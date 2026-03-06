import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateSavedAddressDto {
    @IsString()
    @IsNotEmpty()
    address: string;

    @IsOptional()
    @IsNumber() @Min(-90) @Max(90)
    lat?: number;

    @IsOptional()
    @IsNumber() @Min(-180) @Max(180)
    lng?: number;

    @IsOptional() @IsString()
    receiver_name?: string;

    @IsOptional() @IsString()
    receiver_phone?: string;

    @IsOptional() @IsString()
    delivery_note?: string;
}

export class UpdateSavedAddressDto {
    @IsOptional() @IsString()
    address?: string;

    @IsOptional()
    @IsNumber() @Min(-90) @Max(90)
    lat?: number;

    @IsOptional()
    @IsNumber() @Min(-180) @Max(180)
    lng?: number;

    @IsOptional() @IsString()
    receiver_name?: string;

    @IsOptional() @IsString()
    receiver_phone?: string;

    @IsOptional() @IsString()
    delivery_note?: string;
}