/* eslint-disable @typescript-eslint/no-explicit-any */
import { API } from '@/lib/api';
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
    documents?: Record<string, string | null>;
    created_at?: string;
    createdAt?: string;

    // nếu BE trả reject info
    rejection_reasons?: string[];
    rejection_note?: string;
};

export type RejectPayload = {
    reasons: string[];
    note?: string;
};

const mapApprovalStatus = (raw: any): ApprovalStatus => {
    const s = String(raw ?? '').toUpperCase();

    if (s.includes('PENDING')) return 'pending';
    if (s.includes('APPROVED')) return 'approved';
    if (s.includes('REJECTED')) return 'rejected';

    // nếu BE dùng BLOCKED / LOCKED
    if (s.includes('BLOCK') || s.includes('LOCK')) return 'blocked';

    // fallback
    return 'blocked';
};

const mapMerchant = (m: any): MerchantAdmin => ({
    id: m._id ?? m.id,
    owner_user_id: m.owner_user_id?._id ?? m.owner_user_id,

    name: m.name,
    email: m.owner_user_id?.email ?? m.email,
    phone: m.owner_user_id?.phone ?? m.phone,

    address: m.address,
    district: m.district,
    city: m.city,

    logo: m.logo_url ?? m.logo,
    coverImage: m.cover_image_url ?? m.coverImage,

    approval_status: mapApprovalStatus(m.approval_status),
    is_active: m.is_active ?? (String(m.approval_status ?? '').toUpperCase().includes('APPROVED')),

    // optional
    rating: m.rating,
    totalOrders: m.totalOrders,
    acceptanceRate: m.acceptanceRate,
    cancellationRate: m.cancellationRate,
    avgPrepTime: m.avgPrepTime,
    documents: m.documents ?? {},
    created_at: m.created_at,
    createdAt: m.createdAt,

    rejection_reasons: m.rejection_reasons,
    rejection_note: m.rejection_note,
});

export const merchantApprovalService = {
    async getMerchantsList(): Promise<MerchantAdmin[]> {
        // list sau duyệt (approved/blocked...)
        const res = await API.get('/admin/merchants', { params: { scope: 'list' } });
        const data = res.data?.data ?? [];
        return Array.isArray(data) ? data.map(mapMerchant) : [];
    },

    async getReviewQueue(): Promise<{ pending: MerchantAdmin[]; rejected: MerchantAdmin[] }> {
        const res = await API.get('/admin/merchants/review');
        const pendingRaw = res.data?.data?.pending ?? [];
        const rejectedRaw = res.data?.data?.rejected ?? [];
        return {
            pending: Array.isArray(pendingRaw) ? pendingRaw.map(mapMerchant) : [],
            rejected: Array.isArray(rejectedRaw) ? rejectedRaw.map(mapMerchant) : [],
        };
    },

    async approve(ownerUserId: string): Promise<void> {
        await API.post(`/admin/merchants/${ownerUserId}/approve`);
    },

    async reject(ownerUserId: string, payload: RejectPayload): Promise<void> {
        await API.post(`/admin/merchants/${ownerUserId}/reject`, payload);
    },
};
