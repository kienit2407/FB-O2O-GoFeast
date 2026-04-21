/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import { adminCarouselBannersService } from "@/service/adminCarouselBanners.service";

export type CarouselBannerItem = {
    _id: string;
    carousel_url: string;
    carousel_id: string;
    position: number;
    is_active: boolean;
};

type Store = {
    items: CarouselBannerItem[];
    loading: boolean;
    uploading: boolean;
    savingOrder: boolean;

    fetch: () => Promise<void>;
    uploadMany: (files: File[]) => Promise<void>;
    toggle: (id: string, is_active: boolean) => Promise<void>;
    remove: (id: string) => Promise<void>;
    reorderRemote: (items: { id: string; position: number }[]) => Promise<void>;

    // local reorder helper
    setLocalItems: (items: CarouselBannerItem[]) => void;
};

export const useAdminCarouselBannersStore = create<Store>((set, get) => ({
    items: [],
    loading: false,
    uploading: false,
    savingOrder: false,

    setLocalItems: (items) => set({ items }),

    fetch: async () => {
        set({ loading: true });
        try {
            const res = await adminCarouselBannersService.list();
            const rows: CarouselBannerItem[] = res.data?.data ?? res.data ?? [];
            rows.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
            set({ items: rows });
        } finally {
            set({ loading: false });
        }
    },

    uploadMany: async (files) => {
        if (!files.length) return;
        set({ uploading: true });
        try {
            // upload tuần tự để dễ kiểm soát lỗi
            for (const f of files) {
                await adminCarouselBannersService.create(f);
            }
            await get().fetch();
        } finally {
            set({ uploading: false });
        }
    },

    toggle: async (id, is_active) => {
        await adminCarouselBannersService.toggleActive(id, is_active);
        await get().fetch();
    },

    remove: async (id) => {
        await adminCarouselBannersService.remove(id);
        set({ items: get().items.filter((x) => String(x._id) !== String(id)) });
    },

    reorderRemote: async (items) => {
        set({ savingOrder: true });
        try {
            await adminCarouselBannersService.reorder(items);
            await get().fetch();
        } finally {
            set({ savingOrder: false });
        }
    },
}));