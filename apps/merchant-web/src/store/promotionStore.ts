/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand';
import { promotionService } from '@/service/promotion.service';

type PromotionStore = {
    promotions: any[];
    vouchers: any[];
    loading: boolean;

    fetchPromotions: () => Promise<void>;
    createPromotion: (payload: any) => Promise<any>;
    updatePromotion: (id: string, payload: any) => Promise<any>;
    togglePromotion: (id: string, is_active: boolean) => Promise<any>;
    deletePromotion: (id: string) => Promise<void>;

    fetchVouchers: () => Promise<void>;
    createVoucher: (payload: any) => Promise<any>;
    updateVoucher: (id: string, payload: any) => Promise<any>;
    toggleVoucher: (id: string, is_active: boolean) => Promise<any>;
    deleteVoucher: (id: string) => Promise<void>;
};

export const usePromotionStore = create<PromotionStore>((set, get) => ({
    promotions: [],
    vouchers: [],
    loading: false,

    fetchPromotions: async () => {
        set({ loading: true });
        try {
            const res = await promotionService.listMyPromotions();
            set({ promotions: res.data?.data ?? res.data ?? [] });
        } finally {
            set({ loading: false });
        }
    },

    createPromotion: async (payload) => {
        const res = await promotionService.createMyPromotion(payload);
        const created = res.data?.data ?? res.data;
        set({ promotions: [created, ...get().promotions] });
        return created;
    },

    updatePromotion: async (id, payload) => {
        const res = await promotionService.updateMyPromotion(id, payload);
        const updated = res.data?.data ?? res.data;
        set({
            promotions: get().promotions.map((p) =>
                String(p._id) === String(id) ? updated : p,
            ),
        });
        return updated;
    },

    togglePromotion: async (id, is_active) => {
        const res = await promotionService.toggleMyPromotion(id, is_active);
        const updated = res.data?.data ?? res.data;
        set({
            promotions: get().promotions.map((p) =>
                String(p._id) === String(id) ? updated : p,
            ),
        });
        return updated;
    },

    deletePromotion: async (id) => {
        await promotionService.deleteMyPromotion(id);
        set({
            promotions: get().promotions.filter((p) => String(p._id) !== String(id)),
        });
    },

    fetchVouchers: async () => {
        set({ loading: true });
        try {
            const res = await promotionService.listMyVouchers();
            set({ vouchers: res.data?.data ?? res.data ?? [] });
        } finally {
            set({ loading: false });
        }
    },

    createVoucher: async (payload) => {
        const res = await promotionService.createMyVoucher(payload);
        const created = res.data?.data ?? res.data;
        set({ vouchers: [created, ...get().vouchers] });
        return created;
    },

    updateVoucher: async (id, payload) => {
        const res = await promotionService.updateMyVoucher(id, payload);
        const updated = res.data?.data ?? res.data;
        set({
            vouchers: get().vouchers.map((v) =>
                String(v._id) === String(id) ? updated : v,
            ),
        });
        return updated;
    },

    toggleVoucher: async (id, is_active) => {
        const res = await promotionService.toggleMyVoucher(id, is_active);
        const updated = res.data?.data ?? res.data;
        set({
            vouchers: get().vouchers.map((v) =>
                String(v._id) === String(id) ? updated : v,
            ),
        });
        return updated;
    },

    deleteVoucher: async (id) => {
        await promotionService.deleteMyVoucher(id);
        set({
            vouchers: get().vouchers.filter((v) => String(v._id) !== String(id)),
        });
    },
}));