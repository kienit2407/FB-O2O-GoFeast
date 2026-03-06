import { Type } from 'class-transformer';
import {
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
import { PromotionApplyLevel, PromotionScope, PromotionType } from '../../schemas/promotion.schema';

class ConditionsDto {
    @IsOptional()
    @IsDateString()
    valid_from?: string;

    @IsOptional()
    @IsDateString()
    valid_to?: string;
}

export class UpdateAdminPromotionDto {
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

    @IsOptional()
    @IsBoolean()
    show_as_popup?: boolean;

    @IsOptional()
    @IsBoolean()
    is_active?: boolean;

    // ✅ admin-only
    @IsOptional()
    @IsBoolean()
    show_push_noti?: boolean;

    @IsOptional()
    @ValidateNested()
    @Type(() => ConditionsDto)
    conditions?: ConditionsDto;
}