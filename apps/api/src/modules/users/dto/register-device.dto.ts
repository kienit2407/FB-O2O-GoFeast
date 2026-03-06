import { IsOptional, IsString } from "class-validator";

export class RegisterDeviceDto {
    @IsString() deviceId: string;
    @IsString() platform: string; // 'ios' | 'android'
    @IsOptional() @IsString() fcmToken?: string | null;
}