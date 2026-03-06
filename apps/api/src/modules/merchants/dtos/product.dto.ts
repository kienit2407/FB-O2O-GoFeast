import { Transform, Type } from 'class-transformer';
import {
    IsArray, IsBoolean, IsInt, IsMongoId, IsNumber, IsOptional, IsString, MaxLength, Min
} from 'class-validator';

const ToStringArray = () =>
    Transform(({ value }) => {
        if (value === undefined || value === null || value === '') return undefined; // không gửi => undefined
        return Array.isArray(value) ? value : [value]; // 1 item => wrap
    });
const ToBoolean = () =>
    Transform(({ value }) => {
        if (value === undefined || value === null || value === '') return undefined;
        if (typeof value === 'boolean') return value;

        const v = String(value).trim().toLowerCase();
        if (v === 'true' || v === '1') return true;
        if (v === 'false' || v === '0') return false;

        return value; // để IsBoolean bắt lỗi
    }, { toClassOnly: true });
export class CreateProductDto {
    @IsMongoId()
    category_id: string;

    @IsString()
    @MaxLength(160)
    name: string;

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    description?: string;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    base_price: number;

    @Type(() => Number)
    @IsOptional()
    @IsNumber()
    @Min(0)
    sale_price?: number;

    @IsOptional()
    @ToBoolean()
    @IsBoolean()
    is_available?: boolean;

    @IsOptional()
    @ToBoolean()
    @IsBoolean()
    is_active?: boolean;
    @Type(() => Number)
    @IsOptional()
    @IsInt()
    @Min(0)
    sort_order?: number;

    @ToStringArray()
    @IsOptional()
    @IsArray()
    @IsMongoId({ each: true })
    topping_ids?: string[];
}

export class UpdateProductDto {
    @IsOptional()
    @IsMongoId()
    category_id?: string;

    @IsOptional()
    @IsString()
    @MaxLength(160)
    name?: string;

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    description?: string;

    @Type(() => Number)
    @IsOptional()
    @IsNumber()
    @Min(0)
    base_price?: number;

    @Type(() => Number)
    @IsOptional()
    @IsNumber()
    @Min(0)
    sale_price?: number;

    @IsOptional()
    @ToBoolean()
    @IsBoolean()
    is_available?: boolean;

    @IsOptional()
    @ToBoolean()
    @IsBoolean()
    is_active?: boolean;
    @Type(() => Number)
    @IsOptional()
    @IsInt()
    @Min(0)
    sort_order?: number;

    @ToStringArray()
    @IsOptional()
    @IsArray()
    @IsMongoId({ each: true })
    topping_ids?: string[];
}