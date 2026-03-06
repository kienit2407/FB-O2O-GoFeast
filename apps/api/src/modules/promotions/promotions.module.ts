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

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Merchant.name, schema: MerchantSchema },
            { name: Promotion.name, schema: PromotionSchema },
            { name: Voucher.name, schema: VoucherSchema },
            { name: CarouselBanner.name, schema: CarouselBannerSchema },
        ]),
        CloudinaryModule,
        MulterModule.register({ dest: './uploads' }),
    ],
    controllers: [MerchantPromotionsController, AdminPromotionsController, AdminCarouselBannersController, CarouselBannersController],
    providers: [MerchantPromotionsService, AdminPromotionsService, CloudinaryService, CarouselBannersService],
    exports: [MerchantPromotionsService, AdminPromotionsService, CarouselBannersService, MongooseModule],
})
export class PromotionsModule { }
