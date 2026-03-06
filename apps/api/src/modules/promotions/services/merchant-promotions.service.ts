import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Merchant, MerchantDocument } from '../../merchants/schemas/merchant.schema';
import {
    Promotion,
    PromotionApplyLevel,
    PromotionCreatedByType,
    PromotionDocument,
    PromotionScope,
    PromotionType,
} from '../schemas/promotion.schema';
import { Voucher, VoucherDocument } from '../schemas/voucher.schema';
import { CreateMerchantPromotionDto } from '../dtos/merchant/create-merchant-promotion.dto';
import { UpdateMerchantPromotionDto } from '../dtos/merchant/update-merchant-promotion.dto';
import { CreateMerchantVoucherDto } from '../dtos/merchant/create-merchant-voucher.dto';
import { CloudinaryService } from 'src/common/services/cloudinary.service';
import { UpdateMerchantVoucherDto } from '../dtos/merchant/update-merchant-voucher.dto';

@Injectable()
export class MerchantPromotionsService {
    constructor(
        @InjectModel(Merchant.name) private merchantModel: Model<MerchantDocument>,
        @InjectModel(Promotion.name) private promotionModel: Model<PromotionDocument>,
        @InjectModel(Voucher.name) private voucherModel: Model<VoucherDocument>,
        private readonly cloudinaryService: CloudinaryService,
    ) { }

    private async getMyMerchant(ownerUserId: string) {
        const merchant = await this.merchantModel.findOne({
            owner_user_id: new Types.ObjectId(ownerUserId),
            deleted_at: null,
        });
        if (!merchant) throw new NotFoundException('Merchant not found');
        return merchant;
    }

    private normalizeTargets(input: {
        apply_level: PromotionApplyLevel;
        product_ids?: string[] | Types.ObjectId[];
        category_ids?: string[] | Types.ObjectId[];
    }) {
        const apply = input.apply_level;

        if (apply === PromotionApplyLevel.PRODUCT) {
            if (!input.product_ids?.length) throw new BadRequestException('product_ids is required');
            return {
                product_ids: input.product_ids.map((id: any) => new Types.ObjectId(String(id))),
                category_ids: [],
            };
        }

        if (apply === PromotionApplyLevel.CATEGORY) {
            if (!input.category_ids?.length) throw new BadRequestException('category_ids is required');
            return {
                product_ids: [],
                category_ids: input.category_ids.map((id: any) => new Types.ObjectId(String(id))),
            };
        }

        return { product_ids: [], category_ids: [] };
    }

    private enforceBusinessRules(input: {
        scope: PromotionScope;
        type: PromotionType;
        apply_level: PromotionApplyLevel;
        discount_value: number;
    }) {
        if (input.type === PromotionType.PERCENTAGE && input.discount_value > 100) {
            throw new BadRequestException('discount_value must be <= 100 for percentage');
        }

        // ✅ dine_in không có shipping
        if (input.scope === PromotionScope.DINE_IN && input.apply_level === PromotionApplyLevel.SHIPPING) {
            throw new BadRequestException('DINE_IN cannot apply to SHIPPING');
        }
    }

    // -------- Promotions --------
    async listPromotions(ownerUserId: string) {
        const merchant = await this.getMyMerchant(ownerUserId);
        return this.promotionModel
            .find({
                created_by_type: PromotionCreatedByType.MERCHANT,
                merchant_id: merchant._id,
            })
            .sort({ created_at: -1 })
            .exec();
    }

