export type Role = 'admin' | 'merchant' | 'customer' | 'driver';
export const OAUTH_CTX_COOKIE = '__oauth_ctx';
export type ClientApp =
  | 'admin_web'
  | 'merchant_web'
  | 'customer_mobile'
  | 'driver_mobile';

export const REFRESH_COOKIE_NAME: Record<ClientApp, string> = {
  admin_web: 'rt_admin',
  merchant_web: 'rt_merchant',
  customer_mobile: 'rt_customer',
  driver_mobile: 'rt_driver',
};

export const CLIENT_APP_PATHS: Record<ClientApp, string> = {
  admin_web: 'admin',
  merchant_web: 'merchant',
  customer_mobile: 'customer',
  driver_mobile: 'driver',
};
