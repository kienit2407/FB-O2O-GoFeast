import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Review, ReviewSchema } from './schemas/review.schema';
import {
  MerchantReview,
  MerchantReviewSchema,
} from './schemas/merchant-review.schema';
import {
  DriverReview,
  DriverReviewSchema,
} from './schemas/driver-review.schema';

import {
  Merchant,
  MerchantSchema,
} from '../merchants/schemas/merchant.schema';
import {
  Product,
  ProductSchema,
} from '../merchants/schemas/product.schema';
import {
  Order,
  OrderSchema,
} from '../orders/schemas/order.schema';
import {
  DriverProfile,
  DriverProfileSchema,
} from '../drivers/schemas/driver-profile.schema';
import { User, UserSchema } from '../users/schemas/user.schema';

import { ReviewsService } from './services/reviews.service';
import { MerchantReviewsService } from './services/merchant-reviews.service';
import { DriverReviewsService } from './services/driver-reviews.service';
import { ReviewStatusService } from './services/review-status.service';

import { CustomerReviewsController } from './controllers/customer-reviews.controller';
import { ReviewsMerchantController } from './controllers/reviews-merchant.controller';
import { DriverReviewsController } from './controllers/driver-reviews.controller';
import { RealtimeModule } from '../realtime/realtime.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReviewMediaUploadService } from './services/review-media-upload.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Review.name, schema: ReviewSchema },
      { name: MerchantReview.name, schema: MerchantReviewSchema },
      { name: DriverReview.name, schema: DriverReviewSchema },

      { name: Merchant.name, schema: MerchantSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Order.name, schema: OrderSchema },
      { name: DriverProfile.name, schema: DriverProfileSchema },
      { name: User.name, schema: UserSchema },
   
    ]),
    NotificationsModule,
    RealtimeModule,
  ],
  controllers: [
    CustomerReviewsController,
    ReviewsMerchantController,
    DriverReviewsController,
  ],
  providers: [
    ReviewsService,
    MerchantReviewsService,
    DriverReviewsService,
    ReviewMediaUploadService,
    ReviewStatusService,
  ],
  exports: [
    ReviewsService,
    MerchantReviewsService,
    ReviewMediaUploadService,
    DriverReviewsService,
    ReviewStatusService,
  ],
})
export class ReviewsModule { }