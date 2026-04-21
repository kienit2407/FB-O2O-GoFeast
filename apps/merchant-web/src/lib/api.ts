/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosError, AxiosHeaders, AxiosRequestConfig } from "axios";
import NProgress from "nprogress";
import "nprogress/nprogress.css";
import { useMerchantAuth } from "@/store/authStore";
import { v4 as uuid } from "uuid";

// ====== CONFIG NPROGRESS ======
NProgress.configure({
  showSpinner: false,
  speed: 350,
  minimum: 0.06,
  easing: "ease",
});

// ====== ENDPOINTS ======
export const REFRESH_ENDPOINT = "/auth/merchant/refresh";
export const LOGOUT_ENDPOINT = "/auth/merchant/logout";

// ====== axios config typing ======
declare module "axios" {
  export interface AxiosRequestConfig {
    _retry?: boolean;
  }
}

// ====== device id ======
function getDeviceId() {
  const key = "device_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = uuid();
    localStorage.setItem(key, id);
  }
  return id;
}

// ====== base axios options ======
const envBaseURL = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
const isLocalHttpApi =
  !!envBaseURL &&
  /^(https?:\/\/)(localhost|127\.0\.0\.1)(:\d+)?$/i.test(envBaseURL);
const baseURL =
  import.meta.env.DEV && (!envBaseURL || isLocalHttpApi)
    ? "/api"
    : (envBaseURL || "http://localhost:4000");

const baseHeaders = {
  "x-client-platform": "web",
  "x-client-app": "merchant_web",
};

// ✅ Instance có interceptor (dùng cho mọi API bình thường)
export const API = axios.create({
  baseURL,
  withCredentials: true,
  headers: { ...baseHeaders },
});

// ✅ Instance “trần” (KHÔNG interceptor refresh) để gọi refresh/logout
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
    (config.headers as any)["x-device-id"] = getDeviceId();
    (config.headers as any)["x-client-platform"] = "web";

    const { accessToken } = useMerchantAuth.getState();

    // refresh call: không attach access token (sạch)
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
  (res) => {
    progressDone();
    return res;
  },
  async (error: AxiosError<any>) => {
    progressDone();

    const original = (error.config || {}) as AxiosRequestConfig;
    const status = error.response?.status;
    const url = original.url || "";

    // network error
    if (!error.response) return Promise.reject(error);

    // Nếu refresh fail => clear auth
    if (isRefreshUrl(url)) {
      useMerchantAuth.getState().clear();
      return Promise.reject(error);
    }

    // logout 401 => clear luôn, không refresh
    if (isLogoutUrl(url) && status === 401) {
      useMerchantAuth.getState().clear();
      return Promise.reject(error);
    }

    // không phải 401 => throw
    if (status !== 401) return Promise.reject(error);

    // tránh loop retry
    if (original._retry) return Promise.reject(error);
    original._retry = true;

    // ===== Single-flight refresh (DÙ accessToken đang null vẫn thử) =====
    if (!refreshPromise) {
      refreshPromise = (async () => {
        try {
          const res = await AUTH.post(REFRESH_ENDPOINT, null, {
            headers: {
              "x-device-id": getDeviceId(), // đảm bảo có device id cho refresh
              "x-client-platform": "web",
            },
          });

          const newToken = (res.data as any)?.data?.access_token;
          if (!newToken) return null;

          useMerchantAuth.getState().setAccessToken(newToken);
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
      useMerchantAuth.getState().clear();
      return Promise.reject(error);
    }

    // retry request cũ với token mới
    original.headers = original.headers ?? {};
    (original.headers as any).Authorization = `Bearer ${newToken}`;
    return API(original);
  }
);
