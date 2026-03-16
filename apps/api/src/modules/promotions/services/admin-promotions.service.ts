import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
    Promotion,
    PromotionActivationType,
    PromotionApplyLevel,
    PromotionCreatedByType,
    PromotionDocument,
    PromotionOrderType,
    PromotionPaymentMethod,
    PromotionScope,
    PromotionType,
} from '../schemas/promotion.schema';
import { Voucher, VoucherDocument } from '../schemas/voucher.schema';
import { CloudinaryService } from 'src/common/services/cloudinary.service';

import { CreateAdminPromotionDto } from '../dtos/admin/create-admin-promotion.dto';
import { UpdateAdminPromotionDto } from '../dtos/admin/update-admin-promotion.dto';
import { CreateAdminVoucherDto } from '../dtos/admin/create-admin-voucher.dto';
import { UpdateAdminVoucherDto } from '../dtos/admin/update-admin-voucher.dto';

@Injectable()
export class AdminPromotionsService {
    constructor(
        @InjectModel(Promotion.name) private promotionModel: Model<PromotionDocument>,
        @InjectModel(Voucher.name) private voucherModel: Model<VoucherDocument>,
        private readonly cloudinaryService: CloudinaryService,
    ) { }

    private uniqueEnumArray<T extends string>(values?: T[] | null): T[] {
        return [...new Set((values ?? []).filter(Boolean))] as T[];
    }
    async listActivePlatformPromotionsForCustomer() {
        const now = new Date();

        return this.promotionModel
            .find({
                created_by_type: PromotionCreatedByType.PLATFORM,
                merchant_id: null,
                is_active: true,
                banner_admin_url: { $ne: null },
                $and: [
                    {
                        $or: [
                            { 'conditions.valid_from': { $exists: false } },
                            { 'conditions.valid_from': null },
                            { 'conditions.valid_from': { $lte: now } },
                        ],
                    },
                    {
                        $or: [
                            { 'conditions.valid_to': { $exists: false } },
                            { 'conditions.valid_to': null },
                            { 'conditions.valid_to': { $gte: now } },
                        ],
                    },
                ],
            })
            .sort({ priority: -1, created_at: -1 })
            .lean();
    }
    private deriveExclusiveGroup(input: {
        scope: PromotionScope;
        apply_level: PromotionApplyLevel;
    }): string {
        if (input.apply_level === PromotionApplyLevel.SHIPPING) {
            return 'shipping';
        }
        return input.scope === PromotionScope.DINE_IN ? 'dinein_order' : 'food_order';
    }

    private normalizeCheckoutFields(input: {
        scope: PromotionScope;
        apply_level: PromotionApplyLevel;
        activation_type?: PromotionActivationType;
        priority?: number;
        can_stack_with_voucher?: boolean;
        allowed_order_types?: PromotionOrderType[];
        allowed_payment_methods?: PromotionPaymentMethod[];
        exclusive_group?: string | null;
    }) {
        const activationType =
            input.activation_type ?? PromotionActivationType.AUTO;

        let allowedOrderTypes = this.uniqueEnumArray(input.allowed_order_types);
        if (!allowedOrderTypes.length) {
            if (input.scope === PromotionScope.DINE_IN) {
                allowedOrderTypes = [PromotionOrderType.DINE_IN];
            } else if (
                input.scope === PromotionScope.DELIVERY ||
                input.apply_level === PromotionApplyLevel.SHIPPING
            ) {
                allowedOrderTypes = [PromotionOrderType.DELIVERY];
            }
        }

        return {
            activation_type: activationType,
            priority: Number(input.priority ?? 0),
            can_stack_with_voucher: input.can_stack_with_voucher ?? true,
            allowed_order_types: allowedOrderTypes,
            allowed_payment_methods: this.uniqueEnumArray(input.allowed_payment_methods),
            exclusive_group:
                input.exclusive_group?.trim() ||
                this.deriveExclusiveGroup({
                    scope: input.scope,
                    apply_level: input.apply_level,
                }),
        };
    }

    private enforceBusinessRules(input: {
        scope: PromotionScope;
        type: PromotionType;
        apply_level: PromotionApplyLevel;
        discount_value: number;
        allowed_order_types?: PromotionOrderType[];
    }) {
        if (input.type === PromotionType.PERCENTAGE && input.discount_value > 100) {
            throw new BadRequestException('discount_value must be <= 100 for percentage');
        }

        if (![PromotionApplyLevel.ORDER, PromotionApplyLevel.SHIPPING].includes(input.apply_level)) {
            throw new BadRequestException(
                'Platform promotions only support apply_level = order | shipping',
            );
        }

        if (input.apply_level === PromotionApplyLevel.SHIPPING && input.scope !== PromotionScope.DELIVERY) {
            throw new BadRequestException('apply_level=shipping only allowed when scope=delivery');
        }

        if (
            input.scope === PromotionScope.DELIVERY &&
            input.apply_level !== PromotionApplyLevel.SHIPPING
        ) {
            throw new BadRequestException('scope=delivery only supports apply_level=shipping');
        }

        const allowed = this.uniqueEnumArray(input.allowed_order_types);
        if (
            input.apply_level === PromotionApplyLevel.SHIPPING &&
            allowed.length > 0 &&
            allowed.some((x) => x !== PromotionOrderType.DELIVERY)
        ) {
            throw new BadRequestException('shipping promotions only support allowed_order_types=delivery');
        }
    }

