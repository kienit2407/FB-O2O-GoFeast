/* eslint-disable @typescript-eslint/no-explicit-any */
import { API } from '@/lib/api';

export type MerchantTableStatus = 'available' | 'occupied' | 'reserved';

export interface MerchantTable {
    _id: string;
    table_number: string;
    name?: string | null;
    capacity: number;
    qr_content?: string | null;
    status: MerchantTableStatus;
    current_session_id?: string | null;
    is_active: boolean;
    deleted_at?: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface UpsertTablePayload {
    table_number: string;
    name?: string;
    capacity?: number;
    is_active?: boolean;
    status?: MerchantTableStatus;
}

export const tableService = {
    listMine: async (): Promise<MerchantTable[]> => {
        const res = await API.get('/dine-in/tables/me');
        return res.data?.data ?? [];
    },

    getOne: async (id: string): Promise<MerchantTable> => {
        const res = await API.get(`/dine-in/tables/me/${id}`);
        return res.data?.data;
    },

    create: async (payload: UpsertTablePayload): Promise<MerchantTable> => {
        const res = await API.post('/dine-in/tables/me', payload);
        return res.data?.data;
    },

    update: async (
        id: string,
        payload: Partial<UpsertTablePayload>,
    ): Promise<MerchantTable> => {
        const res = await API.patch(`/dine-in/tables/me/${id}`, payload);
        return res.data?.data;
    },

    regenerateQr: async (id: string): Promise<MerchantTable> => {
        const res = await API.patch(`/dine-in/tables/me/${id}/regenerate-qr`);
        return res.data?.data;
    },

    remove: async (id: string) => {
        const res = await API.delete(`/dine-in/tables/me/${id}`);
        return res.data?.data;
    },
};