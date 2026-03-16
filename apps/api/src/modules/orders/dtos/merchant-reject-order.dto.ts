import { IsOptional, IsString } from 'class-validator';

export class MerchantRejectOrderDto {
    @IsOptional()
    @IsString()
    reason?: string;
}