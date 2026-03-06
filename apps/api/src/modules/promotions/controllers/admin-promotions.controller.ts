import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { MulterOptions } from "@nestjs/platform-express/multer/interfaces/multer-options.interface";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";

import { JwtAuthGuard } from "src/modules/auth";

import { AdminPromotionsService } from "../services/admin-promotions.service";
import { CreateAdminPromotionDto } from "../dtos/admin/create-admin-promotion.dto";
import { UpdateAdminPromotionDto } from "../dtos/admin/update-admin-promotion.dto";
import { CreateAdminVoucherDto } from "../dtos/admin/create-admin-voucher.dto";
import { UpdateAdminVoucherDto } from "../dtos/admin/update-admin-voucher.dto";

const bannerMulterOptions: MulterOptions = {
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!file?.mimetype?.startsWith("image/")) {
            return cb(new BadRequestException("Only image files are allowed") as any, false);
        }
        cb(null, true);
    },
};

@Controller("admin")
@UseGuards(JwtAuthGuard)
export class AdminPromotionsController {
    constructor(private readonly svc: AdminPromotionsService) { }

    // ===== Promotions =====
    @Get("promotions")
    listPromotions() {
        return this.svc.listPlatformPromotions();
    }

    @Post("promotions")
    @UseInterceptors(FileInterceptor("file", bannerMulterOptions))
    async createPromotionMultipart(@UploadedFile() file: Express.Multer.File, @Body("data") data: string) {
        if (!file) throw new BadRequestException("Banner file is required");
        if (!data) throw new BadRequestException("data is required");

        let parsed: any;
        try {
            parsed = JSON.parse(data);
        } catch {
            throw new BadRequestException("data must be valid JSON");
        }

        const dto = plainToInstance(CreateAdminPromotionDto, parsed);
        const errors = validateSync(dto, { whitelist: true, forbidNonWhitelisted: true });
        if (errors.length) throw new BadRequestException(errors);

        return this.svc.createPlatformPromotionWithBanner(dto, file);
    }

    @Patch("promotions/:id")
    updatePromotion(@Param("id") id: string, @Body() dto: UpdateAdminPromotionDto) {
        return this.svc.updatePlatformPromotion(id, dto);
    }

    @Patch("promotions/:id/active")
    togglePromotion(@Param("id") id: string, @Body() body: { is_active: boolean }) {
        return this.svc.togglePlatformPromotion(id, !!body.is_active);
    }

    @Delete("promotions/:id")
    deletePromotion(@Param("id") id: string) {
        return this.svc.deletePlatformPromotion(id);
    }

    @Post("promotions/:id/banner")
    @UseInterceptors(FileInterceptor("file", bannerMulterOptions))
    uploadPromotionBanner(@Param("id") id: string, @UploadedFile() file: Express.Multer.File) {
        if (!file) throw new BadRequestException("Banner file is required");
        return this.svc.uploadPlatformPromotionBanner(id, file);
    }

    // ===== Vouchers (no banner) =====
    @Get("vouchers")
    listVouchers() {
        return this.svc.listPlatformVouchers();
    }

    @Post("vouchers")
    createVoucher(@Body() dto: CreateAdminVoucherDto) {
        return this.svc.createPlatformVoucher(dto);
    }

    @Patch("vouchers/:id")
    updateVoucher(@Param("id") id: string, @Body() dto: UpdateAdminVoucherDto) {
        return this.svc.updatePlatformVoucher(id, dto);
    }

    @Patch("vouchers/:id/active")
    toggleVoucher(@Param("id") id: string, @Body() body: { is_active: boolean }) {
        return this.svc.togglePlatformVoucher(id, !!body.is_active);
    }

    @Delete("vouchers/:id")
    deleteVoucher(@Param("id") id: string) {
        return this.svc.deletePlatformVoucher(id);
    }
}