import { IsOptional, IsString } from 'class-validator';

export class CustomerCancelOrderDto {
    @IsOptional()
    @IsString()
    reason?: string;
}