import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateProductReviewFormDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(5)
    rating?: number;

    @IsOptional()
    @IsString()
    comment?: string;

    // FE gửi JSON string: ["url1","url2"]
    @IsOptional()
    @IsString()
    kept_remote_image_urls?: string;

    // FE gửi '' nếu muốn bỏ video cũ
    @IsOptional()
    @IsString()
    kept_remote_video_url?: string;
}