// src/modules/banners/controllers/admin-carousel-banners.controller.ts
import {
    Controller, Get, Post, Patch, Put, Delete,
    Param, Query, Body, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { CarouselBannersService } from '../services/carousel-banners.service';
import { CreateCarouselBannerDto, ReorderCarouselBannerDto, UpdateCarouselBannerDto } from '../dtos/admin/carousel-banner.dto';


@Controller('admin/carousel-banners')
export class AdminCarouselBannersController {
    constructor(private readonly service: CarouselBannersService) { }

    @Get()
    async list(@Query('includeDeleted') includeDeleted?: string) {
        return {
            success: true,
            data: await this.service.listAdmin({ includeDeleted: includeDeleted === 'true' }),
        };
    }

    @Get(':id')
    async detail(@Param('id') id: string) {
        return { success: true, data: await this.service.getById(id) };
    }

    // Create: upload image + save DB
    @Post()
    @UseInterceptors(
        FileInterceptor('file', {
            storage: memoryStorage(),
            limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
        }),
    )
    async create(@UploadedFile() file: Express.Multer.File, @Body() dto: CreateCarouselBannerDto) {
        const data = await this.service.createWithUpload(file, dto);
        return { success: true, data };
    }

    // Update meta: position/is_active
    @Patch(':id')
    async update(@Param('id') id: string, @Body() dto: UpdateCarouselBannerDto) {
        const data = await this.service.update(id, dto);
        return { success: true, data };
    }

    // Replace image only (upload new -> update db -> delete old on cloudinary)
    @Post(':id/replace-image')
    @UseInterceptors(
        FileInterceptor('file', {
            storage: memoryStorage(),
            limits: { fileSize: 10 * 1024 * 1024 },
        }),
    )
    async replaceImage(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
        const data = await this.service.replaceImage(id, file, true);
        return { success: true, data };
    }

    // Toggle active
    @Patch(':id/active')
    async setActive(@Param('id') id: string, @Body() body: { is_active: boolean }) {
        const data = await this.service.toggleActive(id, !!body.is_active);
        return { success: true, data };
    }

    // Reorder
    @Put('reorder')
    async reorder(@Body() dto: ReorderCarouselBannerDto) {
        const data = await this.service.reorder(dto.items);
        return { success: true, data };
    }

    // Delete: soft delete + delete cloudinary
    @Delete(':id')
    async remove(@Param('id') id: string) {
        const data = await this.service.softDelete(id, true);
        return { success: true, data };
    }
}