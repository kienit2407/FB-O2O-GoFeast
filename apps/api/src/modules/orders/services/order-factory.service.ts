import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomUUID } from 'crypto';

import {
    Order,
    OrderDocument,
    OrderStatus,
    OrderType,
    PaymentMethod as OrderPaymentMethod,
    PaymentStatus as OrderPaymentStatus,
} from '../schemas/order.schema';
import {
    Payment,
    PaymentDocument,
    PaymentStatus as GatewayPaymentStatus,
} from 'src/modules/payments/schemas/payment.schema';
import { BenefitsUsageService } from 'src/modules/benefits/services/benefits-usage.service';
import {
    Promotion,
    PromotionDocument,
    Voucher,
    VoucherDocument,
} from 'src/modules/promotions/schemas';
import {
    Cart,
    CartDocument,
    CartStatus,
} from 'src/modules/carts/schemas';

@Injectable()
export class OrderFactoryService {
    constructor(
        @InjectModel(Order.name)
        private readonly orderModel: Model<OrderDocument>,
        @InjectModel(Payment.name)
        private readonly paymentModel: Model<PaymentDocument>,
        @InjectModel(Promotion.name)
        private readonly promotionModel: Model<PromotionDocument>,
        @InjectModel(Voucher.name)
        private readonly voucherModel: Model<VoucherDocument>,
        @InjectModel(Cart.name)
        private readonly cartModel: Model<CartDocument>,
        private readonly benefitsUsage: BenefitsUsageService,
    ) { }

    private oid(id: string, name = 'id') {
        if (!Types.ObjectId.isValid(id)) {
            throw new Error(`Invalid ${name}`);
        }
        return new Types.ObjectId(id);
    }

    private generateOrderNumber() {
        const ts = Date.now().toString().slice(-10);
        const rand = Math.floor(Math.random() * 10000)
            .toString()
            .padStart(4, '0');
        return `OD${ts}${rand}`;
    }

    private buildOrderItems(cart: any) {
        return (cart.items ?? []).map((it: any) => ({
            _id: new Types.ObjectId(),
            item_type: it.item_type,
            product_id: it.product_id ?? null,
            topping_id: it.topping_id ?? null,
            topping_name: it.item_type === 'topping' ? it.product_name : null,
            product_name: it.product_name,
            product_image: it.product_image_url ?? null,
            quantity: Number(it.quantity ?? 0),
            base_price:
                it.base_price != null
                    ? Number(it.base_price)
                    : Number(it.unit_price ?? 0),
            unit_price: Number(it.unit_price ?? 0),
            selected_options: (it.selected_options ?? []).map((x: any) => ({
                option_name: x.option_name,
                choice_name: x.choice_name,
                price_modifier: Number(x.price_modifier ?? 0),
            })),
            selected_toppings: (it.selected_toppings ?? []).map((x: any) => ({
                topping_id: x.topping_id,
                topping_name: x.topping_name,
                quantity: Number(x.quantity ?? 0),
                unit_price: Number(x.unit_price ?? 0),
            })),
            note: it.note ?? '',
            item_total: Number(it.item_total ?? 0),
        }));
    }

    private async createPaymentIfNeeded(args: {
        userId: string | null;
        order: any;
        payment_method: OrderPaymentMethod;
        amount: number;
        checkoutBenefitsSnapshot?: {
            auto_applied: any[];
            voucher_applied: any | null;
        };
    }) {
        if (args.payment_method === OrderPaymentMethod.CASH) {
            return null;
        }

        const paymentPayload: any = {
            order_id: args.order._id,
            user_id: args.userId ? this.oid(args.userId, 'userId') : null,
            payment_method: args.payment_method,
            amount: args.amount,
            currency: 'VND',
            idempotency_key: randomUUID(),
            status: GatewayPaymentStatus.PENDING,
            gateway_response: {
                checkout_benefits: {
                    auto_applied: args.checkoutBenefitsSnapshot?.auto_applied ?? [],
                    voucher_applied:
                        args.checkoutBenefitsSnapshot?.voucher_applied ?? null,
                },
            },
        };

        return (await this.paymentModel.create(paymentPayload)) as any;
    }

