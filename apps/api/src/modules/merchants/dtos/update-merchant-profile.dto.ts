import { Type } from 'class-transformer';
import {
    IsArray,
    IsBoolean,
    IsIn,
    IsInt,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    Min,
    ValidateNested,
} from 'class-validator';
import { StoreCategory } from '../schemas/merchant.schema';

export class BusinessHourDto {
    @IsInt()
    @Min(1)
    @Max(7)
    day: number; // 1=Mon ... 7=Sun

    @IsOptional()
    @IsString()
    open_time?: string; // "07:00"

    @IsOptional()
    @IsString()
    close_time?: string; // "22:00"

    @IsBoolean()
    is_closed: boolean;
}

export class LocationDto {
    @IsNumber()
    @Min(-90)
    @Max(90)
    lat: number;

    @IsNumber()
    @Min(-180)
    @Max(180)
    lng: number;
}

export class UpdateMerchantProfileDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    @IsIn(Object.values(StoreCategory))
    category?: StoreCategory;

    // FE gửi lat/lng, BE sẽ convert sang GeoJSON
    @IsOptional()
    @ValidateNested()
    @Type(() => LocationDto)
    location?: LocationDto;

    @IsOptional()
    @IsBoolean()
    is_accepting_orders?: boolean;

    @IsOptional()
    @IsNumber()
    average_prep_time_min?: number;

    @IsOptional()
    @IsNumber()
    delivery_radius_km?: number;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => BusinessHourDto)
    business_hours?: BusinessHourDto[];
}