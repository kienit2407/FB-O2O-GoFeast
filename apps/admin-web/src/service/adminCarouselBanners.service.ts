/* eslint-disable @typescript-eslint/no-explicit-any */
import { API } from "@/lib/api"; // hoặc "@/app/lib/axios-client" tuỳ dự án bạn

export const adminCarouselBannersService = {
    list: () => API.get("/admin/carousel-banners"),

    create: (file: File) => {
        const fd = new FormData();
        fd.append("file", file); //  field name = 'file'
        return API.post("/admin/carousel-banners", fd, {
            headers: { "Content-Type": "multipart/form-data" },
        });
    },

    reorder: (items: { id: string; position: number }[]) =>
        API.put("/admin/carousel-banners/reorder", { items }),

    toggleActive: (id: string, is_active: boolean) =>
        API.patch(`/admin/carousel-banners/${id}/active`, { is_active }),

    remove: (id: string) => API.delete(`/admin/carousel-banners/${id}`),
};