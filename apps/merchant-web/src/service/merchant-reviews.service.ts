/* eslint-disable @typescript-eslint/no-explicit-any */
import { API } from '@/lib/api';

export type MerchantReviewFeedType = 'all' | 'merchant' | 'product';

export interface MerchantReviewUser {
    id: string;
    name: string;
    avatar_url: string | null;
}

export interface MerchantReviewMerchant {
    id: string;
    name: string;
    logo_url: string | null;
}

export interface MerchantReviewProduct {
    id: string;
    name: string;
    image_url: string | null;
}

export interface MerchantReviewReply {
    content: string;
    replied_at: string | null;
    is_edited: boolean;
}

export interface MerchantReviewImage {
    url: string;
    public_id: string | null;
}

export interface MerchantReviewFeedItem {
    id: string;
    type: 'merchant' | 'product';
    customer: MerchantReviewUser;
    merchant: MerchantReviewMerchant | null;
    product: MerchantReviewProduct | null;
    order_id: string | null;
    order_number: string | null;
    rating: number;
    comment: string;
    images: MerchantReviewImage[];
    video_url: string | null;
    merchant_reply: MerchantReviewReply | null;
    created_at: string | null;
    updated_at: string | null;
}

export interface MerchantReviewSummaryBlock {
    average_rating: number;
    total_reviews: number;
}

export interface MerchantReviewSummaryResponse {
    average_rating: number;
    total_reviews: number;
    store_reviews: MerchantReviewSummaryBlock;
    product_reviews: MerchantReviewSummaryBlock;
}

export interface MerchantReviewFeedResponse {
    items: MerchantReviewFeedItem[];
    hasMore: boolean;
    nextCursor: string | null;
}

export interface MerchantReviewsFeedQuery {
    type?: MerchantReviewFeedType;
    rating?: number | 'all';
    limit?: number;
    cursor?: string | null;
}

function normalizeUser(raw: any): MerchantReviewUser {
    return {
        id: String(
            raw?.id ??
            raw?._id ??
            raw?.user_id ??
            raw?.customer_id ??
            '',
        ),
        name: String(
            raw?.name ??
            raw?.full_name ??
            raw?.username ??
            raw?.customer_name ??
            'Khách hàng',
        ),
        avatar_url:
            raw?.avatar_url ??
            raw?.avatarUrl ??
            raw?.photo_url ??
            null,
    };
}

function normalizeMerchant(raw: any): MerchantReviewMerchant | null {
    if (!raw) return null;
    return {
        id: String(raw?.id ?? raw?._id ?? raw?.merchant_id ?? ''),
        name: String(raw?.name ?? raw?.merchant_name ?? 'Quán'),
        logo_url: raw?.logo_url ?? raw?.logoUrl ?? null,
    };
}

function normalizeProduct(raw: any): MerchantReviewProduct | null {
    if (!raw) return null;
    return {
        id: String(raw?.id ?? raw?._id ?? raw?.product_id ?? ''),
        name: String(raw?.name ?? raw?.product_name ?? 'Sản phẩm'),
        image_url:
            raw?.image_url ??
            raw?.imageUrl ??
            raw?.thumbnail_url ??
            null,
    };
}

function normalizeReply(raw: any): MerchantReviewReply | null {
    if (!raw) return null;
    return {
        content: String(raw?.content ?? ''),
        replied_at: raw?.replied_at ? String(raw.replied_at) : null,
        is_edited: raw?.is_edited === true,
    };
}

function normalizeImages(raw: any): MerchantReviewImage[] {
    if (!Array.isArray(raw)) return [];
    return raw.map((x: any) => ({
        url: String(x?.url ?? ''),
        public_id: x?.public_id ?? null,
    }));
}

function normalizeFeedItem(raw: any): MerchantReviewFeedItem {
    const inferredType: 'merchant' | 'product' =
        raw?.type === 'product' || raw?.review_type === 'product' || raw?.product != null || raw?.product_id != null
            ? 'product'
            : 'merchant';

    return {
        id: String(raw?.id ?? raw?._id ?? ''),
        type: inferredType,
        customer: normalizeUser(raw?.customer ?? raw?.user ?? raw?.customer_id),
        merchant: normalizeMerchant(raw?.merchant ?? raw?.store ?? {
            id: raw?.merchant_id,
            name: raw?.merchant_name,
            logo_url: raw?.merchant_logo_url,
        }),
        product: normalizeProduct(raw?.product ?? {
            id: raw?.product_id,
            name: raw?.product_name,
            image_url: raw?.product_image_url,
        }),
        order_id: raw?.order_id ? String(raw.order_id) : null,
        order_number: raw?.order_number ? String(raw.order_number) : null,
        rating: Number(raw?.rating ?? 0),
        comment: String(raw?.comment ?? ''),
        images: normalizeImages(raw?.images),
        video_url: raw?.video_url ? String(raw.video_url) : null,
        merchant_reply: normalizeReply(raw?.merchant_reply ?? raw?.reply),
        created_at: raw?.created_at ? String(raw.created_at) : null,
        updated_at: raw?.updated_at ? String(raw.updated_at) : null,
    };
}

export const merchantReviewsService = {
    async getSummary(): Promise<MerchantReviewSummaryResponse> {
        const res = await API.get('/merchant/reviews/summary');
        const data = res.data?.data ?? {};

        return {
            average_rating: Number(data?.average_rating ?? 0),
            total_reviews: Number(data?.total_reviews ?? 0),
            store_reviews: {
                average_rating: Number(data?.store_reviews?.average_rating ?? 0),
                total_reviews: Number(data?.store_reviews?.total_reviews ?? 0),
            },
            product_reviews: {
                average_rating: Number(data?.product_reviews?.average_rating ?? 0),
                total_reviews: Number(data?.product_reviews?.total_reviews ?? 0),
            },
        };
    },

    async getFeed(query: MerchantReviewsFeedQuery = {}): Promise<MerchantReviewFeedResponse> {
        const res = await API.get('/merchant/reviews/feed', {
            params: {
                type: query.type ?? 'all',
                ...(query.rating && query.rating !== 'all' ? { rating: query.rating } : {}),
                ...(query.limit ? { limit: query.limit } : {}),
                ...(query.cursor ? { cursor: query.cursor } : {}),
            },
        });

        const data = res.data?.data ?? {};
        const items = Array.isArray(data?.items) ? data.items.map(normalizeFeedItem) : [];

        return {
            items,
            hasMore: data?.hasMore === true || data?.has_more === true,
            nextCursor: data?.nextCursor ?? data?.next_cursor ?? null,
        };
    },

    async replyStoreReview(reviewId: string, content: string) {
        const payload = { content };
        try {
            const res = await API.patch(`/merchant/reviews/store/${reviewId}/reply`, payload);
            return res.data?.data ?? null;
        } catch {
            const res = await API.post(`/merchant/reviews/store/${reviewId}/reply`, payload);
            return res.data?.data ?? null;
        }
    },

    async replyProductReview(reviewId: string, content: string) {
        const payload = { content };
        try {
            const res = await API.patch(`/merchant/reviews/product/${reviewId}/reply`, payload);
            return res.data?.data ?? null;
        } catch {
            const res = await API.post(`/merchant/reviews/product/${reviewId}/reply`, payload);
            return res.data?.data ?? null;
        }
    },

    async replyReview(item: MerchantReviewFeedItem, content: string) {
        if (item.type === 'product') {
            return this.replyProductReview(item.id, content);
        }
        return this.replyStoreReview(item.id, content);
    },
};