/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import { adminPromotionsService } from "@/service/adminPromotions.service";

type AdminPromotionsStore = {
    promotions: any[];
    vouchers: any[];
    loading: boolean;

    fetchPromotions: () => Promise<void>;
    fetchVouchers: () => Promise<void>;

    createPromotion: (payload: any, bannerFile: File) => Promise<any>;
    updatePromotion: (id: string, payload: any) => Promise<any>;
    togglePromotion: (id: string, is_active: boolean) => Promise<any>;
    deletePromotion: (id: string) => Promise<void>;
    uploadPromotionBanner: (id: string, file: File) => Promise<any>;

    createVoucher: (payload: any) => Promise<any>;
    updateVoucher: (id: string, payload: any) => Promise<any>;
    toggleVoucher: (id: string, is_active: boolean) => Promise<any>;
    deleteVoucher: (id: string) => Promise<void>;
};

export const useAdminPromotionsStore = create<AdminPromotionsStore>((set, get) => ({
    promotions: [],
    vouchers: [],
    loading: false,

    fetchPromotions: async () => {
        set({ loading: true });
        try {
            const res = await adminPromotionsService.listPlatformPromotions();
            set({ promotions: res.data?.data ?? res.data ?? [] });
        } finally {
            set({ loading: false });
        }
    },

    fetchVouchers: async () => {
        set({ loading: true });
        try {
            const res = await adminPromotionsService.listPlatformVouchers();
            set({ vouchers: res.data?.data ?? res.data ?? [] });
        } finally {
            set({ loading: false });
        }
    },

    createPromotion: async (payload, bannerFile) => {
        const res = await adminPromotionsService.createPlatformPromotion(payload, bannerFile);
        const created = res.data?.data ?? res.data;
        set({ promotions: [created, ...get().promotions] });
        return created;
    },

    updatePromotion: async (id, payload) => {
        const res = await adminPromotionsService.updatePlatformPromotion(id, payload);
        const updated = res.data?.data ?? res.data;
        set({
            promotions: get().promotions.map((p) =>
                String(p._id) === String(id) ? updated : p,
            ),
        });
        return updated;
    },

    togglePromotion: async (id, is_active) => {
        const res = await adminPromotionsService.togglePlatformPromotion(id, is_active);
        const updated = res.data?.data ?? res.data;
        set({
            promotions: get().promotions.map((p) =>
                String(p._id) === String(id) ? updated : p,
            ),
        });
        return updated;
    },

    deletePromotion: async (id) => {
        await adminPromotionsService.deletePlatformPromotion(id);
        set({
            promotions: get().promotions.filter((p) => String(p._id) !== String(id)),
        });
    },

    uploadPromotionBanner: async (id, file) => {
        const res = await adminPromotionsService.uploadPlatformPromotionBanner(id, file);
        const updated = res.data?.data ?? res.data;
        set({
            promotions: get().promotions.map((p) =>
                String(p._id) === String(id) ? updated : p,
            ),
        });
        return updated;
    },

    createVoucher: async (payload) => {
        const res = await adminPromotionsService.createPlatformVoucher(payload);
        const created = res.data?.data ?? res.data;
        set({ vouchers: [created, ...get().vouchers] });
        return created;
    },

    updateVoucher: async (id, payload) => {
        const res = await adminPromotionsService.updatePlatformVoucher(id, payload);
        const updated = res.data?.data ?? res.data;
        set({
            vouchers: get().vouchers.map((v) =>
                String(v._id) === String(id) ? updated : v,
            ),
        });
        return updated;
    },

    toggleVoucher: async (id, is_active) => {
        const res = await adminPromotionsService.togglePlatformVoucher(id, is_active);
        const updated = res.data?.data ?? res.data;
        set({
            vouchers: get().vouchers.map((v) =>
                String(v._id) === String(id) ? updated : v,
            ),
        });
        return updated;
    },

    deleteVoucher: async (id) => {
        await adminPromotionsService.deletePlatformVoucher(id);
        set({
            vouchers: get().vouchers.filter((v) => String(v._id) !== String(id)),
        });
    },
}));