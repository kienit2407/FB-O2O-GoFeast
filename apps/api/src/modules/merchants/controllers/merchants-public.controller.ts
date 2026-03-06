// merchants/controllers/merchants-public.controller.ts
import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { MerchantDetailQueryDto } from '../dtos/merchant-detail.query';
import { MerchantsPublicService } from '../services/merchants-public.service';
import { OptionalJwtAuthGuard } from 'src/modules/auth';

@Controller('merchants')
export class MerchantsPublicController {
    constructor(private readonly svc: MerchantsPublicService) { }
    @UseGuards(OptionalJwtAuthGuard)
    @Get(':id/detail')
    async detail(@Param('id') id: string, @Query() q: MerchantDetailQueryDto, @Req() req: any) {
        const userId = req.user?.sub ?? req.user?._id ?? null; // nếu sau này bạn có optional auth
        return this.svc.getDetail({ merchantId: id, lat: q.lat, lng: q.lng, userId });
    }
    //  NEW: options + topping theo sản phẩm (public)
    @Get(':merchantId/products/:productId/config')
    async productConfig(
        @Param('merchantId') merchantId: string,
        @Param('productId') productId: string,
    ) {
        return this.svc.getProductConfig({ merchantId, productId });
    }
}