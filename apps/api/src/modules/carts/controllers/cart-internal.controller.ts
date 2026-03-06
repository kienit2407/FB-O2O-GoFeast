import { Controller, Param, Post } from '@nestjs/common';
import { CartService } from '../services/cart.service';

@Controller('carts/internal')
export class CartInternalController {
    constructor(private readonly cartService: CartService) { }

    @Post('dine-in/:table_session_id/abandon')
    async abandonDineIn(@Param('table_session_id') tableSessionId: string) {
        return this.cartService.abandonDineInCart({ tableSessionId });
    }
}