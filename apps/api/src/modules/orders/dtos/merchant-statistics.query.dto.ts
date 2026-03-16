import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class MerchantStatisticsQueryDto {
    @IsOptional()
    @IsIn(['7d', '30d', '90d'])
    period?: '7d' | '30d' | '90d' = '7d';

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(50)
    limit?: number = 10;
}