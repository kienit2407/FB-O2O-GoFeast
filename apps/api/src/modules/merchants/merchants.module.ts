import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Merchant, MerchantSchema } from './schemas/merchant.schema';
import { Category, CategorySchema } from './schemas/category.schema';
import { Product, ProductSchema } from './schemas/product.schema';
import { Topping, ToppingSchema } from './schemas/topping.schema';
import { ProductOption, ProductOptionSchema } from './schemas/product-option.schema';

import { MerchantsService } from './services/merchants.service';
import { ToppingsService } from './services/toppings.service';
import { CategoriesService } from './services/categories.service';
import { ProductsService } from './services/products.service';
import { ProductOptionsService } from './services/product-options.service';

import { CategoriesController } from './controllers/categories.controller';
import { ProductsController } from './controllers/products.controller';
import { ToppingsController } from './controllers/toppings.controller';
import { ProductOptionsController } from './controllers/product-options.controller';
import { CommonModule } from 'src/common/common.module';
import { MerchantsController } from './controllers/merchants.controller';
import { MerchantsPublicController } from './controllers/merchants-public.controller';
import { MerchantsPublicService } from './services/merchants-public.service';
import { PromotionsModule } from '../promotions/promotions.module';
import { GeoModule } from '../geo/geo.module';
import { Promotion, PromotionSchema } from '../promotions/schemas';
import { FavoritesModule } from '../favorites/favorites.module';
import { BenefitsModule } from '../benefits/benefits.module';
import { CartModule } from '../carts/cart.module';
import { ProductsPublicService } from './services/products-public.service';
import { ProductsPublicController } from './controllers/products-public.controller';
import { ReviewsModule } from '../reviews/reviews.module';

@Module({
  imports: [
    CommonModule,
    GeoModule,
    PromotionsModule,
    CartModule,
    ReviewsModule,
    FavoritesModule,     // Giả sử chứa MerchantFavoritesService
    BenefitsModule,      // Giả sử chứa BenefitsUsageService
    MongooseModule.forFeature([
      { name: Merchant.name, schema: MerchantSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Product.name, schema: ProductSchema },
      { name: Topping.name, schema: ToppingSchema },
      { name: ProductOption.name, schema: ProductOptionSchema },
      { name: Promotion.name, schema: PromotionSchema },
    ]),

  ],
  controllers: [
    CategoriesController,
    ProductsController,
    ToppingsController,
    ProductOptionsController,
    MerchantsController,
    MerchantsPublicController,
    ProductsPublicController
  ],
  providers: [
    MerchantsService,
    ToppingsService,
    CategoriesService,
    ProductsService,
    ProductOptionsService,
    MerchantsPublicService,
    ProductsPublicService
  ],
  exports: [MerchantsService, ToppingsService, CategoriesService, ProductsService, ProductOptionsService],
})
export class MerchantsModule { }
