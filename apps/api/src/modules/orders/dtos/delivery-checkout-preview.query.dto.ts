import { Type } from 'class-transformer';
import { IsEnum, IsMongoId, IsNumber, IsOptional, IsString } from 'class-validator';
import { PaymentMethod } from '../schemas/order.schema';

export class DeliveryCheckoutPreviewQueryDto {
    @IsMongoId()
    merchant_id: string;

    @Type(() => Number)
    @IsNumber()
    lat: number;

    @Type(() => Number)
    @IsNumber()
    lng: number;

    @IsOptional()
    @IsEnum(PaymentMethod)
    payment_method?: PaymentMethod;

    @IsOptional()
    @IsString()
    voucher_code?: string;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    @IsString()
    receiver_name?: string;

    @IsOptional()
    @IsString()
    receiver_phone?: string;

    @IsOptional()
    @IsString()
    address_note?: string;
}