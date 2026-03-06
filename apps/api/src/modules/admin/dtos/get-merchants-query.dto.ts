import { IsIn, IsOptional, IsString } from 'class-validator';

export class GetMerchantsQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(['list', 'all'])
  scope?: 'list' | 'all';
}
