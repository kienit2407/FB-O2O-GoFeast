import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
    Promotion,
    PromotionActivationType,
    PromotionCreatedByType,
    PromotionDocument,
    PromotionScope,
} from '../schemas/promotion.schema';
import { Voucher, VoucherDocument } from '../schemas/voucher.schema';
import { Merchant, MerchantDocument } from 'src/modules/merchants/schemas/merchant.schema';
import { BenefitsUsageService } from 'src/modules/benefits/services/benefits-usage.service';

@Injectable()
export class PublicPromotionsService {
    constructor(
        @InjectModel(Promotion.name)
        private readonly promotionModel: Model<PromotionDocument>,
        @InjectModel(Voucher.name)
        private readonly voucherModel: Model<VoucherDocument>,
        @InjectModel(Merchant.name)
        private readonly merchantModel: Model<MerchantDocument>,
        private readonly benefitsUsage: BenefitsUsageService,
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
    async getPopupPromotion(args: { userId?: string | null }) {
        const now = this.now();

        const promo: any = await this.promotionModel
            .findOne({
                created_by_type: PromotionCreatedByType.PLATFORM,
                merchant_id: null,
                is_active: true,
                show_as_popup: true,
                banner_admin_url: { $ne: null },
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
            .sort({ priority: -1, created_at: -1 })
            .lean();

        if (!promo) return null;

        const promoUsageMap =
            args.userId != null
                ? await this.benefitsUsage.getPromotionUsageCounts(args.userId, [
                    String(promo._id),
                ])
                : new Map<string, number>();

        const promoUsedCount = Number(promoUsageMap.get(String(promo._id)) ?? 0);
        const promoLimitReached =
            Number(promo.per_user_limit ?? 0) > 0 &&
            promoUsedCount >= Number(promo.per_user_limit);

        return {
            id: String(promo._id),
            name: promo.name,
            description: promo.description ?? '',
            banner_url: promo.banner_admin_url ?? null,

            sponsor: 'platform',
            scope: promo.scope,
            apply_level: promo.apply_level,
            activation_type: promo.activation_type,
            discount_type: promo.type,
            discount_value: Number(promo.discount_value ?? 0),
            max_discount: Number(promo.max_discount ?? 0),
            min_order_amount: Number(promo.min_order_amount ?? 0),
            valid_from: promo.conditions?.valid_from ?? null,
            valid_to: promo.conditions?.valid_to ?? null,
            can_stack_with_voucher: promo.can_stack_with_voucher ?? true,

            user_state: {
                promotion_used_count: promoUsedCount,
                promotion_per_user_limit: Number(promo.per_user_limit ?? 0),
                is_user_limit_reached: promoLimitReached,
            },
        };
    }
    private inPromoWindow(promo: any, now: Date) {
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

    private inVoucherWindow(voucher: any, now: Date) {
        const from = voucher?.start_date ? new Date(voucher.start_date) : null;
        const to = voucher?.end_date ? new Date(voucher.end_date) : null;

        if (from && now < from) return false;
        if (to && now > to) return false;
        return true;
    }

    private sponsorOf(promo: any) {
        return promo.created_by_type === PromotionCreatedByType.PLATFORM
            ? 'platform'
            : 'merchant';
    }

    async listMerchantPromotions(args: {
        merchantId: string;
        orderType?: 'delivery' | 'dine_in';
        userId?: string | null;
    }) {
        const merchant: any = await this.merchantModel
            .findOne({
                _id: this.oid(args.merchantId, 'merchantId'),
                deleted_at: null,
            })
            .select({ _id: 1, name: 1, logo_url: 1, address: 1 })
            .lean();

        if (!merchant) {
            throw new NotFoundException('Merchant not found');
        }

        const orderType = args.orderType === 'dine_in' ? 'dine_in' : 'delivery';
        const scopes =
            orderType === 'dine_in'
                ? [PromotionScope.FOOD, PromotionScope.DINE_IN]
                : [PromotionScope.FOOD, PromotionScope.DELIVERY];

        const promos: any[] = await this.promotionModel
            .find({
                is_active: true,
                scope: { $in: scopes },
                $or: [
                    {
                        created_by_type: PromotionCreatedByType.PLATFORM,
                        merchant_id: null,
                    },
                    {
                        created_by_type: PromotionCreatedByType.MERCHANT,
                        merchant_id: merchant._id,
                    },
                ],
            })
            .sort({ priority: -1, created_at: -1 })
            .lean();

        const now = this.now();

        const activePromos = promos.filter((p: any) => {
            if (!p?.is_active) return false;
            if (!this.inPromoWindow(p, now)) return false;

            if (
                Number(p.total_usage_limit ?? 0) > 0 &&
                Number(p.current_usage ?? 0) >= Number(p.total_usage_limit)
            ) {
                return false;
            }

            return true;
        });

        const promoIds = activePromos.map((x: any) => String(x._id));

        const vouchers: any[] = promoIds.length
            ? await this.voucherModel
                .find({
                    promotion_id: {
                        $in: promoIds.map((x) => new Types.ObjectId(x)),
                    },
                    is_active: true,
                })
                .sort({ created_at: -1 })
                .lean()
            : [];

        const activeVouchers = vouchers.filter((v: any) => {
            if (!this.inVoucherWindow(v, now)) return false;

            if (
                Number(v.total_usage_limit ?? 0) > 0 &&
                Number(v.current_usage ?? 0) >= Number(v.total_usage_limit)
            ) {
                return false;
            }

            return true;
        });

        const vouchersByPromo = new Map<string, any[]>();
        for (const v of activeVouchers) {
            const key = String(v.promotion_id);
            const prev = vouchersByPromo.get(key) ?? [];
            prev.push(v);
            vouchersByPromo.set(key, prev);
        }

        const promoUsageMap =
            args.userId && promoIds.length
                ? await this.benefitsUsage.getPromotionUsageCounts(args.userId, promoIds)
                : new Map<string, number>();

        const allVoucherIds = activeVouchers.map((x: any) => String(x._id));

        const voucherStateMap =
            args.userId && allVoucherIds.length
                ? await this.benefitsUsage.getVoucherStates(args.userId, allVoucherIds)
                : new Map<string, any>();

        return activePromos.map((promo: any) => {
            const sponsor = this.sponsorOf(promo);
            const promoUsedCount = Number(
                promoUsageMap.get(String(promo._id)) ?? 0,
            );

            const promoLimitReached =
                Number(promo.per_user_limit ?? 0) > 0 &&
                promoUsedCount >= Number(promo.per_user_limit);

            const promoVouchers = vouchersByPromo.get(String(promo._id)) ?? [];
            const firstVoucher = promoVouchers[0] ?? null;
            const firstVoucherState = firstVoucher
                ? voucherStateMap.get(String(firstVoucher._id))
                : null;

            return {
                id: String(promo._id),
                merchant_id: promo.merchant_id ? String(promo.merchant_id) : null,
                merchant_name: merchant.name,
                name: promo.name,
                description: promo.description ?? '',
                banner_url: promo.banner_admin_url ?? null,

                sponsor,
                scope: promo.scope,
                apply_level: promo.apply_level,
                activation_type: promo.activation_type,
                discount_type: promo.type,
                discount_value: Number(promo.discount_value ?? 0),
                max_discount: Number(promo.max_discount ?? 0),
                min_order_amount: Number(promo.min_order_amount ?? 0),

                valid_from: promo.conditions?.valid_from ?? null,
                valid_to: promo.conditions?.valid_to ?? null,

                can_stack_with_voucher: promo.can_stack_with_voucher ?? true,

                has_voucher: promo.activation_type === PromotionActivationType.VOUCHER,
                voucher_count: promoVouchers.length,

                user_state: {
                    promotion_used_count: promoUsedCount,
                    promotion_per_user_limit: Number(promo.per_user_limit ?? 0),
                    is_user_limit_reached: promoLimitReached,
                },

                first_voucher: firstVoucher
                    ? {
                        id: String(firstVoucher._id),
                        code: firstVoucher.code,
                        per_user_limit: Number(firstVoucher.per_user_limit ?? 0),
                        total_usage_limit: Number(firstVoucher.total_usage_limit ?? 0),
                        current_usage: Number(firstVoucher.current_usage ?? 0),
                        is_saved: !!firstVoucherState?.is_saved,
                        used_count: Number(firstVoucherState?.used_count ?? 0),
                    }
                    : null,
            };
        });
    }
    async getPromotionDetail(args: {
        promotionId: string;
        userId?: string | null;
    }) {
        const promo: any = await this.promotionModel
            .findById(this.oid(args.promotionId, 'promotionId'))
            .lean();

        if (!promo || !promo.is_active) {
            throw new NotFoundException('Promotion not found');
        }

        const now = this.now();
        if (!this.inPromoWindow(promo, now)) {
            throw new BadRequestException('Promotion is not active in current time window');
        }

        const merchant =
            promo.merchant_id != null
                ? await this.merchantModel
                    .findById(promo.merchant_id)
                    .select({ _id: 1, name: 1, logo_url: 1, address: 1 })
                    .lean()
                : null;

        const vouchers: any[] =
            promo.activation_type === PromotionActivationType.VOUCHER
                ? await this.voucherModel
                    .find({
                        promotion_id: promo._id,
                        is_active: true,
                    })
                    .sort({ created_at: -1 })
                    .lean()
                : [];

        const activeVouchers = vouchers.filter((v: any) => {
            if (!this.inVoucherWindow(v, now)) return false;

            if (
                Number(v.total_usage_limit ?? 0) > 0 &&
                Number(v.current_usage ?? 0) >= Number(v.total_usage_limit)
            ) {
                return false;
            }

            return true;
        });

        const promoUsageMap =
            args.userId != null
                ? await this.benefitsUsage.getPromotionUsageCounts(args.userId, [
                    String(promo._id),
                ])
                : new Map<string, number>();

        const voucherIds = activeVouchers.map((x: any) => String(x._id));

        const voucherStateMap =
            args.userId && voucherIds.length
                ? await this.benefitsUsage.getVoucherStates(args.userId, voucherIds)
                : new Map<string, any>();

        const sponsor = this.sponsorOf(promo);
        const promoUsedCount = Number(promoUsageMap.get(String(promo._id)) ?? 0);
        const promoLimitReached =
            Number(promo.per_user_limit ?? 0) > 0 &&
            promoUsedCount >= Number(promo.per_user_limit);

        return {
            promotion: {
                id: String(promo._id),
                merchant_id: promo.merchant_id ? String(promo.merchant_id) : null,
                merchant_name: merchant?.name ?? null,
                merchant_logo_url: merchant?.logo_url ?? null,
                merchant_address: merchant?.address ?? null,

                name: promo.name,
                description: promo.description ?? '',
                banner_url: promo.banner_admin_url ?? null,

                sponsor,
                scope: promo.scope,
                apply_level: promo.apply_level,
                activation_type: promo.activation_type,
                discount_type: promo.type,
                discount_value: Number(promo.discount_value ?? 0),
                max_discount: Number(promo.max_discount ?? 0),
                min_order_amount: Number(promo.min_order_amount ?? 0),

                valid_from: promo.conditions?.valid_from ?? null,
                valid_to: promo.conditions?.valid_to ?? null,
                allowed_order_types: promo.allowed_order_types ?? [],
                allowed_payment_methods: promo.allowed_payment_methods ?? [],
                can_stack_with_voucher: promo.can_stack_with_voucher ?? true,

                user_state: {
                    promotion_used_count: promoUsedCount,
                    promotion_per_user_limit: Number(promo.per_user_limit ?? 0),
                    is_user_limit_reached: promoLimitReached,
                },
            },

            vouchers: activeVouchers.map((v: any) => {
                const state = voucherStateMap.get(String(v._id));

                const usedCount = Number(state?.used_count ?? 0);
                const perUserLimit = Number(v.per_user_limit ?? 0);

                return {
                    id: String(v._id),
                    code: v.code,
                    start_date: v.start_date ?? null,
                    end_date: v.end_date ?? null,
                    total_usage_limit: Number(v.total_usage_limit ?? 0),
                    per_user_limit: perUserLimit,
                    current_usage: Number(v.current_usage ?? 0),

                    is_saved: !!state?.is_saved,
                    used_count: usedCount,
                    is_user_limit_reached: perUserLimit > 0 && usedCount >= perUserLimit,
                    remaining_user_uses:
                        perUserLimit > 0 ? Math.max(0, perUserLimit - usedCount) : null,
                };
            }),
        };
    }
}