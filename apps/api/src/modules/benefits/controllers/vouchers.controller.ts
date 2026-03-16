import { Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { BenefitsUsageService } from '../services/benefits-usage.service';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@Controller()
export class VouchersController {
    constructor(private readonly benefits: BenefitsUsageService) { }

    @UseGuards(JwtAuthGuard)
    @Post('vouchers/:voucherId/save')
    save(@CurrentUser() u: any, @Param('voucherId') voucherId: string) {
        const uid = String(u?._id ?? u?.id ?? u?.sub ?? u?.userId);
        return this.benefits.saveVoucher(uid, voucherId);
    }

    @UseGuards(JwtAuthGuard)
    @Delete('vouchers/:voucherId/save')
    unsave(@CurrentUser() u: any, @Param('voucherId') voucherId: string) {
        const uid = String(u?._id ?? u?.id ?? u?.sub ?? u?.userId);
        return this.benefits.unsaveVoucher(uid, voucherId);
    }

    @UseGuards(JwtAuthGuard)
    @Get('me/vouchers')
    list(
        @CurrentUser() u: any,
        @Query('limit') limit?: string,
        @Query('cursor') cursor?: string,
    ) {
        const uid = String(u?._id ?? u?.id ?? u?.sub ?? u?.userId);
        return this.benefits.listSavedVouchers(uid, {
            limit: Number(limit ?? 50),
            cursor,
        });
    }
}