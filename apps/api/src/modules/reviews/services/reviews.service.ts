import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Review, ReviewDocument } from '../schemas/review.schema';


import { Merchant, MerchantDocument } from '../../merchants/schemas/merchant.schema';
import { Product, ProductDocument } from '../../merchants/schemas/product.schema';
import { Order, OrderDocument, OrderStatus } from '../../orders/schemas/order.schema';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { CreateReviewDto } from '../dtos/create-review.dto';
import { UpdateReviewDto } from '../dtos/update-review.dto';
import { RealtimeGateway } from 'src/modules/realtime/realtime.gateway';
import { NotificationsService } from 'src/modules/notifications/services/notifications.service';
import { RealtimeEvents } from 'src/modules/realtime/realtime.events';
import { MerchantReview, MerchantReviewDocument } from '../schemas/merchant-review.schema';
import { DriverReview, DriverReviewDocument } from '../schemas/driver-review.schema';

@Injectable()
export class ReviewsService {
    constructor(
        @InjectModel(Review.name)
        private readonly reviewModel: Model<ReviewDocument>,

        @InjectModel(Merchant.name)
        private readonly merchantModel: Model<MerchantDocument>,

        @InjectModel(Product.name)
        private readonly productModel: Model<ProductDocument>,

        @InjectModel(Order.name)
        private readonly orderModel: Model<OrderDocument>,

        @InjectModel(User.name)
        private readonly userModel: Model<UserDocument>,

        @InjectModel(MerchantReview.name)
        private readonly merchantReviewModel: Model<MerchantReviewDocument>,
        @InjectModel(DriverReview.name)
        private readonly driverReviewModel: Model<DriverReviewDocument>,
        private readonly notificationsService: NotificationsService,
        private readonly realtimeGateway: RealtimeGateway,
    ) { }
    async getOwnedReviewOrThrow(userId: string, reviewId: string) {
        const review = await this.reviewModel.findOne({
            _id: this.oid(reviewId, 'reviewId'),
            deleted_at: null,
        });

        if (!review) {
            throw new NotFoundException('Review not found');
        }

        if (String(review.user_id) !== String(this.oid(userId, 'userId'))) {
            throw new ForbiddenException('Not allowed');
        }

        return review;
    }
    async getMyReviewSummary(userId: string) {
        const uid = this.oid(userId, 'userId');

        const [merchant, product, driver] = await Promise.all([
            this.merchantReviewModel.countDocuments({
                customer_id: uid,
                deleted_at: null,
            }),
            this.reviewModel.countDocuments({
                user_id: uid,
                deleted_at: null,
            }),
            this.driverReviewModel.countDocuments({
                customer_id: uid,
                deleted_at: null,
            }),
        ]);

        return {
            all: Number(merchant) + Number(product) + Number(driver),
            merchant: Number(merchant),
            product: Number(product),
            driver: Number(driver),
        };
    }
    async listPublicByProduct(
        productId: string,
        params: {
            limit?: number;
            cursor?: string;
            rating?: number;
            viewerUserId?: string | null;
        },
    ) {
        const limit = Math.min(Math.max(Number(params.limit ?? 10), 1), 50);

        const filter: any = {
            product_id: this.oid(productId, 'productId'),
            deleted_at: null,
        };

        if (params.rating) {
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

        const rows = await this.reviewModel
            .find(filter)
            .populate({
                path: 'user_id',
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

        const summaryAgg = await this.reviewModel.aggregate([
            {
                $match: {
                    product_id: this.oid(productId, 'productId'),
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

        let myReview: any = null;
        let canCreateReview = false;
        let createOrderId: string | null = null;

        if (params.viewerUserId && Types.ObjectId.isValid(params.viewerUserId)) {
            const viewerOid = this.oid(params.viewerUserId, 'viewerUserId');

            myReview = await this.reviewModel
                .findOne({
                    product_id: this.oid(productId, 'productId'),
                    user_id: viewerOid,
                    deleted_at: null,
                })
                .populate({
                    path: 'user_id',
                    select: 'full_name name username avatar_url avatarUrl photo_url',
                })
                .sort({ created_at: -1 })
                .lean();

            if (!myReview) {
                const reviewOrder = await this.orderModel
                    .findOne({
                        customer_id: viewerOid,
                        status: 'completed',
                        deleted_at: { $exists: false },
                        items: {
                            $elemMatch: {
                                product_id: this.oid(productId, 'productId'),
                            },
                        },
                    })
                    .sort({ created_at: -1 })
                    .select('_id merchant_id')
                    .lean();

                if (reviewOrder) {
                    const existed = await this.reviewModel.findOne({
                        order_id: reviewOrder._id,
                        product_id: this.oid(productId, 'productId'),
                        user_id: viewerOid,
                        deleted_at: null,
                    }).select('_id').lean();

                    if (!existed) {
                        canCreateReview = true;
                        createOrderId = String(reviewOrder._id);
                    }
                }
            }
        }

        const mapItem = (row: any) => ({
            id: String(row._id),
            rating: Number(row.rating ?? 0),
            comment: row.comment ?? '',
            user: row.user_id
                ? {
                    id: String(row.user_id._id),
                    name: String(
                        row.user_id.full_name ??
                        row.user_id.name ??
                        row.user_id.username ??
                        'Ẩn danh',
                    ),
                    avatar_url:
                        row.user_id.avatar_url ??
                        row.user_id.avatarUrl ??
                        row.user_id.photo_url ??
                        null,
                }
                : null,
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
        });

        return {
            items: items.map(mapItem),
            nextCursor,
            hasMore,
            summary: {
                avg_rating: Number(summaryAgg?.[0]?.avg_rating ?? 0),
                total: Number(summaryAgg?.[0]?.total ?? 0),
            },
            my_review: myReview ? mapItem(myReview) : null,
            can_create_review: canCreateReview,
            create_order_id: createOrderId,
        };
    }
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

    private async assertOrderAllowsProductReview(args: {
        userId: string;
        orderId: string;
        merchantId: string;
        productId: string;
    }) {
        const oidOrder = this.oid(args.orderId, 'order_id');
        const oidUser = this.oid(args.userId, 'user_id');
        const oidMerchant = this.oid(args.merchantId, 'merchant_id');
        const oidProduct = this.oid(args.productId, 'product_id');

        const order = await this.orderModel
            .findById(oidOrder)
            .select('_id customer_id merchant_id driver_id status items')
            .lean();

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        if (String(order.customer_id) !== String(oidUser)) {
            throw new ForbiddenException('Order not owned by user');
        }

        if (String(order.merchant_id) !== String(oidMerchant)) {
            throw new BadRequestException('merchant_id does not match order');
        }

        if (order.status !== OrderStatus.COMPLETED) {
            throw new BadRequestException('Order not eligible for review yet');
        }

        const items = Array.isArray(order.items) ? order.items : [];
        const hasProduct = items.some(
            (it: any) =>
                String(it?.product_id ?? '') === String(oidProduct) &&
                String(it?.item_type ?? 'product') !== 'topping',
        );

        if (!hasProduct) {
            throw new BadRequestException('Product not found in order');
        }
    }
    async listMyReviewFeed(
        userId: string,
        query: {
            type?: 'all' | 'merchant' | 'product' | 'driver';
            limit?: number;
            cursor?: string;
        },
    ) {
        const uid = this.oid(userId, 'userId');
        const limit = Math.min(Math.max(Number(query.limit ?? 10), 1), 30);
        const type = query.type ?? 'all';

        const createdAtFilter =
            query.cursor && !Number.isNaN(new Date(query.cursor).getTime())
                ? { $lt: new Date(query.cursor) }
                : undefined;

        const productWhere: any = {
            user_id: uid,
            deleted_at: null,
        };
        if (createdAtFilter) productWhere.created_at = createdAtFilter;

        const merchantWhere: any = {
            customer_id: uid,
            deleted_at: null,
        };
        if (createdAtFilter) merchantWhere.created_at = createdAtFilter;

        const driverWhere: any = {
            customer_id: uid,
            deleted_at: null,
        };
        if (createdAtFilter) driverWhere.created_at = createdAtFilter;

        const [productRows, merchantRows, driverRows] = await Promise.all([
            type === 'merchant' || type === 'driver'
                ? Promise.resolve([])
                : this.reviewModel
                    .find(productWhere)
                    .populate({
                        path: 'merchant_id',
                        select: 'name logo_url',
                    })
                    .populate({
                        path: 'product_id',
                        select: 'name images merchant_id',
                    })
                    .populate({
                        path: 'order_id',
                        select: 'order_number',
                    })
                    .sort({ created_at: -1, _id: -1 })
                    .limit(limit * 2)
                    .lean<any[]>(),

            type === 'product' || type === 'driver'
                ? Promise.resolve([])
                : this.merchantReviewModel
                    .find(merchantWhere)
                    .populate({
                        path: 'merchant_id',
                        select: 'name logo_url',
                    })
                    .populate({
                        path: 'order_id',
                        select: 'order_number',
                    })
                    .sort({ created_at: -1, _id: -1 })
                    .limit(limit * 2)
                    .lean<any[]>(),

            type === 'merchant' || type === 'product'
                ? Promise.resolve([])
                : this.driverReviewModel
                    .find(driverWhere)
                    .populate({
                        path: 'driver_user_id',
                        select: 'full_name name username avatar_url avatarUrl photo_url',
                    })
                    .populate({
                        path: 'order_id',
                        select: 'order_number',
                    })
                    .sort({ created_at: -1, _id: -1 })
                    .limit(limit * 2)
                    .lean<any[]>(),
        ]);

        const productItems = productRows.map((row: any) => ({
            id: String(row._id),
            type: 'product',
            order: {
                id: String(row.order_id?._id ?? row.order_id ?? ''),
                order_number: row.order_id?.order_number ?? '',
            },
            merchant: row.merchant_id
                ? {
                    id: String(row.merchant_id._id),
                    name: row.merchant_id.name ?? '',
                    logo_url: row.merchant_id.logo_url ?? null,
                }
                : null,
            product: row.product_id
                ? {
                    id: String(row.product_id._id),
                    name: row.product_id.name ?? '',
                    image_url:
                        Array.isArray(row.product_id.images) && row.product_id.images.length
                            ? row.product_id.images[0]?.url ?? null
                            : null,
                    merchant_id: row.merchant_id ? String(row.merchant_id._id) : null,
                }
                : null,
            driver: null,
            rating: Number(row.rating ?? 0),
            comment: row.comment ?? '',
            images: row.images ?? [],
            video_url: row.video_url ?? null,
            merchant_reply: row.merchant_reply ?? null,
            created_at: row.created_at,
            updated_at: row.updated_at,
        }));

        const merchantItems = merchantRows.map((row: any) => ({
            id: String(row._id),
            type: 'merchant',
            order: {
                id: String(row.order_id?._id ?? row.order_id ?? ''),
                order_number: row.order_id?.order_number ?? '',
            },
            merchant: row.merchant_id
                ? {
                    id: String(row.merchant_id._id),
                    name: row.merchant_id.name ?? '',
                    logo_url: row.merchant_id.logo_url ?? null,
                }
                : null,
            product: null,
            driver: null,
            rating: Number(row.rating ?? 0),
            comment: row.comment ?? '',
            images: row.images ?? [],
            video_url: row.video_url ?? null,
            merchant_reply: row.merchant_reply ?? null,
            created_at: row.created_at,
            updated_at: row.updated_at,
        }));

        const driverItems = driverRows.map((row: any) => ({
            id: String(row._id),
            type: 'driver',
            order: {
                id: String(row.order_id?._id ?? row.order_id ?? ''),
                order_number: row.order_id?.order_number ?? '',
            },
            merchant: null,
            product: null,
            driver: row.driver_user_id
                ? {
                    id: String(row.driver_user_id._id),
                    name: String(
                        row.driver_user_id.full_name ??
                        row.driver_user_id.name ??
                        row.driver_user_id.username ??
                        'Tài xế',
                    ),
                    avatar_url:
                        row.driver_user_id.avatar_url ??
                        row.driver_user_id.avatarUrl ??
                        row.driver_user_id.photo_url ??
                        null,
                }
                : null,
            rating: Number(row.rating ?? 0),
            comment: row.comment ?? '',
            images: row.images ?? [],
            video_url: row.video_url ?? null,
            merchant_reply: null,
            created_at: row.created_at,
            updated_at: row.updated_at,
        }));

        const merged = [...productItems, ...merchantItems, ...driverItems]
            .sort(
                (a: any, b: any) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
            )
            .slice(0, limit);

        const nextCursor =
            merged.length >= limit
                ? new Date(merged[merged.length - 1].created_at).toISOString()
                : null;

        return {
            items: merged,
            next_cursor: nextCursor,
            has_more: merged.length >= limit,
        };
    }
    async create(userId: string, dto: CreateReviewDto) {
        await this.assertOrderAllowsProductReview({
            userId,
            orderId: dto.order_id,
            merchantId: dto.merchant_id,
            productId: dto.product_id,
        });

        const doc: Partial<Review> = {
            user_id: this.oid(userId, 'user_id'),
            merchant_id: this.oid(dto.merchant_id, 'merchant_id'),
            product_id: this.oid(dto.product_id, 'product_id'),
            order_id: this.oid(dto.order_id, 'order_id'),
            rating: dto.rating,
            comment: (dto.comment ?? '').trim(),
            video_url: dto.video_url ?? null,
            video_public_id: dto.video_public_id ?? null,
            images: (dto.images ?? []).map((x) => ({
                url: x.url,
                public_id: x.public_id ?? null,
            })),
            is_edited: false,
            merchant_reply: null,
            deleted_at: null,
        };

        try {
            const created = await this.reviewModel.create(doc);

            await this.recalcProductStats(String(doc.product_id));
            const merchant = await this.merchantModel
                .findById(doc.merchant_id)
                .select('_id owner_user_id name')
                .lean();

            const product = await this.productModel
                .findById(doc.product_id)
                .select('_id name')
                .lean();

            if (merchant?.owner_user_id) {
                const notification =
                    await this.notificationsService.notifyMerchantReviewReceived({
                        userId: String(merchant.owner_user_id),
                        reviewId: String(created._id),
                        reviewType: 'product',
                        merchantId: String(doc.merchant_id),
                        productId: String(doc.product_id),
                        orderId: String(doc.order_id),
                        title: 'Có đánh giá món mới',
                        body: `Khách vừa đánh giá món ${product?.name ?? 'sản phẩm'} của quán.`,
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
                throw new BadRequestException(
                    'Review already exists for this order/product',
                );
            }
            throw e;
        }

    }

    async update(userId: string, reviewId: string, dto: UpdateReviewDto) {
        const review = await this.reviewModel.findOne({
            _id: this.oid(reviewId, 'reviewId'),
            deleted_at: null,
        });

        if (!review) {
            throw new NotFoundException('Review not found');
        }

        if (String(review.user_id) !== String(this.oid(userId, 'userId'))) {
            throw new ForbiddenException('Not allowed');
        }

        if (dto.rating != null) review.rating = dto.rating;
        if (dto.comment != null) review.comment = dto.comment.trim();
        if ((dto as any).video_url !== undefined) {
            review.video_url = (dto as any).video_url ?? null;
        }
        if ((dto as any).video_public_id !== undefined) {
            (review as any).video_public_id = (dto as any).video_public_id ?? null;
        }
        if (dto.images != null) {
            review.images = dto.images.map((x) => ({
                url: x.url,
                public_id: x.public_id ?? null,
            })) as any;
        }

        review.is_edited = true;
        await review.save();

        await this.recalcProductStats(String(review.product_id));
        return { ok: true };
    }

    async remove(userId: string, reviewId: string) {
        const review = await this.reviewModel.findOne({
            _id: this.oid(reviewId, 'reviewId'),
            deleted_at: null,
        });

        if (!review) {
            throw new NotFoundException('Review not found');
        }

        if (String(review.user_id) !== String(this.oid(userId, 'userId'))) {
            throw new ForbiddenException('Not allowed');
        }

        review.deleted_at = new Date();
        await review.save();

        await this.recalcProductStats(String(review.product_id));

        return { ok: true };
    }

    async getMyProductReviewByOrder(userId: string, orderId: string, productId: string) {
        const row = await this.reviewModel.findOne({
            user_id: this.oid(userId, 'userId'),
            order_id: this.oid(orderId, 'orderId'),
            product_id: this.oid(productId, 'productId'),
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
        const review = await this.reviewModel.findOne({
            _id: this.oid(reviewId, 'reviewId'),
            deleted_at: null,
        });

        if (!review) {
            throw new NotFoundException('Review not found');
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

        const merchants = await this.merchantModel.findOne({
            _id: review.merchant_id,
            owner_user_id: this.oid(merchantUserId, 'merchantUserId'),
            deleted_at: null,
        }).lean();

        if (merchants) {
            const notification =
                await this.notificationsService.notifyCustomerReviewReply({
                    userId: String(review.user_id),
                    reviewId: String(review._id),
                    reviewType: 'product',
                    merchantId: String(review.merchant_id),
                    productId: String(review.product_id),
                    orderId: String(review.order_id),
                    title: 'Quán đã phản hồi đánh giá món ăn của bạn',
                    body: `${merchant.name ?? 'Quán'} vừa phản hồi đánh giá sản phẩm của bạn.`,
                });

            this.realtimeGateway.emitToCustomer(
                String(review.user_id),
                RealtimeEvents.CUSTOMER_NOTIFICATION_NEW,
                this.notificationsService.toRealtimePayload(notification),
            );
        }

        return { ok: true };
    }

    async listProductReviewsForMerchantOwner(
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

        const rows = await this.reviewModel
            .find(q)
            .populate({ path: 'user_id', select: 'full_name name username avatar_url avatarUrl photo_url' })
            .populate({ path: 'product_id', select: 'name images' })
            .sort({ created_at: -1 })
            .limit(limit + 1)
            .lean();

        const hasMore = rows.length > limit;
        const sliced = hasMore ? rows.slice(0, limit) : rows;

        const items = sliced.map((r: any) => ({
            id: String(r._id),
            entity_type: 'product',
            order_id: String(r.order_id),
            product: r.product_id
                ? {
                    id: String(r.product_id._id ?? r.product_id),
                    name: r.product_id.name ?? 'Sản phẩm',
                }
                : null,
            customer: this.mapUser(r.user_id),
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

    async getProductReviewSummaryForMerchantOwner(ownerUserId: string) {
        const merchant = await this.merchantModel.findOne({
            owner_user_id: this.oid(ownerUserId, 'ownerUserId'),
            deleted_at: null,
        }).lean();

        if (!merchant) {
            throw new NotFoundException('Merchant not found');
        }

        const rows = await this.reviewModel.aggregate([
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


    async recalcProductStats(productId: string) {
        const pid = this.oid(productId, 'productId');

        const stat = await this.reviewModel.aggregate([
            { $match: { product_id: pid, deleted_at: null } },
            {
                $group: {
                    _id: '$product_id',
                    avg: { $avg: '$rating' },
                    cnt: { $sum: 1 },
                },
            },
        ]);

        const avg = Number(stat?.[0]?.avg ?? 0);
        const cnt = Number(stat?.[0]?.cnt ?? 0);

        await this.productModel.updateOne(
            { _id: pid },
            {
                $set: {
                    average_rating: Number(avg.toFixed(2)),
                    total_reviews: cnt,
                },
            } as any,
        );
    }
}