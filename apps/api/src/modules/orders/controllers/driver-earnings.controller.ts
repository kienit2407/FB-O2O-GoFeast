import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { Client } from 'src/modules/auth/decorators/client.decorator';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { ClientGuard } from 'src/modules/auth/guards/client.guard';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';

import { DriverEarningsQueryService } from '../services/driver-earnings-query.service';
import { DriverEarningsQueryDto } from '../dtos/driver-earnings.query.dto';

@Controller('driver/earnings')
@Client('driver_mobile')
@UseGuards(JwtAuthGuard, RolesGuard, ClientGuard)
@Roles('driver')
export class DriverEarningsController {
    constructor(
        private readonly driverEarningsQueryService: DriverEarningsQueryService,
    ) { }

    @Get('summary')
    async getSummary(@Req() req: any, @Query() query: DriverEarningsQueryDto) {
        const data = await this.driverEarningsQueryService.getSummary(
            req.user.userId,
            query,
        );

        return {
            success: true,
            data,
            statusCode: 200,
        };
    }

    @Get('history')
    async getHistory(@Req() req: any, @Query() query: DriverEarningsQueryDto) {
        const data = await this.driverEarningsQueryService.getHistory(
            req.user.userId,
            query,
        );

        return {
            success: true,
            data,
            statusCode: 200,
        };
    }
}