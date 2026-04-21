/* eslint-disable @typescript-eslint/no-explicit-any */
import { API } from '@/lib/api';

export const promotionService = {
    listMyPromotions: () => API.get('/promotions/me'),

    createMyPromotion: (payload: any) =>
        API.post('/promotions/me', payload),

    updateMyPromotion: (id: string, payload: any) =>
        API.patch(`/promotions/me/${id}`, payload),

    toggleMyPromotion: (id: string, is_active: boolean) =>
        API.patch(`/promotions/me/${id}/active`, { is_active }),

    deleteMyPromotion: (id: string) =>
        API.delete(`/promotions/me/${id}`),

    listMyVouchers: () => API.get('/vouchers/me'),
    updateMyVoucher: (id: string, payload: any) =>
        API.patch(`/vouchers/me/${id}`, payload),
    createMyVoucher: (payload: any) =>
        API.post('/vouchers/me', payload),
    toggleMyVoucher: (id: string, is_active: boolean) =>
        API.patch(`/vouchers/me/${id}/active`, { is_active }),
    deleteMyVoucher: (id: string) =>
        API.delete(`/vouchers/me/${id}`),
};