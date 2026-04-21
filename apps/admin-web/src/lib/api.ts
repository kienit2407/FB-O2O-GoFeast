/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosError, AxiosHeaders, AxiosRequestConfig, AxiosResponse } from 'axios';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';
import { v4 as uuid } from 'uuid';

// ====== CONFIG NPROGRESS ======
NProgress.configure({
  showSpinner: false,
  speed: 350,
  minimum: 0.06,
  easing: 'ease',
});

// ====== ENDPOINTS ======
export const REFRESH_ENDPOINT = '/auth/admin/refresh';
export const LOGOUT_ENDPOINT = '/auth/admin/logout'; // Thêm logout để giống merchant

// ====== axios config typing ======
declare module 'axios' {
  export interface AxiosRequestConfig {
    _retry?: boolean;
  }
}

// ====== device id ======
function getDeviceId() {
  // Dùng key riêng cho admin để không đè với merchant nếu test chung domain (localhost)
  const key = 'admin_device_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = uuid();
    localStorage.setItem(key, id);
  }
  return id;
}

// ====== base axios options ======
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const baseHeaders = {
  'x-client-platform': 'web',
  'x-client-app': 'admin_web', // Giữ nguyên admin_web
};

// ✅ Instance có interceptor (dùng cho mọi API bình thường)
export const API = axios.create({
  baseURL,
  withCredentials: true,
  headers: { ...baseHeaders },
});

// ✅ Instance “trần” (KHÔNG interceptor) để gọi refresh/logout tránh loop
export const AUTH = axios.create({
  baseURL,
  withCredentials: true,
  headers: { ...baseHeaders },
});

// ====== progress counter ======
let inflight = 0;
const progressStart = () => {
  if (inflight === 0) NProgress.start();
  inflight += 1;
};
const progressDone = () => {
  inflight = Math.max(0, inflight - 1);
  if (inflight === 0) NProgress.done();
};

// ====== helpers ======
const isRefreshUrl = (url?: string) => !!url && url.includes(REFRESH_ENDPOINT);
const isLogoutUrl = (url?: string) => !!url && url.includes(LOGOUT_ENDPOINT);

// Hàm clear auth của admin (vì admin đang dùng globalThis)
const clearAdminAuth = () => {
  const authStore = (globalThis as any).__adminAuth?.getState();
  if (authStore?.logout) {
    authStore.logout();
  } else if (authStore?.clear) {
    authStore.clear(); // Phòng trường hợp store Admin dùng tên hàm clear()
  }
};

// Chuẩn hóa lỗi riêng của Admin
const normalizeError = (error: any) => {
  const axiosErr = error as AxiosError<any>;
  if (!axiosErr.response) {
    return { message: axiosErr.message || 'Network Error', code: 'NETWORK_ERROR', raw: error };
  }
  const status = axiosErr.response.status;
  const data: any = axiosErr.response.data;

  if (status === 429) return { message: 'Bạn thao tác quá nhanh! Vui lòng đợi vài giây.', code: 'RATE_LIMIT', raw: error };
  if (status === 403) {
    if (data?.code === 'BOT_DETECTED') return { message: 'Hệ thống phát hiện truy cập bất thường.', code: 'BOT_DETECTED', raw: error };
    if (data?.code === 'ACCESS_DENIED') return { message: 'Yêu cầu bị chặn vì lý do bảo mật.', code: 'ACCESS_DENIED', raw: error };
  }
  return { message: data?.message || axiosErr.message || 'Request failed', code: data?.code || `HTTP_${status}`, raw: error };
};

// single-flight refresh
let refreshPromise: Promise<string | null> | null = null;

// ====== REQUEST INTERCEPTOR ======
API.interceptors.request.use(
  (config) => {
    progressStart();

    const headers =
      config.headers instanceof AxiosHeaders
        ? config.headers
        : AxiosHeaders.from(config.headers ?? {});

    (config.headers as any)['x-device-id'] = getDeviceId();
    (config.headers as any)['x-client-platform'] = 'web';

    // Access store admin
    const store = (globalThis as any).__adminAuth?.getState();
    const accessToken = store?.accessToken;

    // refresh call: không attach access token
    if (!isRefreshUrl(config.url) && accessToken) {
      (config.headers as any).Authorization = `Bearer ${accessToken}`;
    } else {
      delete (config.headers as any).Authorization;
    }

    return config;
  },
  (err) => {
    progressDone();
    return Promise.reject(err);
  }
);

// ====== RESPONSE INTERCEPTOR ======
API.interceptors.response.use(
  (res: AxiosResponse) => {
    progressDone();
    return res;
  },
  async (error: AxiosError<any>) => {
    progressDone();

    const original = (error.config || {}) as AxiosRequestConfig;
    const status = error.response?.status;
    const url = original.url || '';

    // network error
    if (!error.response) return Promise.reject(normalizeError(error));

    // Nếu refresh fail => clear auth
    if (isRefreshUrl(url)) {
      clearAdminAuth();
      return Promise.reject(normalizeError(error));
    }

    // logout 401 => clear luôn, không refresh
    if (isLogoutUrl(url) && status === 401) {
      clearAdminAuth();
      return Promise.reject(normalizeError(error));
    }

    // không phải 401 => throw (đã wrap normalizeError của admin)
    if (status !== 401) return Promise.reject(normalizeError(error));

    // tránh loop retry
    if (original._retry) return Promise.reject(normalizeError(error));
    original._retry = true;

    // ===== Single-flight refresh =====
    if (!refreshPromise) {
      refreshPromise = (async () => {
        try {
          // Gọi bằng AUTH instance để không bị kẹp vào interceptor API
          const res = await AUTH.post(REFRESH_ENDPOINT, null, {
            headers: {
              'x-device-id': getDeviceId(),
              'x-client-platform': 'web',
            },
          });

          const newToken = (res.data as any)?.data?.access_token;
          if (!newToken) return null;

          // Lưu token mới vào store Admin
          const authStore = (globalThis as any).__adminAuth?.getState();
          authStore?.setAccessToken?.(newToken);

          return newToken;
        } catch {
          return null;
        } finally {
          refreshPromise = null;
        }
      })();
    }

    const newToken = await refreshPromise;

    if (!newToken) {
      clearAdminAuth();
      return Promise.reject(normalizeError(error));
    }

    // retry request cũ với token mới
    original.headers = original.headers ?? {};
    (original.headers as any).Authorization = `Bearer ${newToken}`;

    return API(original);
  }
);