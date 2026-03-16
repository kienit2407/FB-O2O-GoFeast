import {
    Body,
    Controller,
    Get,
    Param,
    Patch,
    Post,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';
import { Client } from 'src/modules/auth/decorators/client.decorator';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { ClientGuard } from 'src/modules/auth/guards/client.guard';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';

import { ReviewsService } from '../services/reviews.service';
import { MerchantReviewsService } from '../services/merchant-reviews.service';
import { ReviewsMerchantQueryDto } from '../dtos/reviews-merchant.query.dto';
import { MerchantReviewReplyDto } from '../dtos/merchant-review-reply.dto';

@Controller('merchant/reviews')
@Client('merchant_web')
@UseGuards(JwtAuthGuard, RolesGuard, ClientGuard)
@Roles('merchant')
export class ReviewsMerchantController {
    constructor(
        private readonly reviewsService: ReviewsService,
        private readonly merchantReviewsService: MerchantReviewsService,
    ) { }

    @Get('summary')
    async getSummary(@Req() req: any) {
        const [storeSummary, productSummary] = await Promise.all([
            this.merchantReviewsService.getSummaryForMerchantOwner(req.user.userId),
            this.reviewsService.getProductReviewSummaryForMerchantOwner(req.user.userId),
        ]);

        const total_reviews =
            Number(storeSummary.total_reviews ?? 0) +
            Number(productSummary.total_reviews ?? 0);

        const totalWeighted =
            Number(storeSummary.average_rating ?? 0) * Number(storeSummary.total_reviews ?? 0) +
            Number(productSummary.average_rating ?? 0) * Number(productSummary.total_reviews ?? 0);

        return {
            success: true,
            data: {
                average_rating:
                    total_reviews > 0 ? Number((totalWeighted / total_reviews).toFixed(1)) : 0,
                total_reviews,
                store_reviews: storeSummary,
                product_reviews: productSummary,
            },
        };
    }
    @Get('merchant/:merchantId/viewer-state')
    async getMerchantReviewViewerState(
        @Req() req: any,
        @Param('merchantId') merchantId: string,
    ) {
        const data = await this.merchantReviewsService.getViewerStateByMerchant(
            req.user.userId,
            merchantId,
        );
        return { success: true, data };
    }
    @Get(':id/reviews')
    async getMerchantReviews(
        @Param('id') merchantId: string,
        @Query('limit') limit?: string,
        @Query('cursor') cursor?: string,
        @Query('rating') rating?: string,
    ) {
        const data = await this.merchantReviewsService.listPublicByMerchant(
            merchantId,
            {
                limit: limit ? Number(limit) : 10,
                cursor,
                rating: rating ? Number(rating) : undefined,
            },
        );

        return { success: true, data };
    }
    @Get('feed')
    async getFeed(@Req() req: any, @Query() query: ReviewsMerchantQueryDto) {
        const type = query.type ?? 'all';

        if (type === 'merchant') {
            const data = await this.merchantReviewsService.listForMerchantOwner(
                req.user.userId,
                query,
            );
            return { success: true, data };
        }

        if (type === 'product') {
            const data = await this.reviewsService.listProductReviewsForMerchantOwner(
                req.user.userId,
                query,
            );
            return { success: true, data };
        }

        const [merchantRows, productRows] = await Promise.all([
            this.merchantReviewsService.listForMerchantOwner(req.user.userId, {
                rating: query.rating,
                limit: 50,
            }),
            this.reviewsService.listProductReviewsForMerchantOwner(req.user.userId, {
                rating: query.rating,
                limit: 50,
            }),
        ]);

        const merged = [...merchantRows.items, ...productRows.items]
            .sort(
                (a: any, b: any) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
            )
            .slice(0, Number(query.limit ?? 20));

        return {
            success: true,
            data: {
                items: merged,
                hasMore: false,
                nextCursor: null,
            },
        };
    }

    @Post('store/:id/reply')
    async replyStoreReview(
        @Req() req: any,
        @Param('id') id: string,
        @Body() dto: MerchantReviewReplyDto,
    ) {
        const data = await this.merchantReviewsService.replyAsMerchant(
            req.user.userId,
            id,
            dto.content,
        );
        return { success: true, data };
    }

    @Patch('store/:id/reply')
    async editStoreReviewReply(
        @Req() req: any,
        @Param('id') id: string,
        @Body() dto: MerchantReviewReplyDto,
    ) {
        const data = await this.merchantReviewsService.replyAsMerchant(
            req.user.userId,
            id,
            dto.content,
        );
        return { success: true, data };
    }

    @Post('product/:id/reply')
    async replyProductReview(
        @Req() req: any,
        @Param('id') id: string,
        @Body() dto: MerchantReviewReplyDto,
    ) {
        const data = await this.reviewsService.replyAsMerchant(
            req.user.userId,
            id,
            dto.content,
        );
        return { success: true, data };
    }

    @Patch('product/:id/reply')
    async editProductReviewReply(
        @Req() req: any,
        @Param('id') id: string,
        @Body() dto: MerchantReviewReplyDto,
    ) {
        const data = await this.reviewsService.replyAsMerchant(
            req.user.userId,
            id,
            dto.content,
        );
        return { success: true, data };
    }
}