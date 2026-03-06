// src/modules/reviews/dtos/create-review.dto.ts
import { IsArray, IsInt, IsMongoId, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ReviewImageDto {
    @IsString()
    url: string;

    @IsOptional()
    @IsString()
    public_id?: string | null;
}

export class CreateReviewDto {
    @IsMongoId()
    merchant_id: string;

    @IsMongoId()
    product_id: string;

    @IsMongoId()
    order_id: string;

    @IsInt()
    @Min(1)
    @Max(5)
    rating: number;

    @IsOptional()
    @IsString()
    comment?: string;

    @IsOptional()
    @IsString()
    video_url?: string | null;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ReviewImageDto)
    images?: ReviewImageDto[];
}