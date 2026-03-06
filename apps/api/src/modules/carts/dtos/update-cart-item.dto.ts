import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateCartItemDto {
    @IsOptional()
    @IsInt()
    @Min(1)
    quantity?: number;

    @IsOptional()
    @IsString()
    note?: string;
}