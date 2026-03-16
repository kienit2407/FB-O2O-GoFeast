import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Matches, Max, Min } from 'class-validator';

export enum DriverEarningsRange {
    DAY = 'day',
    WEEK = 'week',
    MONTH = 'month',
}

export class DriverEarningsQueryDto {
    @IsOptional()
    @IsEnum(DriverEarningsRange)
    range: DriverEarningsRange = DriverEarningsRange.DAY;

    // format: YYYY-MM-DD
    @IsOptional()
    @Matches(/^\d{4}-\d{2}-\d{2}$/, {
        message: 'date must be in YYYY-MM-DD format',
    })
    date?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit: number = 20;
}