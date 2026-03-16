import { Type } from 'class-transformer';
import {
    ArrayUnique,
    IsArray,
    IsBoolean,
    IsDateString,
    IsEnum,
    IsMongoId,
    IsNumber,
    IsOptional,
    IsString,
    Min,
    ValidateNested,
} from 'class-validator';
import {
    PromotionActivationType,
    PromotionApplyLevel,
    PromotionOrderType,
    PromotionPaymentMethod,
    PromotionScope,
    PromotionType,
} from '../../schemas/promotion.schema';

class ConditionsDto {
    @IsOptional()
    @IsDateString()
    valid_from?: string;

    @IsOptional()
    @IsDateString()
    valid_to?: string;
}

export class UpdateMerchantPromotionDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsEnum(PromotionScope)
    scope?: PromotionScope;

    @IsOptional()
    @IsEnum(PromotionType)
    type?: PromotionType;

    @IsOptional()
    @IsEnum(PromotionApplyLevel)
    apply_level?: PromotionApplyLevel;

    @IsOptional()
    @IsArray()
    @IsMongoId({ each: true })
    product_ids?: string[];

    @IsOptional()
    @IsArray()
    @IsMongoId({ each: true })
    category_ids?: string[];

    @Type(() => Number)
    @IsOptional()
    @IsNumber()
    @Min(0)
    discount_value?: number;

    @Type(() => Number)
    @IsOptional()
    @IsNumber()
    @Min(0)
    max_discount?: number;

    @Type(() => Number)
    @IsOptional()
    @IsNumber()
    @Min(0)
    min_order_amount?: number;

    // ===== NEW =====
    @IsOptional()
    @IsEnum(PromotionActivationType)
    activation_type?: PromotionActivationType;

    @Type(() => Number)
    @IsOptional()
    @IsNumber()
    priority?: number;

    @IsOptional()
    @IsBoolean()
    can_stack_with_voucher?: boolean;

    @IsOptional()
    @IsArray()
    @ArrayUnique()
    @IsEnum(PromotionOrderType, { each: true })
    allowed_order_types?: PromotionOrderType[];

    @IsOptional()
    @IsArray()
    @ArrayUnique()
    @IsEnum(PromotionPaymentMethod, { each: true })
    allowed_payment_methods?: PromotionPaymentMethod[];

    @IsOptional()
    @IsString()
    exclusive_group?: string;

    @IsOptional()
    @IsBoolean()
    show_as_popup?: boolean;

    @IsOptional()
    @IsBoolean()
    is_active?: boolean;

    @IsOptional()
    @ValidateNested()
    @Type(() => ConditionsDto)
    conditions?: ConditionsDto;
}