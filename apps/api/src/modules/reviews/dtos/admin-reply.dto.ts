// src/modules/reviews/dtos/admin-reply.dto.ts
import { IsString, MinLength } from 'class-validator';

export class AdminReplyDto {
    @IsString()
    @MinLength(1)
    content: string;
}