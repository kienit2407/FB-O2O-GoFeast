import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
    MerchantReview,
    MerchantReviewDocument,
} from '../schemas/merchant-review.schema';

import {
    Merchant,
    MerchantDocument,
} from '../../merchants/schemas/merchant.schema';
import {
    Order,
    OrderDocument,
    OrderStatus,
} from '../../orders/schemas/order.schema';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { NotificationsService } from 'src/modules/notifications/services/notifications.service';
import { RealtimeGateway } from 'src/modules/realtime/realtime.gateway';
import { RealtimeEvents } from 'src/modules/realtime/realtime.events';

@Injectable()
export class MerchantReviewsService {
    constructor(
        @InjectModel(MerchantReview.name)
        private readonly merchantReviewModel: Model<MerchantReviewDocument>,
        @InjectModel(Merchant.name)
        private readonly merchantModel: Model<MerchantDocument>,
        @InjectModel(Order.name)
        private readonly orderModel: Model<OrderDocument>,
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
        const review = await this.merchantReviewModel.findOne({
            _id: this.oid(reviewId, 'reviewId'),
            deleted_at: null,
        });

        if (!review) {
            throw new NotFoundException('Merchant review not found');
        }

        if (String(review.customer_id) !== String(this.oid(customerUserId, 'customerUserId'))) {
            throw new ForbiddenException('Not allowed');
        }

        return review;
    }
    private mapPublicItem(row: any) {
        return {
            id: String(row._id),
            rating: Number(row.rating ?? 0),
            comment: row.comment ?? '',
            user: this.mapUser(row.customer_id),
            images: Array.isArray(row.images)
                ? row.images.map((x: any) => ({
                    url: x.url,
                    public_id: x.public_id ?? null,
                }))
                : [],
            video_url: row.video_url ?? null,
            merchant_reply: row.merchant_reply
                ? {
                    content: row.merchant_reply.content,
                    merchant_user_id: String(row.merchant_reply.merchant_user_id),
                    is_edited: !!row.merchant_reply.is_edited,
                    replied_at: row.merchant_reply.replied_at,
                    updated_at: row.merchant_reply.updated_at,
                }
                : null,
            is_edited: !!row.is_edited,
            created_at: row.created_at,
        };
    }

    async listPublicByMerchant(
        merchantId: string,
        params: {
            limit?: number;
            cursor?: string;
            rating?: number;
        },
    ) {
        const limit = Math.min(Math.max(Number(params.limit ?? 10), 1), 50);

        const filter: any = {
            merchant_id: this.oid(merchantId, 'merchantId'),
            deleted_at: null,
        };

        if (params.rating != null) {
            filter.rating = Number(params.rating);
        }

        if (params.cursor) {
            const [createdAtRaw, idRaw] = String(params.cursor).split('|');
            const createdAt = new Date(createdAtRaw);

            if (!Number.isNaN(createdAt.getTime()) && Types.ObjectId.isValid(idRaw)) {
                filter.$or = [
                    { created_at: { $lt: createdAt } },
                    {
                        created_at: createdAt,
                        _id: { $lt: new Types.ObjectId(idRaw) },
                    },
                ];
            }
        }

        const rows = await this.merchantReviewModel
            .find(filter)
            .populate({
                path: 'customer_id',
                select: 'full_name name username avatar_url avatarUrl photo_url',
            })
            .sort({ created_at: -1, _id: -1 })
            .limit(limit + 1)
            .lean();

        const hasMore = rows.length > limit;
        const items = hasMore ? rows.slice(0, limit) : rows;

        const last = items.length ? items[items.length - 1] : null;
        const nextCursor = hasMore && last
            ? `${new Date(last.created_at).toISOString()}|${String(last._id)}`
            : null;

        const summaryAgg = await this.merchantReviewModel.aggregate([
            {
                $match: {
                    merchant_id: this.oid(merchantId, 'merchantId'),
                    deleted_at: null,
                },
            },
            {
                $group: {
                    _id: null,
                    avg_rating: { $avg: '$rating' },
                    total: { $sum: 1 },
                },
            },
        ]);

        return {
            items: items.map((row: any) => this.mapPublicItem(row)),
            nextCursor,
            hasMore,
            summary: {
                avg_rating: Number(summaryAgg?.[0]?.avg_rating ?? 0),
                total: Number(summaryAgg?.[0]?.total ?? 0),
            },
        };
    }

