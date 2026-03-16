import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
    Req,
    UploadedFiles,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { Client } from 'src/modules/auth/decorators/client.decorator';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { ClientGuard } from 'src/modules/auth/guards/client.guard';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';

import { ReviewsService } from '../services/reviews.service';
import { MerchantReviewsService } from '../services/merchant-reviews.service';
import { DriverReviewsService } from '../services/driver-reviews.service';
import { ReviewStatusService } from '../services/review-status.service';


import { CreateMerchantReviewDto } from '../dtos/create-merchant-review.dto';
import { CreateDriverReviewDto } from '../dtos/create-driver-review.dto';
import { CreateReviewDto } from '../dtos/create-review.dto';
import { UpdateReviewDto } from '../dtos/update-review.dto';
import { CustomerMyReviewsQueryDto } from 'src/modules/orders/dtos/customer-my-reviews.query.dto';
import { ReviewMediaUploadService } from '../services/review-media-upload.service';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { CreateProductReviewFormDto } from 'src/modules/merchants/dtos/create-product-review-form.dto';
import { UpdateProductReviewFormDto } from 'src/modules/merchants/dtos/update-product-review-form.dto';
import { CreateMerchantReviewFormDto } from '../dtos/create-merchant-review-form.dto';
import { UpdateMerchantReviewFormDto } from '../dtos/update-merchant-review-form.dto';
import { CreateDriverReviewFormDto } from '../dtos/create-driver-review-form.dto';
import { UpdateDriverReviewFormDto } from '../dtos/update-driver-review-form.dto';

