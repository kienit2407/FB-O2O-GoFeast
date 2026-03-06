import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import {
    Promotion,
    PromotionApplyLevel,
    PromotionCreatedByType,
    PromotionScope,
    PromotionType,
    PromotionDocument,
} from "../schemas/promotion.schema";
import { Voucher, VoucherDocument } from "../schemas/voucher.schema";
import { CloudinaryService } from "src/common/services/cloudinary.service";

import { CreateAdminPromotionDto } from "../dtos/admin/create-admin-promotion.dto";
import { UpdateAdminPromotionDto } from "../dtos/admin/update-admin-promotion.dto";
import { CreateAdminVoucherDto } from "../dtos/admin/create-admin-voucher.dto";
import { UpdateAdminVoucherDto } from "../dtos/admin/update-admin-voucher.dto";

@Injectable()
export class AdminPromotionsService {
    constructor(
        @InjectModel(Promotion.name) private promotionModel: Model<PromotionDocument>,
        @InjectModel(Voucher.name) private voucherModel: Model<VoucherDocument>,
        private readonly cloudinaryService: CloudinaryService
    ) { }

    private enforceBusinessRules(input: {
        scope: PromotionScope;
        type: PromotionType;
        apply_level: PromotionApplyLevel;
        discount_value: number;
    }) {
        if (input.type === PromotionType.PERCENTAGE && input.discount_value > 100) {
            throw new BadRequestException("discount_value must be <= 100 for percentage");
        }

        // ✅ platform/admin: chỉ ORDER hoặc SHIPPING
        if (![PromotionApplyLevel.ORDER, PromotionApplyLevel.SHIPPING].includes(input.apply_level)) {
            throw new BadRequestException("Platform promotions only support apply_level = order | shipping");
        }

        // dine_in không có shipping
        if (input.scope === PromotionScope.DINE_IN && input.apply_level === PromotionApplyLevel.SHIPPING) {
            throw new BadRequestException("DINE_IN cannot apply to SHIPPING");
        }
    }

    // ========== Promotions (Platform) ==========
    async listPlatformPromotions() {
        return this.promotionModel
            .find({ created_by_type: PromotionCreatedByType.PLATFORM, merchant_id: null })
            .sort({ created_at: -1 })
            .exec();
    }

    async createPlatformPromotionWithBanner(dto: CreateAdminPromotionDto, file: Express.Multer.File) {
        if (!file) throw new BadRequestException("Banner file is required");
        if (!file.mimetype?.startsWith("image/")) throw new BadRequestException("Only image files are allowed");

        const scope = (dto.scope ?? PromotionScope.FOOD) as PromotionScope;

        this.enforceBusinessRules({
            scope,
            type: dto.type,
            apply_level: dto.apply_level,
            discount_value: Number(dto.discount_value ?? 0),
        });

        const uploaded = await this.cloudinaryService.uploadImage(file, `promotions/platform/banner`);
        const bannerUrl = uploaded.secure_url || uploaded.url;
        const publicId = uploaded.public_id;

        try {
            const doc = await this.promotionModel.create({
                created_by_type: PromotionCreatedByType.PLATFORM,
                merchant_id: null,

                name: dto.name,
                description: dto.description ?? "",

                scope,
                type: dto.type,
                apply_level: dto.apply_level,

                // ✅ platform: không dùng targets
                product_ids: [],
                category_ids: [],

                discount_value: Number(dto.discount_value ?? 0),
                max_discount: Number(dto.max_discount ?? 0),
                min_order_amount: Number(dto.min_order_amount ?? 0),

                conditions: dto.conditions
                    ? {
                        valid_from: dto.conditions.valid_from ? new Date(dto.conditions.valid_from) : undefined,
                        valid_to: dto.conditions.valid_to ? new Date(dto.conditions.valid_to) : undefined,
                    }
                    : {},

                banner_admin_url: bannerUrl,
                banner_admin_public_id: publicId,

                show_as_popup: !!dto.show_as_popup,
                is_active: dto.is_active ?? true,

                show_push_noti: !!dto.show_push_noti,

                current_usage: 0,
            });

            return doc;
        } catch (e: any) {
            if (publicId) {
                try {
                    await this.cloudinaryService.deleteByPublicId(publicId);
                } catch { }
            }
            throw e;
        }
    }

    async updatePlatformPromotion(id: string, dto: UpdateAdminPromotionDto) {
        const promo = await this.promotionModel.findOne({
            _id: new Types.ObjectId(id),
            created_by_type: PromotionCreatedByType.PLATFORM,
            merchant_id: null,
        });
        if (!promo) throw new NotFoundException("Promotion not found");

        const update: any = { ...dto };

        delete update.created_by_type;
        delete update.merchant_id;
        delete update.current_usage;

        // banner update riêng endpoint
        delete update.banner_image_url;
        delete update.banner_image_public_id;
        delete update.banner_admin_url;
        delete update.banner_admin_public_id;

        // ✅ platform: không cho update target theo product/category
        delete update.product_ids;
        delete update.category_ids;

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

        // ✅ platform: luôn đảm bảo targets rỗng
        update.apply_level = nextApply;
        update.product_ids = [];
        update.category_ids = [];

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

        if (dto.show_push_noti !== undefined) update.show_push_noti = !!dto.show_push_noti;

        return this.promotionModel.findByIdAndUpdate(id, { $set: update }, { new: true }).exec();
    }

