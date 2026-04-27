import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RealtimeGateway } from './realtime.gateway';
import { DispatchOfferService } from './services/dispatch-offer.service';
import { DineInModule } from '../dinein/dine-in.module';
import { Order, OrderSchema } from '../orders/schemas/order.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    forwardRef(() => DineInModule),
  ],
  providers: [RealtimeGateway, DispatchOfferService],
  exports: [DispatchOfferService, RealtimeGateway],
})
export class RealtimeModule {}
