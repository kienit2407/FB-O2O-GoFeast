import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateMerchantReviewFormDto {
    @IsOptional()
    @Transform(({ value }) => Number(value))
    @IsInt()
    @Min(1)
    @Max(5)
    rating?: number;

    @IsOptional()
    @IsString()
    comment?: string;

    @IsOptional()
    kept_remote_image_urls?: string | string[];

    @IsOptional()
    @IsString()
    kept_remote_video_url?: string;
}