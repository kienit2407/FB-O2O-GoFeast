import { Type } from 'class-transformer';
import { IsEnum, IsMongoId, IsNumber, IsOptional, IsString } from 'class-validator';
import { PaymentMethod } from '../schemas/order.schema';

export class DeliveryPlaceOrderDto {
    @IsMongoId()
    merchant_id: string;

    @Type(() => Number)
    @IsNumber()
    lat: number;

    @Type(() => Number)
    @IsNumber()
    lng: number;

    @IsString()
    address: string;

    @IsString()
    receiver_name: string;

    @IsString()
    receiver_phone: string;

    @IsOptional()
    @IsString()
    address_note?: string;

    @IsOptional()
    @IsString()
    order_note?: string;

    @IsEnum(PaymentMethod)
    payment_method: PaymentMethod;

    @IsOptional()
    @IsString()
    voucher_code?: string;
}