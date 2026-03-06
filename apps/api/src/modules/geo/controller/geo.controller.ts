import { Controller, Get, Query } from '@nestjs/common';
import { GeoService } from '../services/geo.service';

@Controller('geo')
export class GeoController {
    constructor(private readonly geo: GeoService) { }
    @Get('autocomplete')
    autocomplete(
        @Query('input') input: string,
        @Query('lat') lat?: string,
        @Query('lng') lng?: string,
        @Query('size') size?: string,
    ) {
        return this.geo.autocomplete(input, {
            lat: lat ? Number(lat) : undefined,
            lng: lng ? Number(lng) : undefined,
            size: size ? Number(size) : undefined,
        });
    }
    @Get('reverse')
    reverse(
        @Query('lat') lat: string,
        @Query('lng') lng: string,
        @Query('size') size?: string,
        @Query('radius') radius?: string,
        @Query('result_type') resultType?: string,
    ) {
        return this.geo.reverse(Number(lat), Number(lng), {
            size: size ? Number(size) : undefined,
            radius: radius ? Number(radius) : undefined,
            resultType,
        });
    }

    @Get('nearby')
    nearby(
        @Query('lat') lat: string,
        @Query('lng') lng: string,
        @Query('radius') radius?: string,
        @Query('type') type?: string,
        @Query('keyword') keyword?: string,
        @Query('size') size?: string,
    ) {
        return this.geo.nearby(Number(lat), Number(lng), {
            radius: radius ? Number(radius) : undefined,
            type,
            keyword,
            size: size ? Number(size) : undefined,
        });
    }
    @Get('search')
    search(@Query('text') text: string) {
        return this.geo.search(text);
    }
}