import { IsEnum, IsInt, IsMongoId, IsOptional, IsString, Min } from 'class-validator';
import { InteractionAction } from '../../ai/schemas/user-interaction.schema';

export class LogInteractionDto {
    @IsEnum(InteractionAction)
    action: InteractionAction;

    @IsString()
    request_id: string;

    @IsString()
    section: string;

    @IsInt()
    @Min(0)
    position: number;

    @IsString()
    item_type: 'merchant' | 'product';

    @IsMongoId()
    merchant_id: string;

    @IsOptional()
    @IsMongoId()
    product_id?: string;
}