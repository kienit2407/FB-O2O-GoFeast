import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';

import { CartService } from '../services/cart.service';
import { AddCartItemDto } from '../dtos/add-cart-item.dto';
import { UpdateCartItemDto } from '../dtos/update-cart-item.dto';

import { DineInSessionGuard } from 'src/modules/dinein/guards/dinein-session.guard';
import { CurrentDineIn } from 'src/modules/dinein/decorators/current-dinein.decorator';

@Controller('carts/dine-in/public')
@UseGuards(DineInSessionGuard)
export class PublicDineInCartController {
    constructor(private readonly cartService: CartService) { }

    @Get('current')
    async getCurrent(@CurrentDineIn() dineIn: any) {
        const data = await this.cartService.getOrCreateDineInCart({
            tableSessionId: dineIn.tableSessionId,
        });
        return { success: true, data };
    }

    @Get('summary')
    async getSummary(@CurrentDineIn() dineIn: any) {
        const data = await this.cartService.getDineInSummary({
            tableSessionId: dineIn.tableSessionId,
        });
        return { success: true, data };
    }

    @Post('items')
    async addItem(
        @CurrentDineIn() dineIn: any,
        @Body() dto: AddCartItemDto,
    ) {
        const data = await this.cartService.addItemDineIn({
            tableSessionId: dineIn.tableSessionId,
            dto,
        });
        return { success: true, data };
    }

    @Patch('items/:lineKey')
    async updateItem(
        @CurrentDineIn() dineIn: any,
        @Param('lineKey') lineKey: string,
        @Body() dto: UpdateCartItemDto,
    ) {
        const data = await this.cartService.updateItemDineIn({
            tableSessionId: dineIn.tableSessionId,
            lineKey,
            dto,
        });
        return { success: true, data };
    }

    @Delete('items/:lineKey')
    async removeItem(
        @CurrentDineIn() dineIn: any,
        @Param('lineKey') lineKey: string,
    ) {
        const data = await this.cartService.removeItemDineIn({
            tableSessionId: dineIn.tableSessionId,
            lineKey,
        });
        return { success: true, data };
    }

    @Delete('clear')
    async clear(@CurrentDineIn() dineIn: any) {
        const data = await this.cartService.clearDineIn({
            tableSessionId: dineIn.tableSessionId,
        });
        return { success: true, data };
    }
    @Post('abandon')
    async abandon(@CurrentDineIn() dineIn: any) {
        const data = await this.cartService.abandonDineInCart({
            tableSessionId: dineIn.tableSessionId,
        });
        return { success: true, data };
    }
}