import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Topping, ToppingDocument } from '../schemas/topping.schema';

export interface CreateToppingDto {
  merchant_id: string | Types.ObjectId;
  name: string;
  description?: string;
  price: number;
  is_available?: boolean;
  is_active?: boolean;
  sort_order?: number;
  max_quantity?: number | null;

  // thêm 2 field ảnh
  image_url?: string | null;
  image_public_id?: string | null;
}

export interface UpdateToppingDto {
  name?: string;
  description?: string;
  price?: number;
  is_available?: boolean;
  is_active?: boolean;
  sort_order?: number;
  max_quantity?: number | null;

  //  thêm 2 field ảnh (cho phép null)
  image_url?: string | null;
  image_public_id?: string | null;
}
@Injectable()
export class ToppingsService {
  constructor(
    @InjectModel(Topping.name) private toppingModel: Model<ToppingDocument>,
  ) { }

  async create(data: CreateToppingDto): Promise<ToppingDocument> {
    // Check duplicate name for same merchant
    const existing = await this.toppingModel.findOne({
      merchant_id: new Types.ObjectId(data.merchant_id),
      name: data.name,
      deleted_at: null,
    }).exec();

    if (existing) {
      throw new BadRequestException('Topping với tên này đã tồn tại');
    }

    const topping = new this.toppingModel({
      ...data,
      merchant_id: new Types.ObjectId(data.merchant_id),
    });

    return topping.save();
  }

  async findById(id: string): Promise<ToppingDocument | null> {
    return this.toppingModel.findById(id).exec();
  }
  async reorder(merchantId: string, orderedIds: string[]) {
    const merchantObjectId = new Types.ObjectId(merchantId);

    const ops = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: new Types.ObjectId(id), merchant_id: merchantObjectId, deleted_at: null },
        update: { $set: { sort_order: index + 1 } },
      },
    }));

    if (ops.length) await this.toppingModel.bulkWrite(ops);
    return this.findByMerchantId(merchantId, { includeInactive: true });
  }
  async findByMerchantId(
    merchantId: string,
    options?: {
      includeInactive?: boolean;
      onlyAvailable?: boolean;
    },
  ): Promise<ToppingDocument[]> {
    const query: any = {
      merchant_id: new Types.ObjectId(merchantId),
      deleted_at: null,
    };

    if (!options?.includeInactive) {
      query.is_active = true;
    }

    if (options?.onlyAvailable) {
      query.is_available = true;
    }

    return this.toppingModel
      .find(query)
      .sort({ sort_order: 1, name: 1 })
      .exec();
  }

  async findByIds(ids: string[]): Promise<ToppingDocument[]> {
    return this.toppingModel
      .find({
        _id: { $in: ids.map(id => new Types.ObjectId(id)) },
        deleted_at: null,
      })
      .exec();
  }

  async updateById(id: string, data: UpdateToppingDto): Promise<ToppingDocument> {
    const topping = await this.toppingModel.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true },
    ).exec();

    if (!topping) {
      throw new NotFoundException('Topping không tồn tại');
    }

    return topping;
  }

  async softDelete(id: string): Promise<ToppingDocument | null> {
    return this.toppingModel.findByIdAndUpdate(
      id,
      { $set: { deleted_at: new Date() } },
      { new: true },
    ).exec();
  }

  async toggleAvailability(id: string): Promise<ToppingDocument | null> {
    const topping = await this.toppingModel.findById(id).exec();
    if (!topping) {
      throw new NotFoundException('Topping không tồn tại');
    }

    return this.toppingModel.findByIdAndUpdate(
      id,
      { $set: { is_available: !topping.is_available } },
      { new: true },
    ).exec();
  }

  async toggleActive(id: string): Promise<ToppingDocument | null> {
    const topping = await this.toppingModel.findById(id).exec();
    if (!topping) {
      throw new NotFoundException('Topping không tồn tại');
    }

    return this.toppingModel.findByIdAndUpdate(
      id,
      { $set: { is_active: !topping.is_active } },
      { new: true },
    ).exec();
  }
}
