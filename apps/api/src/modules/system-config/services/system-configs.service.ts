// src/modules/system-configs/system-configs.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SystemConfig, SystemConfigDocument, SystemConfigKey } from '../shemas/system-config.schema';
import { UpdateCommissionRulesDto } from '../dtos/update-commission-rules.dto';

@Injectable()
export class SystemConfigsService {
    constructor(
        @InjectModel(SystemConfig.name) private readonly configModel: Model<SystemConfigDocument>,
    ) { }

    /**
     * ✅ đảm bảo luôn có 1 record commission_rules_v1
     */
    async ensureCommissionRulesExists() {
        const key = SystemConfigKey.COMMISSION_RULES_V1;
        const existed = await this.configModel.findOne({ key }).lean();
        if (existed) return existed;

        const created = await this.configModel.create({
            key,
            merchant_commission_rate: 0.2,
            driver_commission_rate: 0.1,
            platform_fee_fixed: 0,
            updated_by: null,
        });
        return created.toObject();
    }

    async getCommissionRulesV1() {
        const key = SystemConfigKey.COMMISSION_RULES_V1;
        const doc = await this.configModel.findOne({ key }).lean();
        if (!doc) return this.ensureCommissionRulesExists();
        return doc;
    }

    async updateCommissionRulesV1(dto: UpdateCommissionRulesDto, updatedBy: string) {
        const key = SystemConfigKey.COMMISSION_RULES_V1;

        const doc = await this.configModel
            .findOneAndUpdate(
                { key },
                {
                    $set: {
                        merchant_commission_rate: dto.merchant_commission_rate,
                        driver_commission_rate: dto.driver_commission_rate,
                        platform_fee_fixed: dto.platform_fee_fixed,
                        updated_by: updatedBy,
                    },
                },
                { upsert: true, new: true },
            )
            .lean();

        return doc;
    }
}