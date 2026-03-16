import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';

import { OptionalJwtAuthGuard } from 'src/modules/auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';

import { PublicPromotionsService } from '../services/public-promotions.service';

@Controller('promotions/public')
@UseGuards(OptionalJwtAuthGuard)
export class PublicPromotionsController {
    constructor(private readonly svc: PublicPromotionsService) { }

    private userId(user: any): string | null {
        const id = user?.sub ?? user?.userId ?? user?._id ?? user?.id;
        return id ? String(id) : null;
    }

    @Get('merchant/:merchantId')
    async listMerchantPromotions(
        @Param('merchantId') merchantId: string,
        @Query('order_type') orderType: 'delivery' | 'dine_in' | undefined,
        @CurrentUser() user: any,
    ) {
        const data = await this.svc.listMerchantPromotions({
            merchantId,
            orderType,
            userId: this.userId(user),
        });

        return { success: true, data };
    }
    @Get('popup')
    async getPopupPromotion(@CurrentUser() user: any) {
        const data = await this.svc.getPopupPromotion({
            userId: this.userId(user),
        });

        return { success: true, data };
    }
    @Get(':promotionId')
    async getPromotionDetail(
        @Param('promotionId') promotionId: string,
        @CurrentUser() user: any,
    ) {
        const data = await this.svc.getPromotionDetail({
            promotionId,
            userId: this.userId(user),
        });

        return { success: true, data };
    }
}