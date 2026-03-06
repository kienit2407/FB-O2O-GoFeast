import { Module } from '@nestjs/common';
import { ReviewsPublicController } from './controllers/reviews-public.controller';
import { ReviewsAdminController } from './controllers/reviews-admin.controller';
import { ReviewsService } from './services/reviews.service';
import { Review, ReviewSchema } from './schemas/review.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { Merchant, MerchantSchema, Product, ProductSchema } from '../merchants/schemas';
import { Order, OrderSchema } from '../orders/schemas';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Review.name, schema: ReviewSchema },
      { name: Merchant.name, schema: MerchantSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
  ],
  controllers: [ReviewsPublicController, ReviewsAdminController],
  providers: [ReviewsService]
})
export class ReviewsModule { }
