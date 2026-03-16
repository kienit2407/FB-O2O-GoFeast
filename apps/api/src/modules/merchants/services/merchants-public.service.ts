// merchants/services/merchants-public.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Merchant, MerchantApprovalStatus } from '../schemas/merchant.schema';
import { Category } from '../schemas/category.schema';
import { Product } from '../schemas/product.schema';
import { ProductOption } from '../schemas/product-option.schema';
import { Topping } from '../schemas/topping.schema';

import { Promotion, PromotionApplyLevel, PromotionCreatedByType, PromotionType } from '../../promotions/schemas/promotion.schema';

import { MerchantFavoritesService } from '../../favorites/services/merchant-favorites.service'; // sửa path
import { BenefitsUsageService } from '../../benefits/services/benefits-usage.service'; // sửa path
import { GeoService } from 'src/modules/geo/services/geo.service';
import { Voucher } from 'src/modules/promotions/schemas';
import { CartService } from 'src/modules/carts/services/cart.service';
import { DeliveryRouteResolverService } from 'src/modules/geo/services/delivery-route-resolver.service';

type Input = {
    merchantId: string;
    lat: number;
    lng: number;
    userId: string | null;
};
type WeeklyHour = {
    day: number;
    label: string;
    is_closed: boolean;
    open_time: string | null;
    close_time: string | null;
};

const TZ = 'Asia/Ho_Chi_Minh';
const CLOSING_SOON_MIN = 30;

function normalizeImages(images: any[]): string[] {
    const arr = Array.isArray(images) ? images.slice() : [];
    arr.sort((a, b) => (a?.position ?? 0) - (b?.position ?? 0));
    return arr.map((x) => x?.url).filter(Boolean);
}

function dayLabel(day: number) {
    const map: Record<number, string> = {
        1: 'Thứ 2',
        2: 'Thứ 3',
        3: 'Thứ 4',
        4: 'Thứ 5',
        5: 'Thứ 6',
        6: 'Thứ 7',
        7: 'Chủ nhật',
    };
    return map[day] ?? `Day ${day}`;
}

function parseHm(s?: string | null): number | null {
    if (!s) return null;
    const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
    if (!m) return null;
    const hh = Number(m[1]);
    const mm = Number(m[2]);
    if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
    return hh * 60 + mm;
}

function nowInTz(tz: string) {
    // trick phổ biến: tạo Date “theo timezone”
    return new Date(new Date().toLocaleString('en-US', { timeZone: tz }));
}

function toDay1to7(d: Date) {
    // JS: 0=Sun..6=Sat  => 7=Sun, 1=Mon..6=Sat
    const js = d.getDay();
    return js === 0 ? 7 : js;
}

function buildWeeklyHours(bh: any[]): WeeklyHour[] {
    const byDay = new Map<number, any>();
    (Array.isArray(bh) ? bh : []).forEach((x) => {
        if (!x) return;
        const d = Number(x.day);
        if (d >= 1 && d <= 7) byDay.set(d, x);
    });

    const weekly: WeeklyHour[] = []; // ✅ FIX: không còn never[]
    for (let d = 1; d <= 7; d++) {
        const x = byDay.get(d);
        weekly.push({
            day: d,
            label: dayLabel(d),
            is_closed: x ? !!x.is_closed : true,
            open_time: (x?.open_time ?? null) as string | null,
            close_time: (x?.close_time ?? null) as string | null,
        });
    }

    return weekly;
}

function computeBusinessNow(weeklyHours: any[]) {
    const now = nowInTz(TZ);
    const day = toDay1to7(now);
    const nowMin = now.getHours() * 60 + now.getMinutes();

    const today = weeklyHours.find((x) => Number(x.day) === day) ?? null;

    const openMin = parseHm(today?.open_time);
    const closeMin = parseHm(today?.close_time);
    const isClosed = !today || today.is_closed || openMin == null || closeMin == null;

    if (isClosed) {
        return {
            is_open: false,
            status: 'closed' as const,
            close_in_min: null as number | null,
            open_time: today?.open_time ?? null,
            close_time: today?.close_time ?? null,
            day,
        };
    }

    const isOpen = nowMin >= openMin && nowMin < closeMin;
    if (!isOpen) {
        return {
            is_open: false,
            status: 'closed' as const,
            close_in_min: null,
            open_time: today.open_time,
            close_time: today.close_time,
            day,
        };
    }

    const closeIn = Math.max(0, closeMin - nowMin);
    const status = closeIn <= CLOSING_SOON_MIN ? ('closing_soon' as const) : ('open' as const);

    return {
        is_open: true,
        status,
        close_in_min: closeIn,
        open_time: today.open_time,
        close_time: today.close_time,
        day,
    };
}

