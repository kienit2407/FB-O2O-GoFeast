import { Module } from '@nestjs/common';
import { GeoService } from './services/geo.service';
import { ConfigService } from 'src/config/config.service';
import { GeoController } from './controller/geo.controller';

@Module({
  controllers: [GeoController],
  providers: [GeoService, ConfigService], // hoặc import ConfigModule nếu bạn có
  exports: [GeoService],
})
export class GeoModule {}