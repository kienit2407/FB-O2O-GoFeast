import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache as CacheManager } from 'cache-manager';
import { Order, OrderStatus, OrderType, PaymentStatus } from 'src/modules/orders/schemas';
import { Merchant, MerchantApprovalStatus, Product } from 'src/modules/merchants/schemas';
import { InteractionAction, UserInteraction } from 'src/modules/ai/schemas/user-interaction.schema';
import { FeedImpression, FeedItemType, FeedSectionKey } from '../shemas/feed-impression.schema';
type GetHomeFeedInput = {
    userId: string | null;
    lat: number;
    lng: number;
    orderType: OrderType;
    distanceKm: number;
    limitPerSection: number;
};

type MerchantCandidate = {
    _id: Types.ObjectId;
    name: string | null;
    logo_url: string | null;
    cover_image_url: string | null;
    category: string | null;
    average_rating: number;
    total_orders: number;
    is_accepting_orders: boolean;
    delivery_radius_km: number;
    distance_km: number;
};

@Injectable()
export class FeedService {
    constructor(
        @InjectModel(Merchant.name) private readonly merchantModel: Model<Merchant>,
        @InjectModel(Product.name) private readonly productModel: Model<Product>,
        @InjectModel(Order.name) private readonly orderModel: Model<Order>,
        @InjectModel(UserInteraction.name) private readonly interactionModel: Model<UserInteraction>,
        @Inject(CACHE_MANAGER) private readonly cache: CacheManager,
        @InjectModel(FeedImpression.name)
        private readonly feedImpressionModel: Model<FeedImpression>,
    ) { }
    private pickImageUrls(product: any): string[] {
        const imgs = Array.isArray(product?.images) ? product.images : [];
        if (!imgs.length) return [];
        imgs.sort((a: any, b: any) => (a?.position ?? 0) - (b?.position ?? 0));
        return imgs.map((x: any) => x?.url).filter(Boolean);
    }
    async logInteraction(userId: string, dto: {
        action: InteractionAction;
        request_id: string;
        section: string;
        position: number;
        item_type: 'merchant' | 'product';
        merchant_id: string;
        product_id?: string;
    }) {
        // bạn nói chỉ log khi có user => đã guard rồi
        await this.interactionModel.create({
            user_id: new Types.ObjectId(userId),
            action: dto.action,
            weight: dto.action === InteractionAction.CLICK ? 2 : 1, // MVP
            source: 'home',
            request_id: dto.request_id,
            section: dto.section,
            position: dto.position,
            item_type: dto.item_type,
            merchant_id: new Types.ObjectId(dto.merchant_id),
            product_id: dto.product_id ? new Types.ObjectId(dto.product_id) : null,

            created_at: new Date(),
        });
    }
    private async logImpressions(args: {
        userId: string;
        requestId: string;
        sessionId?: string | null;
        geoCell: string;
        shownAt: Date;
        sections: any[];
    }) {
        const userObjId = new Types.ObjectId(args.userId);

        const docs: Partial<FeedImpression>[] = [];

        for (const section of args.sections) {
            const sectionKey = section?.key as FeedSectionKey;
            const items: any[] = Array.isArray(section?.items) ? section.items : [];

            items.forEach((it, idx) => {
                // item shape của bạn hiện tại: type: 'product' | 'merchant'
                const itemType = (it?.type ?? it?.item_type) as FeedItemType;

                const itemIdStr =
                    itemType === FeedItemType.PRODUCT
                        ? it.product_id
                        : it.merchant_id;

                if (!itemIdStr) return;

                const merchantIdStr =
                    itemType === FeedItemType.PRODUCT
                        ? (it?.merchant?.merchant_id ?? it?.merchant_id)
                        : it?.merchant_id;

                docs.push({
                    user_id: userObjId,
                    request_id: args.requestId,
                    session_id: args.sessionId ?? null,

                    section: sectionKey,
                    item_type: itemType,
                    item_id: new Types.ObjectId(itemIdStr),
                    merchant_id: merchantIdStr ? new Types.ObjectId(merchantIdStr) : null,

                    position: idx,
                    geo_cell: args.geoCell,

                    // distance/score: nếu chưa có thì null, sau này bạn bổ sung score vào items cũng được
                    distance_km: it?.distance_km ?? it?.merchant?.distance_km ?? null,
                    score: it?.score ?? null,

                    model_version: 'heuristic_v1',
                    shown_at: args.shownAt,
                });
            });
        }

        if (!docs.length) return;

        // ordered:false để lỡ 1 record lỗi vẫn insert được phần còn lại
        await this.feedImpressionModel.insertMany(docs, { ordered: false });
    }
    private geoCell(lat: number, lng: number) {
        // MVP cell đơn giản (sau này thay H3/Geohash)
        const la = Math.floor(lat * 100) / 100;
        const ln = Math.floor(lng * 100) / 100;
        return `${la}:${ln}`;
    }