    /**
     * ✅ CREATE: upload banner OK -> mới create record
     */
    async createPromotionWithBanner(ownerUserId: string, dto: CreateMerchantPromotionDto, file: Express.Multer.File) {
        const merchant = await this.getMyMerchant(ownerUserId);

        if (!file) throw new BadRequestException('Banner file is required');
        if (!file.mimetype?.startsWith('image/')) throw new BadRequestException('Only image files are allowed');

        const scope = dto.scope ?? PromotionScope.FOOD;

        this.enforceBusinessRules({
            scope,
            type: dto.type,
            apply_level: dto.apply_level,
            discount_value: Number(dto.discount_value ?? 0),
        });

        const targets = this.normalizeTargets({
            apply_level: dto.apply_level,
            product_ids: dto.product_ids,
            category_ids: dto.category_ids,
        });

        // 1) Upload cloudinary trước
        const uploaded = await this.cloudinaryService.uploadImage(
            file,
            `promotions/${merchant._id.toString()}/banner`,
        );

        const bannerUrl = uploaded.secure_url || uploaded.url;
        const publicId = uploaded.public_id;

        // 2) Create record sau khi upload ok
        try {
            const doc = await this.promotionModel.create({
                created_by_type: PromotionCreatedByType.MERCHANT,
                merchant_id: merchant._id,

                name: dto.name,
                description: dto.description ?? '',

                scope,
                type: dto.type,
                apply_level: dto.apply_level,

                ...targets,

                discount_value: Number(dto.discount_value ?? 0),
                max_discount: Number(dto.max_discount ?? 0),
                min_order_amount: Number(dto.min_order_amount ?? 0),

                conditions: dto.conditions
                    ? {
                        valid_from: dto.conditions.valid_from ? new Date(dto.conditions.valid_from) : undefined,
                        valid_to: dto.conditions.valid_to ? new Date(dto.conditions.valid_to) : undefined,
                    }
                    : {},

                banner_image_url: bannerUrl,
                banner_image_public_id: publicId,

                show_as_popup: !!dto.show_as_popup,
                is_active: dto.is_active ?? true,

                current_usage: 0,
            });

            return doc;
        } catch (e: any) {
            // ✅ nếu tạo record fail thì xoá ảnh đã upload (tránh rác cloudinary)
            if (publicId) {
                try {
                    await this.cloudinaryService.deleteByPublicId(publicId);
                } catch { }
            }
            throw e;
        }
    }

    async updatePromotion(ownerUserId: string, id: string, dto: UpdateMerchantPromotionDto) {
        const merchant = await this.getMyMerchant(ownerUserId);

        const promo = await this.promotionModel.findById(id);
        if (!promo) throw new NotFoundException('Promotion not found');
        if (!promo.merchant_id || String(promo.merchant_id) !== String(merchant._id)) {
            throw new ForbiddenException('Not your promotion');
        }

        const update: any = { ...dto };

        // ✅ khoá các field merchant không được sửa
        delete update.created_by_type;
        delete update.merchant_id;
        delete update.current_usage;

        // ✅ cấm update banner bằng payload (banner update riêng endpoint)
        delete update.banner_image_url;
        delete update.banner_image_public_id;

        const nextScope: PromotionScope = (dto.scope ?? promo.scope) as any;
        const nextType: PromotionType = (dto.type ?? promo.type) as any;
        const nextApply: PromotionApplyLevel = (dto.apply_level ?? promo.apply_level) as any;
        const nextDiscount = Number(dto.discount_value ?? promo.discount_value ?? 0);

        this.enforceBusinessRules({
            scope: nextScope,
            type: nextType,
            apply_level: nextApply,
            discount_value: nextDiscount,
        });

        // normalize targets nếu động vào apply_level / targets
        const touchingTargets =
            dto.apply_level !== undefined ||
            dto.product_ids !== undefined ||
            dto.category_ids !== undefined;

        if (touchingTargets) {
            const targets = this.normalizeTargets({
                apply_level: nextApply,
                product_ids: dto.product_ids ?? (promo.product_ids as any),
                category_ids: dto.category_ids ?? (promo.category_ids as any),
            });
            update.apply_level = nextApply;
            update.product_ids = targets.product_ids;
            update.category_ids = targets.category_ids;
        }

        if (dto.conditions) {
            update.conditions = {
                ...(promo.conditions ?? {}),
                valid_from: dto.conditions.valid_from ? new Date(dto.conditions.valid_from) : (promo.conditions as any)?.valid_from,
                valid_to: dto.conditions.valid_to ? new Date(dto.conditions.valid_to) : (promo.conditions as any)?.valid_to,
            };
        }

        if (dto.discount_value !== undefined) update.discount_value = Number(dto.discount_value);
        if (dto.max_discount !== undefined) update.max_discount = Number(dto.max_discount);
        if (dto.min_order_amount !== undefined) update.min_order_amount = Number(dto.min_order_amount);

        return this.promotionModel.findByIdAndUpdate(id, { $set: update }, { new: true }).exec();
    }

