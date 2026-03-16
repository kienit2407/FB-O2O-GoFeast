import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
    DriverReview,
    DriverReviewDocument,
} from '../schemas/driver-review.schema';

import {
    Order,
    OrderDocument,
    OrderStatus,
} from '../../orders/schemas/order.schema';
import {
    DriverProfile,
    DriverProfileDocument,
} from '../../drivers/schemas/driver-profile.schema';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { NotificationsService } from 'src/modules/notifications/services/notifications.service';
import { RealtimeGateway } from 'src/modules/realtime/realtime.gateway';
import { RealtimeEvents } from 'src/modules/realtime/realtime.events';

@Injectable()
export class DriverReviewsService {
    constructor(
        @InjectModel(DriverReview.name)
        private readonly driverReviewModel: Model<DriverReviewDocument>,
        @InjectModel(Order.name)
        private readonly orderModel: Model<OrderDocument>,
        @InjectModel(DriverProfile.name)
        private readonly driverProfileModel: Model<DriverProfileDocument>,
        @InjectModel(User.name)
        private readonly userModel: Model<UserDocument>,
        private readonly notificationsService: NotificationsService,
        private readonly realtimeGateway: RealtimeGateway,
    ) { }

    private oid(id: string, name = 'id') {
        if (!Types.ObjectId.isValid(id)) {
            throw new BadRequestException(`Invalid ${name}`);
        }
        return new Types.ObjectId(id);
    }

    private mapUser(u: any) {
        if (!u || typeof u !== 'object') {
            return { id: null, name: 'Ẩn danh', avatar_url: null };
        }

        return {
            id: String(u._id ?? ''),
            name: String(u.full_name ?? u.name ?? u.username ?? 'Ẩn danh'),
            avatar_url: u.avatar_url ?? u.avatarUrl ?? u.photo_url ?? null,
        };
    }
    async getOwnedReviewOrThrow(customerUserId: string, reviewId: string) {
        const review = await this.driverReviewModel.findOne({
            _id: this.oid(reviewId, 'reviewId'),
            deleted_at: null,
        });

        if (!review) {
            throw new NotFoundException('Driver review not found');
        }

        if (String(review.customer_id) !== String(this.oid(customerUserId, 'customerUserId'))) {
            throw new ForbiddenException('Not allowed');
        }

        return review;
    }
    private async assertOrderAllowsDriverReview(args: {
        userId: string;
        orderId: string;
        driverUserId: string;
    }) {
        const order = await this.orderModel
            .findById(this.oid(args.orderId, 'order_id'))
            .select('_id customer_id driver_id status order_number merchant_id')
            .lean();

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        if (String(order.customer_id) !== String(this.oid(args.userId, 'user_id'))) {
            throw new ForbiddenException('Order not owned by user');
        }

        if (!order.driver_id) {
            throw new BadRequestException('Order has no driver assigned');
        }

        if (String(order.driver_id) !== String(this.oid(args.driverUserId, 'driver_user_id'))) {
            throw new BadRequestException('driver_user_id does not match order');
        }

        if (order.status !== OrderStatus.COMPLETED) {
            throw new BadRequestException('Order not eligible for review yet');
        }
    }

    async create(customerUserId: string, dto: any) {
        await this.assertOrderAllowsDriverReview({
            userId: customerUserId,
            orderId: dto.order_id,
            driverUserId: dto.driver_user_id,
        });

        try {
            const created = await this.driverReviewModel.create({
                order_id: this.oid(dto.order_id, 'order_id'),
                customer_id: this.oid(customerUserId, 'customer_id'),
                driver_user_id: this.oid(dto.driver_user_id, 'driver_user_id'),
                rating: dto.rating,
                comment: (dto.comment ?? '').trim(),
                images: (dto.images ?? []).map((x: any) => ({
                    url: x.url,
                    public_id: x.public_id ?? null,
                })),
                video_url: dto.video_url ?? null,
                video_public_id: dto.video_public_id ?? null,
                is_edited: false,
                deleted_at: null,
            });

            await this.recalcDriverStats(dto.driver_user_id);
            const notification =
                await this.notificationsService.notifyDriverReviewReceived({
                    userId: dto.driver_user_id,
                    reviewId: String(created._id),
                    orderId: dto.order_id,
                    driverId: dto.driver_user_id,
                    title: 'Bạn vừa nhận được đánh giá mới',
                    body: 'Khách vừa đánh giá chuyến giao hàng của bạn.',
                });

            this.realtimeGateway.emitToDriver(
                dto.driver_user_id,
                RealtimeEvents.DRIVER_NOTIFICATION_NEW,
                this.notificationsService.toRealtimePayload(notification),
            );
            return { id: String(created._id) };
        } catch (e: any) {
            if (e?.code === 11000) {
                throw new BadRequestException('Driver review already exists for this order');
            }
            throw e;
        }
    }

