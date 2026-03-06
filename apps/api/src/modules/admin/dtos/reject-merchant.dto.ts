import { ArrayMinSize, IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectMerchantDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  reasons: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
