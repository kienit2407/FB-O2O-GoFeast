/* eslint-disable @typescript-eslint/no-explicit-any */
// src/service/geo.service.ts
import { API } from '@/lib/api';

type GeoReverseRes = { address: string | null; raw: any };
type GeoSearchRes = { items: Array<{ lat: number; lng: number; label?: string }>; raw: any };

export const geoService = {
    reverse: async (lat: number, lng: number): Promise<GeoReverseRes> => {
        const res = await API.get('/geo/reverse', { params: { lat, lng } });
        return (res.data?.data ?? res.data) as GeoReverseRes;
    },

    search: async (text: string): Promise<GeoSearchRes> => {
        const res = await API.get('/geo/search', { params: { text } });
        return (res.data?.data ?? res.data) as GeoSearchRes;
    },
};