import { IsOptional, IsString, MaxLength } from 'class-validator';

export class EnterTableDto {
    @IsString()
    table_id: string;

    @IsOptional()
    @IsString()
    @MaxLength(80)
    guest_name?: string;
}