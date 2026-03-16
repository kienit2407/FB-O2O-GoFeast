import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { Client } from 'src/modules/auth/decorators/client.decorator';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { ClientGuard } from 'src/modules/auth/guards/client.guard';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';

import { MerchantStatisticsService } from '../services/merchant-statistics.service';
import { MerchantStatisticsQueryDto } from '../dtos/merchant-statistics.query.dto';

@Controller('merchant/statistics')
@Client('merchant_web')
@UseGuards(JwtAuthGuard, RolesGuard, ClientGuard)
@Roles('merchant')
export class MerchantStatisticsController {
    constructor(
        private readonly merchantStatisticsService: MerchantStatisticsService,
    ) { }

    @Get('dashboard')
    async getDashboard(@Req() req: any) {
        const data = await this.merchantStatisticsService.getDashboard(
            req.user.userId,
        );

        return { success: true, data };
    }

    @Get('revenue')
    async getRevenue(
        @Req() req: any,
        @Query() query: MerchantStatisticsQueryDto,
    ) {
        const data = await this.merchantStatisticsService.getRevenueReport(
            req.user.userId,
            {
                period: query.period,
            },
        );

        return { success: true, data };
    }

    @Get('best-sellers')
    async getBestSellers(
        @Req() req: any,
        @Query() query: MerchantStatisticsQueryDto,
    ) {
        const data = await this.merchantStatisticsService.getBestSellers(
            req.user.userId,
            {
                period: query.period,
                limit: query.limit,
            },
        );

        return { success: true, data };
    }
}