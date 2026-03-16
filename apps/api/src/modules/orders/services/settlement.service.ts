import { Injectable } from '@nestjs/common';
import { SystemConfigsService } from 'src/modules/system-config/services/system-configs.service';

@Injectable()
export class SettlementService {
    constructor(
        private readonly systemConfigsService: SystemConfigsService,
    ) { }

    async buildSettlement(order: any) {
        const rules = await this.systemConfigsService.getCommissionRulesV1();

        const subtotal = Number(order.subtotal ?? 0);
        const deliveryFee = Number(order.delivery_fee ?? 0);
        const platformFee = Number(order.platform_fee ?? 0);

        const merchantRate = Number(rules?.merchant_commission_rate ?? 0.2);
        const driverRate = Number(rules?.driver_commission_rate ?? 0.1);

        const merchantGross = subtotal;
        const merchantCommissionAmount = merchantGross * merchantRate;
        const merchantNet = merchantGross - merchantCommissionAmount;

        const driverGross = deliveryFee;
        const driverCommissionAmount = driverGross * driverRate;
        const driverNet = driverGross - driverCommissionAmount;

        const sponsorCost = Number(order.discounts?.total_discount ?? 0);

        const platformRevenue =
            merchantCommissionAmount +
            driverCommissionAmount +
            platformFee;

        return {
            merchant_gross: merchantGross,
            merchant_commission_rate: merchantRate,
            merchant_commission_amount: merchantCommissionAmount,
            merchant_net: merchantNet,

            driver_gross: driverGross,
            driver_commission_rate: driverRate,
            driver_commission_amount: driverCommissionAmount,
            driver_net: driverNet,

            platform_fee: platformFee,
            platform_revenue: platformRevenue,
            sponsor_cost: sponsorCost,
        };
    }
}