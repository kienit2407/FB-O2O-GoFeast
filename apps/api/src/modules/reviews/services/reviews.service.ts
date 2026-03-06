// src/modules/reviews/services/reviews.service.ts
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Review, ReviewDocument } from '../schemas/review.schema';
import { CreateReviewDto } from '../dtos/create-review.dto';
import { UpdateReviewDto } from '../dtos/update-review.dto';

// ⚠️ chỉnh import path theo project bạn
import { Merchant } from '../../merchants/schemas/merchant.schema';
import { Product } from '../../merchants/schemas/product.schema';
import { Order } from '../../orders/schemas/order.schema';

@Injectable()
export class ReviewsService {
    constructor(
        @InjectModel(Review.name) private readonly reviewModel: Model<ReviewDocument>,
        @InjectModel(Merchant.name) private readonly merchantModel: Model<Merchant>,
        @InjectModel(Product.name) private readonly productModel: Model<Product>,
        @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    ) { }

    private oid(id: string, name = 'id') {
        if (!Types.ObjectId.isValid(id)) throw new BadRequestException(`Invalid ${name}`);
        return new Types.ObjectId(id);
    }
    private mapUser(u: any) {
        if (!u || typeof u !== 'object') return { id: null, name: 'Ẩn danh', avatar_url: null };
        return {
            id: String(u._id ?? ''),
            name: String(u.name ?? u.full_name ?? u.username ?? 'Ẩn danh'),
            avatar_url: u.avatar_url ?? u.avatarUrl ?? u.photo_url ?? null,
        };
    }

    // ====== ORDER CHECK (MVP) ======
    private async assertOrderAllowsReview(args: {
        userId: string;
        orderId: string;
        merchantId: string;
        productId: string;
    }) {
        const oidOrder = this.oid(args.orderId, 'order_id');
        const oidUser = this.oid(args.userId, 'user_id');
        const oidMerchant = this.oid(args.merchantId, 'merchant_id');
        const oidProduct = this.oid(args.productId, 'product_id');

        // TODO: map field đúng theo Order schema của bạn:
        // - user_id / customer_user_id
        // - merchant_id
        // - status: delivered/completed
        // - items: [{ product_id, ... }]
        const order: any = await this.orderModel.findOne({ _id: oidOrder, deleted_at: null }).lean();

        if (!order) throw new NotFoundException('Order not found');

        const orderUserId = String(order.user_id ?? order.customer_user_id ?? order.owner_user_id ?? '');
        if (!orderUserId || orderUserId !== String(oidUser)) throw new ForbiddenException('Order not owned by user');

        const orderMerchantId = String(order.merchant_id ?? '');
        if (orderMerchantId && orderMerchantId !== String(oidMerchant)) {
            throw new BadRequestException('merchant_id does not match order');
        }

        const status = String(order.status ?? order.order_status ?? '');
        const okStatuses = new Set(['delivered', 'completed', 'done', 'finished']);
        if (status && !okStatuses.has(status)) {
            throw new BadRequestException('Order not eligible for review yet');
        }

        const items: any[] = Array.isArray(order.items) ? order.items : Array.isArray(order.order_items) ? order.order_items : [];
        const hasProduct = items.some((it) => String(it.product_id ?? it.productId ?? '') === String(oidProduct));
        if (!hasProduct) throw new BadRequestException('Product not found in order');
    }

