// src/modules/reviews/dtos/list-reviews.dto.ts
import { IsInt, IsMongoId, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListReviewsQueryDto {
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(50)
    limit?: number = 10;

    // cursor dạng ISO date hoặc created_at string
    @IsOptional()
    @IsString()
    cursor?: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(5)
    rating?: number;
}

export class MerchantParamDto {
    @IsMongoId()
    merchantId: string;
}

export class ProductParamDto {
    @IsMongoId()
    productId: string;
}