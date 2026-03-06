import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateToppingDto {
    @IsString()
    @MaxLength(120)
    name: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    price: number;

    @IsOptional()
    @IsBoolean()
    is_available?: boolean;

    @IsOptional()
    @IsBoolean()
    is_active?: boolean;

    @IsOptional()
    @IsInt()
    @Min(0)
    sort_order?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    max_quantity?: number;
}

export class UpdateToppingDto {
    @IsOptional()
    @IsString()
    @MaxLength(120)
    name?: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    price?: number;

    @IsOptional()
    @IsBoolean()
    is_available?: boolean;

    @IsOptional()
    @IsBoolean()
    is_active?: boolean;

    @IsOptional()
    @IsInt()
    @Min(0)
    sort_order?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    max_quantity?: number;
}
