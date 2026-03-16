import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { OrderStatus, OrderType } from '../schemas/order.schema';

export class MerchantOrdersQueryDto {
    @IsOptional()
    @IsEnum(OrderStatus)
    status?: OrderStatus;

    @IsOptional()
    @IsEnum(OrderType)
    order_type?: OrderType;

    @Type(() => Number)
    @IsOptional()
    @IsInt()
    @Min(1)
    page = 1;

    @Type(() => Number)
    @IsOptional()
    @IsInt()
    @Min(1)
    limit = 20;
}