@Injectable()
export class MerchantsPublicService {
    constructor(
        @InjectModel(Merchant.name) private readonly merchantModel: Model<Merchant>,
        @InjectModel(Category.name) private readonly categoryModel: Model<Category>,
        @InjectModel(Product.name) private readonly productModel: Model<Product>,
        @InjectModel(Voucher.name) private readonly voucherModel: Model<Voucher>,
        @InjectModel(ProductOption.name) private readonly optionModel: Model<ProductOption>,
        @InjectModel(Topping.name) private readonly toppingModel: Model<Topping>,
        @InjectModel(Promotion.name) private readonly promoModel: Model<Promotion>,

        private readonly deliveryRouteResolver: DeliveryRouteResolverService,
        private readonly favorites: MerchantFavoritesService,
        private readonly benefitsUsage: BenefitsUsageService,
        private readonly cartService: CartService,
    ) { }

    private oid(id: string, name = 'id') {
        if (!Types.ObjectId.isValid(id)) throw new BadRequestException(`Invalid ${name}`);
        return new Types.ObjectId(id);
    }
    private async getActiveVouchers(params: { merchantId: Types.ObjectId; userId: string | null }) {
        const now = new Date();

        // 1) Lấy voucher active của platform + merchant
        // 2) Join qua promotion để lấy discount_value, min_order_amount, type, apply_level...
        const rows = await this.voucherModel.aggregate([
            {
                $match: {
                    is_active: true,
                    $or: [
                        { merchant_id: null },                 // platform voucher
                        { merchant_id: params.merchantId },    // merchant voucher
                    ],
                    // nếu voucher có khung giờ riêng thì check
                    $and: [
                        {
                            $or: [
                                { start_date: { $exists: false } },
                                { start_date: null },
                                { start_date: { $lte: now } },
                            ],
                        },
                        {
                            $or: [
                                { end_date: { $exists: false } },
                                { end_date: null },
                                { end_date: { $gte: now } },
                            ],
                        },
                    ],
                },
            },
            {
                $lookup: {
                    from: 'promotions',
                    localField: 'promotion_id',
                    foreignField: '_id',
                    as: 'promo',
                },
            },
            { $unwind: '$promo' },

            // lọc promotion active + còn hạn theo conditions (giống promotions)
            {
                $match: {
                    'promo.deleted_at': null,
                    'promo.is_active': true,
                    $and: [
                        {
                            $or: [
                                { 'promo.conditions.valid_from': { $exists: false } },
                                { 'promo.conditions.valid_from': null },
                                { 'promo.conditions.valid_from': { $lte: now } },
                            ],
                        },
                        {
                            $or: [
                                { 'promo.conditions.valid_to': { $exists: false } },
                                { 'promo.conditions.valid_to': null },
                                { 'promo.conditions.valid_to': { $gte: now } },
                            ],
                        },
                    ],
                },
            },

            // lọc total usage limit (nếu có)
            {
                $match: {
                    $expr: {
                        $or: [
                            { $lte: ['$total_usage_limit', 0] },
                            { $lt: ['$current_usage', '$total_usage_limit'] },
                        ],
                    },
                },
            },

            { $sort: { created_at: -1 } },
            {
                $project: {
                    _id: 1,
                    code: 1,
                    merchant_id: 1,
                    promotion_id: 1,
                    total_usage_limit: 1,
                    per_user_limit: 1,
                    current_usage: 1,
                    start_date: 1,
                    end_date: 1,

                    promo: {
                        _id: '$promo._id',
                        created_by_type: '$promo.created_by_type',
                        merchant_id: '$promo.merchant_id',
                        apply_level: '$promo.apply_level',
                        type: '$promo.type',
                        discount_value: '$promo.discount_value',
                        max_discount: '$promo.max_discount',
                        min_order_amount: '$promo.min_order_amount',
                        conditions: '$promo.conditions',
                    },
                },
            },
        ]);

        const items = rows.map((r: any) => ({
            id: String(r._id),
            code: String(r.code ?? ''),
            promotion_id: String(r.promotion_id),

            // ai tạo (lấy từ promotion)
            created_by_type: r.promo.created_by_type,
            merchant_id: r.merchant_id ? String(r.merchant_id) : null,

            apply_level: r.promo.apply_level,
            type: r.promo.type,
            discount_value: Number(r.promo.discount_value ?? 0),
            max_discount: Number(r.promo.max_discount ?? 0),
            min_order_amount: Number(r.promo.min_order_amount ?? 0),

            total_usage_limit: Number(r.total_usage_limit ?? 0),
            per_user_limit: Number(r.per_user_limit ?? 0),
            current_usage: Number(r.current_usage ?? 0),

            // thời gian: ưu tiên promotion.conditions (đang dùng cho auto_promotions)
            valid_from: r.promo?.conditions?.valid_from ?? null,
            valid_to: r.promo?.conditions?.valid_to ?? null,

            // nếu bạn muốn FE hiển thị khung giờ riêng voucher thì có thể trả thêm:
            start_date: r.start_date ?? null,
            end_date: r.end_date ?? null,
        }));

        // ===== attach trạng thái user (saved/used) + lọc per_user_limit=1 =====
        if (params.userId && items.length) {
            const ids = items.map((x) => x.id);
            const stateMap = await this.benefitsUsage.getVoucherStates(params.userId, ids);

            const merged = items.map((x) => {
                const st = stateMap.get(x.id);
                return {
                    ...x,
                    is_saved: st?.is_saved ?? false,
                    is_used: st?.is_used ?? false,
                    used_at: st?.used_at ?? null,
                };
            });

            // nếu per_user_limit = 1 và user đã dùng => không trả
            return merged.filter((x) => x.per_user_limit !== 1 || !x.is_used);
        }

        return items;
    }
    private async getMerchantWithDistanceAndEta(merchantId: string, lat: number, lng: number) {
        const mid = this.oid(merchantId, 'merchantId');

        const rows = await this.merchantModel.aggregate([
            {
                $geoNear: {
                    near: { type: 'Point', coordinates: [lng, lat] },
                    key: 'location',
                    spherical: true,
                    distanceField: 'distance_m',
                    query: {
                        _id: mid,
                        deleted_at: null,
                        approval_status: MerchantApprovalStatus.APPROVED,
                        location: { $ne: null },
                    },
                },
            },
            { $addFields: { distance_km: { $divide: ['$distance_m', 1000] } } },
            {
                $project: {
                    name: 1,
                    logo_url: 1,
                    cover_image_url: 1,
                    address: 1,
                    category: 1,
                    average_rating: 1,
                    total_reviews: 1,
                    is_accepting_orders: 1,
                    average_prep_time_min: 1,
                    delivery_radius_km: 1,
                    distance_km: 1,
                    location: 1,
                    business_hours: 1,
                },
            },
        ]);

        const m = rows?.[0];
        if (!m) throw new NotFoundException('Merchant not found');

        const coords = m.location?.coordinates;
        if (!Array.isArray(coords) || coords.length !== 2) {
            throw new BadRequestException('Merchant location is missing');
        }

        const prepMin = Number(m.average_prep_time_min ?? 15);
        const radiusKm = Number(m.delivery_radius_km ?? 0);

        const routeMeta = await this.deliveryRouteResolver.resolve({
            origin: { lat, lng },
            destination: {
                lat: Number(coords[1]),
                lng: Number(coords[0]),
            },
            prepMin,
            radiusKm,
        });

        return {
            merchant: m,
            distanceKm: routeMeta.distanceKm,
            canDeliver: routeMeta.canDeliver,
            etaMin: routeMeta.etaMin,
        };
    }

