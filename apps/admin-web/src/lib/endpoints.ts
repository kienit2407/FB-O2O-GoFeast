export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/admin/login',
    LOGOUT: '/auth/admin/logout',
    REFRESH: '/auth/admin/refresh',
    ME: '/auth/admin/me',
  },
} as const;

export const REFRESH_ENDPOINT = API_ENDPOINTS.AUTH.REFRESH;
