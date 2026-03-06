import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DriverProfile, DriverProfileSchema } from './schemas/driver-profile.schema';
import { DriverProfilesService } from './services/driver-profiles.service';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: DriverProfile.name, schema: DriverProfileSchema }]),
        
    ],
    providers: [DriverProfilesService],
    exports: [DriverProfilesService],
})
export class DriversModule { }