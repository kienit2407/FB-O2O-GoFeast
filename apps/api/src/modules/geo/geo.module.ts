import { Module } from '@nestjs/common';
import { GeoService } from './services/geo.service';
import { ConfigService } from 'src/config/config.service';
import { GeoController } from './controller/geo.controller';
import { DeliveryRouteResolverService } from './services/delivery-route-resolver.service';

@Module({
  controllers: [GeoController],
  providers: [GeoService, ConfigService, DeliveryRouteResolverService], // hoặc import ConfigModule nếu bạn có
  exports: [GeoService, DeliveryRouteResolverService],
})
export class GeoModule {}