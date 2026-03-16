// apps/api/src/modules/promotions/promotions.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { Merchant, MerchantSchema } from '../merchants/schemas/merchant.schema';
import { Promotion, PromotionSchema } from './schemas/promotion.schema';
import { Voucher, VoucherSchema } from './schemas/voucher.schema';
import { MerchantPromotionsService } from './services/merchant-promotions.service';
import { MerchantPromotionsController } from './controllers/merchant-promotions.controller';
import { CloudinaryModule } from '../../common/services/cloudinary.module';
import { AdminPromotionsController } from './controllers/admin-promotions.controller';
import { AdminPromotionsService } from './services/admin-promotions.service';
import { CloudinaryService } from 'src/common/services/cloudinary.service';
import { CarouselBanner, CarouselBannerSchema } from './schemas/carousel-banner.schema';
import { CarouselBannersService } from './services/carousel-banners.service';
import { AdminCarouselBannersController } from './controllers/admin-carousel-banners.controller';
import { CarouselBannersController } from './controllers/carousel-banners.controller';
import { Category, CategorySchema, Product, ProductSchema } from '../merchants/schemas';
import { PromotionPushScheduler } from './services/promotion-push.scheduler';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { PlatformPromotionsController } from './controllers/platform-promotions.controller';
import { PublicPromotionsController } from './controllers/public-promotions.controller';
import { PublicPromotionsService } from './services/public-promotions.service';
import { BenefitsModule } from '../benefits/benefits.module';

@Module({
    imports: [
        
        MongooseModule.forFeature([
            { name: Merchant.name, schema: MerchantSchema },
            { name: Promotion.name, schema: PromotionSchema },
            { name: Voucher.name, schema: VoucherSchema },
            { name: CarouselBanner.name, schema: CarouselBannerSchema },
            { name: Product.name, schema: ProductSchema },
            { name: Category.name, schema: CategorySchema },
            
        ]),
        CloudinaryModule,
        UsersModule,
        RealtimeModule,
        BenefitsModule,
        NotificationsModule,
        MulterModule.register({ dest: './uploads' }),
    ],
    controllers: [MerchantPromotionsController, AdminPromotionsController, AdminCarouselBannersController, CarouselBannersController,PlatformPromotionsController, PublicPromotionsController],
    providers: [MerchantPromotionsService, AdminPromotionsService, CloudinaryService, CarouselBannersService, PromotionPushScheduler, PublicPromotionsService],
    exports: [MerchantPromotionsService, AdminPromotionsService, CarouselBannersService, MongooseModule],
})
export class PromotionsModule { }
