import { IsArray, IsIn, IsInt, IsMongoId, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class AddSelectedOptionDto {
    @IsMongoId() option_id!: string;
    @IsMongoId() choice_id!: string;
}

class AddSelectedToppingDto {
    @IsMongoId() topping_id!: string;

    @IsInt()
    @Min(1)
    quantity!: number;
}

export class AddCartItemDto {
    @IsIn(['product', 'topping'])
    item_type!: 'product' | 'topping';

    @IsOptional()
    @IsMongoId()
    product_id?: string;

    @IsOptional()
    @IsMongoId()
    topping_id?: string;

    @IsInt()
    @Min(1)
    quantity!: number;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AddSelectedOptionDto)
    selected_options?: AddSelectedOptionDto[];

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AddSelectedToppingDto)
    selected_toppings?: AddSelectedToppingDto[];

    @IsOptional()
    @IsString()
    note?: string;
}