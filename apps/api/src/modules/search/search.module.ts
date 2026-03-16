import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { SearchPublicController } from './controllers/search-public.controller';
import { SearchService } from './services/search.service';

import {
    Merchant,
    MerchantSchema,
} from '../merchants/schemas/merchant.schema';
import {
    Product,
    ProductSchema,
} from '../merchants/schemas/product.schema';
import {
    ProductOption,
    ProductOptionSchema,
} from '../merchants/schemas/product-option.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Merchant.name, schema: MerchantSchema },
            { name: Product.name, schema: ProductSchema },
            { name: ProductOption.name, schema: ProductOptionSchema },
        ]),
    ],
    controllers: [SearchPublicController],
    providers: [SearchService],
    exports: [SearchService],
})
export class SearchModule { }