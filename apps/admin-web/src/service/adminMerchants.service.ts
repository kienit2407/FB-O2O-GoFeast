import { API } from '@/lib/api';

export const adminMerchantsService = {
  updateCommissionRate(merchantId: string, commission_rate: number | null) {
    return API.patch(`/admin/merchants/${merchantId}/commission-rate`, { commission_rate });
  },
};