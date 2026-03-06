import { Injectable, NotFoundException } from '@nestjs/common';
import { MerchantsService } from '../../merchants/services/merchants.service';
import { MerchantApprovalStatus } from '../../merchants/schemas/merchant.schema';

@Injectable()
export class AdminApprovalService {
  constructor(private readonly merchantsService: MerchantsService) { }

  async getAllMerchants(scope?: 'list' | 'all') {
    // scope=list: thường loại pending khỏi list (tuỳ bạn)
    if (scope === 'list') {
      return this.merchantsService.findForAdmin({
        approval_status: { $in: [MerchantApprovalStatus.APPROVED, MerchantApprovalStatus.SUSPENDED]  },
      });
    }
    return this.merchantsService.findAllForAdmin();
  }

  async getReviewQueue() {
    const pending = await this.merchantsService.findManyByApprovalStatus(
      MerchantApprovalStatus.PENDING_APPROVAL,
    );
    const rejected = await this.merchantsService.findManyByApprovalStatus(
      MerchantApprovalStatus.REJECTED,
    );
    return { pending, rejected };
  }

  async approve(ownerUserId: string) {
    const updated = await this.merchantsService.updateApprovalStatus(
      ownerUserId,
      MerchantApprovalStatus.APPROVED,
    );
    if (!updated) throw new NotFoundException('Merchant not found');
    return updated;
  }
  async getMerchantById(id: string) {
    const doc = await this.merchantsService.findOneForAdminById(id);
    if (!doc) throw new NotFoundException('Merchant not found');
    return doc;
  }

  async reject(ownerUserId: string, payload: { reasons: string[]; note?: string }) {
    console.log("payload", payload)

    const updated = await this.merchantsService.updateApprovalStatus(
      ownerUserId,
      MerchantApprovalStatus.REJECTED,
      payload.reasons,
      payload.note,
    );
    if (!updated) throw new NotFoundException('Merchant not found');
    return updated;
  }
}
