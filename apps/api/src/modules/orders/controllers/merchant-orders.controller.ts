import {
    Body,
    Controller,
    Get,
    Param,
    Patch,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { ClientGuard } from 'src/modules/auth/guards/client.guard';
import { Client } from 'src/modules/auth/decorators/client.decorator';

import { MerchantOrderActionDto } from '../dtos/merchant-order-action.dto';
import { OrderLifecycleService } from '../services/order-lifecycle.service';
import { MerchantOrderQueryService } from '../services/merchant-order-query.service';
import { MerchantOrdersQueryDto } from '../dtos/merchant-orders.query.dto';
import { MerchantRejectOrderDto } from '../dtos/merchant-reject-order.dto';

@Controller('merchant/orders')
@Client('merchant_web')
@UseGuards(JwtAuthGuard, RolesGuard, ClientGuard)
@Roles('merchant')
export class MerchantOrdersController {
    constructor(
        private readonly lifecycle: OrderLifecycleService,
        private readonly queryService: MerchantOrderQueryService,
    ) { }

    @Get()
    async list(@Req() req: any, @Query() query: MerchantOrdersQueryDto) {
        const data = await this.queryService.listForMerchantOwner(req.user.userId, query);
        return { success: true, data };
    }

    @Get(':id')
    async detail(@Req() req: any, @Param('id') id: string) {
        const data = await this.queryService.getDetailForMerchantOwner(
            req.user.userId,
            id,
        );
        return { success: true, data };
    }

    @Patch(':id/confirm')
    async confirm(
        @Req() req: any,
        @Param('id') id: string,
        @Body() dto: MerchantOrderActionDto,
    ) {
        await this.lifecycle.merchantConfirmOrder(req.user.userId, id, dto.note);

        const data = await this.queryService.getDetailForMerchantOwner(
            req.user.userId,
            id,
        );

        return { success: true, data };
    }

    @Patch(':id/reject')
    async reject(
        @Req() req: any,
        @Param('id') id: string,
        @Body() dto: MerchantRejectOrderDto,
    ) {
        await this.lifecycle.merchantRejectPendingOrder(
            req.user.userId,
            id,
            dto.reason,
        );

        const data = await this.queryService.getDetailForMerchantOwner(
            req.user.userId,
            id,
        );

        return { success: true, data };
    }

    @Patch(':id/preparing')
    async preparing(
        @Req() req: any,
        @Param('id') id: string,
        @Body() dto: MerchantOrderActionDto,
    ) {
        await this.lifecycle.merchantStartPreparing(req.user.userId, id, dto.note);

        const data = await this.queryService.getDetailForMerchantOwner(
            req.user.userId,
            id,
        );

        return { success: true, data };
    }

    @Patch(':id/ready-for-pickup')
    async ready(
        @Req() req: any,
        @Param('id') id: string,
        @Body() dto: MerchantOrderActionDto,
    ) {
        await this.lifecycle.merchantReadyForPickup(req.user.userId, id, dto.note);

        const data = await this.queryService.getDetailForMerchantOwner(
            req.user.userId,
            id,
        );

        return { success: true, data };
    }
}