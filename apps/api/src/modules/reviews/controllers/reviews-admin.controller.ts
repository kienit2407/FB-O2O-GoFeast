// src/modules/reviews/controllers/reviews-admin.controller.ts
import { Body, Controller, Patch, Param, UseGuards } from '@nestjs/common';
import { ReviewsService } from '../services/reviews.service';
import { AdminReplyDto } from '../dtos/admin-reply.dto';

// ⚠️ đổi guard/decorator theo dự án bạn
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@Controller('admin')
export class ReviewsAdminController {
    constructor(private readonly reviews: ReviewsService) { }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Patch('reviews/:id/reply')
    reply(@CurrentUser() u: any, @Param('id') id: string, @Body() dto: AdminReplyDto) {
        return this.reviews.adminReply(String(u._id), id, dto.content);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Patch('reviews/:id/hide')
    hide(@Param('id') id: string) {
        return this.reviews.adminHide(id);
    }
}