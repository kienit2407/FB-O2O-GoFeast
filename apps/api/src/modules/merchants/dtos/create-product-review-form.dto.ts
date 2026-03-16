import { Type } from 'class-transformer';
import { IsInt, IsMongoId, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateProductReviewFormDto {
    @IsMongoId()
    order_id: string;

    @IsMongoId()
    merchant_id: string;

    @IsMongoId()
    product_id: string;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(5)
    rating: number;

    @IsOptional()
    @IsString()
    comment?: string;
}