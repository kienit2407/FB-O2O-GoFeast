import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { BenefitsUsageService } from './services/benefits-usage.service';
import { VouchersController } from './controllers/vouchers.controller';

import { UserVoucher, UserVoucherSchema } from './schemas/user-voucher.schema';
import { PromotionUsage, PromotionUsageSchema } from './schemas/promotion-usage.schema';
import { Promotion, PromotionSchema, Voucher, VoucherSchema } from '../promotions/schemas';
import { Merchant, MerchantSchema } from '../merchants/schemas';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserVoucher.name, schema: UserVoucherSchema },
      { name: PromotionUsage.name, schema: PromotionUsageSchema },
      { name: Voucher.name, schema: VoucherSchema },
      { name: Promotion.name, schema: PromotionSchema },
      { name: Merchant.name, schema: MerchantSchema },
    ]),
  ],
  controllers: [VouchersController],
  providers: [BenefitsUsageService],
  exports: [BenefitsUsageService],
})
export class BenefitsModule {}