    async markBenefitsUsed(args: {
        userId: string;
        orderId: string;
        promotions: {
            auto_applied: any[];
            voucher_applied: any | null;
        };
    }) {
        for (const x of args.promotions.auto_applied ?? []) {
            await this.promotionModel.updateOne(
                { _id: this.oid(x.promotion_id) },
                { $inc: { current_usage: 1 } },
            );

            await this.benefitsUsage.markPromotionUsed({
                userId: args.userId,
                promotionId: x.promotion_id,
                orderId: args.orderId,
                sponsor: x.sponsor,
                scope: x.scope,
                applyLevel: x.apply_level,
            });
        }

        if (args.promotions.voucher_applied) {
            const va = args.promotions.voucher_applied;

            await this.voucherModel.updateOne(
                { _id: this.oid(va.voucher_id) },
                { $inc: { current_usage: 1 } },
            );

            await this.promotionModel.updateOne(
                { _id: this.oid(va.promotion_id) },
                { $inc: { current_usage: 1 } },
            );

            await this.benefitsUsage.markVoucherUsed({
                userId: args.userId,
                voucherId: va.voucher_id,
                orderId: args.orderId,
                promotionId: va.promotion_id,
                merchantId: null, // hoặc set merchantId nếu bạn muốn snapshot luôn
                voucherCode: va.voucher_code,
                promotionName: va.promotion_name ?? null,
                sponsor: va.sponsor,
                scope: va.scope,
                applyLevel: va.apply_level ?? null,
            });

            await this.benefitsUsage.markPromotionUsed({
                userId: args.userId,
                promotionId: va.promotion_id,
                orderId: args.orderId,
            });
        }
    }

    async clearCart(cart: any) {
        cart.items = [];
        cart.last_active_at = new Date();
        await cart.save();
    }

    async clearCartByOrder(order: any) {
        const q: any = {
            merchant_id: order.merchant_id,
            order_type: order.order_type,
            status: CartStatus.ACTIVE,
            deleted_at: null,
        };

        if (order.order_type === OrderType.DELIVERY) {
            q.user_id = order.customer_id;
        } else {
            q.table_session_id = order.table_session_id;
        }

        const cart = await this.cartModel.findOne(q);
        if (!cart) return;

        cart.items = [];
        cart.last_active_at = new Date();
        await cart.save();
    }

    async createDeliveryOrder(args: {
        userId: string;
        merchantId: string;
        cart: any;
        dto: {
            lat: number;
            lng: number;
            address: string;
            receiver_name: string;
            receiver_phone: string;
            address_note?: string;
            order_note?: string;
            payment_method: OrderPaymentMethod;
        };
        preview: any;
    }) {
        const orderPayload: any = {
            order_number: this.generateOrderNumber(),
            order_type: OrderType.DELIVERY,
            customer_id: this.oid(args.userId, 'userId'),
            merchant_id: this.oid(args.merchantId, 'merchantId'),
            driver_id: null,
            table_session_id: null,

            items: this.buildOrderItems(args.cart),

            delivery_address: {
                address: args.dto.address,
                location: {
                    type: 'Point',
                    coordinates: [args.dto.lng, args.dto.lat],
                },
                receiver_name: args.dto.receiver_name,
                receiver_phone: args.dto.receiver_phone,
                note: args.dto.address_note ?? '',
            },

            subtotal_before_discount: args.preview.pricing.subtotal_before_discount,
            delivery_fee_before_discount:
                args.preview.pricing.delivery_fee_before_discount,
            subtotal: args.preview.pricing.subtotal,
            delivery_fee: args.preview.pricing.delivery_fee,
            order_note: args.dto.order_note ?? '',
            platform_fee: args.preview.pricing.platform_fee,
            discounts: {
                food_discount: args.preview.pricing.food_discount,
                delivery_discount: args.preview.pricing.delivery_discount,
                total_discount: args.preview.pricing.total_discount,
            },
            applied_vouchers: args.preview.promotions.voucher_applied
                ? [
                    {
                        voucher_id: this.oid(
                            args.preview.promotions.voucher_applied.voucher_id,
                        ),
                        voucher_code: args.preview.promotions.voucher_applied.voucher_code,
                        scope: args.preview.promotions.voucher_applied.scope,
                        sponsor: args.preview.promotions.voucher_applied.sponsor,
                        discount_amount:
                            args.preview.promotions.voucher_applied.discount_amount,
                    },
                ]
                : [],
            total_amount: args.preview.pricing.total_amount,
            payment_method: args.dto.payment_method,
            payment_status: OrderPaymentStatus.PENDING,
            paid_at: null,
            status: OrderStatus.PENDING,
            status_history: [
                {
                    status: OrderStatus.PENDING,
                    changed_at: new Date(),
                    changed_by: this.oid(args.userId, 'userId'),
                    note: 'Delivery order created',
                },
            ],
            estimated_prep_time: Number(args.preview.delivery.prep_min ?? 0),
            estimated_delivery_time: args.preview.delivery.eta_at
                ? new Date(args.preview.delivery.eta_at)
                : null,
            is_rated: false,
            cancelled_by: null,
            cancel_reason: null,
            driver_assigned_at: null,
            driver_accept_deadline_at: null,
            assignment_attempts: 0,
            settlement: {},
        };

        const order = (await this.orderModel.create(orderPayload)) as any;
        const payment = await this.createPaymentIfNeeded({
            userId: args.userId,
            order,
            payment_method: args.dto.payment_method,
            amount: args.preview.pricing.total_amount,
            checkoutBenefitsSnapshot: args.preview.promotions,
        });

        return { order, payment };
    }