    async togglePlatformPromotion(id: string, is_active: boolean) {
        return this.updatePlatformPromotion(id, { is_active } as any);
    }

    async uploadPlatformPromotionBanner(promotionId: string, file: Express.Multer.File) {
        if (!file?.mimetype?.startsWith("image/")) {
            throw new BadRequestException("Only image files are allowed");
        }

        const promo = await this.promotionModel.findOne({
            _id: new Types.ObjectId(promotionId),
            created_by_type: PromotionCreatedByType.PLATFORM,
            merchant_id: null,
        });
        if (!promo) throw new NotFoundException("Promotion not found");

        if (promo.banner_admin_public_id) {
            try {
                await this.cloudinaryService.deleteByPublicId(promo.banner_admin_public_id);
            } catch { }
        }

        const uploaded = await this.cloudinaryService.uploadImage(file, `promotions/platform/banner`);
        promo.banner_admin_url = uploaded.secure_url || uploaded.url;
        promo.banner_admin_public_id = uploaded.public_id;
        await promo.save();

        return promo;
    }

    async deletePlatformPromotion(id: string) {
        const promo = await this.promotionModel.findOne({
            _id: new Types.ObjectId(id),
            created_by_type: PromotionCreatedByType.PLATFORM,
            merchant_id: null,
        });
        if (!promo) throw new NotFoundException("Promotion not found");

        if (promo.is_active) throw new BadRequestException("Please deactivate promotion before deleting");

        const hasVoucher = await this.voucherModel.exists({ promotion_id: promo._id, merchant_id: null });
        if (hasVoucher) throw new BadRequestException("Please delete vouchers of this promotion first");

        if (promo.banner_admin_public_id) {
            try {
                await this.cloudinaryService.deleteByPublicId(promo.banner_admin_public_id);
            } catch { }
        }

        await this.promotionModel.deleteOne({ _id: promo._id });
        return { ok: true };
    }

    // ========== Vouchers (Platform) ==========
    async listPlatformVouchers() {
        return this.voucherModel
            .find({ merchant_id: null })
            .sort({ created_at: -1 })
            .exec();
    }

    async createPlatformVoucher(dto: CreateAdminVoucherDto) {
        const promo = await this.promotionModel.findOne({
            _id: new Types.ObjectId(dto.promotion_id),
            created_by_type: PromotionCreatedByType.PLATFORM,
            merchant_id: null,
        });
        if (!promo) throw new NotFoundException("Promotion not found");

        const code = dto.code.trim().toUpperCase();
        const existed = await this.voucherModel.findOne({ code }).lean();
        if (existed) throw new BadRequestException("Voucher code already exists");

        const hasStart = !!dto.start_date;
        const hasEnd = !!dto.end_date;
        if (hasStart !== hasEnd) throw new BadRequestException("start_date and end_date must be provided together");

        return this.voucherModel.create({
            merchant_id: null,
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

    async updatePlatformVoucher(id: string, dto: UpdateAdminVoucherDto) {
        const v = await this.voucherModel.findOne({ _id: new Types.ObjectId(id), merchant_id: null });
        if (!v) throw new NotFoundException("Voucher not found");

        const update: any = { ...dto };

        if (dto.code !== undefined) {
            const code = dto.code.trim().toUpperCase();
            const existed = await this.voucherModel.findOne({ code, _id: { $ne: v._id } }).lean();
            if (existed) throw new BadRequestException("Voucher code already exists");
            update.code = code;
        }

        const nextStart =
            dto.start_date !== undefined ? dto.start_date : v.start_date ? v.start_date.toISOString().slice(0, 10) : undefined;
        const nextEnd =
            dto.end_date !== undefined ? dto.end_date : v.end_date ? v.end_date.toISOString().slice(0, 10) : undefined;

        const hasStart = !!nextStart;
        const hasEnd = !!nextEnd;
        if (hasStart !== hasEnd) throw new BadRequestException("start_date and end_date must be provided together");

        if (dto.promotion_id) {
            const promo = await this.promotionModel.findOne({
                _id: new Types.ObjectId(dto.promotion_id),
                created_by_type: PromotionCreatedByType.PLATFORM,
                merchant_id: null,
            });
            if (!promo) throw new NotFoundException("Promotion not found");
            update.promotion_id = new Types.ObjectId(dto.promotion_id);
        }

        if (dto.start_date !== undefined) update.start_date = dto.start_date ? new Date(dto.start_date) : null;
        if (dto.end_date !== undefined) update.end_date = dto.end_date ? new Date(dto.end_date) : null;

        return this.voucherModel.findByIdAndUpdate(id, { $set: update }, { new: true }).exec();
    }

    async togglePlatformVoucher(id: string, is_active: boolean) {
        const v = await this.voucherModel.findOne({ _id: new Types.ObjectId(id), merchant_id: null });
        if (!v) throw new NotFoundException("Voucher not found");

        return this.voucherModel.findByIdAndUpdate(id, { $set: { is_active } }, { new: true }).exec();
    }

    async deletePlatformVoucher(id: string) {
        const v = await this.voucherModel.findOne({ _id: new Types.ObjectId(id), merchant_id: null });
        if (!v) throw new NotFoundException("Voucher not found");

        if (v.is_active) throw new BadRequestException("Please deactivate voucher before deleting");

        await this.voucherModel.deleteOne({ _id: v._id });
        return { ok: true };
    }
}