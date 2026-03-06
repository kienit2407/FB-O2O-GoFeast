
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { MerchantFavorite, MerchantFavoriteDocument } from '../schemas/merchant-favorite.schema';
import { Merchant, MerchantDocument } from '../../merchants/schemas/merchant.schema';
import { Promotion, PromotionApplyLevel, PromotionCreatedByType, PromotionType, Voucher } from 'src/modules/promotions/schemas';

@Injectable()
export class MerchantFavoritesService {
    constructor(
        @InjectModel(MerchantFavorite.name) private favModel: Model<MerchantFavoriteDocument>,
        @InjectModel(Merchant.name) private merchantModel: Model<MerchantDocument>,
        @InjectModel(Promotion.name) private promoModel: Model<any>,
        @InjectModel(Voucher.name) private voucherModel: Model<any>,
    ) { }

    private oid(id: string, name = 'id') {
        if (!Types.ObjectId.isValid(id)) throw new BadRequestException(`Invalid ${name}`);
        return new Types.ObjectId(id);
    }

    async isFavorited(userId: string, merchantId: string): Promise<boolean> {
        const doc = await this.favModel
            .findOne({
                user_id: this.oid(userId, 'userId'),
                merchant_id: this.oid(merchantId, 'merchantId'),
                deleted_at: null,
            })
            .select({ _id: 1 })
            .lean();
        return !!doc;
    }

    async favorite(userId: string, merchantId: string) {
        const uid = this.oid(userId, 'userId');
        const mid = this.oid(merchantId, 'merchantId');

        // idempotent: nếu đã tồn tại thì restore deleted_at=null
        const existing = await this.favModel.findOne({ user_id: uid, merchant_id: mid });
        if (existing) {
            if (existing.deleted_at) {
                existing.deleted_at = null;
                await existing.save();
            }
            return { ok: true, is_favorited: true };
        }

        await this.favModel.create({ user_id: uid, merchant_id: mid, deleted_at: null });
        return { ok: true, is_favorited: true };
    }

    async unfavorite(userId: string, merchantId: string) {
        const uid = this.oid(userId, 'userId');
        const mid = this.oid(merchantId, 'merchantId');

        const doc = await this.favModel.findOne({ user_id: uid, merchant_id: mid, deleted_at: null });
        if (!doc) return { ok: true, is_favorited: false }; // idempotent

        doc.deleted_at = new Date();
        await doc.save();
        return { ok: true, is_favorited: false };
    }

    async listMyFavorites(
        userId: string,
        opts?: { limit?: number; cursor?: string; lat?: number | null; lng?: number | null },
    ) {
        const uid = this.oid(userId, 'userId');
        const limit = Math.min(Math.max(Number(opts?.limit ?? 10), 1), 50);

        const q: any = { user_id: uid, deleted_at: null };
        if (opts?.cursor) {
            const d = new Date(opts.cursor);
            if (!Number.isNaN(d.getTime())) q.created_at = { $lt: d };
        }

        const rows = await this.favModel.find(q).sort({ created_at: -1 }).limit(limit + 1).lean();

        const hasMore = rows.length > limit;
        const slice = hasMore ? rows.slice(0, limit) : rows;

        const merchantIds = slice.map((x) => x.merchant_id).filter(Boolean);

        // ===== merchants with distance_km (if lat/lng provided) =====
        let merchants: any[] = [];
        if (opts?.lat != null && opts?.lng != null) {
            merchants = await this.merchantModel.aggregate([
                {
                    $geoNear: {
                        near: { type: 'Point', coordinates: [Number(opts.lng), Number(opts.lat)] },
                        key: 'location',
                        spherical: true,
                        distanceField: 'distance_m',
                        query: { _id: { $in: merchantIds }, deleted_at: null, location: { $ne: null } },
                    },
                },
                { $addFields: { distance_km: { $divide: ['$distance_m', 1000] } } },
                {
                    $project: {
                        name: 1,
                        logo_url: 1,
                        cover_image_url: 1,
                        average_rating: 1,
                        total_reviews: 1,
                        is_accepting_orders: 1,
                        address: 1,
                        category: 1,
                        average_prep_time_min: 1,
                        distance_km: 1,
                    },
                },
            ]);
        } else {
            merchants = await this.merchantModel
                .find({ _id: { $in: merchantIds }, deleted_at: null })
                .select({
                    name: 1,
                    logo_url: 1,
                    cover_image_url: 1,
                    average_rating: 1,
                    total_reviews: 1,
                    is_accepting_orders: 1,
                    address: 1,
                    category: 1,
                    average_prep_time_min: 1,
                })
                .lean();
        }

        const merchantMap = new Map<string, any>(merchants.map((m) => [String(m._id), m]));

        // ===== badges (ưu đãi) =====
        const badgesMap = await this._buildBadgesForMerchants(merchantIds);

        const items = slice
            .map((f: any) => {
                const m = merchantMap.get(String(f.merchant_id));
                if (!m) return null;

                const distanceKm = m.distance_km != null ? Number(m.distance_km) : null;

                // eta: fallback đơn giản theo distance + prep
                let etaMin: number | null = null;
                if (distanceKm != null) {
                    const prep = Number(m.average_prep_time_min ?? 15);
                    const travel = Math.max(6, Math.ceil(distanceKm * 4 + 8));
                    etaMin = prep + travel + 2;
                }

                return {
                    merchant: {
                        id: String(m._id),
                        name: m.name,
                        logo_url: m.logo_url ?? null,
                        cover_image_url: m.cover_image_url ?? null,
                        rating: Number(m.average_rating ?? 0),
                        reviews: Number(m.total_reviews ?? 0),
                        is_accepting_orders: !!m.is_accepting_orders,
                        address: m.address ?? null,
                        category: m.category ?? null,

                        // ✅ NEW
                        distance_km: distanceKm != null ? Number(distanceKm.toFixed(1)) : null,
                        eta_min: etaMin,
                        badges: badgesMap.get(String(m._id)) ?? [],
                    },
                    favorited_at: f.created_at,
                };
            })
            .filter(Boolean);

        const nextCursor = hasMore ? slice[slice.length - 1]?.created_at?.toISOString?.() ?? null : null;
        return { items, nextCursor };
    }
    private _fmtVnd(v: number) {
        const n = Math.round(Number(v || 0));
        // 16.000đ (giống VN)
        return `${new Intl.NumberFormat('vi-VN').format(n)}đ`;
    }