    private async assertVoucherPromotion(promotionId: string | Types.ObjectId) {
        const promo = await this.promotionModel.findOne({
            _id: new Types.ObjectId(String(promotionId)),
            created_by_type: PromotionCreatedByType.PLATFORM,
            merchant_id: null,
        });

        if (!promo) throw new NotFoundException('Promotion not found');

        if (promo.activation_type !== PromotionActivationType.VOUCHER) {
            throw new BadRequestException(
                'Voucher can only be created for promotions with activation_type=voucher',
            );
        }

        return promo;
    }

    async listPlatformPromotions() {
        return this.promotionModel
            .find({ created_by_type: PromotionCreatedByType.PLATFORM, merchant_id: null })
            .sort({ created_at: -1 })
            .exec();
    }

    async createPlatformPromotionWithBanner(
        dto: CreateAdminPromotionDto,
        file: Express.Multer.File,
    ) {
        if (!file) throw new BadRequestException('Banner file is required');
        if (!file.mimetype?.startsWith('image/')) {
            throw new BadRequestException('Only image files are allowed');
        }
        if (dto.show_push_noti && !dto.conditions?.valid_from) {
            throw new BadRequestException(
                'valid_from is required when show_push_noti is enabled',
            );
        }
        const scope = (dto.scope ?? PromotionScope.FOOD) as PromotionScope;
        const applyLevel = dto.apply_level;
        const discountValue = Number(dto.discount_value ?? 0);

        const checkoutFields = this.normalizeCheckoutFields({
            scope,
            apply_level: applyLevel,
            activation_type: dto.activation_type,
            priority: dto.priority,
            can_stack_with_voucher: dto.can_stack_with_voucher,
            allowed_order_types: dto.allowed_order_types,
            allowed_payment_methods: dto.allowed_payment_methods,
            exclusive_group: dto.exclusive_group,
        });

        this.enforceBusinessRules({
            scope,
            type: dto.type,
            apply_level: applyLevel,
            discount_value: discountValue,
            allowed_order_types: checkoutFields.allowed_order_types,
        });

        const uploaded = await this.cloudinaryService.uploadImage(
            file,
            `promotions/platform/banner`,
        );
        const bannerUrl = uploaded.secure_url || uploaded.url;
        const publicId = uploaded.public_id;

        try {
            const doc = await this.promotionModel.create({
                created_by_type: PromotionCreatedByType.PLATFORM,
                merchant_id: null,

                name: dto.name,
                description: dto.description ?? '',

                scope,
                type: dto.type,
                apply_level: applyLevel,

                product_ids: [],
                category_ids: [],

                discount_value: discountValue,
                max_discount: Number(dto.max_discount ?? 0),
                min_order_amount: Number(dto.min_order_amount ?? 0),

                conditions: dto.conditions
                    ? {
                        valid_from: dto.conditions.valid_from
                            ? new Date(dto.conditions.valid_from)
                            : undefined,
                        valid_to: dto.conditions.valid_to
                            ? new Date(dto.conditions.valid_to)
                            : undefined,
                    }
                    : {},

                ...checkoutFields,

                banner_admin_url: bannerUrl,
                banner_admin_public_id: publicId,

                show_as_popup: !!dto.show_as_popup,
                is_active: dto.is_active ?? true,
                show_push_noti: !!dto.show_push_noti,
                push_noti_title: dto.push_noti_title?.trim() || null,
                push_noti_body: dto.push_noti_body?.trim() || null,
                push_sent_at: null,
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

        if (!promo) {
            throw new NotFoundException('Promotion not found');
        }

        const nextScope: PromotionScope =
            (dto.scope ?? promo.scope) as PromotionScope;

        const nextType: PromotionType =
            (dto.type ?? promo.type) as PromotionType;

        const nextApply: PromotionApplyLevel =
            (dto.apply_level ?? promo.apply_level) as PromotionApplyLevel;

        const nextDiscount = Number(
            dto.discount_value ?? promo.discount_value ?? 0,
        );

        const nextActivationType: PromotionActivationType =
            (dto.activation_type ??
                promo.activation_type ??
                PromotionActivationType.AUTO) as PromotionActivationType;

        const nextPriority = Number(dto.priority ?? promo.priority ?? 0);

        const nextCanStackWithVoucher =
            dto.can_stack_with_voucher ?? promo.can_stack_with_voucher ?? true;

        const nextAllowedOrderTypes =
            dto.allowed_order_types ?? promo.allowed_order_types ?? [];

        const nextAllowedPaymentMethods =
            dto.allowed_payment_methods ?? promo.allowed_payment_methods ?? [];

        const nextExclusiveGroup =
            dto.exclusive_group ?? promo.exclusive_group ?? null;

        const existingValidFrom = (promo.conditions as any)?.valid_from ?? undefined;
        const existingValidTo = (promo.conditions as any)?.valid_to ?? undefined;

        const hasConditionsPatch = dto.conditions !== undefined;
        const hasValidFromPatch =
            dto.conditions !== undefined &&
            Object.prototype.hasOwnProperty.call(dto.conditions, 'valid_from');
        const hasValidToPatch =
            dto.conditions !== undefined &&
            Object.prototype.hasOwnProperty.call(dto.conditions, 'valid_to');

        const nextValidFrom = hasValidFromPatch
            ? (dto.conditions?.valid_from
                ? new Date(dto.conditions.valid_from)
                : undefined)
            : existingValidFrom;

        const nextValidTo = hasValidToPatch
            ? (dto.conditions?.valid_to
                ? new Date(dto.conditions.valid_to)
                : undefined)
            : existingValidTo;

        if (dto.show_push_noti === true && !nextValidFrom) {
            throw new BadRequestException(
                'valid_from is required when show_push_noti is enabled',
            );
        }

        const checkoutFields = this.normalizeCheckoutFields({
            scope: nextScope,
            apply_level: nextApply,
            activation_type: nextActivationType,
            priority: nextPriority,
            can_stack_with_voucher: nextCanStackWithVoucher,
            allowed_order_types: nextAllowedOrderTypes,
            allowed_payment_methods: nextAllowedPaymentMethods,
            exclusive_group: nextExclusiveGroup,
        });

        this.enforceBusinessRules({
            scope: nextScope,
            type: nextType,
            apply_level: nextApply,
            discount_value: nextDiscount,
            allowed_order_types: checkoutFields.allowed_order_types,
        });

        if (
            nextActivationType === PromotionActivationType.AUTO &&
            promo.activation_type === PromotionActivationType.VOUCHER
        ) {
            const hasVoucher = await this.voucherModel.exists({
                promotion_id: promo._id,
                merchant_id: null,
            });

            if (hasVoucher) {
                throw new BadRequestException(
                    'Please delete vouchers of this promotion first before switching activation_type to auto',
                );
            }
        }

        const update: any = {};

        if (dto.name !== undefined) {
            update.name = dto.name;
        }

        if (dto.description !== undefined) {
            update.description = dto.description ?? '';
        }

        if (dto.scope !== undefined) {
            update.scope = nextScope;
        }

        if (dto.type !== undefined) {
            update.type = nextType;
        }

        update.apply_level = nextApply;
        update.product_ids = [];
        update.category_ids = [];

        if (dto.discount_value !== undefined) {
            update.discount_value = Number(dto.discount_value);
        }

        if (dto.max_discount !== undefined) {
            update.max_discount = Number(dto.max_discount);
        }

        if (dto.min_order_amount !== undefined) {
            update.min_order_amount = Number(dto.min_order_amount);
        }

        if (dto.show_as_popup !== undefined) {
            update.show_as_popup = !!dto.show_as_popup;
        }

        if (dto.is_active !== undefined) {
            update.is_active = !!dto.is_active;
        }

        if (dto.show_push_noti !== undefined) {
            update.show_push_noti = !!dto.show_push_noti;
        }

        if (dto.push_noti_title !== undefined) {
            update.push_noti_title = dto.push_noti_title?.trim() || null;
        }

        if (dto.push_noti_body !== undefined) {
            update.push_noti_body = dto.push_noti_body?.trim() || null;
        }

        if (hasConditionsPatch) {
            update.conditions = {
                valid_from: nextValidFrom,
                valid_to: nextValidTo,
            };
        }

        Object.assign(update, checkoutFields);

        const shouldResetPushSentAt =
            dto.show_push_noti !== undefined ||
            dto.push_noti_title !== undefined ||
            dto.push_noti_body !== undefined ||
            hasValidFromPatch ||
            hasValidToPatch ||
            dto.is_active !== undefined;

        if (shouldResetPushSentAt) {
            update.push_sent_at = null;
        }

        return this.promotionModel
            .findByIdAndUpdate(
                id,
                {
                    $set: update,
                },
                {
                    new: true,
                },
            )
            .exec();
    }
    async togglePlatformPromotion(id: string, is_active: boolean) {
        return this.updatePlatformPromotion(id, { is_active } as any);
    }

    async uploadPlatformPromotionBanner(
        promotionId: string,
        file: Express.Multer.File,
    ) {
        if (!file?.mimetype?.startsWith('image/')) {
            throw new BadRequestException('Only image files are allowed');
        }

        const promo = await this.promotionModel.findOne({
            _id: new Types.ObjectId(promotionId),
            created_by_type: PromotionCreatedByType.PLATFORM,
            merchant_id: null,
        });
        if (!promo) throw new NotFoundException('Promotion not found');

        if (promo.banner_admin_public_id) {
            try {
                await this.cloudinaryService.deleteByPublicId(promo.banner_admin_public_id);
            } catch { }
        }

        const uploaded = await this.cloudinaryService.uploadImage(
            file,
            `promotions/platform/banner`,
        );
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
        if (!promo) throw new NotFoundException('Promotion not found');

        if (promo.is_active) {
            throw new BadRequestException('Please deactivate promotion before deleting');
        }

        const hasVoucher = await this.voucherModel.exists({
            promotion_id: promo._id,
            merchant_id: null,
        });
        if (hasVoucher) {
            throw new BadRequestException('Please delete vouchers of this promotion first');
        }

        if (promo.banner_admin_public_id) {
            try {
                await this.cloudinaryService.deleteByPublicId(promo.banner_admin_public_id);
            } catch { }
        }

        await this.promotionModel.deleteOne({ _id: promo._id });
        return { ok: true };
    }

    async listPlatformVouchers() {
        return this.voucherModel.find({ merchant_id: null }).sort({ created_at: -1 }).exec();
    }

    async createPlatformVoucher(dto: CreateAdminVoucherDto) {
        await this.assertVoucherPromotion(dto.promotion_id);

        const code = dto.code.trim().toUpperCase();
        const existed = await this.voucherModel.findOne({ code }).lean();
        if (existed) throw new BadRequestException('Voucher code already exists');

        const hasStart = !!dto.start_date;
        const hasEnd = !!dto.end_date;
        if (hasStart !== hasEnd) {
            throw new BadRequestException('start_date and end_date must be provided together');
        }

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
        const v = await this.voucherModel.findOne({
            _id: new Types.ObjectId(id),
            merchant_id: null,
        });
        if (!v) throw new NotFoundException('Voucher not found');

        const update: any = { ...dto };

        if (dto.code !== undefined) {
            const code = dto.code.trim().toUpperCase();
            const existed = await this.voucherModel.findOne({ code, _id: { $ne: v._id } }).lean();
            if (existed) throw new BadRequestException('Voucher code already exists');
            update.code = code;
        }

        const nextStart =
            dto.start_date !== undefined
                ? dto.start_date
                : v.start_date
                    ? v.start_date.toISOString().slice(0, 10)
                    : undefined;

        const nextEnd =
            dto.end_date !== undefined
                ? dto.end_date
                : v.end_date
                    ? v.end_date.toISOString().slice(0, 10)
                    : undefined;

        const hasStart = !!nextStart;
        const hasEnd = !!nextEnd;
        if (hasStart !== hasEnd) {
            throw new BadRequestException('start_date and end_date must be provided together');
        }

        if (dto.promotion_id) {
            await this.assertVoucherPromotion(dto.promotion_id);
            update.promotion_id = new Types.ObjectId(dto.promotion_id);
        }

        if (dto.start_date !== undefined) update.start_date = dto.start_date ? new Date(dto.start_date) : null;
        if (dto.end_date !== undefined) update.end_date = dto.end_date ? new Date(dto.end_date) : null;

        return this.voucherModel
            .findByIdAndUpdate(id, { $set: update }, { new: true })
            .exec();
    }

    async togglePlatformVoucher(id: string, is_active: boolean) {
        const v = await this.voucherModel.findOne({
            _id: new Types.ObjectId(id),
            merchant_id: null,
        });
        if (!v) throw new NotFoundException('Voucher not found');

        return this.voucherModel
            .findByIdAndUpdate(id, { $set: { is_active } }, { new: true })
            .exec();
    }

    async deletePlatformVoucher(id: string) {
        const v = await this.voucherModel.findOne({
            _id: new Types.ObjectId(id),
            merchant_id: null,
        });
        if (!v) throw new NotFoundException('Voucher not found');

        if (v.is_active) {
            throw new BadRequestException('Please deactivate voucher before deleting');
        }

        await this.voucherModel.deleteOne({ _id: v._id });
        return { ok: true };
    }
}