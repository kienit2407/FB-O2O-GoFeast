import { IsDateString, IsEnum, IsString } from 'class-validator';
import { DriverLicenseType } from '../schemas/driver-profile.schema';

export class DriverOnboardingSubmitDto {
    @IsString() phone: string;

    @IsString() idCardNumber: string;
    @IsString() idCardFrontUrl: string;
    @IsString() idCardBackUrl: string;

    @IsString() licenseNumber: string;
    @IsEnum(DriverLicenseType) licenseType: DriverLicenseType;
    @IsString() licenseImageUrl: string;
    @IsDateString() licenseExpiry: string;

    @IsString() vehicleBrand: string;
    @IsString() vehicleModel: string;
    @IsString() vehiclePlate: string;
    @IsString() vehicleImageUrl: string;
    @IsString() avatarUrl: string;
}