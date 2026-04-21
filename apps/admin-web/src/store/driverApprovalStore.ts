/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand';
import {
    driverApprovalService,
    type AdminDriverRow,
    type RejectPayload,
} from '@/service/driverApproval.service';

type State = {
    loading: boolean;
    error?: string;
    hasFetched: boolean;

    drivers: AdminDriverRow[];
    pendingDrivers: AdminDriverRow[]; // Thêm state danh sách chờ

    fetchDrivers: (scope?: 'list' | 'all') => Promise<void>;
    approveDriver: (userId: string) => Promise<void>;
    rejectDriver: (userId: string, payload: RejectPayload) => Promise<void>;
};

export const useDriverApprovalStore = create<State>((set, get) => ({
    loading: false,
    error: undefined,
    hasFetched: false,

    drivers: [],
    pendingDrivers: [], // Khởi tạo mảng rỗng

    fetchDrivers: async (scope = 'list') => {
        const { hasFetched, loading } = get();
        if (hasFetched || loading) return;

        set({ loading: true, error: undefined });
        try {
            const drivers = await driverApprovalService.getDriversList(scope);
            
            // Tự động lọc ra những người có trạng thái 'pending' để đưa vào danh sách chờ
            const pendingDrivers = drivers.filter(d => d.verification_status === 'pending');

            set({ drivers, pendingDrivers, loading: false, hasFetched: true });
        } catch (e: any) {
            set({ loading: false, error: e?.message ?? 'Fetch drivers failed' });
        }
    },

    approveDriver: async (userId: string) => {
        set({ loading: true, error: undefined });
        try {
            await driverApprovalService.approve(userId);

            const { drivers, pendingDrivers } = get();
            set({
                loading: false,
                // Cập nhật trạng thái trong mảng tổng
                drivers: drivers.map((d) =>
                    d.user.id === userId
                        ? {
                            ...d,
                            verification_status: 'approved',
                            driver_profile: d.driver_profile
                                ? {
                                    ...d.driver_profile,
                                    verification_status: 'approved',
                                    verification_reasons: [],
                                    verification_note: null,
                                    verified_at: new Date().toISOString(),
                                }
                                : d.driver_profile,
                        }
                        : d,
                ),
                // Xoá tài xế đó khỏi danh sách chờ ngay lập tức
                pendingDrivers: pendingDrivers.filter((d) => d.user.id !== userId),
            });
        } catch (e: any) {
            set({ loading: false, error: e?.message ?? 'Approve failed' });
            throw e;
        }
    },

    rejectDriver: async (userId: string, payload: RejectPayload) => {
        set({ loading: true, error: undefined });
        try {
            await driverApprovalService.reject(userId, payload);

            const { drivers, pendingDrivers } = get();
            set({
                loading: false,
                // Cập nhật trạng thái trong mảng tổng
                drivers: drivers.map((d) =>
                    d.user.id === userId
                        ? {
                            ...d,
                            verification_status: 'rejected',
                            driver_profile: d.driver_profile
                                ? {
                                    ...d.driver_profile,
                                    verification_status: 'rejected',
                                    verification_reasons: payload.reasons ?? [],
                                    verification_note: payload.note ?? null,
                                    verified_at: new Date().toISOString(),
                                }
                                : d.driver_profile,
                        }
                        : d,
                ),
                // Xoá tài xế đó khỏi danh sách chờ ngay lập tức
                pendingDrivers: pendingDrivers.filter((d) => d.user.id !== userId),
            });
        } catch (e: any) {
            set({ loading: false, error: e?.message ?? 'Reject failed' });
            throw e;
        }
    },
}));