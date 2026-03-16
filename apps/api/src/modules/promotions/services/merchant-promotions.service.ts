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
import { CreateMerchantPromotionDto } from '../dtos/merchant/create-merchant-promotion.dto';
import { UpdateMerchantPromotionDto } from '../dtos/merchant/update-merchant-promotion.dto';
import { CreateMerchantVoucherDto } from '../dtos/merchant/create-merchant-voucher.dto';
import { UpdateMerchantVoucherDto } from '../dtos/merchant/update-merchant-voucher.dto';
import { CloudinaryService } from 'src/common/services/cloudinary.service';
import { Category, CategoryDocument, Product, ProductDocument } from 'src/modules/merchants/schemas';

@Injectable()
export class MerchantPromotionsService {
    constructor(
        @InjectModel(Merchant.name) private merchantModel: Model<MerchantDocument>,
        @InjectModel(Promotion.name) private promotionModel: Model<PromotionDocument>,
        @InjectModel(Voucher.name) private voucherModel: Model<VoucherDocument>,
        @InjectModel(Product.name) private productModel: Model<ProductDocument>,
        @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
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

    private uniqueEnumArray<T extends string>(values?: T[] | null): T[] {
        return [...new Set((values ?? []).filter(Boolean))] as T[];
    }

    private deriveExclusiveGroup(input: {
        scope: PromotionScope;
        apply_level: PromotionApplyLevel;
    }): string {
        if (
            input.apply_level === PromotionApplyLevel.PRODUCT ||
            input.apply_level === PromotionApplyLevel.CATEGORY
        ) {
            return 'food_line';
        }

        if (input.apply_level === PromotionApplyLevel.SHIPPING) {
            return 'shipping';
        }

        return input.scope === PromotionScope.DINE_IN ? 'dinein_order' : 'food_order';
    }

    private async normalizeTargets(input: {
        merchantId: Types.ObjectId;
        apply_level: PromotionApplyLevel;
        product_ids?: string[] | Types.ObjectId[];
        category_ids?: string[] | Types.ObjectId[];
    }) {
        const apply = input.apply_level;

        if (apply === PromotionApplyLevel.PRODUCT) {
            if (!input.product_ids?.length) {
                throw new BadRequestException('product_ids is required');
            }

            const ids = input.product_ids.map((id: any) => new Types.ObjectId(String(id)));

            const count = await this.productModel.countDocuments({
                _id: { $in: ids },
                merchant_id: input.merchantId,
                deleted_at: null,
            });

            if (count !== ids.length) {
                throw new BadRequestException('Some product_ids are invalid or do not belong to this merchant');
            }

            return {
                product_ids: ids,
                category_ids: [],
            };
        }

        if (apply === PromotionApplyLevel.CATEGORY) {
            if (!input.category_ids?.length) {
                throw new BadRequestException('category_ids is required');
            }

            const ids = input.category_ids.map((id: any) => new Types.ObjectId(String(id)));

            const count = await this.categoryModel.countDocuments({
                _id: { $in: ids },
                merchant_id: input.merchantId,
                deleted_at: null,
            });

            if (count !== ids.length) {
                throw new BadRequestException('Some category_ids are invalid or do not belong to this merchant');
            }

            return {
                product_ids: [],
                category_ids: ids,
            };
        }

        return { product_ids: [], category_ids: [] };
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

        if (input.apply_level === PromotionApplyLevel.SHIPPING && input.scope !== PromotionScope.DELIVERY) {
            throw new BadRequestException('apply_level=shipping only allowed when scope=delivery');
        }

        if (
            input.scope === PromotionScope.DELIVERY &&
            input.apply_level !== PromotionApplyLevel.SHIPPING
        ) {
            throw new BadRequestException('scope=delivery only supports apply_level=shipping');
        }

        if (
            (input.apply_level === PromotionApplyLevel.PRODUCT ||
                input.apply_level === PromotionApplyLevel.CATEGORY) &&
            input.scope !== PromotionScope.FOOD
        ) {
            throw new BadRequestException('product/category promotions only support scope=food');
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
            if (input.scope === PromotionScope.DELIVERY || input.apply_level === PromotionApplyLevel.SHIPPING) {
                allowedOrderTypes = [PromotionOrderType.DELIVERY];
            } else if (input.scope === PromotionScope.DINE_IN) {
                allowedOrderTypes = [PromotionOrderType.DINE_IN];
            } else {
                allowedOrderTypes = [PromotionOrderType.DELIVERY, PromotionOrderType.DINE_IN];
            }
        }

        const allowedPaymentMethods = this.uniqueEnumArray(input.allowed_payment_methods);

        return {
            activation_type: activationType,
            priority: Number(input.priority ?? 0),
            can_stack_with_voucher:
                input.can_stack_with_voucher ?? true,
            allowed_order_types: allowedOrderTypes,
            allowed_payment_methods: allowedPaymentMethods,
            exclusive_group:
                input.exclusive_group?.trim() ||
                this.deriveExclusiveGroup({
                    scope: input.scope,
                    apply_level: input.apply_level,
                }),
        };
    }

    private async assertVoucherPromotion(promotionId: string | Types.ObjectId) {
        const promo = await this.promotionModel.findById(promotionId);
        if (!promo) throw new NotFoundException('Promotion not found');

        if (promo.activation_type !== PromotionActivationType.VOUCHER) {
            throw new BadRequestException(
                'Voucher can only be created for promotions with activation_type=voucher',
            );
        }

        return promo;
    }

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

    // ✅ merchant create promotion không cần banner
    async createPromotion(
        ownerUserId: string,
        dto: CreateMerchantPromotionDto,
    ) {
        const merchant = await this.getMyMerchant(ownerUserId);

        const scope = dto.scope ?? PromotionScope.FOOD;
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

        const targets = await this.normalizeTargets({
            merchantId: merchant._id,
            apply_level: applyLevel,
            product_ids: dto.product_ids,
            category_ids: dto.category_ids,
        });

        return this.promotionModel.create({
            created_by_type: PromotionCreatedByType.MERCHANT,
            merchant_id: merchant._id,

            name: dto.name,
            description: dto.description ?? '',

            scope,
            type: dto.type,
            apply_level: applyLevel,
            ...targets,

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
            show_as_popup: false,

            is_active: dto.is_active ?? true,
            current_usage: 0,
        });
    }

    async updatePromotion(
        ownerUserId: string,
        id: string,
        dto: UpdateMerchantPromotionDto,
    ) {
        const merchant = await this.getMyMerchant(ownerUserId);

        const promo = await this.promotionModel.findById(id);
        if (!promo) throw new NotFoundException('Promotion not found');
        if (!promo.merchant_id || String(promo.merchant_id) !== String(merchant._id)) {
            throw new ForbiddenException('Not your promotion');
        }

        const update: any = { ...dto };

        delete update.created_by_type;
        delete update.merchant_id;
        delete update.current_usage;
        delete update.banner_image_url;
        delete update.banner_image_public_id;

        // ✅ merchant không được chỉnh popup
        delete update.show_as_popup;

        const nextScope: PromotionScope = (dto.scope ?? promo.scope) as any;
        const nextType: PromotionType = (dto.type ?? promo.type) as any;
        const nextApply: PromotionApplyLevel = (dto.apply_level ?? promo.apply_level) as any;
        const nextDiscount = Number(dto.discount_value ?? promo.discount_value ?? 0);
        const nextActivationType: PromotionActivationType =
            (dto.activation_type ?? promo.activation_type ?? PromotionActivationType.AUTO) as any;

        const checkoutFields = this.normalizeCheckoutFields({
            scope: nextScope,
            apply_level: nextApply,
            activation_type: nextActivationType,
            priority: dto.priority ?? promo.priority ?? 0,
            can_stack_with_voucher:
                dto.can_stack_with_voucher ?? promo.can_stack_with_voucher ?? true,
            allowed_order_types: dto.allowed_order_types ?? promo.allowed_order_types ?? [],
            allowed_payment_methods:
                dto.allowed_payment_methods ?? promo.allowed_payment_methods ?? [],
            exclusive_group: dto.exclusive_group ?? promo.exclusive_group ?? null,
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
            const hasVoucher = await this.voucherModel.exists({ promotion_id: promo._id });
            if (hasVoucher) {
                throw new BadRequestException(
                    'Please delete vouchers of this promotion first before switching activation_type to auto',
                );
            }
        }

        const touchingTargets =
            dto.apply_level !== undefined ||
            dto.product_ids !== undefined ||
            dto.category_ids !== undefined;

        if (touchingTargets) {
            const targets = await this.normalizeTargets({
                merchantId: merchant._id,
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
                valid_from: dto.conditions.valid_from
                    ? new Date(dto.conditions.valid_from)
                    : (promo.conditions as any)?.valid_from,
                valid_to: dto.conditions.valid_to
                    ? new Date(dto.conditions.valid_to)
                    : (promo.conditions as any)?.valid_to,
            };
        }

        if (dto.discount_value !== undefined) update.discount_value = Number(dto.discount_value);
        if (dto.max_discount !== undefined) update.max_discount = Number(dto.max_discount);
        if (dto.min_order_amount !== undefined) update.min_order_amount = Number(dto.min_order_amount);

        Object.assign(update, checkoutFields);

        return this.promotionModel
            .findByIdAndUpdate(id, { $set: update }, { new: true })
            .exec();
    }

    async togglePromotion(ownerUserId: string, id: string, is_active: boolean) {
        return this.updatePromotion(ownerUserId, id, { is_active } as any);
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


        await this.promotionModel.deleteOne({ _id: promo._id });
        return { ok: true };
    }

    async listVouchers(ownerUserId: string) {
        const merchant = await this.getMyMerchant(ownerUserId);
        return this.voucherModel
            .find({ merchant_id: merchant._id })
            .sort({ created_at: -1 })
            .exec();
    }

    async createVoucher(ownerUserId: string, dto: CreateMerchantVoucherDto) {
        const merchant = await this.getMyMerchant(ownerUserId);

        const promo = await this.assertVoucherPromotion(dto.promotion_id);
        if (!promo.merchant_id || String(promo.merchant_id) !== String(merchant._id)) {
            throw new ForbiddenException('Promotion not belong to merchant');
        }

        const code = dto.code.trim().toUpperCase();
        const existed = await this.voucherModel.findOne({ code }).lean();
        if (existed) throw new BadRequestException('Voucher code already exists');

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

    async updateVoucher(
        ownerUserId: string,
        id: string,
        dto: UpdateMerchantVoucherDto,
    ) {
        const merchant = await this.getMyMerchant(ownerUserId);

        const v = await this.voucherModel.findById(id);
        if (!v) throw new NotFoundException('Voucher not found');
        if (!v.merchant_id || String(v.merchant_id) !== String(merchant._id)) {
            throw new ForbiddenException('Not your voucher');
        }

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
            const promo = await this.assertVoucherPromotion(dto.promotion_id);
            if (!promo.merchant_id || String(promo.merchant_id) !== String(merchant._id)) {
                throw new ForbiddenException('Promotion not belong to merchant');
            }
            update.promotion_id = new Types.ObjectId(dto.promotion_id);
        }

        if (dto.start_date !== undefined) {
            update.start_date = dto.start_date ? new Date(dto.start_date) : null;
        }
        if (dto.end_date !== undefined) {
            update.end_date = dto.end_date ? new Date(dto.end_date) : null;
        }

        return this.voucherModel
            .findByIdAndUpdate(id, { $set: update }, { new: true })
            .exec();
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

        if (v.is_active) {
            throw new BadRequestException('Please deactivate voucher before deleting');
        }

        await this.voucherModel.deleteOne({ _id: v._id });
        return { ok: true };
    }
}

