import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class FeedHomeQueryDto {
    @Type(() => Number)
    @IsNumber()
    lat!: number;

    @Type(() => Number)
    @IsNumber()
    lng!: number;

    @IsOptional()
    @IsIn(['delivery', 'dine_in'])
    order_type?: 'delivery' | 'dine_in' = 'delivery';

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    @Max(20)
    distance_km?: number = 7;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(5)
    @Max(50)
    limit_per_section?: number = 10;
}