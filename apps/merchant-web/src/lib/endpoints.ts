// Centralized endpoint constants to avoid circular imports
// No logic, no imports - pure constants only

export const API_ENDPOINTS = {
  AUTH: {
    REGISTER: '/auth/merchant/register',
    LOGIN: '/auth/merchant/login',
    LOGOUT: '/auth/merchant/logout',
    REFRESH: '/auth/merchant/refresh',
    ME: '/auth/merchant/me',
    ONBOARDING: {
      STATUS: '/auth/merchant/onboarding/status',
      BASIC_INFO: '/auth/merchant/onboarding/basic-info',
      DOCUMENTS: '/auth/merchant/onboarding/documents',
      SUBMIT: '/auth/merchant/onboarding/submit',
      RESTART: '/auth/merchant/onboarding/restart',
    },
  },
} as const;

// Export refresh endpoint separately for easy checking
export const REFRESH_ENDPOINT = API_ENDPOINTS.AUTH.REFRESH;
