/* eslint-disable @typescript-eslint/no-explicit-any */
import { API } from "@/lib/api";

export const adminPromotionsService = {
    // ===== promotions =====
    listPlatformPromotions: () => API.get("/admin/promotions"),

    createPlatformPromotion: (payload: any, bannerFile: File) => {
        const fd = new FormData();
        fd.append("file", bannerFile);
        fd.append("data", JSON.stringify(payload));
        return API.post("/admin/promotions", fd, {
            headers: { "Content-Type": "multipart/form-data" },
        });
    },

    updatePlatformPromotion: (id: string, payload: any) =>
        API.patch(`/admin/promotions/${id}`, payload),

    togglePlatformPromotion: (id: string, is_active: boolean) =>
        API.patch(`/admin/promotions/${id}/active`, { is_active }),

    deletePlatformPromotion: (id: string) =>
        API.delete(`/admin/promotions/${id}`),

    uploadPlatformPromotionBanner: (id: string, file: File) => {
        const fd = new FormData();
        fd.append("file", file);
        return API.post(`/admin/promotions/${id}/banner`, fd, {
            headers: { "Content-Type": "multipart/form-data" },
        });
    },

    // ===== vouchers =====
    listPlatformVouchers: () => API.get("/admin/vouchers"),

    createPlatformVoucher: (payload: any) =>
        API.post("/admin/vouchers", payload),

    updatePlatformVoucher: (id: string, payload: any) =>
        API.patch(`/admin/vouchers/${id}`, payload),

    togglePlatformVoucher: (id: string, is_active: boolean) =>
        API.patch(`/admin/vouchers/${id}/active`, { is_active }),

    deletePlatformVoucher: (id: string) =>
        API.delete(`/admin/vouchers/${id}`),
};