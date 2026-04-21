/* eslint-disable @typescript-eslint/no-explicit-any */
import { API } from '@/lib/api';

export type UserStatus = 'active' | 'inactive' | 'blocked' | 'pending';

export type LoginHistoryItem = {
    id: string;
    created_at?: string | null;
    platform?: string | null;
    app?: string | null;
    auth_method?: string | null;
    oauth_provider?: string | null;
    device_id?: string | null;
    ip?: string | null;
    user_agent?: string | null;
};

export type UserLite = {
    id: string;
    email?: string | null;
    phone?: string | null;
    full_name?: string | null;
    status?: UserStatus | string | null;
    role?: string | null;
    avatar_url?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
};

export type AdminUserRow = {
    user: UserLite;
    last_login: LoginHistoryItem | null;
};

const mapUserFromList = (u: any): UserLite => ({
    id: u?.id ?? '',
    email: u?.email ?? null,
    phone: u?.phone ?? null,
    full_name: u?.full_name ?? null,
    status: u?.status ?? 'active',
    role: u?.role ?? null,
    avatar_url: u?.avatar_url ?? null,
    created_at: u?.created_at ?? null,
    updated_at: u?.updated_at ?? null,
});

const mapLastLoginFromList = (u: any): LoginHistoryItem | null => {
    if (!u?.last_login_at && !u?.last_login_ip && !u?.last_login_platform) return null;
    return {
        id: 'last_login',
        created_at: u?.last_login_at ?? null,
        ip: u?.last_login_ip ?? null,
        platform: u?.last_login_platform ?? null,
        device_id: u?.last_login_device_id ?? null,
        user_agent: u?.last_login_user_agent ?? null,
        app: u?.last_login_app ?? null,
        auth_method: u?.last_login_auth_method ?? null,
        oauth_provider: u?.last_login_oauth_provider ?? null,
    };
};

const mapHistoryItem = (h: any): LoginHistoryItem => ({
    id: h?.id ?? h?._id ?? '',
    created_at: h?.created_at ?? null,
    platform: h?.platform ?? null,
    app: h?.app ?? null,
    auth_method: h?.auth_method ?? null,
    oauth_provider: h?.oauth_provider ?? null,
    device_id: h?.device_id ?? null,
    ip: h?.ip ?? null,
    user_agent: h?.user_agent ?? null,
});

export const adminUsersService = {
    async list(params: {
        q?: string;
        role?: string;
        status?: UserStatus; // FE dùng tab truyền vào
        page?: number;
        limit?: number;
        sortBy?: 'created_at' | 'last_login_at';
        sortDir?: 'asc' | 'desc';
    }): Promise<{ items: AdminUserRow[]; total: number; page: number; limit: number }> {
        const res = await API.get('/admin/users', { params });
        const data = res.data?.data;

        const rawItems = Array.isArray(data?.items) ? data.items : [];
        return {
            items: rawItems.map((u: any) => ({
                user: mapUserFromList(u),
                last_login: mapLastLoginFromList(u),
            })),
            total: data?.total ?? 0,
            page: data?.page ?? params.page ?? 1,
            limit: data?.limit ?? params.limit ?? 10,
        };
    },

    async detail(userId: string, params?: { page?: number; limit?: number }) {
        const res = await API.get(`/admin/users/${userId}`, { params });
        const data = res.data?.data;

        return {
            user: mapUserFromList(data?.user),
            loginHistory: {
                items: Array.isArray(data?.loginHistory?.items)
                    ? data.loginHistory.items.map(mapHistoryItem)
                    : [],
                page: data?.loginHistory?.page ?? 1,
                limit: data?.loginHistory?.limit ?? 20,
                total: data?.loginHistory?.total ?? 0,
            },
        };
    },

    async setActive(userId: string, active: boolean): Promise<UserLite> {
        const res = await API.patch(`/admin/users/${userId}/active`, { active });
        const u = res.data?.data;
        return mapUserFromList(u);
    },
};