import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { UserVoucher, UserVoucherDocument } from '../schemas/user-voucher.schema';
import {
    PromotionUsage,
    PromotionUsageDocument,
} from '../schemas/promotion-usage.schema';

import { Voucher, VoucherDocument } from 'src/modules/promotions/schemas/voucher.schema';
import {
    Promotion,
    PromotionDocument,
    PromotionCreatedByType,
} from 'src/modules/promotions/schemas/promotion.schema';
import { Merchant, MerchantDocument } from 'src/modules/merchants/schemas/merchant.schema';

@Injectable()
export class BenefitsUsageService {
    constructor(
        @InjectModel(UserVoucher.name)
        private userVoucherModel: Model<UserVoucherDocument>,

        @InjectModel(PromotionUsage.name)
        private promoUsageModel: Model<PromotionUsageDocument>,

        @InjectModel(Voucher.name)
        private voucherModel: Model<VoucherDocument>,

        @InjectModel(Promotion.name)
        private promotionModel: Model<PromotionDocument>,

        @InjectModel(Merchant.name)
        private merchantModel: Model<MerchantDocument>,
    ) { }

    private oid(id: string, name = 'id') {
        if (!Types.ObjectId.isValid(id)) {
            throw new BadRequestException(`Invalid ${name}`);
        }
        return new Types.ObjectId(id);
    }

    private now() {
        return new Date();
    }

    private isVoucherInWindow(voucher: any, now: Date) {
        const from = voucher?.start_date ? new Date(voucher.start_date) : null;
        const to = voucher?.end_date ? new Date(voucher.end_date) : null;

        if (from && now < from) return false;
        if (to && now > to) return false;
        return true;
    }

    private isPromotionInWindow(promo: any, now: Date) {
        const from = promo?.conditions?.valid_from
            ? new Date(promo.conditions.valid_from)
            : null;
        const to = promo?.conditions?.valid_to
            ? new Date(promo.conditions.valid_to)
            : null;

        if (from && now < from) return false;
        if (to && now > to) return false;
        return true;
    }