    private timeBucket(minutes = 5) {
        return Math.floor(Date.now() / (minutes * 60 * 1000));
    }

    private async getCandidateMerchants(input: GetHomeFeedInput): Promise<MerchantCandidate[]> {
        const maxDistanceM = Math.max(1, input.distanceKm) * 1000;

        const pipeline: any[] = [
            {
                $geoNear: {
                    near: { type: 'Point', coordinates: [input.lng, input.lat] },
                    key: 'location',
                    spherical: true,
                    distanceField: 'distance_m',
                    maxDistance: maxDistanceM,
                    query: {
                        approval_status: MerchantApprovalStatus.APPROVED,
                        is_accepting_orders: true,
                        deleted_at: null,
                        location: { $ne: null }, //  tránh doc chưa set location
                    },
                },
            },
            { $addFields: { distance_km: { $divide: ['$distance_m', 1000] } } },

            //  tôn trọng radius riêng của từng merchant
            {
                $match: {
                    $expr: {
                        $lte: [
                            '$distance_m',
                            {
                                $multiply: [{ $ifNull: ['$delivery_radius_km', 0] }, 1000],
                            },
                        ],
                    },
                },
            },

            {
                $project: {
                    name: 1,
                    logo_url: 1,
                    cover_image_url: 1,
                    category: 1,
                    average_rating: 1,
                    total_orders: 1,
                    is_accepting_orders: 1,
                    delivery_radius_km: { $ifNull: ['$delivery_radius_km', 0] },
                    distance_km: 1,
                },
            },
            { $limit: 250 },
        ];

        return this.merchantModel.aggregate(pipeline);
    }

    private async getUserSignals(userId: string | null) {
        if (!userId) {
            return { topMerchantIds: [] as string[], topCategories: new Set<string>() };
        }

        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const uid = new Types.ObjectId(userId);

        const topMerchants = await this.interactionModel
            .aggregate([
                { $match: { user_id: uid, created_at: { $gte: since }, merchant_id: { $ne: null } } },
                { $group: { _id: '$merchant_id', score: { $sum: { $ifNull: ['$weight', 1] } } } },
                { $sort: { score: -1 } },
                { $limit: 20 },
            ])
            .then((rows: any[]) => rows.map((r) => String(r._id)));

        const merchantDocs = await this.merchantModel
            .find({ _id: { $in: topMerchants.map((id) => new Types.ObjectId(id)) } })
            .select({ category: 1 })
            .lean();

        const cat = new Set<string>();
        for (const m of merchantDocs) if (m?.category) cat.add(m.category);

        return { topMerchantIds: topMerchants, topCategories: cat };
    }

    private pickImageUrl(product: any): string | null {
        const imgs = Array.isArray(product?.images) ? product.images : [];
        if (!imgs.length) return null;
        // sort by position asc
        imgs.sort((a: any, b: any) => (a?.position ?? 0) - (b?.position ?? 0));
        return imgs[0]?.url ?? null;
    }

