
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SystemConfigsService } from './services/system-configs.service';
import { SystemConfig, SystemConfigSchema } from './shemas/system-config.schema';


@Module({
    imports: [
        MongooseModule.forFeature([{ name: SystemConfig.name, schema: SystemConfigSchema }]),
    ],
    providers: [SystemConfigsService],
    exports: [SystemConfigsService],
})
export class SystemConfigsModule { }