    // ====== CREATE ======
    async create(userId: string, dto: CreateReviewDto) {
        await this.assertOrderAllowsReview({
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
            images: (dto.images ?? []).map((x) => ({ url: x.url, public_id: x.public_id ?? null })),
            is_edited: false,
            admin_reply: null,
            deleted_at: null,
        };

        try {
            const created = await this.reviewModel.create(doc);
            // recalc merchant + product stats
            await Promise.all([
                this.recalcMerchantStats(String(doc.merchant_id)),
                this.recalcProductStats(String(doc.product_id)),
            ]);

            return { id: String(created._id) };
        } catch (e: any) {
            // duplicate key => review exists
            if (e?.code === 11000) throw new BadRequestException('Review already exists for this order/product');
            throw e;
        }
    }

    // ====== UPDATE (owner) ======
    async update(userId: string, reviewId: string, dto: UpdateReviewDto) {
        const rid = this.oid(reviewId, 'reviewId');
        const uid = this.oid(userId, 'userId');

        const review = await this.reviewModel.findOne({ _id: rid, deleted_at: null });
        if (!review) throw new NotFoundException('Review not found');
        if (String(review.user_id) !== String(uid)) throw new ForbiddenException('Not allowed');

        if (dto.rating != null) (review as any).rating = dto.rating;
        if (dto.comment != null) (review as any).comment = dto.comment.trim();
        if (dto.video_url !== undefined) (review as any).video_url = dto.video_url ?? null;
        if (dto.images != null) (review as any).images = dto.images.map((x) => ({ url: x.url, public_id: x.public_id ?? null }));

        (review as any).is_edited = true;

        await review.save();

        await Promise.all([
            this.recalcMerchantStats(String(review.merchant_id)),
            this.recalcProductStats(String(review.product_id)),
        ]);

        return { ok: true };
    }

    // ====== DELETE (soft, owner) ======
    async remove(userId: string, reviewId: string) {
        const rid = this.oid(reviewId, 'reviewId');
        const uid = this.oid(userId, 'userId');

        const review = await this.reviewModel.findOne({ _id: rid, deleted_at: null });
        if (!review) throw new NotFoundException('Review not found');
        if (String(review.user_id) !== String(uid)) throw new ForbiddenException('Not allowed');

        (review as any).deleted_at = new Date();
        await review.save();

        await Promise.all([
            this.recalcMerchantStats(String(review.merchant_id)),
            this.recalcProductStats(String(review.product_id)),
        ]);

        return { ok: true };
    }

    // ====== ADMIN REPLY ======
    async adminReply(adminId: string, reviewId: string, content: string) {
        const rid = this.oid(reviewId, 'reviewId');
        const review = await this.reviewModel.findOne({ _id: rid, deleted_at: null });
        if (!review) throw new NotFoundException('Review not found');

        (review as any).admin_reply = {
            content: content.trim(),
            admin_id: this.oid(adminId, 'adminId'),
            is_edited: Boolean((review as any).admin_reply),
        };

        await review.save();
        return { ok: true };
    }

    // ====== ADMIN HIDE (soft delete) ======
    async adminHide(reviewId: string) {
        const rid = this.oid(reviewId, 'reviewId');
        const review = await this.reviewModel.findOne({ _id: rid, deleted_at: null });
        if (!review) throw new NotFoundException('Review not found');

        (review as any).deleted_at = new Date();
        await review.save();

        await Promise.all([
            this.recalcMerchantStats(String(review.merchant_id)),
            this.recalcProductStats(String(review.product_id)),
        ]);

        return { ok: true };
    }

    // ====== LIST REVIEWS ======
    async listByMerchant(merchantId: string, opts: { limit?: number; cursor?: string; rating?: number }) {
        const mid = this.oid(merchantId, 'merchantId');
        const limit = Math.min(Math.max(Number(opts.limit ?? 10), 1), 50);

        const q: any = { merchant_id: mid, deleted_at: null };
        if (opts.rating) q.rating = Number(opts.rating);

        if (opts.cursor) {
            const d = new Date(opts.cursor);
            if (!Number.isNaN(d.getTime())) q.created_at = { $lt: d };
        }

        const rows = await this.reviewModel
            .find(q)
            .populate({ path: 'user_id', select: 'name full_name username avatar_url avatarUrl photo_url' })
            .sort({ created_at: -1 })
            .limit(limit + 1)
            .lean();

        const hasMore = rows.length > limit;
        const sliced = hasMore ? rows.slice(0, limit) : rows;

        const items = sliced.map((r: any) => ({
            id: String(r._id),
            user_id: typeof r.user_id === 'object' ? String(r.user_id?._id) : String(r.user_id),
            user: this.mapUser(r.user_id),
            product_id: String(r.product_id),
            order_id: String(r.order_id),
            rating: r.rating,
            comment: r.comment,
            images: r.images ?? [],
            video_url: r.video_url ?? null,
            admin_reply: r.admin_reply ?? null,
            created_at: r.created_at,
        }));

        const nextCursor =
            hasMore && items.length ? (items[items.length - 1].created_at as Date).toISOString() : null;

        return { items, nextCursor, hasMore };
    }

    async listByProduct(productId: string, opts: { limit?: number; cursor?: string; rating?: number }) {
        const pid = this.oid(productId, 'productId');
        const limit = Math.min(Math.max(Number(opts.limit ?? 10), 1), 50);

        const q: any = { product_id: pid, deleted_at: null };
        if (opts.rating) q.rating = Number(opts.rating);

        if (opts.cursor) {
            const d = new Date(opts.cursor);
            if (!Number.isNaN(d.getTime())) q.created_at = { $lt: d };
        }

        const rows = await this.reviewModel
            .find(q)
            .populate({ path: 'user_id', select: 'name full_name username avatar_url avatarUrl photo_url' })
            .sort({ created_at: -1 })
            .limit(limit + 1)
            .lean();

        const hasMore = rows.length > limit;
        const sliced = hasMore ? rows.slice(0, limit) : rows;

        const items = sliced.map((r: any) => ({
            id: String(r._id),
            user_id: typeof r.user_id === 'object' ? String(r.user_id?._id) : String(r.user_id),
            user: this.mapUser(r.user_id),
            merchant_id: String(r.merchant_id),
            order_id: String(r.order_id),
            rating: r.rating,
            comment: r.comment,
            images: r.images ?? [],
            video_url: r.video_url ?? null,
            admin_reply: r.admin_reply ?? null,
            created_at: r.created_at,
        }));

        const nextCursor =
            hasMore && items.length ? (items[items.length - 1].created_at as Date).toISOString() : null;

        return { items, nextCursor, hasMore };
    }

    // ====== STATS RECALC ======
    async recalcMerchantStats(merchantId: string) {
        const mid = this.oid(merchantId, 'merchantId');

        const stat = await this.reviewModel.aggregate([
            { $match: { merchant_id: mid, deleted_at: null } },
            { $group: { _id: '$merchant_id', avg: { $avg: '$rating' }, cnt: { $sum: 1 } } },
        ]);

        const avg = Number(stat?.[0]?.avg ?? 0);
        const cnt = Number(stat?.[0]?.cnt ?? 0);

        await this.merchantModel.updateOne(
            { _id: mid },
            { $set: { average_rating: Number(avg.toFixed(2)), total_reviews: cnt } },
        );
    }

    async recalcProductStats(productId: string) {
        const pid = this.oid(productId, 'productId');

        const stat = await this.reviewModel.aggregate([
            { $match: { product_id: pid, deleted_at: null } },
            { $group: { _id: '$product_id', avg: { $avg: '$rating' }, cnt: { $sum: 1 } } },
        ]);

        const avg = Number(stat?.[0]?.avg ?? 0);
        const cnt = Number(stat?.[0]?.cnt ?? 0);

        // ⚠️ nếu Product schema bạn có field cache thì update, nếu chưa có thì bỏ đoạn này
        await this.productModel.updateOne(
            { _id: pid },
            { $set: { average_rating: Number(avg.toFixed(2)), total_reviews: cnt } } as any,
        );
    }
}