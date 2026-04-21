/* eslint-disable @typescript-eslint/no-explicit-any */
import { API, AUTH } from "@/lib/api";

const MERCHANT_LOGIN_ENDPOINT_CANDIDATES = [
  "/auth/merchant/login",
  "/auth/merchant/login/",
] as const;

async function postWithEndpointFallback(
  endpoints: readonly string[],
  payload: any
) {
  let lastError: any;

  for (const endpoint of endpoints) {
    try {
      return await AUTH.request({
        url: endpoint,
        method: "POST",
        data: payload,
      });
    } catch (error: any) {
      const status = error?.response?.status;
      const message = String(error?.response?.data?.message ?? "");
      const canRetry =
        status === 404 ||
        message.includes("Cannot GET") ||
        message.includes("Cannot POST");

      if (!canRetry) {
        throw error;
      }

      lastError = error;
    }
  }

  throw lastError;
}

export const merchantAuthService = {
  // Auth
  register: (payload: any) => AUTH.post("/auth/merchant/register", payload),
  login: (payload: any) =>
    postWithEndpointFallback(MERCHANT_LOGIN_ENDPOINT_CANDIDATES, payload),

  // ✅ logout/refresh dùng AUTH để khỏi trigger auto-refresh
  logout: () => AUTH.post("/auth/merchant/logout"),
  refresh: () => AUTH.post("/auth/merchant/refresh"),

  // Authenticated API dùng API (có interceptor)
  me: () => API.get("/auth/merchant/me"),

  // Onboarding
  onboardingStatus: () => API.get("/auth/merchant/onboarding/status"),
  saveBasicInfo: (payload: any) => API.post("/auth/merchant/onboarding/basic-info", payload),
  uploadDocument: (form: FormData) =>
    API.post("/auth/merchant/onboarding/documents", form, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  submit: () => API.post("/auth/merchant/onboarding/submit"),
  restart: () => API.post("/auth/merchant/onboarding/restart"),
};
