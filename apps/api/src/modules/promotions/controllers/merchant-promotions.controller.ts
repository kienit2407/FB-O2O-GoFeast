import {
    Body, Controller, Get, Param, Patch, Post, UseGuards, Delete,
} from '@nestjs/common';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth';
import { MerchantPromotionsService } from '../services/merchant-promotions.service';
import { CreateMerchantPromotionDto } from '../dtos/merchant/create-merchant-promotion.dto';
import { UpdateMerchantPromotionDto } from '../dtos/merchant/update-merchant-promotion.dto';
import { CreateMerchantVoucherDto } from '../dtos/merchant/create-merchant-voucher.dto';
import { UpdateMerchantVoucherDto } from '../dtos/merchant/update-merchant-voucher.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class MerchantPromotionsController {
    constructor(private readonly svc: MerchantPromotionsService) { }

    private ownerId(user: any) {
        const id = user?.sub ?? user?.userId ?? user?._id ?? user?.id;
        return String(id);
    }

    // ----- promotions -----
    @Get('promotions/me')
    listPromotions(@CurrentUser() user: any) {
        return this.svc.listPromotions(this.ownerId(user));
    }

    // ✅ JSON thường, không cần file/banner
    @Post('promotions/me')
    createPromotion(@CurrentUser() user: any, @Body() dto: CreateMerchantPromotionDto) {
        return this.svc.createPromotion(this.ownerId(user), dto);
    }

    @Patch('promotions/me/:id')
    updatePromotion(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateMerchantPromotionDto) {
        return this.svc.updatePromotion(this.ownerId(user), id, dto);
    }

    @Patch('promotions/me/:id/active')
    togglePromotion(@CurrentUser() user: any, @Param('id') id: string, @Body() body: { is_active: boolean }) {
        return this.svc.togglePromotion(this.ownerId(user), id, !!body.is_active);
    }

    @Delete('promotions/me/:id')
    deletePromotion(@CurrentUser() user: any, @Param('id') id: string) {
        return this.svc.deletePromotion(this.ownerId(user), id);
    }

    // ----- vouchers -----
    @Get('vouchers/me')
    listVouchers(@CurrentUser() user: any) {
        return this.svc.listVouchers(this.ownerId(user));
    }

    @Post('vouchers/me')
    createVoucher(@CurrentUser() user: any, @Body() dto: CreateMerchantVoucherDto) {
        return this.svc.createVoucher(this.ownerId(user), dto);
    }

    @Patch('vouchers/me/:id')
    updateVoucher(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateMerchantVoucherDto) {
        return this.svc.updateVoucher(this.ownerId(user), id, dto);
    }

    @Patch('vouchers/me/:id/active')
    toggleVoucher(@CurrentUser() user: any, @Param('id') id: string, @Body() body: { is_active: boolean }) {
        return this.svc.toggleVoucher(this.ownerId(user), id, !!body.is_active);
    }

    @Delete('vouchers/me/:id')
    deleteVoucher(@CurrentUser() user: any, @Param('id') id: string) {
        return this.svc.deleteVoucher(this.ownerId(user), id);
    }
}