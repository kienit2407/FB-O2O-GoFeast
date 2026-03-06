// src/modules/banners/dtos/admin/create-carousel-banner.dto.ts
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class CreateCarouselBannerDto {
    @IsOptional()
    @IsInt()
    @Min(0)
    position?: number;

    @IsOptional()
    @IsBoolean()
    is_active?: boolean;
}



export class UpdateCarouselBannerDto {
    @IsOptional()
    @IsInt()
    @Min(0)
    position?: number;

    @IsOptional()
    @IsBoolean()
    is_active?: boolean;
}

export class ReorderItemDto {
    @IsString()
    id: string;

    @IsInt()
    @Min(0)
    position: number;
}

export class ReorderCarouselBannerDto {
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => ReorderItemDto)
    items: ReorderItemDto[];
}