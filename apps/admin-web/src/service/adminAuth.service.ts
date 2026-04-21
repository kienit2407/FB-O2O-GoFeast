/* eslint-disable @typescript-eslint/no-explicit-any */
import { API } from '@/lib/api';

export const adminAuthService = {
  register: (payload: { email: string; password: string }) =>
    API.post('/auth/admin/register', payload),

  login: (payload: { email: string; password: string }) =>
    API.post('/auth/admin/login', payload),

  logout: () => API.post('/auth/admin/logout'),

  refresh: () => API.post('/auth/admin/refresh'),

  me: () => API.get('/auth/admin/me'),
};