    async listSavedVouchers(userId: string, opts?: { limit?: number; cursor?: string }) {
        const uid = this.oid(userId, 'userId');
        const limit = Math.min(Math.max(Number(opts?.limit ?? 50), 1), 100);

        const q: any = {
            user_id: uid,
            deleted_at: null,
            is_saved: true,
        };

        if (opts?.cursor) {
            const d = new Date(opts.cursor);
            if (!Number.isNaN(d.getTime())) {
                q.saved_at = { $lt: d };
            }
        }

        const rows = await this.userVoucherModel
            .find(q)
            .sort({ saved_at: -1 })
            .limit(limit + 1)
            .lean();

        const hasMore = rows.length > limit;
        const slice = hasMore ? rows.slice(0, limit) : rows;

        const voucherIds = [
            ...new Set(slice.map((x: any) => String(x.voucher_id)).filter(Boolean)),
        ];

        if (!voucherIds.length) {
            return { items: [], nextCursor: null };
        }

        const voucherDocs: any[] = await this.voucherModel
            .find({
                _id: { $in: voucherIds.map((x) => new Types.ObjectId(x)) },
            })
            .lean();

        const now = this.now();

        const activeVouchers = voucherDocs.filter((v: any) => {
            if (!v?.is_active) return false;
            if (!this.isVoucherInWindow(v, now)) return false;

            if (
                Number(v.total_usage_limit ?? 0) > 0 &&
                Number(v.current_usage ?? 0) >= Number(v.total_usage_limit)
            ) {
                return false;
            }

            return true;
        });

        const voucherMap = new Map<string, any>();
        activeVouchers.forEach((v: any) => voucherMap.set(String(v._id), v));

        const promotionIds = [
            ...new Set(
                activeVouchers.map((x: any) => String(x.promotion_id)).filter(Boolean),
            ),
        ];

        const promoDocs: any[] = await this.promotionModel
            .find({
                _id: { $in: promotionIds.map((x) => new Types.ObjectId(x)) },
            })
            .lean();

        const activePromos = promoDocs.filter((p: any) => {
            if (!p?.is_active) return false;
            if (!this.isPromotionInWindow(p, now)) return false;

            if (
                Number(p.total_usage_limit ?? 0) > 0 &&
                Number(p.current_usage ?? 0) >= Number(p.total_usage_limit)
            ) {
                return false;
            }

            return true;
        });

        const promoMap = new Map<string, any>();
        activePromos.forEach((p: any) => promoMap.set(String(p._id), p));

        const merchantIds = [
            ...new Set(
                activePromos
                    .map((x: any) => (x.merchant_id ? String(x.merchant_id) : null))
                    .filter(Boolean),
            ),
        ];

        const merchants: any[] = merchantIds.length
            ? await this.merchantModel
                .find({
                    //  Thêm "as string" vào sau x
                    _id: { $in: merchantIds.map((x) => new Types.ObjectId(x as string)) },
                    deleted_at: null,
                })
                .select({ _id: 1, name: 1, logo_url: 1, address: 1 })
                .lean()
            : [];

        const merchantMap = new Map<string, any>();
        merchants.forEach((m: any) => merchantMap.set(String(m._id), m));

        const promoUsageRows: any[] = promotionIds.length
            ? await this.promoUsageModel
                .find({
                    user_id: uid,
                    promotion_id: {
                        $in: promotionIds.map((x) => new Types.ObjectId(x)),
                    },
                })
                .select({ promotion_id: 1, used_count: 1 })
                .lean()
            : [];

        const promoUsageMap = new Map<string, number>();
        promoUsageRows.forEach((r: any) => {
            promoUsageMap.set(String(r.promotion_id), Number(r.used_count ?? 0));
        });

        const items = slice
            .map((row: any) => {
                const voucher = voucherMap.get(String(row.voucher_id));
                if (!voucher) return null;

                const promo = promoMap.get(String(voucher.promotion_id));
                if (!promo) return null;

                const merchant = promo.merchant_id
                    ? merchantMap.get(String(promo.merchant_id))
                    : null;

                const voucherUsedCount = Number(row.used_count ?? 0);
                const promoUsedCount = Number(promoUsageMap.get(String(promo._id)) ?? 0);

                if (
                    Number(voucher.per_user_limit ?? 0) > 0 &&
                    voucherUsedCount >= Number(voucher.per_user_limit)
                ) {
                    return null;
                }

                if (
                    Number(promo.per_user_limit ?? 0) > 0 &&
                    promoUsedCount >= Number(promo.per_user_limit)
                ) {
                    return null;
                }

                return {
                    user_voucher_id: String(row._id),
                    voucher_id: String(voucher._id),
                    promotion_id: String(promo._id),
                    merchant_id: promo.merchant_id ? String(promo.merchant_id) : null,
                    merchant_name: merchant?.name ?? null,
                    merchant_logo_url: merchant?.logo_url ?? null,

                    voucher_code: voucher.code,
                    promotion_name: promo.name,
                    description: promo.description ?? '',
                    banner_url: promo.banner_admin_url ?? null,

                    sponsor:
                        promo.created_by_type === PromotionCreatedByType.PLATFORM
                            ? 'platform'
                            : 'merchant',

                    scope: promo.scope,
                    apply_level: promo.apply_level,
                    activation_type: promo.activation_type,
                    discount_type: promo.type,
                    discount_value: Number(promo.discount_value ?? 0),
                    max_discount: Number(promo.max_discount ?? 0),
                    min_order_amount: Number(promo.min_order_amount ?? 0),

                    valid_from: promo.conditions?.valid_from ?? null,
                    valid_to: promo.conditions?.valid_to ?? null,
                    voucher_start_date: voucher.start_date ?? null,
                    voucher_end_date: voucher.end_date ?? null,

                    total_usage_limit: Number(voucher.total_usage_limit ?? 0),
                    per_user_limit: Number(voucher.per_user_limit ?? 0),
                    current_usage: Number(voucher.current_usage ?? 0),

                    promotion_per_user_limit: Number(promo.per_user_limit ?? 0),
                    promotion_used_count: promoUsedCount,

                    used_count: voucherUsedCount,
                    is_saved: !!row.is_saved,
                    is_used: voucherUsedCount > 0,
                    saved_at: row.saved_at ?? row.created_at ?? null,
                    used_at: row.used_at ?? row.last_used_at ?? null,

                    remaining_user_uses:
                        Number(voucher.per_user_limit ?? 0) > 0
                            ? Math.max(0, Number(voucher.per_user_limit) - voucherUsedCount)
                            : null,
                };
            })
            .filter(Boolean);

        const nextCursor = hasMore
            ? slice[slice.length - 1]?.saved_at?.toISOString?.() ?? null
            : null;

        return { items, nextCursor };
    }

