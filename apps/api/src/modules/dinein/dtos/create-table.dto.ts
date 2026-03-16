import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateTableDto {
    @IsString()
    @MaxLength(30)
    table_number: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    name?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    capacity?: number;

    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    is_active?: boolean;
}