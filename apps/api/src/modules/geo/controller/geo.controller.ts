import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
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
    @Get('route')
    async route(
        @Query('originLat') originLat: string,
        @Query('originLng') originLng: string,
        @Query('destinationLat') destinationLat: string,
        @Query('destinationLng') destinationLng: string,
        @Query('mode') mode?: 'driving' | 'motorcycling' | 'walking' | 'truck',
    ) {
        const oLat = Number(originLat);
        const oLng = Number(originLng);
        const dLat = Number(destinationLat);
        const dLng = Number(destinationLng);

        if (
            [oLat, oLng, dLat, dLng].some((x) => Number.isNaN(x))
        ) {
            throw new BadRequestException('Invalid route coordinates');
        }

        const data = await this.geo.getEtaDirections({
            origin: { lat: oLat, lng: oLng },
            destination: { lat: dLat, lng: dLng },
            mode: mode ?? 'motorcycling',
            new_admin: true,
        });

        return { success: true, data };
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