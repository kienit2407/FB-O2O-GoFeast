import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { DriverLicenseType } from '../schemas/driver-profile.schema';

export class DriverOnboardingDraftDto {
    // step 1
    @IsOptional()
    @IsString()
    phone?: string;

    // step 2
    @IsOptional() @IsString() idCardNumber?: string;
    @IsOptional() @IsString() idCardFrontUrl?: string;
    @IsOptional() @IsString() idCardBackUrl?: string;

    // step 3
    @IsOptional() @IsString() licenseNumber?: string;
    @IsOptional() @IsEnum(DriverLicenseType) licenseType?: DriverLicenseType;
    @IsOptional() @IsString() licenseImageUrl?: string;
    @IsOptional() @IsDateString() licenseExpiry?: string; // ISO string

    // step 4
    @IsOptional() @IsString() vehicleBrand?: string;
    @IsOptional() @IsString() vehicleModel?: string;
    @IsOptional() @IsString() vehiclePlate?: string;
    @IsOptional() @IsString() vehicleImageUrl?: string;
}