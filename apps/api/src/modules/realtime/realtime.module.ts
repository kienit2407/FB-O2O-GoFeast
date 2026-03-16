import { Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { DispatchOfferService } from './services/dispatch-offer.service';
import { AuthModule } from '../auth/auth.module';

@Module({
    providers: [RealtimeGateway, DispatchOfferService],
    exports: [DispatchOfferService, RealtimeGateway],
})
export class RealtimeModule { }