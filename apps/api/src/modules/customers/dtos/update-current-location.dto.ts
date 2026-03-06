// update-current-location.dto.ts
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateCurrentLocationDto {
    @IsNumber()
    lat: number;

    @IsNumber()
    lng: number;

    // optional (có thể không gửi hoặc gửi null)
    @IsOptional() @IsString()
    address?: string | null;

    @IsOptional() @IsString()
    delivery_note?: string | null;

    @IsOptional() @IsString()
    receiver_name?: string | null;

    @IsOptional() @IsString()
    receiver_phone?: string | null;
}