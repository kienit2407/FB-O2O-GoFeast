import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { BenefitsUsageService } from './services/benefits-usage.service';
import { VouchersController } from './controllers/vouchers.controller';

import { UserVoucher, UserVoucherSchema } from './schemas/user-voucher.schema';
import { PromotionUsage, PromotionUsageSchema } from './schemas/promotion-usage.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserVoucher.name, schema: UserVoucherSchema },
      { name: PromotionUsage.name, schema: PromotionUsageSchema },
    ]),
  ],
  controllers: [VouchersController],
  providers: [BenefitsUsageService],
  exports: [BenefitsUsageService],
})
export class BenefitsModule {}