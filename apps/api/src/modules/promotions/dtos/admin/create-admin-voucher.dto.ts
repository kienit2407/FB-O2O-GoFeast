import { Transform } from 'class-transformer';
import { IsBoolean, IsDateString, IsMongoId, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateAdminVoucherDto {
    @IsMongoId()
    promotion_id: string;

    @IsString()
    @Transform(({ value }) => String(value ?? '').trim().toUpperCase())
    code: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    total_usage_limit?: number;

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