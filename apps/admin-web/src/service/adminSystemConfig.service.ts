import { API } from '@/lib/api';

export type CommissionRules = {
    key: 'commission_rules_v1';
    merchant_commission_rate: number;
    driver_commission_rate: number;
    platform_fee_fixed: number;
    updated_at?: string;
};

export const adminSystemConfigService = {
    getCommissionRules() {
        return API.get<CommissionRules>('/admin/system-configs/commission-rules');
    },

    updateCommissionRules(payload: {
        merchant_commission_rate: number;
        driver_commission_rate: number;
        platform_fee_fixed: number;
    }) {
        return API.put<CommissionRules>('/admin/system-configs/commission-rules', payload);
    },
};