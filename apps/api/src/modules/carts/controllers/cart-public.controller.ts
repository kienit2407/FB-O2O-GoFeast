import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AddCartItemDto } from '../dtos/add-cart-item.dto';
import { UpdateCartItemDto } from '../dtos/update-cart-item.dto';
import { CartService } from '../services/cart.service';
import { OptionalJwtAuthGuard } from 'src/modules/auth';

@Controller('carts')
export class CartPublicController {
    constructor(private readonly cartService: CartService) { }

    // DELIVERY (AUTH REQUIRED)
    @UseGuards(AuthGuard('jwt'))
    @Get('delivery/current')
    async getDeliveryCurrent(@Req() req: any, @Query('merchant_id') merchantId: string) {
        const userId = req.user?.userId;
        return this.cartService.getOrCreateDeliveryCart({ userId, merchantId });
    }
    @UseGuards(OptionalJwtAuthGuard)
    // summary cho guest cũng được -> không guard
    @Get('delivery/summary')
    async getDeliverySummary(@Req() req: any, @Query('merchant_id') merchantId: string) {
        const userId = req.user?.userId;
        return this.cartService.getDeliverySummary({ userId, merchantId });
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('delivery/items')
    async addDeliveryItem(@Req() req: any, @Query('merchant_id') merchantId: string, @Body() dto: AddCartItemDto) {
        const userId = req.user?.userId;
        return this.cartService.addItemDelivery({ userId, merchantId, dto });
    }

    @UseGuards(AuthGuard('jwt'))
    @Patch('delivery/items/:line_key')
    async updateDeliveryItem(
        @Req() req: any,
        @Query('merchant_id') merchantId: string,
        @Param('line_key') lineKey: string,
        @Body() dto: UpdateCartItemDto,
    ) {
        const userId = req.user?.userId;
        return this.cartService.updateItemDelivery({ userId, merchantId, lineKey, dto });
    }

    @UseGuards(AuthGuard('jwt'))
    @Delete('delivery/items/:line_key')
    async removeDeliveryItem(@Req() req: any, @Query('merchant_id') merchantId: string, @Param('line_key') lineKey: string) {
        const userId = req.user?.userId;
        return this.cartService.removeItemDelivery({ userId, merchantId, lineKey });
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('delivery/clear')
    async clearDelivery(@Req() req: any, @Query('merchant_id') merchantId: string) {
        const userId = req.user?.userId;
        return this.cartService.clearDelivery({ userId, merchantId });
    }

    // DINE-IN (GUEST)
    @Get('dine-in/current')
    async getDineInCurrent(@Query('table_session_id') tableSessionId: string) {
        return this.cartService.getOrCreateDineInCart({ tableSessionId });
    }

    @Get('dine-in/summary')
    async getDineInSummary(@Query('table_session_id') tableSessionId: string) {
        return this.cartService.getDineInSummary({ tableSessionId });
    }

    @Post('dine-in/items')
    async addDineInItem(@Query('table_session_id') tableSessionId: string, @Body() dto: AddCartItemDto) {
        return this.cartService.addItemDineIn({ tableSessionId, dto });
    }

    @Patch('dine-in/items/:line_key')
    async updateDineInItem(@Query('table_session_id') tableSessionId: string, @Param('line_key') lineKey: string, @Body() dto: UpdateCartItemDto) {
        return this.cartService.updateItemDineIn({ tableSessionId, lineKey, dto });
    }

    @Delete('dine-in/items/:line_key')
    async removeDineInItem(@Query('table_session_id') tableSessionId: string, @Param('line_key') lineKey: string) {
        return this.cartService.removeItemDineIn({ tableSessionId, lineKey });
    }

    @Post('dine-in/clear')
    async clearDineIn(@Query('table_session_id') tableSessionId: string) {
        return this.cartService.clearDineIn({ tableSessionId });
    }
}