    async createDineInOrder(args: {
        userId: string | null;
        merchantId: string;
        tableSessionId: string;
        cart: any;
        dto: {
            order_note?: string;
            payment_method: OrderPaymentMethod;
        };
        preview: any;
    }) {
        const changedBy = args.userId ? this.oid(args.userId, 'userId') : null;

        const orderPayload: any = {
            order_number: this.generateOrderNumber(),
            order_type: OrderType.DINE_IN,
            customer_id: args.userId ? this.oid(args.userId, 'userId') : null,
            merchant_id: this.oid(args.merchantId, 'merchantId'),
            driver_id: null,
            table_session_id: this.oid(args.tableSessionId, 'tableSessionId'),

            items: this.buildOrderItems(args.cart),

            subtotal_before_discount: args.preview.pricing.subtotal_before_discount,
            delivery_fee_before_discount: 0,
            subtotal: args.preview.pricing.subtotal,
            delivery_fee: 0,
            order_note: args.dto.order_note ?? '',
            platform_fee: args.preview.pricing.platform_fee,
            discounts: {
                food_discount: args.preview.pricing.food_discount,
                delivery_discount: 0,
                total_discount: args.preview.pricing.total_discount,
            },
            applied_vouchers: args.preview.promotions.voucher_applied
                ? [
                    {
                        voucher_id: this.oid(
                            args.preview.promotions.voucher_applied.voucher_id,
                        ),
                        voucher_code: args.preview.promotions.voucher_applied.voucher_code,
                        scope: args.preview.promotions.voucher_applied.scope,
                        sponsor: args.preview.promotions.voucher_applied.sponsor,
                        discount_amount:
                            args.preview.promotions.voucher_applied.discount_amount,
                    },
                ]
                : [],
            total_amount: args.preview.pricing.total_amount,
            payment_method: args.dto.payment_method,
            payment_status: OrderPaymentStatus.PENDING,
            paid_at: null,
            status: OrderStatus.PENDING,
            status_history: [
                {
                    status: OrderStatus.PENDING,
                    changed_at: new Date(),
                    changed_by: changedBy,
                    note: 'Dine-in order created',
                },
            ],
            estimated_prep_time: Number(
                args.preview.dine_in.estimated_prep_time_min ?? 0,
            ),
            estimated_delivery_time: null,
            is_rated: false,
            cancelled_by: null,
            cancel_reason: null,
            driver_assigned_at: null,
            driver_accept_deadline_at: null,
            assignment_attempts: 0,
            settlement: {},
        };

        const order = (await this.orderModel.create(orderPayload)) as any;
        const payment = await this.createPaymentIfNeeded({
            userId: args.userId,
            order,
            payment_method: args.dto.payment_method,
            amount: args.preview.pricing.total_amount,
            checkoutBenefitsSnapshot: args.preview.promotions,
        });

        return { order, payment };
    }
}