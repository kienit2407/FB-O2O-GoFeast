import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { DriverVerificationStatus } from 'src/modules/drivers/schemas/driver-profile.schema';

export class UpdateDriverVerificationDto {
    @IsEnum(DriverVerificationStatus)
    verificationStatus: DriverVerificationStatus.PENDING | DriverVerificationStatus.APPROVED | DriverVerificationStatus.REJECTED;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    verificationReasons?: string[];

    @IsOptional()
    @IsString()
    verificationNote?: string;
}