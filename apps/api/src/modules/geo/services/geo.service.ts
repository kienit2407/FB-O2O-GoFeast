// src/modules/geo/geo.service.ts
import {
  Injectable,
  BadGatewayException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from 'src/config/config.service';

type LatLng = { lat: number; lng: number };
type TravelMode = 'driving' | 'motorcycling' | 'walking' | 'truck';

@Injectable()
export class GeoService {
  constructor(private readonly config: ConfigService) { }
  private toPoint(input: LatLng | string): string {
    if (typeof input === 'string') return input;
    // TrackAsia dùng "lat,lng"
    return `${input.lat},${input.lng}`;
  }
  private get key(): string {
    const k = this.config.get<string>('TRACKASIA_KEY') || this.config.trackAsiaKey;
    if (!k) throw new InternalServerErrorException('TRACKASIA_KEY is missing');
    return k;
  }
  async getEtaDirections(params: {
    origin: LatLng | string;
    destination: LatLng | string;
    mode?: TravelMode;
    new_admin?: boolean;
  }) {
    const url = new URL('https://maps.track-asia.com/route/v2/directions/json');

    url.searchParams.set('origin', this.toPoint(params.origin));
    url.searchParams.set('destination', this.toPoint(params.destination));
    url.searchParams.set('mode', params.mode ?? 'motorcycling'); // delivery thường dùng motorcycling
    url.searchParams.set('new_admin', String(params.new_admin ?? true));
    url.searchParams.set('key', this.key);

    const json = await this.fetchJson(url);

    // ZERO_RESULTS hoặc không có route
    if (json?.status === 'ZERO_RESULTS' || !Array.isArray(json?.routes) || json.routes.length === 0) {
      return {
        ok: false as const,
        status: json?.status ?? 'ZERO_RESULTS',
        distance_m: null,
        duration_s: null,
        distance_text: null,
        duration_text: null,
        polyline: null,
        raw: json,
      };
    }

    const route = json.routes[0];
    const leg = route?.legs?.[0];

    const distance_m = Number(leg?.distance?.value ?? 0) || 0;
    const duration_s = Number(leg?.duration?.value ?? 0) || 0;

    return {
      ok: true as const,
      status: json.status,
      distance_m,
      duration_s,
      distance_text: leg?.distance?.text ?? null,
      duration_text: leg?.duration?.text ?? null,

      // tiện cho FE vẽ route nếu muốn
      polyline: route?.overview_polyline?.points ?? null,

      // nếu TrackAsia trả giống Google có duration_in_traffic (không phải lúc nào cũng có)
      duration_in_traffic_s: route?.legs?.[0]?.duration_in_traffic?.value ?? null,

      raw: json,
    };
  }
  private async fetchJson(url: URL) {
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    });

    const ct = res.headers.get('content-type') || '';
    const text = await res.text().catch(() => '');

    // Nếu HTTP != 200 -> ném kèm body snippet để biết lỗi thật (403/429/...)
    if (!res.ok) {
      throw new BadGatewayException({
        message: 'TrackAsia HTTP error',
        status: res.status,
        contentType: ct,
        url: res.url,
        bodySnippet: text.slice(0, 300),
      });
    }

    // Có khi trả HTML dù 200 => vẫn bắt
    if (!ct.includes('application/json')) {
      throw new BadGatewayException({
        message: 'TrackAsia returned non-JSON response',
        status: res.status,
        contentType: ct,
        url: res.url,
        bodySnippet: text.slice(0, 300),
      });
    }

    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      throw new BadGatewayException({
        message: 'TrackAsia JSON parse failed',
        status: res.status,
        url: res.url,
        bodySnippet: text.slice(0, 300),
      });
    }

    // TrackAsia theo chuẩn Google: có field status/error_message :contentReference[oaicite:2]{index=2}
    if (json?.status && json.status !== 'OK' && json.status !== 'ZERO_RESULTS') {
      throw new BadGatewayException({
        message: 'TrackAsia API status not OK',
        status: json.status,
        error_message: json.error_message,
        url: res.url,
      });
    }

    return json;
  }
  async autocomplete(
    input: string,
    opts?: { lat?: number; lng?: number; size?: number },
  ) {
    const url = new URL('https://maps.track-asia.com/api/v2/place/autocomplete/json');
    url.searchParams.set('input', input);
    url.searchParams.set('size', String(opts?.size ?? 8));

    // bias theo vị trí hiện tại (optional)
    if (opts?.lat != null && opts?.lng != null) {
      url.searchParams.set('location', `${opts.lat},${opts.lng}`);
    }

    url.searchParams.set('new_admin', 'true');
    url.searchParams.set('include_old_admin', 'true');
    url.searchParams.set('key', this.key);

    const json = await this.fetchJson(url);

    const predictions = Array.isArray(json?.predictions) ? json.predictions : [];

    const items = predictions
      .map((p: any) => ({
        placeId: p?.place_id ?? null,
        title: p?.structured_formatting?.main_text ?? p?.description ?? '',
        subtitle: p?.structured_formatting?.secondary_text ?? p?.description ?? '',
        description: p?.description ?? null,
      }))
      .filter((x: any) => x.title);

    return { items };
  }
  async reverse(
    lat: number,
    lng: number,
    opts?: { size?: number; radius?: number; resultType?: string },
  ) {
    const url = new URL('https://maps.track-asia.com/api/v2/geocode/json');

    url.searchParams.set('latlng', `${lat},${lng}`);

    //  default cho pin-center
    url.searchParams.set('result_type', opts?.resultType || 'street_address');
    url.searchParams.set('size', String(opts?.size ?? 5));
    url.searchParams.set('radius', String(opts?.radius ?? 120));

    url.searchParams.set('new_admin', 'true');
    url.searchParams.set('include_old_admin', 'true');
    url.searchParams.set('key', this.key);

    const json = await this.fetchJson(url);

    const results = Array.isArray(json?.results) ? json.results : [];

    const first = results[0];
    const address = first?.formatted_address || first?.name || null;

    const items = results
      .map((r: any) => {
        const loc = r?.geometry?.location;
        return {
          placeId: r?.place_id ?? null,
          address: r?.formatted_address || r?.name || null,
          name: r?.name || null,
          lat: loc?.lat ?? null,
          lng: loc?.lng ?? null,
          types: r?.types ?? [],
        };
      })
      .filter((x: any) => x.address); // bỏ item rỗng

    // ✅ trả về address + items cho FE dùng list gợi ý
    return { address, items };
  }
  async nearby(
    lat: number,
    lng: number,
    opts?: { radius?: number; type?: string; keyword?: string; size?: number },
  ) {
    const url = new URL('https://maps.track-asia.com/api/v2/place/nearbysearch/json');
    url.searchParams.set('location', `${lat},${lng}`);
    url.searchParams.set('radius', String(opts?.radius ?? 300));
    if (opts?.type) url.searchParams.set('type', opts.type); // vd: restaurant|cafe
    if (opts?.keyword) url.searchParams.set('keyword', opts.keyword);
    url.searchParams.set('new_admin', 'true');
    url.searchParams.set('include_old_admin', 'true');
    url.searchParams.set('key', this.key);

    const json = await this.fetchJson(url);

    const results = Array.isArray(json?.results) ? json.results : [];
    const items = results
      .slice(0, opts?.size ?? 10)
      .map((r: any) => {
        const loc = r?.geometry?.location;
        return {
          placeId: r?.place_id ?? null,
          address: r?.vicinity || r?.formatted_address || r?.name || null,
          name: r?.name || null,
          lat: loc?.lat ?? null,
          lng: loc?.lng ?? null,
          types: r?.types ?? [],
        };
      })
      .filter((x: any) => x.address);

    return { items };
  }
  async search(text: string) {
    // ✅ đúng docs: Search v2 dùng place/textsearch :contentReference[oaicite:4]{index=4}
    const url = new URL('https://maps.track-asia.com/api/v2/place/textsearch/json');
    url.searchParams.set('query', text);
    url.searchParams.set('radius', '5000');
    url.searchParams.set('new_admin', 'true');
    url.searchParams.set('include_old_admin', 'true');
    url.searchParams.set('key', this.key);

    const json = await this.fetchJson(url);

    const results = Array.isArray(json?.results) ? json.results : [];
    const items = results.map((r: any) => ({
      lat: r?.geometry?.location?.lat,
      lng: r?.geometry?.location?.lng,
      label: r?.formatted_address || r?.name,
      raw: r,
    }));

    return { items, raw: json };
  }
}