    async getViewerStateByMerchant(customerUserId: string, merchantId: string) {
        const uid = this.oid(customerUserId, 'customerUserId');
        const mid = this.oid(merchantId, 'merchantId');

        const myReview = await this.merchantReviewModel
            .findOne({
                customer_id: uid,
                merchant_id: mid,
                deleted_at: null,
            })
            .populate({
                path: 'customer_id',
                select: 'full_name name username avatar_url avatarUrl photo_url',
            })
            .sort({ created_at: -1, _id: -1 })
            .lean();

        const reviewedOrderIds = await this.merchantReviewModel.distinct('order_id', {
            customer_id: uid,
            merchant_id: mid,
            deleted_at: null,
        });

        const reviewableOrder = await this.orderModel
            .findOne({
                customer_id: uid,
                merchant_id: mid,
                status: OrderStatus.COMPLETED,
                _id: { $nin: reviewedOrderIds },
            })
            .sort({ created_at: -1, _id: -1 })
            .select('_id')
            .lean();

        return {
            my_review: myReview ? this.mapPublicItem(myReview) : null,
            can_create_review: !myReview && !!reviewableOrder,
            create_order_id:
                !myReview && reviewableOrder
                    ? String(reviewableOrder._id)
                    : null,
        };
    }
    private async assertOrderAllowsMerchantReview(args: {
        userId: string;
        orderId: string;
        merchantId: string;
    }) {
        const order = await this.orderModel
            .findById(this.oid(args.orderId, 'order_id'))
            .select('_id customer_id merchant_id status')
            .lean();

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        if (String(order.customer_id) !== String(this.oid(args.userId, 'user_id'))) {
            throw new ForbiddenException('Order not owned by user');
        }

        if (String(order.merchant_id) !== String(this.oid(args.merchantId, 'merchant_id'))) {
            throw new BadRequestException('merchant_id does not match order');
        }

        if (order.status !== OrderStatus.COMPLETED) {
            throw new BadRequestException('Order not eligible for review yet');
        }
    }

    async create(customerUserId: string, dto: any) {
        await this.assertOrderAllowsMerchantReview({
            userId: customerUserId,
            orderId: dto.order_id,
            merchantId: dto.merchant_id,
        });

        try {
            const created = await this.merchantReviewModel.create({
                order_id: this.oid(dto.order_id, 'order_id'),
                customer_id: this.oid(customerUserId, 'customer_id'),
                merchant_id: this.oid(dto.merchant_id, 'merchant_id'),
                rating: dto.rating,
                comment: (dto.comment ?? '').trim(),
                images: (dto.images ?? []).map((x: any) => ({
                    url: x.url,
                    public_id: x.public_id ?? null,
                })),
                video_url: dto.video_url ?? null,
                video_public_id: dto.video_public_id ?? null,
                is_edited: false,
                merchant_reply: null,
                deleted_at: null,
            });

            await this.recalcMerchantStoreStats(dto.merchant_id);
            const merchant = await this.merchantModel
                .findById(dto.merchant_id)
                .select('_id owner_user_id name')
                .lean();

            if (merchant?.owner_user_id) {
                const notification =
                    await this.notificationsService.notifyMerchantReviewReceived({
                        userId: String(merchant.owner_user_id),
                        reviewId: String(created._id),
                        reviewType: 'merchant',
                        merchantId: String(dto.merchant_id),
                        orderId: String(dto.order_id),
                        title: 'Có đánh giá quán mới',
                        body: `Khách vừa đánh giá quán ${merchant.name ?? ''}`.trim(),
                    });

                this.realtimeGateway.emitToUser(
                    String(merchant.owner_user_id),
                    RealtimeEvents.MERCHANT_NOTIFICATION_NEW,
                    this.notificationsService.toRealtimePayload(notification),
                );
            }
            return { id: String(created._id) };
        } catch (e: any) {
            if (e?.code === 11000) {
                throw new BadRequestException('Merchant review already exists for this order');
            }
            throw e;
        }
    }

    async update(customerUserId: string, reviewId: string, dto: any) {
        const review = await this.merchantReviewModel.findOne({
            _id: this.oid(reviewId, 'reviewId'),
            deleted_at: null,
        });

        if (!review) throw new NotFoundException('Merchant review not found');

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

        await this.recalcMerchantStoreStats(String(review.merchant_id));

        return { ok: true };
    }

    async remove(customerUserId: string, reviewId: string) {
        const review = await this.merchantReviewModel.findOne({
            _id: this.oid(reviewId, 'reviewId'),
            deleted_at: null,
        });

        if (!review) throw new NotFoundException('Merchant review not found');

        if (String(review.customer_id) !== String(this.oid(customerUserId, 'customerUserId'))) {
            throw new ForbiddenException('Not allowed');
        }

        review.deleted_at = new Date();
        await review.save();

        await this.recalcMerchantStoreStats(String(review.merchant_id));

        return { ok: true };
    }

