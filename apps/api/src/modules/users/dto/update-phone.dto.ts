// src/modules/auth/dto/update-phone.dto.ts
import { IsString, Matches } from 'class-validator';

export class UpdatePhoneDto {
  @IsString()
  @Matches(/^\d{9,11}$/, { message: 'Phone must be 9-11 digits' })
  phone: string;
}