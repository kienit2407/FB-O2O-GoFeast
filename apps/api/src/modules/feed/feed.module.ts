import { Module } from '@nestjs/common';
import { FeedController } from './controller/feed.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Merchant, MerchantSchema, Product, ProductSchema } from '../merchants/schemas';
import { Order, OrderSchema } from '../orders/schemas';
import { UserInteraction, UserInteractionSchema } from '../ai/schemas/user-interaction.schema';
import { CacheModule } from '@nestjs/cache-manager';
import { FeedImpression, FeedImpressionSchema } from './shemas/feed-impression.schema';
import { FeedService } from './services/feed.service';

@Module({
  imports: [

    MongooseModule.forFeature([
      { name: Merchant.name, schema: MerchantSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Order.name, schema: OrderSchema },
      { name: UserInteraction.name, schema: UserInteractionSchema },
      { name: FeedImpression.name, schema: FeedImpressionSchema },
    ]),
  ],
  controllers: [FeedController],
  providers: [FeedService]
})
export class FeedModule { }
