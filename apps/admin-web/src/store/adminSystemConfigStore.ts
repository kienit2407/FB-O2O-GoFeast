// src/store/adminSystemConfigStore.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand';
import { adminSystemConfigService, CommissionRules } from '@/service/adminSystemConfig.service';

type AdminSystemConfigStore = {
    commission: CommissionRules | null;
    loading: boolean;

    fetchCommissionRules: () => Promise<void>;
    updateCommissionRules: (payload: {
        merchant_commission_rate: number;
        driver_commission_rate: number;
        platform_fee_fixed: number;
    }) => Promise<CommissionRules>;
};

const unwrap = (res: any) => (res?.data?.data ?? res?.data ?? res);

export const useAdminSystemConfigStore = create<AdminSystemConfigStore>((set) => ({
    commission: null,
    loading: false,

    fetchCommissionRules: async () => {
        set({ loading: true });
        try {
            const res = await adminSystemConfigService.getCommissionRules();
            set({ commission: unwrap(res) });
        } finally {
            set({ loading: false });
        }
    },

    updateCommissionRules: async (payload) => {
        set({ loading: true });
        try {
            const res = await adminSystemConfigService.updateCommissionRules(payload);
            const data = unwrap(res);
            set({ commission: data });
            return data;
        } finally {
            set({ loading: false });
        }
    },
}));