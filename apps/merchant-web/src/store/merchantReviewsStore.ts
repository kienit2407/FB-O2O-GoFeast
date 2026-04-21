/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand';
import {
    merchantReviewsService,
    MerchantReviewFeedItem,
    MerchantReviewFeedResponse,
    MerchantReviewFeedType,
    MerchantReviewSummaryResponse,
} from '@/service/merchant-reviews.service';

interface MerchantReviewsStoreState {
    summary: MerchantReviewSummaryResponse | null;
    items: MerchantReviewFeedItem[];

    selectedType: MerchantReviewFeedType;
    selectedRating: 'all' | '1' | '2' | '3' | '4' | '5';

    loadingSummary: boolean;
    loadingFeed: boolean;
    replying: boolean;
    replyTargetId: string | null;

    errorSummary: string | null;
    errorFeed: string | null;

    hasMore: boolean;
    nextCursor: string | null;

    setType: (type: MerchantReviewFeedType) => void;
    setRating: (rating: 'all' | '1' | '2' | '3' | '4' | '5') => void;

    fetchSummary: () => Promise<void>;
    fetchFeed: (opts?: { append?: boolean }) => Promise<void>;
    bootstrap: () => Promise<void>;
    refresh: () => Promise<void>;
    loadMore: () => Promise<void>;

    replyReview: (reviewId: string, content: string) => Promise<boolean>;
    patchReplyLocally: (reviewId: string, content: string) => void;
    clear: () => void;
}

export const useMerchantReviewsStore = create<MerchantReviewsStoreState>((set, get) => ({
    summary: null,
    items: [],

    selectedType: 'all',
    selectedRating: 'all',

    loadingSummary: false,
    loadingFeed: false,
    replying: false,
    replyTargetId: null,

    errorSummary: null,
    errorFeed: null,

    hasMore: false,
    nextCursor: null,

    setType: (type) => set({ selectedType: type }),
    setRating: (rating) => set({ selectedRating: rating }),

    fetchSummary: async () => {
        set({ loadingSummary: true, errorSummary: null });
        try {
            const data = await merchantReviewsService.getSummary();
            set({
                summary: data,
                loadingSummary: false,
            });
        } catch (e: any) {
            set({
                loadingSummary: false,
                errorSummary: e?.response?.data?.message ?? e?.message ?? 'Không tải được tổng quan đánh giá',
            });
        }
    },

    fetchFeed: async (opts) => {
        const append = opts?.append === true;
        const { selectedType, selectedRating, nextCursor, items } = get();

        set({
            loadingFeed: true,
            errorFeed: null,
        });

        try {
            const data: MerchantReviewFeedResponse = await merchantReviewsService.getFeed({
                type: selectedType,
                rating: selectedRating === 'all' ? 'all' : Number(selectedRating),
                limit: 20,
                cursor: append ? nextCursor : null,
            });

            set({
                items: append ? [...items, ...data.items] : data.items,
                hasMore: data.hasMore,
                nextCursor: data.nextCursor,
                loadingFeed: false,
            });
        } catch (e: any) {
            set({
                loadingFeed: false,
                errorFeed: e?.response?.data?.message ?? e?.message ?? 'Không tải được danh sách đánh giá',
            });
        }
    },

    bootstrap: async () => {
        await Promise.all([
            get().fetchSummary(),
            get().fetchFeed(),
        ]);
    },

    refresh: async () => {
        await Promise.all([
            get().fetchSummary(),
            get().fetchFeed(),
        ]);
    },

    loadMore: async () => {
        const { loadingFeed, hasMore, nextCursor } = get();
        if (loadingFeed || !hasMore || !nextCursor) return;
        await get().fetchFeed({ append: true });
    },

    patchReplyLocally: (reviewId, content) =>
        set((state) => ({
            items: state.items.map((item) =>
                item.id === reviewId
                    ? {
                        ...item,
                        merchant_reply: {
                            content,
                            replied_at: new Date().toISOString(),
                            is_edited: item.merchant_reply != null,
                        },
                    }
                    : item,
            ),
        })),

    replyReview: async (reviewId, content) => {
        const item = get().items.find((x) => x.id === reviewId);
        if (!item) return false;

        set({
            replying: true,
            replyTargetId: reviewId,
            errorFeed: null,
        });

        try {
            await merchantReviewsService.replyReview(item, content);
            get().patchReplyLocally(reviewId, content);

            set({
                replying: false,
                replyTargetId: null,
            });

            return true;
        } catch (e: any) {
            set({
                replying: false,
                replyTargetId: null,
                errorFeed: e?.response?.data?.message ?? e?.message ?? 'Gửi phản hồi thất bại',
            });
            return false;
        }
    },

    clear: () =>
        set({
            summary: null,
            items: [],
            selectedType: 'all',
            selectedRating: 'all',
            loadingSummary: false,
            loadingFeed: false,
            replying: false,
            replyTargetId: null,
            errorSummary: null,
            errorFeed: null,
            hasMore: false,
            nextCursor: null,
        }),
}));