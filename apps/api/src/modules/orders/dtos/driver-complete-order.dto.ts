import { ArrayMinSize, IsArray, IsOptional, IsString } from 'class-validator';

export class DriverCompleteOrderDto {
    @IsArray()
    @ArrayMinSize(1)
    @IsString({ each: true })
    proof_of_delivery_images: string[];

    @IsOptional()
    @IsString()
    note?: string;
}