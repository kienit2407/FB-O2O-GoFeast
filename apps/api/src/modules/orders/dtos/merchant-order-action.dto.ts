import { IsOptional, IsString } from 'class-validator';

export class MerchantOrderActionDto {
    @IsOptional()
    @IsString()
    note?: string;
}