import { Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { BenefitsUsageService } from '../services/benefits-usage.service';

// ⚠️ đổi theo auth project bạn
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@Controller()
export class VouchersController {
    constructor(private readonly benefits: BenefitsUsageService) { }

    @UseGuards(JwtAuthGuard)
    @Post('vouchers/:voucherId/save')
    save(@CurrentUser() u: any, @Param('voucherId') voucherId: string) {
        return this.benefits.saveVoucher(String(u._id), voucherId);
    }

    @UseGuards(JwtAuthGuard)
    @Delete('vouchers/:voucherId/save')
    unsave(@CurrentUser() u: any, @Param('voucherId') voucherId: string) {
        return this.benefits.unsaveVoucher(String(u._id), voucherId);
    }

    @UseGuards(JwtAuthGuard)
    @Get('me/vouchers')
    list(
        @CurrentUser() u: any,
        @Query('limit') limit?: string,
        @Query('cursor') cursor?: string,
    ) {
        return this.benefits.listSavedVouchers(String(u._id), {
            limit: Number(limit ?? 50),
            cursor,
        });
    }
}