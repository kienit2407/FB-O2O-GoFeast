/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef } from 'react';
import trackasiagl from 'trackasia-gl';
import 'trackasia-gl/dist/trackasia-gl.css';

import type { AdminHeatmapPoint } from '@/service/adminDashboard.service';

type Props = {
  points: AdminHeatmapPoint[];
  height?: number;
};

const SOURCE_ID = 'admin-orders-heatmap-src';
const HEATMAP_LAYER_ID = 'admin-orders-heatmap-layer';
const CIRCLE_LAYER_ID = 'admin-orders-heatmap-point-layer';

function buildStyleUrl() {
  const styleUrl = import.meta.env.VITE_TRACKASIA_STYLE_URL as string | undefined;
  const key = import.meta.env.VITE_TRACKASIA_STYLE_KEY as string | undefined;

  if (!styleUrl) return undefined;
  if (!key) return styleUrl;

  return styleUrl.includes('{key}') ? styleUrl.replace('{key}', key) : styleUrl;
}

function toGeoJson(points: AdminHeatmapPoint[]) {
  return {
    type: 'FeatureCollection',
    features: points.map((point) => ({
      type: 'Feature',
      properties: {
        order_id: point.id,
        order_type: point.order_type,
        status: point.status,
        weight: point.weight,
      },
      geometry: {
        type: 'Point',
        coordinates: [point.lng, point.lat],
      },
    })),
  };
}

export function OrderHeatmap({ points, height = 260 }: Props) {
  const style = useMemo(() => buildStyleUrl(), []);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !style) return;

    const map = new trackasiagl.Map({
      container: containerRef.current,
      style,
      center: [106.70098, 10.77689],
      zoom: 10,
    });

    map.addControl(new trackasiagl.NavigationControl(), 'top-right');

    map.on('load', () => {
      const sourceData = toGeoJson(points);

      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: sourceData as any,
      });

      map.addLayer({
        id: HEATMAP_LAYER_ID,
        type: 'heatmap',
        source: SOURCE_ID,
        maxzoom: 15,
        paint: {
          'heatmap-weight': ['get', 'weight'],
          'heatmap-intensity': 1,
          'heatmap-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0,
            6,
            8,
            18,
            12,
            28,
            15,
            44,
          ],
          'heatmap-opacity': 0.85,
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0,
            'rgba(56, 189, 248, 0)',
            0.2,
            'rgba(56, 189, 248, 0.35)',
            0.45,
            'rgba(74, 222, 128, 0.55)',
            0.65,
            'rgba(250, 204, 21, 0.65)',
            0.85,
            'rgba(249, 115, 22, 0.8)',
            1,
            'rgba(220, 38, 38, 0.9)',
          ],
        },
      });

      map.addLayer({
        id: CIRCLE_LAYER_ID,
        type: 'circle',
        source: SOURCE_ID,
        minzoom: 12,
        paint: {
          'circle-radius': 4,
          'circle-color': '#111827',
          'circle-stroke-width': 1,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.65,
        },
      });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [points, style]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const source = map.getSource(SOURCE_ID);
    if (!source) return;

    source.setData(toGeoJson(points));
  }, [points]);

  if (!style) {
    return (
      <div className="h-[260px] bg-muted rounded-lg flex items-center justify-center text-sm text-muted-foreground">
        Thiếu cấu hình TrackAsia (`VITE_TRACKASIA_STYLE_URL`)
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ height, width: '100%', borderRadius: 12, overflow: 'hidden' }}
    />
  );
}