    private async _buildBadgesForMerchants(merchantIds: Types.ObjectId[]) {
        const now = new Date();
        const map = new Map<string, Array<{ kind: string; text: string }>>();

        // 1) Merchant promotions only
        const promos = await this.promoModel
            .find({
                deleted_at: null,
                is_active: true,
                created_by_type: PromotionCreatedByType.MERCHANT, // ✅ chỉ merchant
                merchant_id: { $in: merchantIds },                // ✅ chỉ merchant trong list
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
            })
            .select({ merchant_id: 1, apply_level: 1 })
            .lean();

        for (const p of promos as any[]) {
            const mid = String(p.merchant_id);
            if (!map.has(mid)) map.set(mid, []);
            const arr = map.get(mid)!;

            const apply = String(p.apply_level ?? '');
            if (apply === PromotionApplyLevel.SHIPPING) {
                if (!arr.some((x) => x.kind === 'shipping')) {
                    arr.push({ kind: 'shipping', text: 'Giảm phí giao hàng' });
                }
            } else {
                if (!arr.some((x) => x.kind === 'promo')) {
                    arr.push({ kind: 'promo', text: 'Giảm món' });
                }
            }
        }

        // 2) Merchant vouchers only (join promo để lấy type/discount_value)
        const vrows = await this.voucherModel.aggregate([
            {
                $match: {
                    is_active: true,
                    merchant_id: { $in: merchantIds }, // ✅ chỉ voucher của merchant
                    $and: [
                        { $or: [{ start_date: { $exists: false } }, { start_date: null }, { start_date: { $lte: now } }] },
                        { $or: [{ end_date: { $exists: false } }, { end_date: null }, { end_date: { $gte: now } }] },
                    ],
                },
            },
            { $lookup: { from: 'promotions', localField: 'promotion_id', foreignField: '_id', as: 'promo' } },
            { $unwind: '$promo' },
            {
                $match: {
                    'promo.deleted_at': null,
                    'promo.is_active': true,
                    'promo.created_by_type': PromotionCreatedByType.MERCHANT, // ✅ chỉ promo merchant
                    'promo.merchant_id': { $in: merchantIds },               // ✅ đúng merchant
                },
            },
            {
                $project: {
                    merchant_id: 1,
                    type: '$promo.type',
                    discount_value: '$promo.discount_value',
                },
            },
        ]);

        for (const r of vrows as any[]) {
            const mid = String(r.merchant_id);
            if (!map.has(mid)) map.set(mid, []);
            const arr = map.get(mid)!;

            const type = String(r.type ?? '');
            const dv = Number(r.discount_value ?? 0);
            if (dv <= 0) continue;

            // chỉ 1 badge voucher/merchant
            if (arr.some((x) => x.kind === 'voucher')) continue;

            if (type === PromotionType.PERCENTAGE) {
                arr.push({ kind: 'voucher', text: `Mã giảm ${dv.toFixed(0)}%` });
            } else {
                arr.push({ kind: 'voucher', text: `Mã giảm ${this._fmtVnd(dv)}` });
            }
        }

        // limit tối đa 3 badge giống UI
        for (const [k, arr] of map.entries()) {
            map.set(k, arr.slice(0, 3));
        }

        return map;
    }
}