    //  Promotions trả object + filter per-user
    private async getActiveAutoPromotions(params: { merchantId: Types.ObjectId; userId: string | null }) {
        const now = new Date();

        const q: any = {
            deleted_at: null,
            is_active: true,
            $and: [
                {
                    $or: [
                        { 'conditions.valid_from': { $exists: false } },
                        { 'conditions.valid_from': null },
                        { 'conditions.valid_from': { $lte: now } },
                    ],
                },
                {
                    $or: [
                        { 'conditions.valid_to': { $exists: false } },
                        { 'conditions.valid_to': null },
                        { 'conditions.valid_to': { $gte: now } },
                    ],
                },
            ],
            $or: [
                { created_by_type: PromotionCreatedByType.PLATFORM, merchant_id: null },
                { created_by_type: PromotionCreatedByType.MERCHANT, merchant_id: params.merchantId },
            ],
        };

        const promos = await this.promoModel.find(q).sort({ created_at: -1 }).lean();

        const items = promos.map((p: any) => {
            const perUserLimit =
                Number(p.per_user_limit ?? p.conditions?.per_user_limit ?? p.usage_limit_per_user ?? 0) || 0;

            return {
                id: String(p._id),
                created_by_type: p.created_by_type,
                merchant_id: p.merchant_id ? String(p.merchant_id) : null,
                apply_level: p.apply_level,
                type: p.type,
                discount_value: Number(p.discount_value ?? 0),
                max_discount: Number(p.max_discount ?? 0),
                min_order_amount: Number(p.min_order_amount ?? p.conditions?.min_order_amount ?? 0),
                per_user_limit: perUserLimit,
                valid_from: p.conditions?.valid_from ?? null,
                valid_to: p.conditions?.valid_to ?? null,
            };
        });

        // lọc “per user 1 lần” nếu userId có
        if (params.userId) {
            const oneTimeIds = items.filter((x) => x.per_user_limit === 1).map((x) => x.id);
            if (oneTimeIds.length) {
                const usedMap = await this.benefitsUsage.getPromotionUsageCounts(params.userId, oneTimeIds);
                return items.filter((x) => x.per_user_limit !== 1 || (usedMap.get(x.id) ?? 0) < 1);
            }
        }

        return items;
    }

