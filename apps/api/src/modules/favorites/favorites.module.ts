import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { MerchantFavoritesService } from './services/merchant-favorites.service';
import { MerchantFavorite, MerchantFavoriteSchema } from './schemas/merchant-favorite.schema';
import { Merchant, MerchantSchema } from '../merchants/schemas/merchant.schema';
import { MerchantFavoritesController } from './controller/merchant-favorites.controller';

// 1. Import thêm Schema của Promotion và Voucher (sửa lại path nếu cần)
import { Promotion, PromotionSchema } from '../promotions/schemas/promotion.schema';
import { Voucher, VoucherSchema } from '../promotions/schemas';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MerchantFavorite.name, schema: MerchantFavoriteSchema },
      { name: Merchant.name, schema: MerchantSchema },
      // 2. Khai báo thêm 2 Model này vào để Service có thể Inject được
      { name: Promotion.name, schema: PromotionSchema },
      { name: Voucher.name, schema: VoucherSchema },
    ]),
  ],
  controllers: [MerchantFavoritesController],
  providers: [MerchantFavoritesService],
  exports: [MerchantFavoritesService],
})
export class FavoritesModule { }