    async getMyReviewByOrder(customerUserId: string, orderId: string) {
        const row = await this.merchantReviewModel.findOne({
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
            merchant_reply: row.merchant_reply ?? null,
            created_at: row.created_at,
            updated_at: row.updated_at,
        };
    }

    async replyAsMerchant(merchantUserId: string, reviewId: string, content: string) {
        const review = await this.merchantReviewModel.findOne({
            _id: this.oid(reviewId, 'reviewId'),
            deleted_at: null,
        });

        if (!review) {
            throw new NotFoundException('Merchant review not found');
        }

        const merchant = await this.merchantModel.findOne({
            _id: review.merchant_id,
            owner_user_id: this.oid(merchantUserId, 'merchantUserId'),
            deleted_at: null,
        });

        if (!merchant) {
            throw new ForbiddenException('Not allowed');
        }

        const existed = review.merchant_reply != null;

        review.merchant_reply = {
            content: content.trim(),
            merchant_user_id: this.oid(merchantUserId, 'merchantUserId'),
            is_edited: existed,
            replied_at: review.merchant_reply?.replied_at ?? new Date(),
            updated_at: new Date(),
        } as any;

        await review.save();
        const notification =
            await this.notificationsService.notifyCustomerReviewReply({
                userId: String(review.customer_id),
                reviewId: String(review._id),
                reviewType: 'merchant',
                merchantId: String(review.merchant_id),
                orderId: String(review.order_id),
                title: 'Quán đã phản hồi đánh giá của bạn',
                body: `${merchant.name ?? 'Quán'} vừa phản hồi đánh giá của bạn.`,
            });

        this.realtimeGateway.emitToCustomer(
            String(review.customer_id),
            RealtimeEvents.CUSTOMER_NOTIFICATION_NEW,
            this.notificationsService.toRealtimePayload(notification),
        );
        return { ok: true };
    }

    async listForMerchantOwner(
        ownerUserId: string,
        query: { rating?: number; cursor?: string; limit?: number },
    ) {
        const merchant = await this.merchantModel.findOne({
            owner_user_id: this.oid(ownerUserId, 'ownerUserId'),
            deleted_at: null,
        }).lean();

        if (!merchant) {
            throw new NotFoundException('Merchant not found');
        }

        const limit = Math.min(Math.max(Number(query.limit ?? 10), 1), 50);

        const q: any = {
            merchant_id: merchant._id,
            deleted_at: null,
        };

        if (query.rating) q.rating = Number(query.rating);

        if (query.cursor) {
            const d = new Date(query.cursor);
            if (!Number.isNaN(d.getTime())) {
                q.created_at = { $lt: d };
            }
        }

        const rows = await this.merchantReviewModel
            .find(q)
            .populate({
                path: 'customer_id',
                select: 'full_name name username avatar_url avatarUrl photo_url',
            })
            .sort({ created_at: -1 })
            .limit(limit + 1)
            .lean();

        const hasMore = rows.length > limit;
        const sliced = hasMore ? rows.slice(0, limit) : rows;

        const items = sliced.map((r: any) => ({
            id: String(r._id),
            entity_type: 'merchant',
            order_id: String(r.order_id),
            product: null,
            customer: this.mapUser(r.customer_id),
            rating: Number(r.rating ?? 0),
            comment: r.comment ?? '',
            images: r.images ?? [],
            video_url: r.video_url ?? null,
            merchant_reply: r.merchant_reply ?? null,
            created_at: r.created_at,
        }));

        return {
            items,
            hasMore,
            nextCursor:
                hasMore && items.length
                    ? (items[items.length - 1].created_at as Date).toISOString()
                    : null,
        };
    }

    async getSummaryForMerchantOwner(ownerUserId: string) {
        const merchant = await this.merchantModel.findOne({
            owner_user_id: this.oid(ownerUserId, 'ownerUserId'),
            deleted_at: null,
        }).lean();

        if (!merchant) {
            throw new NotFoundException('Merchant not found');
        }

        const rows = await this.merchantReviewModel.aggregate([
            {
                $match: {
                    merchant_id: merchant._id,
                    deleted_at: null,
                },
            },
            {
                $group: {
                    _id: '$rating',
                    count: { $sum: 1 },
                },
            },
        ]);

        const total = rows.reduce((sum, x: any) => sum + Number(x.count ?? 0), 0);
        const weighted = rows.reduce(
            (sum, x: any) => sum + Number(x._id ?? 0) * Number(x.count ?? 0),
            0,
        );

        const rating_breakdown = [5, 4, 3, 2, 1].map((rating) => {
            const found = rows.find((x: any) => Number(x._id) === rating);
            return {
                rating,
                count: Number(found?.count ?? 0),
            };
        });

        return {
            average_rating: total > 0 ? Number((weighted / total).toFixed(1)) : 0,
            total_reviews: total,
            rating_breakdown,
        };
    }

    async recalcMerchantStoreStats(merchantId: string) {
        const mid = this.oid(merchantId, 'merchantId');

        const stat = await this.merchantReviewModel.aggregate([
            { $match: { merchant_id: mid, deleted_at: null } },
            {
                $group: {
                    _id: '$merchant_id',
                    avg: { $avg: '$rating' },
                    cnt: { $sum: 1 },
                },
            },
        ]);

        const avg = Number(stat?.[0]?.avg ?? 0);
        const cnt = Number(stat?.[0]?.cnt ?? 0);

        await this.merchantModel.updateOne(
            { _id: mid },
            {
                $set: {
                    average_rating: Number(avg.toFixed(2)),
                    total_reviews: cnt,
                },
            },
        );
    }
}