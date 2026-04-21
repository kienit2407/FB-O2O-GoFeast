/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef } from 'react';
import trackasiagl from 'trackasia-gl';
import 'trackasia-gl/dist/trackasia-gl.css';

type Props = {
    value?: { lat: number; lng: number } | null;
    onChange: (v: { lat: number; lng: number }) => void;
    height?: number;
};

function buildStyleUrl() {
    const styleUrl = import.meta.env.VITE_TRACKASIA_STYLE_URL as string | undefined;
    const key = import.meta.env.VITE_TRACKASIA_STYLE_KEY as string | undefined;

    if (!styleUrl) return undefined;
    if (!key) return styleUrl;
    return styleUrl.includes('{key}') ? styleUrl.replace('{key}', key) : styleUrl;
}

export function TrackAsiaMapPicker({ value, onChange, height = 600 }: Props) {
    const mapRef = useRef<any>(null);
    const markerRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    const style = useMemo(() => buildStyleUrl(), []);

    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;
        if (!style) return;

        const center: [number, number] = value
            ? [value.lng, value.lat]
            : [106.70098, 10.77689]; // HCM fallback

        const map = new trackasiagl.Map({
            container: containerRef.current,
            style,
            center,
            zoom: value ? 16 : 12,
        });

        map.addControl(new trackasiagl.NavigationControl(), 'top-right');

        const marker = new trackasiagl.Marker({ draggable: true })
            .setLngLat(center)
            .addTo(map);

        marker.on('dragend', () => {
            const ll = marker.getLngLat();
            onChange({ lat: ll.lat, lng: ll.lng });
        });

        map.on('click', (e: any) => {
            const ll = e.lngLat;
            marker.setLngLat([ll.lng, ll.lat]);
            onChange({ lat: ll.lat, lng: ll.lng });
        });

        mapRef.current = map;
        markerRef.current = marker;

        return () => {
            marker.remove();
            map.remove();
            mapRef.current = null;
            markerRef.current = null;
        };
    }, [style]); // ✅ không phụ thuộc value để khỏi init lại

    useEffect(() => {
        if (!value || !mapRef.current || !markerRef.current) return;
        markerRef.current.setLngLat([value.lng, value.lat]);
        mapRef.current.easeTo({ center: [value.lng, value.lat], zoom: 16 });
    }, [value]);

    return (
        <div
            ref={containerRef}
            style={{ height, width: '100%', borderRadius: 12, overflow: 'hidden' }}
        />
    );
}