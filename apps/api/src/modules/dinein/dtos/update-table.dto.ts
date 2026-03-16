import { Type } from 'class-transformer';
import {
    IsBoolean,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    MaxLength,
    Min,
} from 'class-validator';
import { TableStatus } from '../schemas/table.schema';

export class UpdateTableDto {
    @IsOptional()
    @IsString()
    @MaxLength(30)
    table_number?: string;

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

    @IsOptional()
    @IsEnum(TableStatus)
    status?: TableStatus;
}