    //  NEW: public product config (options + topping theo product)
    async getProductConfig(params: { merchantId: string; productId: string }) {
        const mid = this.oid(params.merchantId, 'merchantId');
        const pid = this.oid(params.productId, 'productId');

        const product: any = await this.productModel
            .findOne({ _id: pid, merchant_id: mid, deleted_at: null, is_active: true })
            .lean();

        if (!product) throw new NotFoundException('Product not found');

        const optionGroups: any[] = await this.optionModel
            .find({ product_id: pid, deleted_at: null })
            .sort({ sort_order: 1, created_at: 1 })
            .lean();

        const options = optionGroups.map((g: any) => ({
            id: String(g._id),
            name: g.name,
            type: g.type,
            is_required: !!g.is_required,
            min_select: Number(g.min_select ?? 1),
            max_select: Number(g.max_select ?? 1),
            sort_order: Number(g.sort_order ?? 0),
            choices: (Array.isArray(g.choices) ? g.choices : []).map((c: any) => ({
                id: String(c._id),
                name: c.name,
                price_modifier: Number(c.price_modifier ?? 0),
                is_default: !!c.is_default,
                is_available: c.is_available !== false,
            })),
        }));

        const toppingIds = (Array.isArray(product.topping_ids) ? product.topping_ids : [])
            .map((x: any) => String(x))
            .filter(Types.ObjectId.isValid)
            .map((x: string) => new Types.ObjectId(x));

        const toppings = toppingIds.length
            ? await this.toppingModel
                .find({
                    _id: { $in: toppingIds },
                    merchant_id: mid,
                    deleted_at: null,
                    is_active: true,
                })
                .sort({ sort_order: 1, created_at: 1 })
                .lean()
            : [];

        const priceBase = Number(product.base_price ?? 0);
        const priceSale = Number(product.sale_price ?? 0);
        const price = priceSale > 0 && priceSale < priceBase ? priceSale : priceBase;

        return {
            product: {
                id: String(product._id),
                name: product.name,
                price,
                base_price: priceSale > 0 && priceSale < priceBase ? priceBase : null,
                is_available: product.is_available !== false,
                has_options: options.length > 0,
            },
            options,
            toppings: toppings.map((t: any) => ({
                id: String(t._id),
                name: t.name,
                description: t.description ?? null,
                price: Number(t.price ?? 0),
                is_available: t.is_available !== false,
                max_quantity: Number(t.max_quantity ?? 1),
            })),
        };
    }

