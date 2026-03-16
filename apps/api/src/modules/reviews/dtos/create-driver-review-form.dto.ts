import { Transform } from 'class-transformer';
import { IsInt, IsMongoId, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateDriverReviewFormDto {
    @IsMongoId()
    order_id: string;

    @IsMongoId()
    driver_user_id: string;

    @Transform(({ value }) => Number(value))
    @IsInt()
    @Min(1)
    @Max(5)
    rating: number;

    @IsOptional()
    @IsString()
    comment?: string;
}