import {
    Controller,
    Get,
    Param,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';
import { Client } from 'src/modules/auth/decorators/client.decorator';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { ClientGuard } from 'src/modules/auth/guards/client.guard';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';

import { DriverReviewsService } from '../services/driver-reviews.service';

@Controller('driver/reviews')
@Client('driver_mobile')
@UseGuards(JwtAuthGuard, RolesGuard, ClientGuard)
@Roles('driver')
export class DriverReviewsController {
    constructor(
        private readonly driverReviewsService: DriverReviewsService,
    ) { }

    @Get('mine')
    async listMine(
        @Req() req: any,
        @Query('cursor') cursor?: string,
        @Query('limit') limit?: string,
    ) {
        const data = await this.driverReviewsService.listForDriver(
            req.user.userId,
            {
                cursor,
                limit: limit ? Number(limit) : undefined,
            },
        );

        return { success: true, data };
    }

    @Get('mine/:id')
    async getMineDetail(@Req() req: any, @Param('id') id: string) {
        const data = await this.driverReviewsService.getDetailForDriver(
            req.user.userId,
            id,
        );

        return { success: true, data };
    }
}