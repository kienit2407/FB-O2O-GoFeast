import { Type, Transform } from 'class-transformer';
import { IsOptional, Min } from 'class-validator';

export class ListNotificationsDto {
    @IsOptional()
    @Type(() => Number)
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @Min(1)
    limit?: number = 20;

    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    exclude_promotion?: boolean = false;
}