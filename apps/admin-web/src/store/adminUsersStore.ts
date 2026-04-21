/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand';
import { adminUsersService, type AdminUserRow, type UserStatus, type UserLite } from '@/service/adminUsers.service';

type TabKey = 'active' | 'inactive' | 'all';

type State = {
    loading: boolean;
    detailLoading: boolean;
    error?: string;

    tab: TabKey;
    q: string;
    role?: string;

    page: number;
    limit: number;
    total: number;

    users: AdminUserRow[];

    // drawer
    drawerOpen: boolean;
    selectedUser?: UserLite;
    selectedUserId?: string;
    loginHistory: { items: any[]; page: number; limit: number; total: number };

    setTab: (tab: TabKey) => void;
    setQuery: (q: string) => void;
    setRole: (role?: string) => void;
    setPage: (page: number, limit?: number) => void;

    fetchUsers: () => Promise<void>;
    openDetail: (userId: string) => Promise<void>;
    closeDetail: () => void;
    fetchHistoryPage: (page: number, limit?: number) => Promise<void>;

    toggleActive: (userId: string, active: boolean) => Promise<void>;
};

export const useAdminUsersStore = create<State>((set, get) => ({
    loading: false,
    detailLoading: false,
    error: undefined,

    tab: 'active',
    q: '',
    role: undefined,

    page: 1,
    limit: 10,
    total: 0,

    users: [],

    drawerOpen: false,
    selectedUser: undefined,
    selectedUserId: undefined,
    loginHistory: { items: [], page: 1, limit: 20, total: 0 },

    setTab: (tab) => set({ tab, page: 1 }),
    setQuery: (q) => set({ q, page: 1 }),
    setRole: (role) => set({ role, page: 1 }),
    setPage: (page, limit) => set({ page, ...(limit ? { limit } : {}) }),

    fetchUsers: async () => {
        const { tab, q, role, page, limit } = get();

        const status: UserStatus | undefined =
            tab === 'all' ? undefined : (tab as any);

        set({ loading: true, error: undefined });
        try {
            const res = await adminUsersService.list({
                q: q.trim() || undefined,
                role: role || undefined,
                status,
                page,
                limit,
                sortBy: 'created_at',
                sortDir: 'desc',
            });

            set({
                users: res.items,
                total: res.total,
                page: res.page,
                limit: res.limit,
                loading: false,
            });
        } catch (e: any) {
            set({ loading: false, error: e?.message ?? 'Fetch users failed' });
        }
    },

    openDetail: async (userId: string) => {
        set({
            drawerOpen: true,
            selectedUserId: userId,
            detailLoading: true,
            error: undefined,
            loginHistory: { items: [], page: 1, limit: 20, total: 0 },
        });

        try {
            const res = await adminUsersService.detail(userId, { page: 1, limit: 20 });
            set({
                selectedUser: res.user,
                loginHistory: res.loginHistory,
                detailLoading: false,
            });
        } catch (e: any) {
            set({ detailLoading: false, error: e?.message ?? 'Fetch detail failed' });
        }
    },

    closeDetail: () =>
        set({
            drawerOpen: false,
            selectedUser: undefined,
            selectedUserId: undefined,
            loginHistory: { items: [], page: 1, limit: 20, total: 0 },
        }),

    fetchHistoryPage: async (page, limit) => {
        const { selectedUserId, loginHistory } = get();
        if (!selectedUserId) return;

        set({ detailLoading: true, error: undefined });
        try {
            const res = await adminUsersService.detail(selectedUserId, {
                page,
                limit: limit ?? loginHistory.limit,
            });

            set({
                selectedUser: res.user,
                loginHistory: res.loginHistory,
                detailLoading: false,
            });
        } catch (e: any) {
            set({ detailLoading: false, error: e?.message ?? 'Fetch history failed' });
        }
    },

    toggleActive: async (userId, active) => {
        // optimistic update list
        const { users, selectedUserId, selectedUser } = get();
        const prev = users;

        set({
            users: users.map((r) =>
                r.user.id === userId ? { ...r, user: { ...r.user, status: active ? 'active' : 'inactive' } } : r
            ),
            selectedUser:
                selectedUserId === userId && selectedUser
                    ? { ...selectedUser, status: active ? 'active' : 'inactive' }
                    : selectedUser,
        });

        try {
            const updated = await adminUsersService.setActive(userId, active);

            // sync lại theo response
            set({
                users: get().users.map((r) =>
                    r.user.id === userId ? { ...r, user: { ...r.user, status: updated.status ?? (active ? 'active' : 'inactive') } } : r
                ),
                selectedUser:
                    selectedUserId === userId && get().selectedUser
                        ? { ...get().selectedUser!, status: updated.status ?? (active ? 'active' : 'inactive') }
                        : get().selectedUser,
            });
        } catch (e: any) {
            // rollback
            set({ users: prev, error: e?.message ?? 'Update status failed' });
            throw e;
        }
    },
}));