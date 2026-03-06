// src/modules/banners/controllers/carousel-banners.controller.ts
import { Controller, Get } from '@nestjs/common';
import { CarouselBannersService } from '../services/carousel-banners.service';

@Controller('carousel-banners')
export class CarouselBannersController {
    constructor(private readonly service: CarouselBannersService) { }

    @Get()
    async list() {
        const data = await this.service.listPublic();
        return { success: true, data };
    }
}