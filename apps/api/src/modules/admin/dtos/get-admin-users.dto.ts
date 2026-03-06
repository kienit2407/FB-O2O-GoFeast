
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { UserStatus } from 'src/modules/users/schemas/user.schema';

export class GetAdminUsersDto {
    @IsOptional()
    @IsString()
    q?: string; // search email/phone/full_name

    @IsOptional()
    @IsString()
    role?: string;
    @IsOptional()
    @IsEnum(UserStatus)
    status?: UserStatus;
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 10;

    @IsOptional()
    @IsIn(['created_at', 'last_login_at'])
    sortBy?: 'created_at' | 'last_login_at' = 'created_at';

    @IsOptional()
    @IsIn(['asc', 'desc'])
    sortDir?: 'asc' | 'desc' = 'desc';
}