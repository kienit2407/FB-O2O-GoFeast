import { Type } from 'class-transformer';
import {
    ArrayNotEmpty,
    IsArray,
    IsBoolean,
    IsDateString,
    IsEnum,
    IsMongoId,
    IsNumber,
    IsOptional,
    IsString,
    Min,
    ValidateIf,
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

export class CreateAdminPromotionDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsEnum(PromotionScope)
    scope?: PromotionScope;

    @IsEnum(PromotionType)
    type: PromotionType;

    @IsEnum(PromotionApplyLevel)
    apply_level: PromotionApplyLevel;

    @ValidateIf((o) => o.apply_level === PromotionApplyLevel.PRODUCT)
    @IsArray()
    @ArrayNotEmpty()
    @IsMongoId({ each: true })
    product_ids?: string[];

    @ValidateIf((o) => o.apply_level === PromotionApplyLevel.CATEGORY)
    @IsArray()
    @ArrayNotEmpty()
    @IsMongoId({ each: true })
    category_ids?: string[];

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    discount_value: number;

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