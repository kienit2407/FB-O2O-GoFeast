import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Merchant, MerchantDocument } from 'src/modules/merchants/schemas/merchant.schema';
import { GeoService } from 'src/modules/geo/services/geo.service';

import { OrderType, PaymentMethod } from '../schemas/order.schema';
import { DeliveryCheckoutPreviewQueryDto } from '../dtos/delivery-checkout-preview.query.dto';
import { DeliveryPlaceOrderDto } from '../dtos/delivery-place-order.dto';
import { CheckoutPricingService } from './checkout-pricing.service';
import { PromotionEngineService } from './promotion-engine.service';
import { OrderFactoryService } from './order-factory.service';
import { Cart, CartDocument, CartStatus } from 'src/modules/carts/schemas';
import { CheckoutPaymentService } from './checkout-payment.service';
import { DeliveryRouteResolverService } from 'src/modules/geo/services/delivery-route-resolver.service';
import { OrderLifecycleService } from './order-lifecycle.service';
import { NotificationsService } from 'src/modules/notifications/services/notifications.service';

@Injectable()
export class DeliveryCheckoutService {
    constructor(
        @InjectModel(Cart.name)
        private readonly cartModel: Model<CartDocument>,
        @InjectModel(Merchant.name)
        private readonly merchantModel: Model<MerchantDocument>,
        private readonly checkoutPayment: CheckoutPaymentService,
        private readonly deliveryRouteResolver: DeliveryRouteResolverService,
        private readonly pricingService: CheckoutPricingService,
        private readonly promotionEngine: PromotionEngineService,
        private readonly orderFactory: OrderFactoryService,
        private readonly orderLifecycleService: OrderLifecycleService,
        private readonly notificationsService: NotificationsService,
    ) { }

    private oid(id: string, name = 'id') {
        if (!Types.ObjectId.isValid(id)) {
            throw new BadRequestException(`Invalid ${name}`);
        }
        return new Types.ObjectId(id);
    }


    private haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
        const toRad = (x: number) => (x * Math.PI) / 180;
        const R = 6371;

        const dLat = toRad(b.lat - a.lat);
        const dLng = toRad(b.lng - a.lng);

