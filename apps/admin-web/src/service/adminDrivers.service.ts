import { API } from '@/lib/api';

export const adminDriversService = {
    updateCommissionRate(userId: string, commission_rate: number | null) {
        return API.patch(`/admin/drivers/${userId}/commission-rate`, { commission_rate });
    },
};