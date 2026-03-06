// // src/modules/admin/services/admin-merchants.service.ts
// import { Injectable, NotFoundException } from '@nestjs/common';
// import { InjectModel } from '@nestjs/mongoose';
// import { Model } from 'mongoose';
// import { Merchant, MerchantDocument } from 'src/modules/merchants/schemas';

// @Injectable()
// export class AdminMerchantsService {
//     constructor(
//         @InjectModel(Merchant.name) private readonly merchantModel: Model<MerchantDocument>,
//     ) { }

//     async updateCommissionRate(merchantId: string, commissionRate: number | null) {
//         const doc = await this.merchantModel.findByIdAndUpdate(
//             merchantId,
//             { $set: { commission_rate: commissionRate } },
//             { new: true },
//         ).lean();

//         if (!doc) throw new NotFoundException('Merchant not found');
//         return doc;
//     }
// }