    async saveVoucher(userId: string, voucherId: string) {
        const uid = this.oid(userId, 'userId');
        const vid = this.oid(voucherId, 'voucherId');

        const voucher: any = await this.voucherModel.findById(vid).lean();
        if (!voucher || !voucher.is_active) {
            throw new BadRequestException('Voucher không tồn tại hoặc đã bị tắt');
        }

        const promo: any = await this.promotionModel.findById(voucher.promotion_id).lean();
        if (!promo || !promo.is_active) {
            throw new BadRequestException('Promotion không tồn tại hoặc đã bị tắt');
        }

        const now = this.now();
        if (!this.isVoucherInWindow(voucher, now)) {
            throw new BadRequestException('Voucher chưa tới hạn hoặc đã hết hạn');
        }

        if (!this.isPromotionInWindow(promo, now)) {
            throw new BadRequestException('Promotion chưa tới hạn hoặc đã hết hạn');
        }

        await this.userVoucherModel.updateOne(
            { user_id: uid, voucher_id: vid },
            {
                $set: {
                    is_saved: true,
                    deleted_at: null,
                    saved_at: new Date(),

                    promotion_id: promo._id,
                    merchant_id: promo.merchant_id ?? null,
                    voucher_code: voucher.code ?? null,
                    promotion_name: promo.name ?? null,
                    sponsor:
                        promo.created_by_type === PromotionCreatedByType.PLATFORM
                            ? 'platform'
                            : 'merchant',
                    scope: promo.scope ?? null,
                    apply_level: promo.apply_level ?? null,
                },
                $setOnInsert: {
                    used_count: 0,
                    is_used: false,
                    used_order_id: null,
                    first_used_at: null,
                    used_at: null,
                    last_used_at: null,
                },
            },
            { upsert: true },
        );

        return { ok: true };
    }

    async unsaveVoucher(userId: string, voucherId: string) {
        const uid = this.oid(userId, 'userId');
        const vid = this.oid(voucherId, 'voucherId');

        const doc = await this.userVoucherModel.findOne({
            user_id: uid,
            voucher_id: vid,
            deleted_at: null,
        });

        if (!doc) return { ok: true };

        doc.is_saved = false;
        doc.deleted_at = new Date();
        await doc.save();

        return { ok: true };
    }

    async markVoucherUsed(args: {
        userId: string;
        voucherId: string;
        orderId: string;
        promotionId?: string | null;
        merchantId?: string | null;
        voucherCode?: string | null;
        promotionName?: string | null;
        sponsor?: string | null;
        scope?: string | null;
        applyLevel?: string | null;
    }) {
        const uid = this.oid(args.userId, 'userId');
        const vid = this.oid(args.voucherId, 'voucherId');
        const oid = this.oid(args.orderId, 'orderId');
        const now = new Date();

        const doc = await this.userVoucherModel.findOne({
            user_id: uid,
            voucher_id: vid,
        });

        if (!doc) {
            await this.userVoucherModel.create({
                user_id: uid,
                voucher_id: vid,
                promotion_id: args.promotionId ? this.oid(args.promotionId, 'promotionId') : null,
                merchant_id: args.merchantId ? this.oid(args.merchantId, 'merchantId') : null,
                voucher_code: args.voucherCode ?? null,
                promotion_name: args.promotionName ?? null,
                sponsor: args.sponsor ?? null,
                scope: args.scope ?? null,
                apply_level: args.applyLevel ?? null,

                is_saved: false,
                saved_at: now,
                is_used: true,
                used_count: 1,
                used_order_id: oid,
                first_used_at: now,
                used_at: now,
                last_used_at: now,
                deleted_at: null,
            });

            return { ok: true };
        }

        doc.is_used = true;
        doc.used_count = Number(doc.used_count ?? 0) + 1;
        doc.used_order_id = oid;
        doc.first_used_at = doc.first_used_at ?? now;
        doc.used_at = now;
        doc.last_used_at = now;

        if (args.promotionId && !doc.promotion_id) {
            doc.promotion_id = this.oid(args.promotionId, 'promotionId');
        }
        if (args.merchantId && !doc.merchant_id) {
            doc.merchant_id = this.oid(args.merchantId, 'merchantId');
        }
        if (args.voucherCode && !doc.voucher_code) {
            doc.voucher_code = args.voucherCode;
        }
        if (args.promotionName && !doc.promotion_name) {
            doc.promotion_name = args.promotionName;
        }
        if (args.sponsor && !doc.sponsor) {
            doc.sponsor = args.sponsor;
        }
        if (args.scope && !doc.scope) {
            doc.scope = args.scope;
        }
        if (args.applyLevel && !doc.apply_level) {
            doc.apply_level = args.applyLevel;
        }

        await doc.save();
        return { ok: true };
    }

