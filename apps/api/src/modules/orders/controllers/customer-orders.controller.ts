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
import { CustomerCancelOrderDto } from '../dtos/customer-cancel-order.dto';
import { OrderLifecycleService } from '../services/order-lifecycle.service';
import { OrderTrackingQueryService } from '../services/order-tracking-query.service';
import { CustomerOrdersQueryDto } from '../dtos/customer-orders.query.dto';
import { CustomerOrderQueryService } from '../services/customer-order-query.service';

@Controller('orders/me')
@UseGuards(JwtAuthGuard)
export class CustomerOrdersController {
    constructor(
        private readonly lifecycle: OrderLifecycleService,
        private readonly trackingQuery: OrderTrackingQueryService,
        private readonly customerOrderQueryService: CustomerOrderQueryService,
        
    ) { }
    @Get('tab-counts')
    async getTabCounts(@Req() req: any) {
        const data = await this.customerOrderQueryService.getTabCounts(
            req.user.userId,
        );
        return { success: true, data };
    }

    @Get('active')
    async getActive(@Req() req: any, @Query() query: CustomerOrdersQueryDto) {
        const data = await this.customerOrderQueryService.getActiveOrders(
            req.user.userId,
            query,
        );
        return { success: true, data };
    }

    @Get('history')
    async getHistory(@Req() req: any, @Query() query: CustomerOrdersQueryDto) {
        const data = await this.customerOrderQueryService.getHistoryOrders(
            req.user.userId,
            query,
        );
        return { success: true, data };
    }

    @Get(':id')
    async getDetail(@Req() req: any, @Param('id') id: string) {
        const data = await this.customerOrderQueryService.getOrderDetail(
            req.user.userId,
            id,
        );
        return { success: true, data };
    }
    @Get(':id/tracking')
    async tracking(@Req() req: any, @Param('id') id: string) {
        const data = await this.trackingQuery.getCustomerTracking(
            req.user.userId,
            id,
        );

        return {
            success: true,
            data,
        };
    }

    @Patch(':id/cancel')
    async cancel(
        @Req() req: any,
        @Param('id') id: string,
        @Body() dto: CustomerCancelOrderDto,
    ) {
        const data = await this.lifecycle.customerCancelPendingOrder(
            req.user.userId,
            id,
            dto.reason,
        );

        return {
            success: true,
            data,
        };
    }
}