        const aa =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(a.lat)) *
            Math.cos(toRad(b.lat)) *
            Math.sin(dLng / 2) ** 2;

        const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
        return R * c;
    }

    private buildCartPayload(cart: any) {
        const itemCount = (cart.items ?? []).reduce(
            (s: number, it: any) => s + Number(it.quantity ?? 0),
            0,
        );

        const items = (cart.items ?? []).map((it: any) => ({
            line_key: it.line_key,
            item_type: it.item_type,
            product_id: it.product_id ? String(it.product_id) : null,
            topping_id: it.topping_id ? String(it.topping_id) : null,
            name: it.product_name,
            image_url: it.product_image_url ?? null,
            quantity: Number(it.quantity ?? 0),
            unit_price: Number(it.unit_price ?? 0),
            base_price: it.base_price != null ? Number(it.base_price) : null,
            item_total: Number(it.item_total ?? 0),
            note: it.note ?? '',
            selected_options: it.selected_options ?? [],
            selected_toppings: it.selected_toppings ?? [],
        }));

        return { itemCount, items };
    }


    private async getActiveDeliveryCart(userId: string, merchantId: string) {
        const cart = await this.cartModel.findOne({
            user_id: this.oid(userId, 'userId'),
            merchant_id: this.oid(merchantId, 'merchantId'),
            order_type: OrderType.DELIVERY,
            status: CartStatus.ACTIVE,
            deleted_at: null,
        });

        if (!cart) throw new NotFoundException('Active delivery cart not found');
        if (!cart.items?.length) throw new BadRequestException('Cart is empty');

        return cart;
    }

    private async getMerchant(merchantId: string) {
        const merchant: any = await this.merchantModel.findById(
            this.oid(merchantId, 'merchantId'),
        ).lean();

        if (!merchant) throw new NotFoundException('Merchant not found');
        if (merchant.is_accepting_orders === false) {
            throw new BadRequestException('Merchant is not accepting orders');
        }

        const coords = merchant?.location?.coordinates;
        if (!Array.isArray(coords) || coords.length !== 2) {
            throw new BadRequestException('Merchant location is missing');
        }

        return merchant;
    }

    async preview(userId: string, q: DeliveryCheckoutPreviewQueryDto) {
        const paymentMethod = q.payment_method ?? PaymentMethod.CASH;
        const cart = await this.getActiveDeliveryCart(userId, q.merchant_id);
        const merchant: any = await this.getMerchant(q.merchant_id);

        const merchantCoords = merchant.location.coordinates;
        const prepMin = Number(merchant.average_prep_time_min ?? 15);
        const radiusKm = Number(merchant.delivery_radius_km ?? 0);

        const routeMeta = await this.deliveryRouteResolver.resolve({
            origin: { lat: q.lat, lng: q.lng },
            destination: {
                lat: Number(merchantCoords[1]),
                lng: Number(merchantCoords[0]),
            },
            prepMin,
            radiusKm,
        });

        const distanceKm = routeMeta.distanceKm;

        if (radiusKm > 0 && !routeMeta.canDeliver) {
            throw new BadRequestException('Address is outside merchant delivery radius');
        }

        const etaMin = routeMeta.etaMin;
        const etaAt = routeMeta.etaAt;

        const subtotalBeforeDiscount = (cart.items ?? []).reduce(
            (s: number, it: any) => s + Number(it.item_total ?? 0),
            0,
        );

        const deliveryFeeBeforeDiscount = this.pricingService.calcDeliveryFee(distanceKm);

        const promotions = await this.promotionEngine.resolve({
            userId,
            merchantId: q.merchant_id,
            orderType: OrderType.DELIVERY,
            paymentMethod,
            subtotal_before_discount: subtotalBeforeDiscount,
            delivery_fee_before_discount: deliveryFeeBeforeDiscount,
            cartItems: cart.items ?? [],
            voucherCode: q.voucher_code,
        });

        const platformFee = await this.pricingService.getPlatformFee(OrderType.DELIVERY);

        const pricing = this.pricingService.finalize({
            subtotal_before_discount: subtotalBeforeDiscount,
            delivery_fee_before_discount: deliveryFeeBeforeDiscount,
            platform_fee: platformFee,
            raw_food_discount: promotions.raw_food_discount,
            raw_delivery_discount: promotions.raw_delivery_discount,
        });

        const cartPayload = this.buildCartPayload(cart);

        return {
            type: 'delivery',
            merchant: {
                id: String(merchant._id),
                name: merchant.name,
                address: merchant.address ?? null,
            },
            delivery: {
                address: q.address ?? null,
                receiver_name: q.receiver_name ?? null,
                receiver_phone: q.receiver_phone ?? null,
                note: q.address_note ?? null,
                lat: q.lat,
                lng: q.lng,
                distance_km: Number(distanceKm.toFixed(2)),
                distance_text: routeMeta.distanceText,
                duration_text: routeMeta.durationText,
                prep_min: prepMin,
                eta_min: etaMin,
                eta_at: etaAt,
            },
            cart: {
                id: String(cart._id),
                item_count: cartPayload.itemCount,
                items: cartPayload.items,
            },
            payment: {
                selected_method: paymentMethod,
            },
            promotions,
            pricing,
        };
    }
    private getOrderPreviewImage(order: any): string | null {
        const items = Array.isArray(order?.items) ? order.items : [];

        for (const item of items) {
            const image = item?.product_image;
            if (typeof image === 'string' && image.trim().length > 0) {
                return image.trim();
            }
        }

        return null;
    }
    async placeOrder(
        userId: string,
        dto: DeliveryPlaceOrderDto,
        meta?: { clientIp?: string | null },
    ) {
        const preview = await this.preview(userId, {
            merchant_id: dto.merchant_id,
            lat: dto.lat,
            lng: dto.lng,
            payment_method: dto.payment_method,
            voucher_code: dto.voucher_code,
            address: dto.address,
            receiver_name: dto.receiver_name,
            receiver_phone: dto.receiver_phone,
            address_note: dto.address_note,
        });

        const cart = await this.getActiveDeliveryCart(userId, dto.merchant_id);

        const { order, payment } = await this.orderFactory.createDeliveryOrder({

            userId,
            merchantId: dto.merchant_id,
            cart,
            dto: {
                lat: dto.lat,
                lng: dto.lng,
                address: dto.address,
                receiver_name: dto.receiver_name,
                receiver_phone: dto.receiver_phone,
                address_note: dto.address_note,
                order_note: dto.order_note,
                payment_method: dto.payment_method,
            },
            preview,
        });
        await this.notificationsService.notifyCustomerOrderCreated({
            userId: String(order.customer_id),
            orderId: String(order._id),
            orderNumber: order.order_number,
            imageUrl: this.getOrderPreviewImage(order) ?? undefined,
            orderType: order.order_type,
        });
        let paymentAction: any = null;

        if (payment) {
            paymentAction = await this.checkoutPayment.createPaymentAction({
                order,
                payment,
                clientIp: meta?.clientIp ?? null,
            });
        } else {
            await this.orderFactory.markBenefitsUsed({
                userId,
                orderId: String(order._id),
                promotions: preview.promotions,
            });

            await this.orderFactory.clearCartByOrder(order);

            if (order.order_type === OrderType.DELIVERY) {
                await this.orderLifecycleService.activateDeliveryOrder(String(order._id));
            }
        }

        return {
            order_id: String(order._id),
            order_number: order.order_number,
            status: order.status,
            payment: payment
                ? {
                    payment_id: String(payment._id),
                    status: payment.status,
                    method: payment.payment_method,
                    amount: payment.amount,
                }
                : {
                    payment_id: null,
                    status: 'pending',
                    method: dto.payment_method,
                    amount: preview.pricing.total_amount,
                },
            payment_action: paymentAction,
            pricing: preview.pricing,
            delivery: preview.delivery,
        };
    }
}