import {
    Body, Controller, Get, Param, Patch, Post, UseGuards, Delete,
    UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth';
import { MerchantPromotionsService } from '../services/merchant-promotions.service';
import { CreateMerchantPromotionDto } from '../dtos/merchant/create-merchant-promotion.dto';
import { UpdateMerchantPromotionDto } from '../dtos/merchant/update-merchant-promotion.dto';
import { CreateMerchantVoucherDto } from '../dtos/merchant/create-merchant-voucher.dto';
import { UpdateMerchantVoucherDto } from '../dtos/merchant/update-merchant-voucher.dto';

const bannerMulterOptions: MulterOptions = {
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        if (!file?.mimetype?.startsWith('image/')) {
            return cb(new BadRequestException('Only image files are allowed') as any, false);
        }
        cb(null, true);
    },
};

@Controller()
@UseGuards(JwtAuthGuard)
export class MerchantPromotionsController {
    constructor(private readonly svc: MerchantPromotionsService) { }

    private ownerId(user: any) {
        const id = user?.sub ?? user?.userId ?? user?._id ?? user?.id;
        return String(id);
    }

    // ----- promotions -----
    @Get('promotions/me')
    listPromotions(@CurrentUser() user: any) {
        return this.svc.listPromotions(this.ownerId(user));
    }

    @Post('promotions/me')
    @UseInterceptors(FileInterceptor('file', bannerMulterOptions))
    async createPromotionMultipart(
        @CurrentUser() user: any,
        @UploadedFile() file: Express.Multer.File,
        @Body('data') data: string,
    ) {
        if (!file) throw new BadRequestException('Banner file is required');
        if (!data) throw new BadRequestException('data is required');

        let parsed: any;
        try {
            parsed = JSON.parse(data);
        } catch {
            throw new BadRequestException('data must be valid JSON');
        }

        const dto = plainToInstance(CreateMerchantPromotionDto, parsed);

        // ⚠️ nếu bạn hay gửi show_as_popup/is_active mà DTO chưa có -> sẽ fail ở đây
        const errors = validateSync(dto, { whitelist: true, forbidNonWhitelisted: true });
        if (errors.length) throw new BadRequestException(errors);

        return this.svc.createPromotionWithBanner(this.ownerId(user), dto, file);
    }

    @Patch('promotions/me/:id')
    updatePromotion(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateMerchantPromotionDto) {
        return this.svc.updatePromotion(this.ownerId(user), id, dto);
    }

    @Patch('promotions/me/:id/active')
    togglePromotion(@CurrentUser() user: any, @Param('id') id: string, @Body() body: { is_active: boolean }) {
        return this.svc.togglePromotion(this.ownerId(user), id, !!body.is_active);
    }

    @Delete('promotions/me/:id')
    deletePromotion(@CurrentUser() user: any, @Param('id') id: string) {
        return this.svc.deletePromotion(this.ownerId(user), id);
    }

    // ----- banner -----
    @Post('promotions/me/:id/banner')
    @UseInterceptors(FileInterceptor('file', bannerMulterOptions))
    uploadBanner(@CurrentUser() user: any, @Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
        if (!file) throw new BadRequestException('Banner file is required');
        return this.svc.uploadPromotionBanner(this.ownerId(user), id, file);
    }

    // ----- vouchers -----
    @Get('vouchers/me')
    listVouchers(@CurrentUser() user: any) {
        return this.svc.listVouchers(this.ownerId(user));
    }

    @Post('vouchers/me')
    createVoucher(@CurrentUser() user: any, @Body() dto: CreateMerchantVoucherDto) {
        return this.svc.createVoucher(this.ownerId(user), dto);
    }

    @Patch('vouchers/me/:id')
    updateVoucher(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateMerchantVoucherDto) {
        return this.svc.updateVoucher(this.ownerId(user), id, dto);
    }

    @Patch('vouchers/me/:id/active')
    toggleVoucher(@CurrentUser() user: any, @Param('id') id: string, @Body() body: { is_active: boolean }) {
        return this.svc.toggleVoucher(this.ownerId(user), id, !!body.is_active);
    }

    @Delete('vouchers/me/:id')
    deleteVoucher(@CurrentUser() user: any, @Param('id') id: string) {
        return this.svc.deleteVoucher(this.ownerId(user), id);
    }
}