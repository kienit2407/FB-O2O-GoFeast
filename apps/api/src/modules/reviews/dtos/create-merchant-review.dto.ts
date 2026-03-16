import {
    ArrayMaxSize,
    IsArray,
    IsInt,
    IsMongoId,
    IsOptional,
    IsString,
    Max,
    Min,
    ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

class ReviewImageDto {
    @IsString()
    url: string;

    @IsOptional()
    @IsString()
    public_id?: string | null;
}

export class CreateMerchantReviewDto {
    @IsMongoId()
    order_id: string;

    @IsMongoId()
    merchant_id: string;

    @Transform(({ value }) => Number(value))
    @IsInt()
    @Min(1)
    @Max(5)
    rating: number;

    @IsOptional()
    @IsString()
    comment?: string;

    @IsOptional()
    @IsArray()
    @ArrayMaxSize(9)
    @ValidateNested({ each: true })
    @Type(() => ReviewImageDto)
    images?: ReviewImageDto[];

    @IsOptional()
    @IsString()
    video_url?: string | null;

    @IsOptional()
    @IsString()
    video_public_id?: string | null;
}