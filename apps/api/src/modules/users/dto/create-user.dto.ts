import { IsEmail, IsString, IsEnum, IsOptional } from 'class-validator';
import { UserStatus } from '../schemas/user.schema';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  phone: string;

  @IsString()
  full_name: string;

  @IsEnum(['customer', 'driver', 'merchant', 'merchant_staff', 'admin'])
  role: 'customer' | 'driver' | 'merchant' | 'merchant_staff' | 'admin';

  @IsOptional()
  avatar?: string;

  @IsOptional()
  @IsString()
  password_hash?: string;

  @IsOptional()
  // 2. Sửa @IsString() thành @IsEnum(UserStatus) để validate chuẩn hơn
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsString({ each: true })
  auth_methods?: string[];
}