    async getVoucherStates(userId: string, voucherIds: string[]) {
        const uid = this.oid(userId, 'userId');
        const vids = voucherIds
            .filter(Types.ObjectId.isValid)
            .map((x) => new Types.ObjectId(x));

        const rows = await this.userVoucherModel
            .find({
                user_id: uid,
                voucher_id: { $in: vids },
            })
            .select({
                voucher_id: 1,
                is_saved: 1,
                is_used: 1,
                used_at: 1,
                used_order_id: 1,
                used_count: 1,
                deleted_at: 1,
            })
            .lean();

        const map = new Map<string, any>();

        rows.forEach((r: any) => {
            map.set(String(r.voucher_id), {
                is_saved: !!r.is_saved && !r.deleted_at,
                is_used: Number(r.used_count ?? 0) > 0,
                used_count: Number(r.used_count ?? 0),
                used_at: r.used_at ?? null,
                used_order_id: r.used_order_id ? String(r.used_order_id) : null,
            });
        });

        return map;
    }

    async getVoucherUsageCounts(userId: string, voucherIds: string[]) {
        const uid = this.oid(userId, 'userId');
        const vids = voucherIds
            .filter(Types.ObjectId.isValid)
            .map((x) => new Types.ObjectId(x));

        const rows = await this.userVoucherModel
            .find({
                user_id: uid,
                voucher_id: { $in: vids },
            })
            .select({ voucher_id: 1, used_count: 1 })
            .lean();

        const map = new Map<string, number>();
        rows.forEach((r: any) => {
            map.set(String(r.voucher_id), Number(r.used_count ?? 0));
        });

        return map;
    }

    async markPromotionUsed(args: {
        userId: string;
        promotionId: string;
        orderId: string;
        merchantId?: string | null;
        sponsor?: string | null;
        scope?: string | null;
        applyLevel?: string | null;
        activationType?: string | null;
        orderType?: string | null;
    }) {
        const uid = this.oid(args.userId, 'userId');
        const pid = this.oid(args.promotionId, 'promotionId');
        const oid = this.oid(args.orderId, 'orderId');
        const now = new Date();

        await this.promoUsageModel.updateOne(
            { user_id: uid, promotion_id: pid },
            {
                $setOnInsert: {
                    first_used_at: now,
                    used_count: 0,
                },
                $set: {
                    last_used_at: now,
                    last_used_order_id: oid,
                    merchant_id: args.merchantId ? this.oid(args.merchantId, 'merchantId') : null,
                    sponsor: args.sponsor ?? null,
                    scope: args.scope ?? null,
                    apply_level: args.applyLevel ?? null,
                    activation_type: args.activationType ?? null,
                    last_used_order_type: args.orderType ?? null,
                },
                $inc: { used_count: 1 },
            },
            { upsert: true },
        );

        return { ok: true };
    }

    async getPromotionUsageCounts(userId: string, promotionIds: string[]) {
        const uid = this.oid(userId, 'userId');
        const pids = promotionIds
            .filter(Types.ObjectId.isValid)
            .map((x) => new Types.ObjectId(x));

        const rows = await this.promoUsageModel
            .find({
                user_id: uid,
                promotion_id: { $in: pids },
            })
            .select({ promotion_id: 1, used_count: 1 })
            .lean();

        const map = new Map<string, number>();
        rows.forEach((r: any) => {
            map.set(String(r.promotion_id), Number(r.used_count ?? 0));
        });

        return map;
    }
}