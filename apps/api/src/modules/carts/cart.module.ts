import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Cart, CartSchema } from './schemas/cart.schema';


// các model bạn đã có sẵn
import { Product, ProductSchema } from '../merchants/schemas/product.schema';
import { ProductOption, ProductOptionSchema } from '../merchants/schemas/product-option.schema';
import { Topping, ToppingSchema } from '../merchants/schemas/topping.schema';
import { TableSession, TableSessionSchema } from '../dinein/schemas';
import { CartService } from './services/cart.service';
import { CartPublicController } from './controllers/cart-public.controller';
import { CartInternalController } from './controllers/cart-internal.controller';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Cart.name, schema: CartSchema },
            { name: Product.name, schema: ProductSchema },
            { name: ProductOption.name, schema: ProductOptionSchema },
            { name: Topping.name, schema: ToppingSchema },
            { name: TableSession.name, schema: TableSessionSchema },
        ]),
    ],
    controllers: [CartPublicController, CartInternalController],
    providers: [CartService],
    exports: [CartService],
})
export class CartModule { }