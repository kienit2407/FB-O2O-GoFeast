import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Merchant, MerchantDocument, MerchantApprovalStatus } from '../schemas/merchant.schema';

export interface CreateMerchantDto {
  owner_user_id: Types.ObjectId | string;
  email: string;
  phone?: string;
  name?: string;
  approval_status?: MerchantApprovalStatus;
  onboarding_step?: number;
}

@Injectable()
export class MerchantsService {

  constructor(
    @InjectModel(Merchant.name) private merchantModel: Model<MerchantDocument>,
  ) { }
  async findAllForAdmin() {
    return this.findForAdmin({});
  }

  async findManyByApprovalStatus(status: MerchantApprovalStatus) {
    return this.findForAdmin({ approval_status: status });
  }
  async findOneForAdminById(id: string) {
    return this.merchantModel
      .findOne({ _id: new Types.ObjectId(id), deleted_at: null })
      .populate('owner_user_id', 'email full_name phone')
      .exec();
  }
  /**
   * Menu check không cần ProductModel.
   * Giả định có collection "products" và mỗi product có một trong các field:
   * merchant_id | merchant | merchantId trỏ về merchant._id
   * và có cờ active: is_active | isActive | status === 'active'
   * và soft-delete: deleted_at | deletedAt
   */


  private hasValidGeoPoint(merchant: any): boolean {
    const coords = merchant.location?.coordinates;
    return (
      Array.isArray(coords) &&
      coords.length === 2 &&
      Number.isFinite(coords[0]) &&
      Number.isFinite(coords[1])
    );
  }

  private isBusinessHoursReady(bh: any): boolean {
    if (!Array.isArray(bh) || bh.length === 0) return false;
    const openDays = bh.filter((x) => x && x.is_closed === false);
    if (openDays.length === 0) return false;
    return openDays.every((d) => typeof d.open_time === 'string' && typeof d.close_time === 'string' && d.open_time && d.close_time);
  }

  private isPositiveNumber(v: any): boolean {
    return Number.isFinite(Number(v)) && Number(v) > 0;
  }

  private async hasActiveMenuProducts(merchantId: Types.ObjectId): Promise<boolean> {
    const col = this.merchantModel.db.collection('products');

    const q: any = {
      $and: [
        { $or: [{ merchant_id: merchantId }, { merchant: merchantId }, { merchantId }] },
        { $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }, { deletedAt: null }, { deletedAt: { $exists: false } }] },
        { $or: [{ is_active: true }, { isActive: true }, { status: 'active' }] },
      ],
    };

    const count = await col.countDocuments(q);
    return count > 0;
  }

  async getMissingForAcceptingOrders(merchant: any): Promise<{
    missing_profile_fields: string[];
    missing_menu: boolean;
  }> {
    const missing_profile_fields: string[] = [];

    if (merchant.approval_status !== MerchantApprovalStatus.APPROVED)
      missing_profile_fields.push('approval_status');

    if (!merchant.name) missing_profile_fields.push('name');
    if (!merchant.phone) missing_profile_fields.push('phone');
    if (!merchant.category) missing_profile_fields.push('category');

    if (!merchant.address) missing_profile_fields.push('address');
    if (!this.hasValidGeoPoint(merchant)) missing_profile_fields.push('location');

    if (!this.isBusinessHoursReady(merchant.business_hours))
      missing_profile_fields.push('business_hours');

    if (!this.isPositiveNumber(merchant.average_prep_time_min))
      missing_profile_fields.push('average_prep_time_min');

    if (!this.isPositiveNumber(merchant.delivery_radius_km))
      missing_profile_fields.push('delivery_radius_km');

    const hasMenu = await this.hasActiveMenuProducts(merchant._id);

    return {
      missing_profile_fields,
      missing_menu: !hasMenu,
    };
  }
  async create(data: CreateMerchantDto): Promise<MerchantDocument> {
    const merchant = new this.merchantModel({
      ...data,
      owner_user_id: new Types.ObjectId(data.owner_user_id),
    });
    return merchant.save();
  }

  async findByOwnerUserId(ownerUserId: string): Promise<MerchantDocument | null> {
    console.log('[MerchantsService.findByOwnerUserId] Searching for owner_user_id:', ownerUserId);
    const merchant = await this.merchantModel.findOne({
      owner_user_id: new Types.ObjectId(ownerUserId),
      deleted_at: null,
    }).exec();
    console.log('[MerchantsService.findByOwnerUserId] Result:', merchant ? `found (id: ${merchant._id}, name: ${merchant.name})` : 'not found');
    return merchant;
  }

  async findById(id: string): Promise<MerchantDocument | null> {
    return this.merchantModel.findById(id).exec();
  }
  async updateById(id: string, update: Record<string, any>) {
    const doc = await this.merchantModel.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true },
    );
    if (!doc) throw new NotFoundException('Merchant not found');
    return doc;
  }
  async findForAdmin(filter: any) {
    const rows = await this.merchantModel
      .find({ deleted_at: null, ...filter })
      .populate({
        path: 'owner_user_id',
        select: 'email full_name phone role',
        match: { role: 'merchant', deleted_at: null },
      })
      .sort({ created_at: -1 })
      .exec();

    // populate match không loại document, nó chỉ làm owner_user_id = null
    return rows.filter((m: any) => m.owner_user_id);
  }

  async updateByOwnerUserId(
    ownerUserId: string,
    data: Partial<Merchant>,
  ): Promise<MerchantDocument | null> {
    return this.merchantModel.findOneAndUpdate(
      { owner_user_id: new Types.ObjectId(ownerUserId) },
      { $set: data },
      { new: true },
    ).exec();
  }

  async updateApprovalStatus(
    ownerUserId: string,
    status: MerchantApprovalStatus,
    rejectionReasons?: string[],
    rejectionNote?: string,
  ) {
    const updateData: any = { approval_status: status };

    if (status === MerchantApprovalStatus.APPROVED) {
      updateData.rejection_reasons = [];
      updateData.rejection_note = null;
    }

    if (status === MerchantApprovalStatus.REJECTED) {
      updateData.rejection_reasons = rejectionReasons ?? [];
      updateData.rejection_note = rejectionNote ?? null;
    }

    return this.merchantModel.findOneAndUpdate(
      { owner_user_id: new Types.ObjectId(ownerUserId) },
      { $set: updateData },
      { new: true },
    ).exec();
  }
  async softDelete(id: string): Promise<void> {
    await this.merchantModel.findByIdAndUpdate(id, {
      deleted_at: new Date(),
    });
  }
}
