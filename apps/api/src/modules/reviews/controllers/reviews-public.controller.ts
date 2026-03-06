// src/modules/reviews/controllers/reviews-public.controller.ts
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ReviewsService } from '../services/reviews.service';
import { CreateReviewDto } from '../dtos/create-review.dto';
import { UpdateReviewDto } from '../dtos/update-review.dto';
import { ListReviewsQueryDto, MerchantParamDto, ProductParamDto } from '../dtos/list-reviews.dto';

// ⚠️ đổi guard/decorator theo dự án bạn
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthGuard } from '@nestjs/passport';

@Controller()
export class ReviewsPublicController {
    constructor(private readonly reviews: ReviewsService) { }

    // CREATE
    @UseGuards(AuthGuard('jwt'))
    @Post('reviews')
    create(@CurrentUser() u: any, @Body() dto: CreateReviewDto) {
        return this.reviews.create(String(u._id), dto);
    }

    // UPDATE
    @UseGuards(AuthGuard('jwt'))
    @Patch('reviews/:id')
    update(@CurrentUser() u: any, @Param('id') id: string, @Body() dto: UpdateReviewDto) {
        return this.reviews.update(String(u._id), id, dto);
    }

    // DELETE (soft)
    @UseGuards(AuthGuard('jwt'))
    @Delete('reviews/:id')
    remove(@CurrentUser() u: any, @Param('id') id: string) {
        return this.reviews.remove(String(u._id), id);
    }

    // LIST by merchant
    @Get('merchants/:merchantId/reviews')
    listByMerchant(@Param() p: MerchantParamDto, @Query() q: ListReviewsQueryDto) {
        return this.reviews.listByMerchant(p.merchantId, q);
    }

    // LIST by product
    @Get('products/:productId/reviews')
    listByProduct(@Param() p: ProductParamDto, @Query() q: ListReviewsQueryDto) {
        return this.reviews.listByProduct(p.productId, q);
    }
}