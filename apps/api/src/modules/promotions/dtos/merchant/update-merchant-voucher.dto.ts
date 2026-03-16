import { Transform, Type } from 'class-transformer';
import {
    IsBoolean,
    IsDateString,
    IsMongoId,
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';

export class UpdateMerchantVoucherDto {
    @IsOptional()
    @IsMongoId()
    promotion_id?: string;

    @IsOptional()
    @IsString()
    @Transform(({ value }) => String(value ?? '').trim().toUpperCase())
    code?: string;

    @Type(() => Number)
    @IsOptional()
    @IsNumber()
    @Min(0)
    total_usage_limit?: number;

    @Type(() => Number)
    @IsOptional()
    @IsNumber()
    @Min(0)
    per_user_limit?: number;

    @IsOptional()
    @IsDateString()
    start_date?: string;

    @IsOptional()
    @IsDateString()
    end_date?: string;

    @IsOptional()
    @IsBoolean()
    is_active?: boolean;
}