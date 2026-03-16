import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ProductDetailQueryDto } from '../dtos/product-detail.dto';
import { ProductsPublicService } from '../services/products-public.service';
import { ProductReviewsQueryDto } from '../dtos/product-reviews-query.dto';
import { OptionalJwtAuthGuard } from 'src/modules/auth';
import { ReviewsService } from 'src/modules/reviews/services/reviews.service';

@Controller('products')
export class ProductsPublicController {
    constructor(
        private readonly svc: ProductsPublicService,

        private readonly reviewsService: ReviewsService,
    ) { }

    @Get(':id/detail')
    detail(@Param('id') id: string, @Query() q: ProductDetailQueryDto) {
        return this.svc.getDetail(id, { lat: q.lat, lng: q.lng });
    }

    @Get(':id/reviews')
    @UseGuards(OptionalJwtAuthGuard)
    async listReviews(
        @Param('id') id: string,
        @Query() q: ProductReviewsQueryDto,
        @Req() req: any,
    ) {
        const viewerUserId = req.user?.userId ? String(req.user.userId) : null;

        const data = await this.reviewsService.listPublicByProduct(id, {
            limit: q.limit ?? 10,
            cursor: q.cursor,
            rating: q.rating,
            viewerUserId,
        });

        return { success: true, data };
    }
}