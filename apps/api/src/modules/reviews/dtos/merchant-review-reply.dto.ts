import { IsString, MaxLength } from 'class-validator';

export class MerchantReviewReplyDto {
    @IsString()
    @MaxLength(1000)
    content: string;
}