    async update(customerUserId: string, reviewId: string, dto: any) {
        const review = await this.driverReviewModel.findOne({
            _id: this.oid(reviewId, 'reviewId'),
            deleted_at: null,
        });

        if (!review) throw new NotFoundException('Driver review not found');

        if (String(review.customer_id) !== String(this.oid(customerUserId, 'customerUserId'))) {
            throw new ForbiddenException('Not allowed');
        }

        if (dto.rating != null) review.rating = dto.rating;
        if (dto.comment != null) review.comment = dto.comment.trim();
        if (dto.images != null) {
            review.images = dto.images.map((x: any) => ({
                url: x.url,
                public_id: x.public_id ?? null,
            })) as any;
        }
        if (dto.video_url !== undefined) review.video_url = dto.video_url ?? null;
        if (dto.video_public_id !== undefined) {
            review.video_public_id = dto.video_public_id ?? null;
        }

        review.is_edited = true;
        await review.save();

        await this.recalcDriverStats(String(review.driver_user_id));

        return { ok: true };
    }

    async remove(customerUserId: string, reviewId: string) {
        const review = await this.driverReviewModel.findOne({
            _id: this.oid(reviewId, 'reviewId'),
            deleted_at: null,
        });

        if (!review) throw new NotFoundException('Driver review not found');

        if (String(review.customer_id) !== String(this.oid(customerUserId, 'customerUserId'))) {
            throw new ForbiddenException('Not allowed');
        }

        review.deleted_at = new Date();
        await review.save();

        await this.recalcDriverStats(String(review.driver_user_id));

        return { ok: true };
    }

    async getMyReviewByOrder(customerUserId: string, orderId: string) {
        const row = await this.driverReviewModel.findOne({
            customer_id: this.oid(customerUserId, 'customerUserId'),
            order_id: this.oid(orderId, 'orderId'),
            deleted_at: null,
        }).lean();

        if (!row) return null;

        return {
            id: String(row._id),
            rating: row.rating,
            comment: row.comment,
            images: row.images ?? [],
            video_url: row.video_url ?? null,
            created_at: row.created_at,
            updated_at: row.updated_at,
        };
    }

    async listForDriver(driverUserId: string, query: { cursor?: string; limit?: number }) {
        const limit = Math.min(Math.max(Number(query.limit ?? 10), 1), 50);

        const q: any = {
            driver_user_id: this.oid(driverUserId, 'driverUserId'),
            deleted_at: null,
        };

        if (query.cursor) {
            const d = new Date(query.cursor);
            if (!Number.isNaN(d.getTime())) {
                q.created_at = { $lt: d };
            }
        }

        const rows = await this.driverReviewModel
            .find(q)
            .populate({
                path: 'customer_id',
                select: 'full_name name username avatar_url avatarUrl photo_url',
            })
            .populate({
                path: 'order_id',
                select: 'order_number merchant_id delivery_address created_at updated_at',
            })
            .sort({ created_at: -1 })
            .limit(limit + 1)
            .lean();

        const hasMore = rows.length > limit;
        const sliced = hasMore ? rows.slice(0, limit) : rows;

        return {
            items: sliced.map((r: any) => ({
                id: String(r._id),
                review_id: String(r._id),
                order: {
                    id: String(r.order_id?._id ?? r.order_id ?? ''),
                    order_number: r.order_id?.order_number ?? '',
                    customer_address: r.order_id?.delivery_address?.address ?? '',
                },
                customer: this.mapUser(r.customer_id),
                rating: Number(r.rating ?? 0),
                comment: r.comment ?? '',
                images: r.images ?? [],
                video_url: r.video_url ?? null,
                created_at: r.created_at,
            })),
            hasMore,
            nextCursor:
                hasMore && sliced.length
                    ? new Date(sliced[sliced.length - 1].created_at).toISOString()
                    : null,
        };
    }

    async getDetailForDriver(driverUserId: string, reviewId: string) {
        const row = await this.driverReviewModel
            .findOne({
                _id: this.oid(reviewId, 'reviewId'),
                driver_user_id: this.oid(driverUserId, 'driverUserId'),
                deleted_at: null,
            })
            .populate({
                path: 'customer_id',
                select: 'full_name name username avatar_url avatarUrl photo_url',
            })
            .populate({
                path: 'order_id',
                select: 'order_number merchant_id delivery_address created_at updated_at',
            })
            .lean<any>();

        if (!row) {
            throw new NotFoundException('Driver review not found');
        }

        const order = row?.order_id as any;

        return {
            id: String(row._id),
            order: {
                id: String(order?._id ?? row.order_id ?? ''),
                order_number: order?.order_number ?? '',
                customer_address: order?.delivery_address?.address ?? '',
            },
            customer: this.mapUser(row.customer_id),
            rating: Number(row.rating ?? 0),
            comment: row.comment ?? '',
            images: row.images ?? [],
            video_url: row.video_url ?? null,
            created_at: row.created_at,
            updated_at: row.updated_at,
        };
    }

    async recalcDriverStats(driverUserId: string) {
        const driverOid = this.oid(driverUserId, 'driverUserId');

        const stat = await this.driverReviewModel.aggregate([
            {
                $match: {
                    driver_user_id: driverOid,
                    deleted_at: null,
                },
            },
            {
                $group: {
                    _id: '$driver_user_id',
                    avg: { $avg: '$rating' },
                    cnt: { $sum: 1 },
                },
            },
        ]);

        const avg = Number(stat?.[0]?.avg ?? 0);
        const cnt = Number(stat?.[0]?.cnt ?? 0);

        await this.driverProfileModel.updateOne(
            { user_id: driverOid },
            {
                $set: {
                    average_rating: Number(avg.toFixed(2)),
                    total_reviews: cnt,
                },
            } as any,
        );
    }
}