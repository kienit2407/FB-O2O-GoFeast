import { Transform } from 'class-transformer';
import {
    IsDateString,
    IsIn,
    IsOptional,
    IsString,
    Matches,
    MaxLength,
} from 'class-validator';

function normalizeNullableString(value: any) {
    if (value === undefined) return undefined;
    if (value === null) return null;

    const s = String(value).trim();
    return s === '' ? null : s;
}

export class UpdateCustomerUserInfoDto {
    @IsOptional()
    @Transform(({ value }) => normalizeNullableString(value))
    @IsString()
    @MaxLength(120)
    full_name?: string | null;

    @IsOptional()
    @Transform(({ value }) => normalizeNullableString(value))
    @IsString()
    @Matches(/^[0-9+\-\s]{8,15}$/, {
        message: 'phone is invalid',
    })
    phone?: string | null;

    @IsOptional()
    @Transform(({ value }) => normalizeNullableString(value))
    @IsIn(['male', 'female', 'other'])
    gender?: 'male' | 'female' | 'other' | null;

    @IsOptional()
    @Transform(({ value }) => normalizeNullableString(value))
    @IsDateString()
    date_of_birth?: string | null;
}