    async getDetail(input: Input) {
        const { merchantId, lat, lng, userId } = input;

        const { merchant, distanceKm, canDeliver, etaMin } =
            await this.getMerchantWithDistanceAndEta(merchantId, lat, lng);

        const mid = new Types.ObjectId(merchantId);
        // const cartSummary = await this.cartService.getCartSummaryForMerchantDetail({
        //     userId,
        //     merchantId,
        // });
        // business hours (weekly + now)
        const weeklyHours = buildWeeklyHours(merchant.business_hours ?? []);
        const businessNow = computeBusinessNow(weeklyHours);

        // categories active
        const cats = await this.categoryModel
            .find({ merchant_id: mid, deleted_at: null, is_active: true })
            .sort({ sort_order: 1, created_at: 1 })
            .lean();

        //  products: chỉ lọc is_active=true, KHÔNG lọc is_available (để UI làm mờ)
        const prods: any[] = await this.productModel
            .find({
                merchant_id: mid,
                deleted_at: null,
                is_active: true,
            })
            .sort({ sort_order: 1, created_at: -1 })
            .lean();

        const prodIds = prods.map((p: any) => p._id);

        // option count
        const optCounts = await this.optionModel
            .aggregate([
                { $match: { product_id: { $in: prodIds }, deleted_at: null } },
                { $group: { _id: '$product_id', c: { $sum: 1 } } },
            ])
            .then((rows) => {
                const m = new Map<string, number>();
                rows.forEach((r: any) => m.set(String(r._id), Number(r.c ?? 0)));
                return m;
            });

        const toProductItem = (p: any) => {
            const imageUrls = normalizeImages(p.images);
            const base = Number(p.base_price ?? 0);
            const sale = Number(p.sale_price ?? 0);
            const price = sale > 0 && sale < base ? sale : base;

            return {
                id: String(p._id),
                name: p.name,
                description: p.description ?? '',
                image_urls: imageUrls,
                price,
                base_price: sale > 0 && sale < base ? base : null,

                sold: Number(p.total_sold ?? 0),

                //  quan trọng cho UI
                is_available: p.is_available !== false,

                //  từ cache Product (do ReviewsService.recalcProductStats() set)
                rating: Number(p.average_rating ?? 0),
                reviews: Number(p.total_reviews ?? 0),

                has_options: (optCounts.get(String(p._id)) ?? 0) > 0,
            };
        };

        // on_sale section
        const onSale = prods
            .filter((p: any) => Number(p.sale_price ?? 0) > 0 && Number(p.sale_price) < Number(p.base_price ?? 0))
            .sort((a: any, b: any) => Number(b.total_sold ?? 0) - Number(a.total_sold ?? 0));

        //  popular: chỉ lấy sold >= 10, max 10, nếu empty thì không trả
        const popular = prods
            .filter((p: any) => Number(p.total_sold ?? 0) >= 10)
            .slice()
            .sort((a: any, b: any) => Number(b.total_sold ?? 0) - Number(a.total_sold ?? 0))
            .slice(0, 10)
            .map(toProductItem);

        // group by category
        const byCat = new Map<string, any[]>();
        for (const p of prods) {
            const k = String(p.category_id);
            if (!byCat.has(k)) byCat.set(k, []);
            byCat.get(k)!.push(p);
        }

        const sections: any[] = [];

        if (onSale.length) {
            sections.push({
                key: 'on_sale',
                title: 'Món Đang Giảm',
                items: onSale.map(toProductItem),
            });
        }

        for (const c of cats) {
            const items = (byCat.get(String((c as any)._id)) ?? []).map(toProductItem);
            if (!items.length) continue;
            sections.push({
                key: String((c as any)._id),
                title: (c as any).name,
                items,
            });
        }

        //  topping section (toàn quán)
        const toppings = await this.toppingModel
            .find({ merchant_id: mid, deleted_at: null, is_active: true })
            .sort({ sort_order: 1, created_at: 1 })
            .lean();

        if (toppings.length) {
            sections.push({
                key: 'toppings',
                title: 'Món Thêm',
                items: toppings.map((t: any) => ({
                    id: String(t._id),
                    name: t.name,
                    image_url: t.image_url ?? null,
                    description: t.description ?? null,
                    price: Number(t.price ?? 0),
                    is_available: t.is_available !== false,
                    max_quantity: Number(t.max_quantity ?? 1),
                })),
            });
        }

        const coverUrls = [merchant.cover_image_url].filter(Boolean);

        // viewer
        const isFavorited = userId ? await this.favorites.isFavorited(userId, merchantId) : false;

        // benefits (promotions now; vouchers later)
        const autoPromotions = await this.getActiveAutoPromotions({ merchantId: mid, userId });
        const vouchers = await this.getActiveVouchers({ merchantId: mid, userId });
        const data: any = {
            merchant: {
                id: merchantId,
                name: merchant.name,
                rating: Number(merchant.average_rating ?? 0),
                reviews: Number(merchant.total_reviews ?? 0),
                category: merchant.category ?? null,
                address: merchant.address ?? null,
                is_accepting_orders: !!merchant.is_accepting_orders,
                distance_km: Number(distanceKm.toFixed(2)),
                delivery_radius_km: Number(merchant.delivery_radius_km ?? 0),

                can_deliver: canDeliver,
                eta_min: etaMin,

                logo_url: merchant.logo_url,
                cover_urls: coverUrls,
            },

            business: {
                timezone: TZ,
                now: businessNow,
                weekly_hours: weeklyHours,
            },

            viewer: { is_favorited: isFavorited },

            benefits: {
                auto_promotions: autoPromotions,
                vouchers, //  bạn chưa có Voucher schema -> cắm sau
            },

            sections,
        };

        if (popular.length) data.popular = popular
        return data;
    }
}