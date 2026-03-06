import { Controller, Get, Param, Query } from '@nestjs/common';
import { ProductDetailQueryDto } from '../dtos/product-detail.dto';
import { ProductsPublicService } from '../services/products-public.service';

@Controller('products')
export class ProductsPublicController {
    constructor(private readonly svc: ProductsPublicService) { }

    @Get(':id/detail')
    detail(@Param('id') id: string, @Query() q: ProductDetailQueryDto) {
        return this.svc.getDetail(id, { lat: q.lat, lng: q.lng });
    }
}