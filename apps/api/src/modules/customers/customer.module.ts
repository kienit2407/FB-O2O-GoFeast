import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomerProfile, CustomerProfileSchema } from './schemas/customer-profile.schema';
import { CustomerProfilesService } from './services/customer-profile.service';
import { GeoModule } from '../geo/geo.module';
import { CustomerMeController } from './controllers/customer.controller';
import { Order, OrderSchema } from '../orders/schemas';
import { CloudinaryModule } from 'src/common/services/cloudinary.module';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: CustomerProfile.name, schema: CustomerProfileSchema },
            { name: Order.name, schema: OrderSchema },
        ]),
        GeoModule,
        CloudinaryModule,
        UsersModule,
    ],
    controllers: [CustomerMeController],
    providers: [CustomerProfilesService],
    exports: [CustomerProfilesService], //  để AuthModule dùng được
})
export class CustomerModule { }