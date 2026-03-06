import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Merchant, MerchantApprovalStatus } from '../../modules/merchants/schemas/merchant.schema';

@Injectable()
export class MerchantApprovedGuard implements CanActivate {
  constructor(@InjectModel(Merchant.name) private merchantModel: Model<Merchant>) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (user.role !== 'merchant' && user.role !== 'merchant_staff') {
      throw new ForbiddenException('This endpoint is only accessible to merchants');
    }

    const merchant = await this.merchantModel.findOne({ owner_user_id: user.userId });

    if (!merchant) {
      throw new ForbiddenException('Merchant profile not found. Please complete your merchant profile');
    }

    if (merchant.approval_status !== MerchantApprovalStatus.APPROVED) {
      throw new ForbiddenException(
        `Merchant account status is ${merchant.approval_status}. ${merchant.approval_status === MerchantApprovalStatus.REJECTED ? merchant.rejection_reasons || 'Please contact support for details.' : 'Your account is pending review.'}`,
      );
    }

    if (merchant.deleted_at) {
      throw new ForbiddenException('Merchant account has been deleted');
    }

    request.merchant = merchant;
    return true;
  }
}
