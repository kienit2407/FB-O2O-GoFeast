// src/modules/reviews/dtos/update-review.dto.ts
import { IsArray, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ReviewImageDto {
    @IsString()
    url: string;

    @IsOptional()
    @IsString()
    public_id?: string | null;
}

export class UpdateReviewDto {
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(5)
    rating?: number;

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