    private async buildFoodForYou(input: GetHomeFeedInput, candidates: MerchantCandidate[]) {
        // pool merchant: ưu tiên merchant user hay tương tác, không có thì lấy gần nhất
        const { topMerchantIds } = await this.getUserSignals(input.userId);

        const candidateIds = candidates.map((m) => m._id);

        const preferredMerchantIds = topMerchantIds
            .map((id) => new Types.ObjectId(id))
            .filter((id) => candidateIds.some((c) => String(c) === String(id)));

        const pool = (preferredMerchantIds.length ? preferredMerchantIds : candidateIds)
            .slice(0, 80); // pool rộng chút cho dễ có món sale

        if (!pool.length) {
            return { key: 'food_for_you', title: 'Food for you', items: [] };
        }

        //  chỉ lấy món SALE + mỗi merchant 1 món (best seller)
        const products = await this.productModel.aggregate([
            {
                $match: {
                    merchant_id: { $in: pool },
                    is_active: true,
                    is_available: true,
                    deleted_at: null,
                    sale_price: { $gt: 0 },
                    $expr: { $lt: ['$sale_price', '$base_price'] }, // sale < base
                },
            },
            // sort để "best seller" đứng đầu mỗi merchant
            { $sort: { total_sold: -1, average_rating: -1, updated_at: -1 } },

            // group by merchant -> lấy first (top 1)
            { $group: { _id: '$merchant_id', p: { $first: '$$ROOT' } } },

            // giới hạn theo section
            { $limit: input.limitPerSection },

            { $replaceRoot: { newRoot: '$p' } },

            {
                $project: {
                    merchant_id: 1,
                    name: 1,
                    base_price: 1,
                    sale_price: 1,
                    average_rating: 1,
                    total_sold: 1,
                    images: 1,
                },
            },
        ]);

        const merchantMap = new Map<string, MerchantCandidate>();
        for (const m of candidates) merchantMap.set(String(m._id), m);

        return {
            key: 'food_for_you',
            title: 'Food for you',
            items: products.map((p: any) => {
                const m = merchantMap.get(String(p.merchant_id));
                const imageUrls = this.pickImageUrls(p);

                return {
                    type: 'product',
                    product_id: String(p._id),
                    product_name: p.name,

                    //  NEW: list ảnh
                    image_urls: imageUrls,
                    //  keep old field (compat FE)
                    image_url: imageUrls[0] ?? null,

                    base_price: p.base_price,
                    sale_price: p.sale_price,
                    rating: p.average_rating ?? 0,

                    merchant: m
                        ? {
                            merchant_id: String(m._id),
                            name: m.name,
                            category: m.category,
                            distance_km: Number(m.distance_km?.toFixed(2)),
                            logo_url: m.logo_url,
                        }
                        : { merchant_id: String(p.merchant_id) },
                };
            }),
        };
    }

