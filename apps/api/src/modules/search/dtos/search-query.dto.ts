import {
    IsEnum,
    IsNumberString,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';

export enum SearchTabDto {
    ALL = 'all',
    NEAR_ME = 'near_me',
}

export class SearchOverviewQueryDto {
    @IsString()
    @MaxLength(100)
    q: string;

    @IsOptional()
    @IsEnum(SearchTabDto)
    tab?: SearchTabDto = SearchTabDto.ALL;

    @IsOptional()
    @IsNumberString()
    lat?: string;

    @IsOptional()
    @IsNumberString()
    lng?: string;

    @IsOptional()
    @IsNumberString()
    merchant_page?: string = '1';

    @IsOptional()
    @IsNumberString()
    merchant_limit?: string = '10';

    @IsOptional()
    @IsNumberString()
    product_page?: string = '1';

    @IsOptional()
    @IsNumberString()
    product_limit?: string = '10';
}

export class SearchListQueryDto {
    @IsString()
    @MaxLength(100)
    q: string;

    @IsOptional()
    @IsEnum(SearchTabDto)
    tab?: SearchTabDto = SearchTabDto.ALL;

    @IsOptional()
    @IsNumberString()
    lat?: string;

    @IsOptional()
    @IsNumberString()
    lng?: string;

    @IsOptional()
    @IsNumberString()
    page?: string = '1';

    @IsOptional()
    @IsNumberString()
    limit?: string = '10';
}