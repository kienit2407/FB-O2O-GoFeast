/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand';

import { merchantApprovalService } from '@/service/merchantApproval.service';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'blocked';

export type MerchantAdmin = {
    id: string;
    owner_user_id: string;

    name: string;
    email?: string;
    phone?: string;

    address?: string;
    district?: string;
    city?: string;

    logo?: string;
    coverImage?: string;

    approval_status: ApprovalStatus;
    is_active?: boolean;

    // optional fields nếu BE trả (để UI không lỗi)
    rating?: number;
    totalOrders?: number;
    acceptanceRate?: number;
    cancellationRate?: number;
    avgPrepTime?: number;

    created_at?: string;
    createdAt?: string;
    documents?: Record<string, string | null>;
    // nếu BE trả reject info
    rejection_reasons?: string[];
    rejection_note?: string;
};

export type RejectPayload = {
    reasons: string[];
    note?: string;
};

type State = {
    loading: boolean;
    error?: string;

    merchants: MerchantAdmin[];
    pending: MerchantAdmin[];
    rejected: MerchantAdmin[];

    fetchMerchants: () => Promise<void>;
    fetchReviewQueue: () => Promise<void>;

    approveMerchant: (ownerUserId: string) => Promise<void>;
    rejectMerchant: (ownerUserId: string, payload: RejectPayload) => Promise<void>;
};

export const useMerchantApprovalStore = create<State>((set, get) => ({
    loading: false,
    error: undefined,

    merchants: [],
    pending: [],
    rejected: [],

    fetchMerchants: async () => {
        set({ loading: true, error: undefined });
        try {
            const merchants = await merchantApprovalService.getMerchantsList();
            set({ merchants, loading: false });
        } catch (e: any) {
            set({ loading: false, error: e?.message ?? 'Fetch merchants failed' });
        }
    },

    fetchReviewQueue: async () => {
        set({ loading: true, error: undefined });
        try {
            const { pending, rejected } = await merchantApprovalService.getReviewQueue();
            set({ pending, rejected, loading: false });
        } catch (e: any) {
            set({ loading: false, error: e?.message ?? 'Fetch review queue failed' });
        }
    },

    approveMerchant: async (ownerUserId: string) => {
        set({ loading: true, error: undefined });
        try {
            await merchantApprovalService.approve(ownerUserId);

            const { pending, rejected, merchants } = get();
            const approvedItem =
                pending.find((m) => m.owner_user_id === ownerUserId) ||
                rejected.find((m) => m.owner_user_id === ownerUserId);

            set({
                loading: false,
                pending: pending.filter((m) => m.owner_user_id !== ownerUserId),
                rejected: rejected.filter((m) => m.owner_user_id !== ownerUserId),
                merchants: approvedItem
                    ? [{ ...approvedItem, approval_status: 'approved', is_active: true }, ...merchants]
                    : merchants,
            });
        } catch (e: any) {
            set({ loading: false, error: e?.message ?? 'Approve failed' });
            throw e;
        }
    },

    rejectMerchant: async (ownerUserId: string, payload: RejectPayload) => {
        set({ loading: true, error: undefined });
        try {
            await merchantApprovalService.reject(ownerUserId, payload);

            const { pending, rejected } = get();
            const item = pending.find((m) => m.owner_user_id === ownerUserId);

            set({
                loading: false,
                pending: pending.filter((m) => m.owner_user_id !== ownerUserId),
                rejected: item
                    ? [
                        {
                            ...item,
                            approval_status: 'rejected',
                            rejection_reasons: payload.reasons,
                            rejection_note: payload.note,
                        },
                        ...rejected,
                    ]
                    : rejected,
            });
        } catch (e: any) {
            set({ loading: false, error: e?.message ?? 'Reject failed' });
            throw e;
        }
    },
}));