    private async buildPeopleLove(input: GetHomeFeedInput, candidates: MerchantCandidate[]) {
        const cell = this.geoCell(input.lat, input.lng);
        const bucket = this.timeBucket(5);
        const cacheKey = `feed:people_love:${cell}:${bucket}:d${input.distanceKm}:l${input.limitPerSection}`;

        const cached = await this.cache.get<any>(cacheKey);
        if (cached) return cached;

        const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const merchantIds = candidates.map((m) => m._id);

        // trending = số order 7 ngày gần nhất (lọc paid + không cancelled)
        const rows = await this.orderModel.aggregate([
            {
                $match: {
                    created_at: { $gte: since },
                    order_type: input.orderType,
                    merchant_id: { $in: merchantIds },
                    payment_status: PaymentStatus.PAID,
                    status: { $ne: OrderStatus.CANCELLED },
                },
            },
            { $group: { _id: '$merchant_id', orders_7d: { $sum: 1 } } },
            { $sort: { orders_7d: -1 } },
            { $limit: 100 },
        ]);

        const mapCount = new Map<string, number>();
        rows.forEach((r: any) => mapCount.set(String(r._id), r.orders_7d));

        const list = [...candidates]
            .map((m) => ({
                ...m,
                orders_7d: mapCount.get(String(m._id)) ?? 0,
                score: (mapCount.get(String(m._id)) ?? 0) * 1.0 + (m.average_rating ?? 0) * 5 - (m.distance_km ?? 0) * 0.5,
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, input.limitPerSection)
            .map((m) => ({
                type: 'merchant',
                merchant_id: String(m._id),
                name: m.name,
                category: m.category,
                logo_url: m.logo_url,
                cover_image_url: m.cover_image_url,
                rating: m.average_rating ?? 0,
                distance_km: Number(m.distance_km.toFixed(2)),
                orders_7d: m.orders_7d,
            }));

        const payload = { key: 'people_love', title: 'People love food from', items: list };

        // cache 5 phút
        await this.cache.set(cacheKey, payload, 5 * 60);
        return payload;
    }

    private async buildRestaurantsYouMayLike(input: GetHomeFeedInput, candidates: MerchantCandidate[]) {
        const cell = this.geoCell(input.lat, input.lng);
        const bucket = this.timeBucket(5);
        const cacheKeyBase = `feed:restaurants_like:${cell}:${bucket}:d${input.distanceKm}:l${input.limitPerSection}`;

        // NOTE: section này vẫn hơi personalized (vì 80/20), nhưng MVP có thể cache theo cell rồi filter nhẹ.
        // Nếu muốn chuẩn hơn: tách cache guest vs user.
        const cacheKey = input.userId ? `${cacheKeyBase}:u` : `${cacheKeyBase}:g`;

        const cached = await this.cache.get<any>(cacheKey);
        if (cached) return cached;

        const { topCategories, topMerchantIds } = await this.getUserSignals(input.userId);

        const interactedSet = new Set(topMerchantIds);
        const sameTaste = candidates.filter((m) => m.category && topCategories.has(m.category));
        const notInteracted = candidates.filter((m) => !interactedSet.has(String(m._id)));

        const pick80 = (sameTaste.length ? sameTaste : candidates)
            .filter((m) => !interactedSet.has(String(m._id)))
            .sort((a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0))
            .slice(0, Math.ceil(input.limitPerSection * 0.8));

        const pick20 = notInteracted
            .sort((a, b) => (b.average_rating ?? 0) - (a.average_rating ?? 0))
            .slice(0, Math.max(1, Math.floor(input.limitPerSection * 0.2)));

        // merge + unique
        const merged: MerchantCandidate[] = [];
        const seen = new Set<string>();
        for (const m of [...pick80, ...pick20]) {
            const id = String(m._id);
            if (seen.has(id)) continue;
            seen.add(id);
            merged.push(m);
            if (merged.length >= input.limitPerSection) break;
        }

        const payload = {
            key: 'restaurants_you_may_like',
            title: 'Restaurants you may like',
            items: merged.map((m) => ({
                type: 'merchant',
                merchant_id: String(m._id),
                name: m.name,
                category: m.category,
                logo_url: m.logo_url,
                cover_image_url: m.cover_image_url,
                rating: m.average_rating ?? 0,
                distance_km: Number(m.distance_km.toFixed(2)),
            })),
        };

        await this.cache.set(cacheKey, payload, 5 * 60 * 1000);
        return payload;
    }

    async getHomeFeed(input: GetHomeFeedInput) {
        const geoCell = this.geoCell(input.lat, input.lng);
        const shownAt = new Date();

        const candidates = await this.getCandidateMerchants(input);

        const [a, b, c] = await Promise.all([
            this.buildFoodForYou(input, candidates),
            this.buildPeopleLove(input, candidates),
            this.buildRestaurantsYouMayLike(input, candidates),
        ]);

        const sections = [a, b, c];

        //  chỉ log khi có user
        if (input.userId) {
            const requestId = `fd_${Date.now()}_${Math.random().toString(16).slice(2)}`;

            // bạn có thể await (đơn giản) hoặc fire-and-forget
            void this.logImpressions({
                userId: input.userId,
                requestId,
                sessionId: null,
                geoCell,
                shownAt,
                sections,
            }).catch(() => undefined);

            return {
                request_id: requestId,
                geo_cell: geoCell,
                generated_at: shownAt,
                meta: {
                    lat: input.lat,
                    lng: input.lng,
                    distance_km: input.distanceKm,
                    order_type: input.orderType,
                },
                sections,
            };
        }

        // guest (không log)
        return {
            request_id: null,
            geo_cell: geoCell,
            generated_at: shownAt,
            meta: {
                lat: input.lat,
                lng: input.lng,
                distance_km: input.distanceKm,
                order_type: input.orderType,
            },
            sections,
        };
    }
}