    async togglePromotion(ownerUserId: string, id: string, is_active: boolean) {
        return this.updatePromotion(ownerUserId, id, { is_active });
    }

    async deletePromotion(ownerUserId: string, id: string) {
        const merchant = await this.getMyMerchant(ownerUserId);

        const promo = await this.promotionModel.findOne({
            _id: new Types.ObjectId(id),
            merchant_id: merchant._id,
            created_by_type: PromotionCreatedByType.MERCHANT,
        });
        if (!promo) throw new NotFoundException('Promotion not found');

        if (promo.is_active) {
            throw new BadRequestException('Please deactivate promotion before deleting');
        }

        const hasVoucher = await this.voucherModel.exists({ promotion_id: promo._id });
        if (hasVoucher) {
            throw new BadRequestException('Please delete vouchers of this promotion first');
        }

        if (promo.banner_image_public_id) {
            try {
                await this.cloudinaryService.deleteByPublicId(promo.banner_image_public_id);
            } catch { }
        }

        await this.promotionModel.deleteOne({ _id: promo._id });
        return { ok: true };
    }

    // -------- Banner (edit banner) --------
    async uploadPromotionBanner(ownerUserId: string, promotionId: string, file: Express.Multer.File) {
        const merchant = await this.getMyMerchant(ownerUserId);

        if (!file?.mimetype?.startsWith('image/')) {
            throw new BadRequestException('Only image files are allowed');
        }

        const promo = await this.promotionModel.findOne({
            _id: new Types.ObjectId(promotionId),
            merchant_id: merchant._id,
            created_by_type: PromotionCreatedByType.MERCHANT,
        });
        if (!promo) throw new NotFoundException('Promotion not found');

        if (promo.banner_image_public_id) {
            try {
                await this.cloudinaryService.deleteByPublicId(promo.banner_image_public_id);
            } catch { }
        }

        const uploaded = await this.cloudinaryService.uploadImage(
            file,
            `promotions/${merchant._id.toString()}/banner`,
        );

        promo.banner_image_url = uploaded.secure_url || uploaded.url;
        promo.banner_image_public_id = uploaded.public_id;
        await promo.save();

        return promo;
    }
    private validateBusiness(dto: any) {
        // % <= 100
        if (dto.type === PromotionType.PERCENTAGE && Number(dto.discount_value) > 100) {
            throw new BadRequestException('discount_value must be <= 100 for percentage');
        }

        // shipping only for delivery
        if (dto.apply_level === PromotionApplyLevel.SHIPPING && dto.scope !== PromotionScope.DELIVERY) {
            throw new BadRequestException('apply_level=shipping only allowed when scope=delivery');
        }

        // target required
        if (dto.apply_level === PromotionApplyLevel.PRODUCT && !dto.product_ids?.length) {
            throw new BadRequestException('product_ids is required');
        }
        if (dto.apply_level === PromotionApplyLevel.CATEGORY && !dto.category_ids?.length) {
            throw new BadRequestException('category_ids is required');
        }
    }

