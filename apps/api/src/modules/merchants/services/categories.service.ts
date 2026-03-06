import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Category, CategoryDocument } from '../schemas/category.schema';
import { Product, ProductDocument } from '../schemas/product.schema';

@Injectable()
export class CategoriesService {
    constructor(
        @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
        @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    ) { }

    async list(merchantId: string, opts?: { includeInactive?: boolean }) {
        const q: any = {
            merchant_id: new Types.ObjectId(merchantId),
            deleted_at: null,
        };
        if (!opts?.includeInactive) q.is_active = true;

        return this.categoryModel.find(q).sort({ sort_order: 1, created_at: 1 }).exec();
    }

    async create(merchantId: string, data: Partial<Category>) {
        const exists = await this.categoryModel.findOne({
            merchant_id: new Types.ObjectId(merchantId),
            name: data.name,
            deleted_at: null,
        });
        if (exists) throw new BadRequestException('Danh mục đã tồn tại');

        const last = await this.categoryModel
            .find({ merchant_id: new Types.ObjectId(merchantId), deleted_at: null })
            .sort({ sort_order: -1 })
            .limit(1);

        const nextSort = typeof data.sort_order === 'number'
            ? data.sort_order
            : (last?.[0]?.sort_order ?? 0) + 1;

        const doc = new this.categoryModel({
            merchant_id: new Types.ObjectId(merchantId),
            name: data.name,
            description: data.description,
            is_active: data.is_active ?? true,
            sort_order: nextSort,
        });

        return doc.save();
    }

    async update(merchantId: string, id: string, data: Partial<Category>) {
        const doc = await this.categoryModel.findOneAndUpdate(
            {
                _id: new Types.ObjectId(id),
                merchant_id: new Types.ObjectId(merchantId),
                deleted_at: null,
            },
            { $set: data },
            { new: true },
        );
        if (!doc) throw new NotFoundException('Category not found');
        return doc;
    }

    async toggleActive(merchantId: string, id: string) {
        const doc = await this.categoryModel.findOne({
            _id: new Types.ObjectId(id),
            merchant_id: new Types.ObjectId(merchantId),
            deleted_at: null,
        });
        if (!doc) throw new NotFoundException('Category not found');

        return this.categoryModel.findByIdAndUpdate(
            doc._id,
            { $set: { is_active: !doc.is_active } },
            { new: true },
        );
    }

    async reorder(merchantId: string, orderedIds: string[]) {
        const merchantObjectId = new Types.ObjectId(merchantId);

        const ops = orderedIds.map((id, index) => ({
            updateOne: {
                filter: {
                    _id: new Types.ObjectId(id),
                    merchant_id: merchantObjectId,
                    deleted_at: null,
                },
                update: { $set: { sort_order: index + 1 } },
            },
        }));

        if (ops.length) await this.categoryModel.bulkWrite(ops);
        return this.list(merchantId, { includeInactive: true });
    }

    async softDelete(merchantId: string, id: string) {
        // optional safeguard: không cho xóa nếu còn product
        const productCount = await this.productModel.countDocuments({
            merchant_id: new Types.ObjectId(merchantId),
            category_id: new Types.ObjectId(id),
            deleted_at: null,
        });
        if (productCount > 0) {
            throw new BadRequestException('Không thể xoá danh mục đang có sản phẩm');
        }

        const doc = await this.categoryModel.findOneAndUpdate(
            {
                _id: new Types.ObjectId(id),
                merchant_id: new Types.ObjectId(merchantId),
                deleted_at: null,
            },
            { $set: { deleted_at: new Date() } },
            { new: true },
        );

        if (!doc) throw new NotFoundException('Category not found');
        return doc;
    }
}