@Controller('customer/reviews')
@Client('customer_mobile')
@UseGuards(JwtAuthGuard, RolesGuard, ClientGuard)
@Roles('customer')
export class CustomerReviewsController {
    constructor(
        private readonly reviewsService: ReviewsService,
        private readonly merchantReviewsService: MerchantReviewsService,
        private readonly driverReviewsService: DriverReviewsService,
        private readonly reviewStatusService: ReviewStatusService,
        private readonly reviewMediaUploadService: ReviewMediaUploadService,
    ) { }
    private parseStringArray(value?: string | string[]): string[] {
        if (!value) return [];

        if (Array.isArray(value)) {
            return value.flatMap((x) => this.parseStringArray(x));
        }

        const raw = String(value).trim();
        if (!raw) return [];

        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                return parsed.map((x) => String(x).trim()).filter(Boolean);
            }
            return [String(parsed).trim()].filter(Boolean);
        } catch (_) {
            if (raw.includes(',')) {
                return raw.split(',').map((x) => x.trim()).filter(Boolean);
            }
            return [raw];
        }
    }
    @Get('mine/summary')
    async myReviewsSummary(@Req() req: any) {
        const data = await this.reviewsService.getMyReviewSummary(req.user.userId);
        return { success: true, data };
    }
    @Get('order/:orderId/status')
    async getOrderReviewStatus(@Req() req: any, @Param('orderId') orderId: string) {
        const data = await this.reviewStatusService.getOrderReviewStatus(
            req.user.userId,
            orderId,
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
    @Post('product')
    @UseInterceptors(
        FileFieldsInterceptor([
            { name: 'images', maxCount: 9 },
            { name: 'video', maxCount: 1 },
        ]),
    )
    async createProductReview(
        @Req() req: any,
        @Body() dto: CreateProductReviewFormDto,
        @UploadedFiles()
        files: {
            images?: Express.Multer.File[];
            video?: Express.Multer.File[];
        },
    ) {
        const uploadedImages = await this.reviewMediaUploadService.uploadImages(
            files?.images ?? [],
        );
        const uploadedVideo = await this.reviewMediaUploadService.uploadVideo(
            files?.video?.[0],
        );

        try {
            const data = await this.reviewsService.create(req.user.userId, {
                order_id: dto.order_id,
                merchant_id: dto.merchant_id,
                product_id: dto.product_id,
                rating: Number(dto.rating),
                comment: (dto.comment ?? '').trim(),
                images: uploadedImages,
                video_url: uploadedVideo?.url ?? null,
                video_public_id: uploadedVideo?.public_id ?? null,
            } as any);

            return { success: true, data };
        } catch (e) {
            await Promise.allSettled([
                this.reviewMediaUploadService.destroyImages(
                    uploadedImages.map((x) => x.public_id).filter(Boolean),
                ),
                this.reviewMediaUploadService.destroyVideo(
                    uploadedVideo?.public_id,
                ),
            ]);
            throw e;
        }
    }

    @Patch('product/:id')
    @UseInterceptors(
        FileFieldsInterceptor([
            { name: 'images', maxCount: 9 },
            { name: 'video', maxCount: 1 },
        ]),
    )
    async updateProductReview(
        @Req() req: any,
        @Param('id') id: string,
        @Body() dto: UpdateProductReviewFormDto,
        @UploadedFiles()
        files: {
            images?: Express.Multer.File[];
            video?: Express.Multer.File[];
        },
    ) {
        const current = await this.reviewsService.getOwnedReviewOrThrow(
            req.user.userId,
            id,
        );

        const keptRemoteImageUrls = this.parseStringArray(dto.kept_remote_image_urls);
        const keptRemoteVideoUrl = (dto.kept_remote_video_url ?? '').trim();

        const currentImages = Array.isArray(current.images) ? current.images : [];
        const keptImages = currentImages
            .filter((img: any) => keptRemoteImageUrls.includes(String(img.url)))
            .map((img: any) => ({
                url: img.url,
                public_id: img.public_id ?? null,
            }));

        const removedImagePublicIds = currentImages
            .filter((img: any) => !keptRemoteImageUrls.includes(String(img.url)))
            .map((img: any) => img.public_id)
            .filter(Boolean);

        const uploadedImages = await this.reviewMediaUploadService.uploadImages(
            files?.images ?? [],
        );
        const uploadedVideo = await this.reviewMediaUploadService.uploadVideo(
            files?.video?.[0],
        );

        const keepOldVideo =
            !!keptRemoteVideoUrl &&
            !!current.video_url &&
            keptRemoteVideoUrl === String(current.video_url);

        const nextVideoUrl = uploadedVideo?.url
            ?? (keepOldVideo ? current.video_url ?? null : null);

        const nextVideoPublicId = uploadedVideo?.public_id
            ?? (keepOldVideo ? (current as any).video_public_id ?? null : null);

        const shouldDeleteOldVideo =
            !!(current as any).video_public_id && (!keepOldVideo || !!uploadedVideo);

        try {
            const data = await this.reviewsService.update(req.user.userId, id, {
                ...(dto.rating != null ? { rating: Number(dto.rating) } : {}),
                ...(dto.comment != null ? { comment: (dto.comment ?? '').trim() } : {}),
                images: [...keptImages, ...uploadedImages],
                video_url: nextVideoUrl,
                video_public_id: nextVideoPublicId,
            } as any);

            await Promise.allSettled([
                this.reviewMediaUploadService.destroyImages(removedImagePublicIds),
                shouldDeleteOldVideo
                    ? this.reviewMediaUploadService.destroyVideo(
                        (current as any).video_public_id,
                    )
                    : Promise.resolve(),
            ]);

            return { success: true, data };
        } catch (e) {
            await Promise.allSettled([
                this.reviewMediaUploadService.destroyImages(
                    uploadedImages.map((x) => x.public_id).filter(Boolean),
                ),
                this.reviewMediaUploadService.destroyVideo(
                    uploadedVideo?.public_id,
                ),
            ]);
            throw e;
        }
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
    @Get('mine')
    async myReviews(@Req() req: any, @Query() query: CustomerMyReviewsQueryDto) {
        const data = await this.reviewsService.listMyReviewFeed(req.user.userId, query);
        return { success: true, data };
    }
    @Delete('product/:id')
    async deleteProductReview(@Req() req: any, @Param('id') id: string) {
        const current = await this.reviewsService.getOwnedReviewOrThrow(
            req.user.userId,
            id,
        );

        const imagePublicIds = (Array.isArray(current.images) ? current.images : [])
            .map((x: any) => x.public_id)
            .filter(Boolean);

        const videoPublicId = (current as any).video_public_id ?? null;

        await Promise.allSettled([
            this.reviewMediaUploadService.destroyImages(imagePublicIds),
            this.reviewMediaUploadService.destroyVideo(videoPublicId),
        ]);

        const data = await this.reviewsService.remove(req.user.userId, id);
        return { success: true, data };
    }

    @Post('merchant')
    @UseInterceptors(
        FileFieldsInterceptor([
            { name: 'images', maxCount: 9 },
            { name: 'video', maxCount: 1 },
        ]),
    )
    async createMerchantReview(
        @Req() req: any,
        @Body() dto: CreateMerchantReviewFormDto,
        @UploadedFiles()
        files: {
            images?: Express.Multer.File[];
            video?: Express.Multer.File[];
        },
    ) {
        const uploadedImages = await this.reviewMediaUploadService.uploadImages(
            files?.images ?? [],
            'reviews/merchants/images',
        );
        const uploadedVideo = await this.reviewMediaUploadService.uploadVideo(
            files?.video?.[0],
            'reviews/merchants/videos',
        );

        try {
            const data = await this.merchantReviewsService.create(req.user.userId, {
                order_id: dto.order_id,
                merchant_id: dto.merchant_id,
                rating: Number(dto.rating),
                comment: (dto.comment ?? '').trim(),
                images: uploadedImages,
                video_url: uploadedVideo?.url ?? null,
                video_public_id: uploadedVideo?.public_id ?? null,
            });

            return { success: true, data };
        } catch (e) {
            await Promise.allSettled([
                this.reviewMediaUploadService.destroyImages(
                    uploadedImages.map((x) => x.public_id).filter(Boolean),
                ),
                this.reviewMediaUploadService.destroyVideo(uploadedVideo?.public_id),
            ]);
            throw e;
        }
    }

    @Patch('merchant/:id')
    @UseInterceptors(
        FileFieldsInterceptor([
            { name: 'images', maxCount: 9 },
            { name: 'video', maxCount: 1 },
        ]),
    )
    async updateMerchantReview(
        @Req() req: any,
        @Param('id') id: string,
        @Body() dto: UpdateMerchantReviewFormDto,
        @UploadedFiles()
        files: {
            images?: Express.Multer.File[];
            video?: Express.Multer.File[];
        },
    ) {
        const current = await this.merchantReviewsService.getOwnedReviewOrThrow(
            req.user.userId,
            id,
        );

        const keptRemoteImageUrls = this.parseStringArray(dto.kept_remote_image_urls);
        const keptRemoteVideoUrl = (dto.kept_remote_video_url ?? '').trim();

        const currentImages = Array.isArray(current.images) ? current.images : [];
        const keptImages = currentImages
            .filter((img: any) => keptRemoteImageUrls.includes(String(img.url)))
            .map((img: any) => ({
                url: img.url,
                public_id: img.public_id ?? null,
            }));

        const removedImagePublicIds = currentImages
            .filter((img: any) => !keptRemoteImageUrls.includes(String(img.url)))
            .map((img: any) => img.public_id)
            .filter(Boolean);

        const uploadedImages = await this.reviewMediaUploadService.uploadImages(
            files?.images ?? [],
            'reviews/merchants/images',
        );
        const uploadedVideo = await this.reviewMediaUploadService.uploadVideo(
            files?.video?.[0],
            'reviews/merchants/videos',
        );

        const keepOldVideo =
            !!keptRemoteVideoUrl &&
            !!current.video_url &&
            keptRemoteVideoUrl === String(current.video_url);

        const nextVideoUrl =
            uploadedVideo?.url ?? (keepOldVideo ? current.video_url ?? null : null);

        const nextVideoPublicId =
            uploadedVideo?.public_id ??
            (keepOldVideo ? (current as any).video_public_id ?? null : null);

        const shouldDeleteOldVideo =
            !!(current as any).video_public_id && (!keepOldVideo || !!uploadedVideo);

        try {
            const data = await this.merchantReviewsService.update(req.user.userId, id, {
                ...(dto.rating != null ? { rating: Number(dto.rating) } : {}),
                ...(dto.comment != null ? { comment: (dto.comment ?? '').trim() } : {}),
                images: [...keptImages, ...uploadedImages],
                video_url: nextVideoUrl,
                video_public_id: nextVideoPublicId,
            });

            await Promise.allSettled([
                this.reviewMediaUploadService.destroyImages(removedImagePublicIds),
                shouldDeleteOldVideo
                    ? this.reviewMediaUploadService.destroyVideo(
                        (current as any).video_public_id,
                    )
                    : Promise.resolve(),
            ]);

            return { success: true, data };
        } catch (e) {
            await Promise.allSettled([
                this.reviewMediaUploadService.destroyImages(
                    uploadedImages.map((x) => x.public_id).filter(Boolean),
                ),
                this.reviewMediaUploadService.destroyVideo(uploadedVideo?.public_id),
            ]);
            throw e;
        }
    }
    @Delete('merchant/:id')
    async deleteMerchantReview(@Req() req: any, @Param('id') id: string) {
        const current = await this.merchantReviewsService.getOwnedReviewOrThrow(
            req.user.userId,
            id,
        );

        const imagePublicIds = (Array.isArray(current.images) ? current.images : [])
            .map((x: any) => x.public_id)
            .filter(Boolean);

        const videoPublicId = (current as any).video_public_id ?? null;

        await Promise.allSettled([
            this.reviewMediaUploadService.destroyImages(imagePublicIds),
            this.reviewMediaUploadService.destroyVideo(videoPublicId),
        ]);

        const data = await this.merchantReviewsService.remove(req.user.userId, id);
        return { success: true, data };
    }

    @Get('merchant/order/:orderId')
    async getMyMerchantReviewByOrder(@Req() req: any, @Param('orderId') orderId: string) {
        const data = await this.merchantReviewsService.getMyReviewByOrder(
            req.user.userId,
            orderId,
        );
        return { success: true, data };
    }

    @Post('driver')
    @UseInterceptors(
        FileFieldsInterceptor([
            { name: 'images', maxCount: 9 },
            { name: 'video', maxCount: 1 },
        ]),
    )
    async createDriverReview(
        @Req() req: any,
        @Body() dto: CreateDriverReviewFormDto,
        @UploadedFiles()
        files: {
            images?: Express.Multer.File[];
            video?: Express.Multer.File[];
        },
    ) {
        const uploadedImages = await this.reviewMediaUploadService.uploadImages(
            files?.images ?? [],
            'reviews/drivers/images',
        );
        const uploadedVideo = await this.reviewMediaUploadService.uploadVideo(
            files?.video?.[0],
            'reviews/drivers/videos',
        );

        try {
            const data = await this.driverReviewsService.create(req.user.userId, {
                order_id: dto.order_id,
                driver_user_id: dto.driver_user_id,
                rating: Number(dto.rating),
                comment: (dto.comment ?? '').trim(),
                images: uploadedImages,
                video_url: uploadedVideo?.url ?? null,
                video_public_id: uploadedVideo?.public_id ?? null,
            });

            return { success: true, data };
        } catch (e) {
            await Promise.allSettled([
                this.reviewMediaUploadService.destroyImages(
                    uploadedImages.map((x) => x.public_id).filter(Boolean),
                ),
                this.reviewMediaUploadService.destroyVideo(uploadedVideo?.public_id),
            ]);
            throw e;
        }
    }

    @Patch('driver/:id')
    @UseInterceptors(
        FileFieldsInterceptor([
            { name: 'images', maxCount: 9 },
            { name: 'video', maxCount: 1 },
        ]),
    )
    async updateDriverReview(
        @Req() req: any,
        @Param('id') id: string,
        @Body() dto: UpdateDriverReviewFormDto,
        @UploadedFiles()
        files: {
            images?: Express.Multer.File[];
            video?: Express.Multer.File[];
        },
    ) {
        const current = await this.driverReviewsService.getOwnedReviewOrThrow(
            req.user.userId,
            id,
        );

        const keptRemoteImageUrls = this.parseStringArray(dto.kept_remote_image_urls);
        const keptRemoteVideoUrl = (dto.kept_remote_video_url ?? '').trim();

        const currentImages = Array.isArray(current.images) ? current.images : [];
        const keptImages = currentImages
            .filter((img: any) => keptRemoteImageUrls.includes(String(img.url)))
            .map((img: any) => ({
                url: img.url,
                public_id: img.public_id ?? null,
            }));

        const removedImagePublicIds = currentImages
            .filter((img: any) => !keptRemoteImageUrls.includes(String(img.url)))
            .map((img: any) => img.public_id)
            .filter(Boolean);

        const uploadedImages = await this.reviewMediaUploadService.uploadImages(
            files?.images ?? [],
            'reviews/drivers/images',
        );
        const uploadedVideo = await this.reviewMediaUploadService.uploadVideo(
            files?.video?.[0],
            'reviews/drivers/videos',
        );

        const keepOldVideo =
            !!keptRemoteVideoUrl &&
            !!current.video_url &&
            keptRemoteVideoUrl === String(current.video_url);

        const nextVideoUrl =
            uploadedVideo?.url ?? (keepOldVideo ? current.video_url ?? null : null);

        const nextVideoPublicId =
            uploadedVideo?.public_id ??
            (keepOldVideo ? (current as any).video_public_id ?? null : null);

        const shouldDeleteOldVideo =
            !!(current as any).video_public_id && (!keepOldVideo || !!uploadedVideo);

        try {
            const data = await this.driverReviewsService.update(req.user.userId, id, {
                ...(dto.rating != null ? { rating: Number(dto.rating) } : {}),
                ...(dto.comment != null ? { comment: (dto.comment ?? '').trim() } : {}),
                images: [...keptImages, ...uploadedImages],
                video_url: nextVideoUrl,
                video_public_id: nextVideoPublicId,
            });

            await Promise.allSettled([
                this.reviewMediaUploadService.destroyImages(removedImagePublicIds),
                shouldDeleteOldVideo
                    ? this.reviewMediaUploadService.destroyVideo(
                        (current as any).video_public_id,
                    )
                    : Promise.resolve(),
            ]);

            return { success: true, data };
        } catch (e) {
            await Promise.allSettled([
                this.reviewMediaUploadService.destroyImages(
                    uploadedImages.map((x) => x.public_id).filter(Boolean),
                ),
                this.reviewMediaUploadService.destroyVideo(uploadedVideo?.public_id),
            ]);
            throw e;
        }
    }

    @Delete('driver/:id')
    async deleteDriverReview(@Req() req: any, @Param('id') id: string) {
        const current = await this.driverReviewsService.getOwnedReviewOrThrow(
            req.user.userId,
            id,
        );

        const imagePublicIds = (Array.isArray(current.images) ? current.images : [])
            .map((x: any) => x.public_id)
            .filter(Boolean);

        const videoPublicId = (current as any).video_public_id ?? null;

        await Promise.allSettled([
            this.reviewMediaUploadService.destroyImages(imagePublicIds),
            this.reviewMediaUploadService.destroyVideo(videoPublicId),
        ]);

        const data = await this.driverReviewsService.remove(req.user.userId, id);
        return { success: true, data };
    }

    @Get('driver/order/:orderId')
    async getMyDriverReviewByOrder(@Req() req: any, @Param('orderId') orderId: string) {
        const data = await this.driverReviewsService.getMyReviewByOrder(
            req.user.userId,
            orderId,
        );
        return { success: true, data };
    }
}