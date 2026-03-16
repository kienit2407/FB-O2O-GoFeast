import { Injectable } from '@nestjs/common';
import { GeoService } from './geo.service';

type LatLng = { lat: number; lng: number };

@Injectable()
export class DeliveryRouteResolverService {
    private readonly NEAR_ROUTE_THRESHOLD_KM = 0.08; // 80m
    private readonly ETA_BUFFER_MIN = 2;

    constructor(private readonly geo: GeoService) { }

    private roundCoord(n: number) {
        return Number(Number(n).toFixed(6));
    }

    private haversineKm(a: LatLng, b: LatLng) {
        const toRad = (x: number) => (x * Math.PI) / 180;
        const R = 6371;

        const dLat = toRad(b.lat - a.lat);
        const dLng = toRad(b.lng - a.lng);

        const aa =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(a.lat)) *
            Math.cos(toRad(b.lat)) *
            Math.sin(dLng / 2) ** 2;

        const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
        return R * c;
    }

    // 👇 lấy đúng fallback cũ của merchant detail để đồng bộ
    private estimateFallbackTravelMin(distanceKm: number) {
        return Math.max(6, Math.ceil(distanceKm * 4 + 8));
    }

    private formatDistanceText(distanceKm: number) {
        if (distanceKm < 1) {
            return `${Math.max(1, Math.round(distanceKm * 1000))} m`;
        }
        return `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km`;
    }

    async resolve(input: {
        origin: LatLng;
        destination: LatLng;
        prepMin: number;
        radiusKm?: number;
    }) {
        const origin = {
            lat: this.roundCoord(input.origin.lat),
            lng: this.roundCoord(input.origin.lng),
        };

        const destination = {
            lat: this.roundCoord(input.destination.lat),
            lng: this.roundCoord(input.destination.lng),
        };

        const prepMin = Math.max(0, Math.round(Number(input.prepMin ?? 15)));
        const radiusKm = Number(input.radiusKm ?? 0);

        const crowKm = this.haversineKm(origin, destination);

        let distanceKm = crowKm;
        let travelMin: number | null = null;
        let distanceText: string | null = null;
        let durationText: string | null = null;
        let source:
            | 'trackasia_motorcycling'
            | 'trackasia_driving'
            | 'nearby_fallback'
            | 'crow_fallback' = 'crow_fallback';

        // 1) Quá gần => khỏi gọi directions, nhưng vẫn dùng fallback ETA giống merchant detail
        if (crowKm <= this.NEAR_ROUTE_THRESHOLD_KM) {
            travelMin = this.estimateFallbackTravelMin(crowKm);
            distanceText = this.formatDistanceText(crowKm);
            durationText = `${travelMin} phút`;
            source = 'nearby_fallback';
        } else {
            // 2) Thử motorcycling trước
            try {
                const r = await this.geo.getEtaDirections({
                    origin,
                    destination,
                    mode: 'motorcycling',
                    new_admin: true,
                });

                if (r.ok && r.distance_m != null) {
                    distanceKm = Number(r.distance_m) / 1000;
                    travelMin = Math.max(1, Math.ceil(Number(r.duration_s ?? 0) / 60));
                    distanceText = r.distance_text ?? this.formatDistanceText(distanceKm);
                    durationText = r.duration_text ?? `${travelMin} phút`;
                    source = 'trackasia_motorcycling';
                }
            } catch (e: any) {
                console.warn('[delivery-route] motorcycling directions failed', {
                    message: e?.message,
                });
            }

            // 3) Nếu fail thì thử driving
            if (travelMin == null) {
                try {
                    const r = await this.geo.getEtaDirections({
                        origin,
                        destination,
                        mode: 'driving',
                        new_admin: true,
                    });

                    if (r.ok && r.distance_m != null) {
                        distanceKm = Number(r.distance_m) / 1000;
                        travelMin = Math.max(1, Math.ceil(Number(r.duration_s ?? 0) / 60));
                        distanceText = r.distance_text ?? this.formatDistanceText(distanceKm);
                        durationText = r.duration_text ?? `${travelMin} phút`;
                        source = 'trackasia_driving';
                    }
                } catch (e: any) {
                    console.warn('[delivery-route] driving directions failed', {
                        message: e?.message,
                    });
                }
            }

            // 4) Fallback cuối
            if (travelMin == null) {
                distanceKm = crowKm;
                travelMin = this.estimateFallbackTravelMin(crowKm);
                distanceText = this.formatDistanceText(distanceKm);
                durationText = `${travelMin} phút`;
                source = 'crow_fallback';
            }
        }

        const etaMin = prepMin + travelMin + this.ETA_BUFFER_MIN;
        const etaAt = new Date(Date.now() + etaMin * 60 * 1000).toISOString();
        const canDeliver = radiusKm > 0 ? distanceKm <= radiusKm : false;

        return {
            origin,
            destination,
            prepMin,
            radiusKm,

            distanceKm,
            distanceText,
            durationText,
            travelMin,
            etaMin,
            etaAt,
            canDeliver,
            source,
        };
    }
}