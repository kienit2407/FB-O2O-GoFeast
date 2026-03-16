import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CustomerMyReviewsQueryDto {
    @IsOptional()
    @IsIn(['all', 'merchant', 'product'])
    type?: 'all' | 'merchant' | 'product' = 'all';

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(30)
    limit?: number = 10;

    @IsOptional()
    @IsString()
    cursor?: string;
}