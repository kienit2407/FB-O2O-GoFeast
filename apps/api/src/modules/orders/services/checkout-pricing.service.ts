import { Injectable } from '@nestjs/common';
import { OrderType } from '../schemas/order.schema';
import { SystemConfigsService } from 'src/modules/system-config/services/system-configs.service';

@Injectable()
export class CheckoutPricingService {
    private readonly BASE_DELIVERY_FEE = 16000;
    private readonly BASE_DELIVERY_KM = 2;
    private readonly EXTRA_FEE_PER_KM = 4000;

    constructor(
        private readonly systemConfigsService: SystemConfigsService,
    ) { }

    calcDeliveryFee(distanceKm: number) {
        if (distanceKm <= this.BASE_DELIVERY_KM) return this.BASE_DELIVERY_FEE;

        const extraKm = Math.ceil(distanceKm - this.BASE_DELIVERY_KM);
        return this.BASE_DELIVERY_FEE + extraKm * this.EXTRA_FEE_PER_KM;
    }

    async getPlatformFee(orderType: OrderType) {
        const cfg = await this.systemConfigsService.getCommissionRulesV1();
        const fixed = Math.max(0, Math.round(Number(cfg?.platform_fee_fixed ?? 0)));

        // giữ đúng logic hiện tại:
        // chỉ delivery mới thu platform fee
        return orderType === OrderType.DELIVERY ? fixed : 0;

        // nếu sau này bạn muốn "global" thật cho cả dine-in:
        // return fixed;
    }

    finalize(args: {
        subtotal_before_discount: number;
        delivery_fee_before_discount: number;
        platform_fee: number;
        raw_food_discount: number;
        raw_delivery_discount: number;
    }) {
        const food_discount = Math.min(
            Math.max(0, Math.round(args.raw_food_discount)),
            Math.round(args.subtotal_before_discount),
        );

        const delivery_discount = Math.min(
            Math.max(0, Math.round(args.raw_delivery_discount)),
            Math.round(args.delivery_fee_before_discount),
        );

        const subtotal =
            Math.max(0, Math.round(args.subtotal_before_discount) - food_discount);

        const delivery_fee =
            Math.max(0, Math.round(args.delivery_fee_before_discount) - delivery_discount);

        const platform_fee = Math.max(0, Math.round(args.platform_fee));
        const total_discount = food_discount + delivery_discount;
        const total_amount = subtotal + delivery_fee + platform_fee;

        return {
            subtotal_before_discount: Math.round(args.subtotal_before_discount),
            delivery_fee_before_discount: Math.round(args.delivery_fee_before_discount),
            subtotal,
            delivery_fee,
            platform_fee,
            food_discount,
            delivery_discount,
            total_discount,
            total_amount,
        };
    }
}