    private toObjectIds(ids: any[]) {
        const out = (ids ?? []).map((x) => String(x));
        const bad = out.find((s) => !Types.ObjectId.isValid(s));
        if (bad) throw new BadRequestException(`Invalid MongoId: ${bad}`);
        return out.map((s) => new Types.ObjectId(s));
    }

    
    async updateVoucher(ownerUserId: string, id: string, dto: UpdateMerchantVoucherDto) {
        const merchant = await this.getMyMerchant(ownerUserId);

        const v = await this.voucherModel.findById(id);
        if (!v) throw new NotFoundException('Voucher not found');
        if (!v.merchant_id || String(v.merchant_id) !== String(merchant._id)) {
            throw new ForbiddenException('Not your voucher');
        }

        const update: any = { ...dto };

        // normalize code
        if (dto.code !== undefined) {
            const code = dto.code.trim().toUpperCase();
            // unique check (trừ chính nó)
            const existed = await this.voucherModel.findOne({ code, _id: { $ne: v._id } }).lean();
            if (existed) throw new BadRequestException('Voucher code already exists');
            update.code = code;
        }

        // validate date: nếu có 1 trong 2 -> phải có cả 2 (tương tự create)
        const nextStart = dto.start_date !== undefined ? dto.start_date : (v.start_date ? v.start_date.toISOString().slice(0, 10) : undefined);
        const nextEnd = dto.end_date !== undefined ? dto.end_date : (v.end_date ? v.end_date.toISOString().slice(0, 10) : undefined);
        const hasStart = !!nextStart;
        const hasEnd = !!nextEnd;
        if (hasStart !== hasEnd) {
            throw new BadRequestException('start_date and end_date must be provided together');
        }

        // nếu cho đổi promotion_id thì phải thuộc merchant
        if (dto.promotion_id) {
            const promo = await this.promotionModel.findById(dto.promotion_id);
            if (!promo) throw new NotFoundException('Promotion not found');
            if (!promo.merchant_id || String(promo.merchant_id) !== String(merchant._id)) {
                throw new ForbiddenException('Promotion not belong to merchant');
            }
            update.promotion_id = new Types.ObjectId(dto.promotion_id);
        }

        // map date -> Date/null
        if (dto.start_date !== undefined) update.start_date = dto.start_date ? new Date(dto.start_date) : null;
        if (dto.end_date !== undefined) update.end_date = dto.end_date ? new Date(dto.end_date) : null;

        return this.voucherModel.findByIdAndUpdate(id, { $set: update }, { new: true }).exec();
    }
    

    // -------- Vouchers --------
    async listVouchers(ownerUserId: string) {
        const merchant = await this.getMyMerchant(ownerUserId);
        return this.voucherModel
            .find({ merchant_id: merchant._id })
            .sort({ created_at: -1 })
            .exec();
    }

    async createVoucher(ownerUserId: string, dto: CreateMerchantVoucherDto) {
        const merchant = await this.getMyMerchant(ownerUserId);

        const promo = await this.promotionModel.findById(dto.promotion_id);
        if (!promo) throw new NotFoundException('Promotion not found');
        if (!promo.merchant_id || String(promo.merchant_id) !== String(merchant._id)) {
            throw new ForbiddenException('Promotion not belong to merchant');
        }

        const code = dto.code.trim().toUpperCase();

        const existed = await this.voucherModel.findOne({ code }).lean();
        if (existed) throw new BadRequestException('Voucher code already exists');

        // optional date validation: nếu có 1 cái thì phải có cả 2
        const hasStart = !!dto.start_date;
        const hasEnd = !!dto.end_date;
        if (hasStart !== hasEnd) {
            throw new BadRequestException('start_date and end_date must be provided together');
        }

        return this.voucherModel.create({
            merchant_id: merchant._id,
            promotion_id: new Types.ObjectId(dto.promotion_id),
            code,

            total_usage_limit: dto.total_usage_limit ?? 0,
            per_user_limit: dto.per_user_limit ?? 0,
            current_usage: 0,

            is_active: dto.is_active ?? true,

            start_date: dto.start_date ? new Date(dto.start_date) : null,
            end_date: dto.end_date ? new Date(dto.end_date) : null,
        });
    }

    async toggleVoucher(ownerUserId: string, id: string, is_active: boolean) {
        const merchant = await this.getMyMerchant(ownerUserId);

        const v = await this.voucherModel.findById(id);
        if (!v) throw new NotFoundException('Voucher not found');
        if (!v.merchant_id || String(v.merchant_id) !== String(merchant._id)) {
            throw new ForbiddenException('Not your voucher');
        }

        return this.voucherModel
            .findByIdAndUpdate(id, { $set: { is_active } }, { new: true })
            .exec();
    }

    async deleteVoucher(ownerUserId: string, id: string) {
        const merchant = await this.getMyMerchant(ownerUserId);

        const v = await this.voucherModel.findById(id);
        if (!v) throw new NotFoundException('Voucher not found');
        if (!v.merchant_id || String(v.merchant_id) !== String(merchant._id)) {
            throw new ForbiddenException('Not your voucher');
        }

        // ✅ chỉ cho xoá khi voucher inactive (đúng yêu cầu FE)
        if (v.is_active) {
            throw new BadRequestException('Please deactivate voucher before deleting');
        }

        await this.voucherModel.deleteOne({ _id: v._id });
        return { ok: true };
    }
}