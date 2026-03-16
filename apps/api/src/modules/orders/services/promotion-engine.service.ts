import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';



import { BenefitsUsageService } from 'src/modules/benefits/services/benefits-usage.service';
import { Product, ProductDocument } from 'src/modules/merchants/schemas/product.schema';
import { OrderType, PaymentMethod } from '../schemas/order.schema';
import { Promotion, PromotionActivationType, PromotionApplyLevel, PromotionCreatedByType, PromotionDocument, PromotionScope, PromotionType, Voucher, VoucherDocument } from 'src/modules/promotions/schemas';

type RatedPromotion = {
    promo: any;
    sponsor: 'platform' | 'merchant';
    discount_amount: number;
};

@Injectable()
export class PromotionEngineService {
    constructor(
        @InjectModel(Promotion.name)
        private readonly promotionModel: Model<PromotionDocument>,
        @InjectModel(Voucher.name)
        private readonly voucherModel: Model<VoucherDocument>,
        @InjectModel(Product.name)
        private readonly productModel: Model<ProductDocument>,
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

    private isInWindow(conditions: any, now: Date) {
        const from = conditions?.valid_from ? new Date(conditions.valid_from) : null;
        const to = conditions?.valid_to ? new Date(conditions.valid_to) : null;

        if (from && now < from) return false;
        if (to && now > to) return false;
        return true;
    }

    private isVoucherInWindow(voucher: any, now: Date) {
        const from = voucher?.start_date ? new Date(voucher.start_date) : null;
        const to = voucher?.end_date ? new Date(voucher.end_date) : null;

        if (from && now < from) return false;
        if (to && now > to) return false;
        return true;
    }

    private async buildCategoryMap(cartItems: any[]) {
        const productIds = [
            ...new Set(
                (cartItems ?? [])
                    .filter((x: any) => x.item_type === 'product' && x.product_id)
                    .map((x: any) => String(x.product_id)),
            ),
        ];

        if (!productIds.length) return new Map<string, string>();

        const docs: any[] = await this.productModel
            .find({ _id: { $in: productIds.map((x) => new Types.ObjectId(x)) } })
            .select({ _id: 1, category_id: 1 })
            .lean();

        const map = new Map<string, string>();
        docs.forEach((d: any) => map.set(String(d._id), String(d.category_id)));
        return map;
    }

    private isPromotionUsable(args: {
        promo: any;
        orderType: OrderType;
        paymentMethod: PaymentMethod;
        subtotal_before_discount: number;
        perUserUsedCount: number;
        now: Date;
    }) {
        const { promo, orderType, paymentMethod, subtotal_before_discount, perUserUsedCount, now } = args;

        if (!promo?.is_active) return false;
        if (!this.isInWindow(promo.conditions, now)) return false;

        if (Number(promo.min_order_amount ?? 0) > subtotal_before_discount) {
            return false;
        }

        if (
            Number(promo.total_usage_limit ?? 0) > 0 &&
            Number(promo.current_usage ?? 0) >= Number(promo.total_usage_limit)
        ) {
            return false;
        }

        if (
            Number(promo.per_user_limit ?? 0) > 0 &&
            perUserUsedCount >= Number(promo.per_user_limit)
        ) {
            return false;
        }

        const allowedOrderTypes = Array.isArray(promo.allowed_order_types)
            ? promo.allowed_order_types
            : [];
        if (allowedOrderTypes.length && !allowedOrderTypes.includes(orderType as any)) {
            return false;
        }

        const allowedPaymentMethods = Array.isArray(promo.allowed_payment_methods)
            ? promo.allowed_payment_methods
            : [];
        if (allowedPaymentMethods.length && !allowedPaymentMethods.includes(paymentMethod as any)) {
            return false;
        }

        return true;
    }

    private computePromotionDiscount(args: {
        promo: any;
        subtotal_before_discount: number;
        delivery_fee_before_discount: number;
        cartItems: any[];
        categoryMap: Map<string, string>;
    }) {
        const {
            promo,
            subtotal_before_discount,
            delivery_fee_before_discount,
            cartItems,
            categoryMap,
        } = args;

        let eligibleAmount = 0;

        switch (promo.apply_level) {
            case PromotionApplyLevel.ORDER:
                eligibleAmount = subtotal_before_discount;
                break;

            case PromotionApplyLevel.SHIPPING:
                eligibleAmount = delivery_fee_before_discount;
                break;

            case PromotionApplyLevel.PRODUCT:
                eligibleAmount = (cartItems ?? [])
                    .filter(
                        (it: any) =>
                            it.item_type === 'product' &&
                            it.product_id &&
                            (promo.product_ids ?? []).map(String).includes(String(it.product_id)),
                    )
                    .reduce((s: number, it: any) => s + Number(it.item_total ?? 0), 0);
                break;

            case PromotionApplyLevel.CATEGORY:
                eligibleAmount = (cartItems ?? [])
                    .filter((it: any) => {
                        if (it.item_type !== 'product' || !it.product_id) return false;
                        const cid = categoryMap.get(String(it.product_id));
                        return !!cid && (promo.category_ids ?? []).map(String).includes(cid);
                    })
                    .reduce((s: number, it: any) => s + Number(it.item_total ?? 0), 0);
                break;
        }

        if (eligibleAmount <= 0) return 0;

        let discount = 0;
        if (promo.type === PromotionType.PERCENTAGE) {
            discount = (eligibleAmount * Number(promo.discount_value ?? 0)) / 100;
        } else {
            discount = Number(promo.discount_value ?? 0);
        }

        if (Number(promo.max_discount ?? 0) > 0) {
            discount = Math.min(discount, Number(promo.max_discount));
        }

        discount = Math.round(discount);
        discount = Math.min(discount, Math.round(eligibleAmount));
        return Math.max(0, discount);
    }

    private pickBestBySponsorGroup(rated: RatedPromotion[]) {
        const bestMap = new Map<string, RatedPromotion>();

        for (const item of rated) {
            const key = `${item.sponsor}:${item.promo.exclusive_group ?? '__default__'}`;
            const prev = bestMap.get(key);

            if (!prev) {
                bestMap.set(key, item);
                continue;
            }

            if (item.discount_amount > prev.discount_amount) {
                bestMap.set(key, item);
                continue;
            }

            if (
                item.discount_amount === prev.discount_amount &&
                Number(item.promo.priority ?? 0) > Number(prev.promo.priority ?? 0)
            ) {
                bestMap.set(key, item);
            }
        }

        return Array.from(bestMap.values());
    }
    private isVoucherUsable(args: {
        voucher: any;
        perUserUsedCount: number;
        now: Date;
    }) {
        const { voucher, perUserUsedCount, now } = args;

        if (!voucher?.is_active) return false;
        if (!this.isVoucherInWindow(voucher, now)) return false;

        if (
            Number(voucher.total_usage_limit ?? 0) > 0 &&
            Number(voucher.current_usage ?? 0) >= Number(voucher.total_usage_limit)
        ) {
            return false;
        }

        if (
            Number(voucher.per_user_limit ?? 0) > 0 &&
            perUserUsedCount >= Number(voucher.per_user_limit)
        ) {
            return false;
        }

        return true;
    }
    async resolve(args: {
        userId: string | null;
        merchantId: string;
        orderType: OrderType;
        paymentMethod: PaymentMethod;
        subtotal_before_discount: number;
        delivery_fee_before_discount: number;
        cartItems: any[];
        voucherCode?: string;
    }) {
        const now = this.now();
        const categoryMap = await this.buildCategoryMap(args.cartItems);

        const scopes =
            args.orderType === OrderType.DELIVERY
                ? [PromotionScope.FOOD, PromotionScope.DELIVERY]
                : [PromotionScope.FOOD, PromotionScope.DINE_IN];

        const candidates: any[] = await this.promotionModel
            .find({
                is_active: true,
                activation_type: PromotionActivationType.AUTO,
                scope: { $in: scopes },
                $or: [
                    {
                        created_by_type: PromotionCreatedByType.PLATFORM,
                        merchant_id: null,
                    },
                    {
                        created_by_type: PromotionCreatedByType.MERCHANT,
                        merchant_id: this.oid(args.merchantId, 'merchantId'),
                    },
                ],
            })
            .lean();

        const usageMap =
            args.userId && candidates.length
                ? await this.benefitsUsage.getPromotionUsageCounts(
                    args.userId,
                    candidates.map((x: any) => String(x._id)),
                )
                : new Map<string, number>();

        const ratedAuto: RatedPromotion[] = candidates
            .map((promo: any) => {
                const usedCount = Number(usageMap.get(String(promo._id)) ?? 0);

                const usable = this.isPromotionUsable({
                    promo,
                    orderType: args.orderType,
                    paymentMethod: args.paymentMethod,
                    subtotal_before_discount: args.subtotal_before_discount,
                    perUserUsedCount: usedCount,
                    now,
                });

                if (!usable) return null;

                const discount_amount = this.computePromotionDiscount({
                    promo,
                    subtotal_before_discount: args.subtotal_before_discount,
                    delivery_fee_before_discount: args.delivery_fee_before_discount,
                    cartItems: args.cartItems,
                    categoryMap,
                });

                if (discount_amount <= 0) return null;

                return {
                    promo,
                    discount_amount,
                    sponsor:
                        promo.created_by_type === PromotionCreatedByType.PLATFORM
                            ? 'platform'
                            : 'merchant',
                } as RatedPromotion;
            })
            .filter(Boolean) as RatedPromotion[];

        let autoApplied = this.pickBestBySponsorGroup(ratedAuto);

        let voucherApplied: any = null;

        if (args.voucherCode?.trim()) {
            if (!args.userId) {
                throw new BadRequestException('Vui lòng đăng nhập để sử dụng voucher');
            }

            const code = args.voucherCode.trim().toUpperCase();

            const voucher: any = await this.voucherModel.findOne({
                code,
                is_active: true,
            }).lean();

            if (!voucher) {
                throw new BadRequestException('Voucher không tồn tại hoặc đã bị tắt');
            }

            const promo: any = await this.promotionModel.findById(voucher.promotion_id).lean();
            if (!promo) {
                throw new BadRequestException('Promotion của voucher không tồn tại');
            }

            if (promo.activation_type !== PromotionActivationType.VOUCHER) {
                throw new BadRequestException('Voucher không hợp lệ');
            }

            if (!promo.is_active || !this.isInWindow(promo.conditions, now)) {
                throw new BadRequestException('Promotion của voucher hiện không áp dụng');
            }

            if (
                voucher.merchant_id &&
                String(voucher.merchant_id) !== String(args.merchantId)
            ) {
                throw new BadRequestException('Voucher không thuộc merchant này');
            }

            const promoUsageMap = await this.benefitsUsage.getPromotionUsageCounts(
                args.userId,
                [String(promo._id)],
            );

            const promoUsedCount = Number(promoUsageMap.get(String(promo._id)) ?? 0);

            const voucherUsageMap = await this.benefitsUsage.getVoucherUsageCounts(
                args.userId,
                [String(voucher._id)],
            );

            const voucherUsedCount = Number(
                voucherUsageMap.get(String(voucher._id)) ?? 0,
            );

            const promoUsable = this.isPromotionUsable({
                promo,
                orderType: args.orderType,
                paymentMethod: args.paymentMethod,
                subtotal_before_discount: args.subtotal_before_discount,
                perUserUsedCount: promoUsedCount,
                now,
            });

            if (!promoUsable) {
                throw new BadRequestException('Voucher không thoả điều kiện áp dụng');
            }

            const voucherUsable = this.isVoucherUsable({
                voucher,
                perUserUsedCount: voucherUsedCount,
                now,
            });

            if (!voucherUsable) {
                throw new BadRequestException('Voucher đã hết lượt hoặc không còn khả dụng');
            }

            const discount_amount = this.computePromotionDiscount({
                promo,
                subtotal_before_discount: args.subtotal_before_discount,
                delivery_fee_before_discount: args.delivery_fee_before_discount,
                cartItems: args.cartItems,
                categoryMap,
            });

            if (discount_amount <= 0) {
                throw new BadRequestException('Voucher không áp dụng được cho giỏ hàng này');
            }

            autoApplied = autoApplied.filter(
                (x) => x.promo.can_stack_with_voucher !== false,
            );

            voucherApplied = {
                voucher_id: String(voucher._id),
                promotion_id: String(promo._id),
                voucher_code: voucher.code,
                promotion_name: promo.name,
                sponsor:
                    promo.created_by_type === PromotionCreatedByType.PLATFORM
                        ? 'platform'
                        : 'merchant',
                scope: promo.scope,
                apply_level: promo.apply_level,
                discount_amount,
            };
        }

        let raw_food_discount = 0;
        let raw_delivery_discount = 0;

        for (const item of autoApplied) {
            if (item.promo.apply_level === PromotionApplyLevel.SHIPPING) {
                raw_delivery_discount += item.discount_amount;
            } else {
                raw_food_discount += item.discount_amount;
            }
        }

        if (voucherApplied) {
            if (voucherApplied.apply_level === PromotionApplyLevel.SHIPPING) {
                raw_delivery_discount += Number(voucherApplied.discount_amount ?? 0);
            } else {
                raw_food_discount += Number(voucherApplied.discount_amount ?? 0);
            }
        }

        return {
            auto_applied: autoApplied.map((x) => ({
                promotion_id: String(x.promo._id),
                name: x.promo.name,
                sponsor: x.sponsor,
                scope: x.promo.scope,
                apply_level: x.promo.apply_level,
                discount_amount: x.discount_amount,
            })),
            voucher_applied: voucherApplied,
            raw_food_discount,
            raw_delivery_discount,
        };
    }
}