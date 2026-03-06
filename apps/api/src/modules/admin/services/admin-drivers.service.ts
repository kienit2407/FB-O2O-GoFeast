// // src/modules/admin/services/admin-drivers.service.ts
// import { Injectable, NotFoundException } from '@nestjs/common';
// import { InjectModel } from '@nestjs/mongoose';
// import { Model } from 'mongoose';
// import { DriverProfile, DriverProfileDocument } from 'src/modules/drivers/schemas/driver-profile.schema';

// @Injectable()
// export class AdminDriversService {
//     constructor(
//         @InjectModel(DriverProfile.name) private readonly driverModel: Model<DriverProfileDocument>,
//     ) { }

//     async updateCommissionRateByUser(userId: string, commissionRate: number | null) {
//         const doc = await this.driverModel.findOneAndUpdate(
//             { user_id: userId },
//             { $set: { commission_rate: commissionRate } },
//             { new: true },
//         ).lean();

//         if (!doc) throw new NotFoundException('Driver profile not found');
//         return doc;
//     }
// }