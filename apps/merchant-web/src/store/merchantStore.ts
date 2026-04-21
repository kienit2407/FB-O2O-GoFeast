/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand';
import { merchantService } from '@/service/merchant.service';
import { useMerchantAuth } from '@/store/authStore';

type MerchantActions = {
    updateMe: (payload: any) => Promise<any>;
    uploadLogo: (file: File) => Promise<any>;
    uploadCover: (file: File) => Promise<any>;
};

export const useMerchantActions = create<MerchantActions>(() => ({
    updateMe: async (payload) => {
        const res = await merchantService.updateMe(payload);
        const updated = res.data?.data;

        useMerchantAuth.setState((s) => ({
            merchant: updated ?? s.merchant,
            user: s.user ? { ...s.user, merchant: updated ?? s.user.merchant } : s.user,
        }));

        return updated;
    },

    uploadLogo: async (file) => {
        const res = await merchantService.uploadLogo(file);
        const data = res.data?.data; // { logo_url, logo_public_id }

        useMerchantAuth.setState((s) => {
            const merged = s.merchant ? { ...s.merchant, ...data } : s.merchant;
            return {
                merchant: merged,
                user: s.user ? { ...s.user, merchant: merged ?? s.user.merchant } : s.user,
            };
        });

        return data;
    },

    uploadCover: async (file) => {
        const res = await merchantService.uploadCover(file);
        const data = res.data?.data; // { cover_image_url, cover_image_public_id }

        useMerchantAuth.setState((s) => {
            const merged = s.merchant ? { ...s.merchant, ...data } : s.merchant;
            return {
                merchant: merged,
                user: s.user ? { ...s.user, merchant: merged ?? s.user.merchant } : s.user,
            };
        });

        return data;
    },
}));
