import { create } from 'zustand';
import {
    MerchantTable,
    tableService,
    UpsertTablePayload,
} from '@/service/table.service';

interface TableStoreState {
    tables: MerchantTable[];
    isLoading: boolean;
    isSubmitting: boolean;

    fetchTables: () => Promise<MerchantTable[]>;
    createTable: (payload: UpsertTablePayload) => Promise<MerchantTable>;
    updateTable: (
        id: string,
        payload: Partial<UpsertTablePayload>,
    ) => Promise<MerchantTable>;
    regenerateQr: (id: string) => Promise<MerchantTable>;
    removeTable: (id: string) => Promise<void>;

    setTables: (tables: MerchantTable[]) => void;
    getById: (id: string) => MerchantTable | undefined;
    clear: () => void;
}

export const useTableStore = create<TableStoreState>((set, get) => ({
    tables: [],
    isLoading: false,
    isSubmitting: false,

    setTables: (tables) => set({ tables }),

    getById: (id) => get().tables.find((x) => x._id === id),

    clear: () => set({ tables: [], isLoading: false, isSubmitting: false }),

    fetchTables: async () => {
        set({ isLoading: true });
        try {
            const tables = await tableService.listMine();
            set({ tables });
            return tables;
        } finally {
            set({ isLoading: false });
        }
    },

    createTable: async (payload) => {
        set({ isSubmitting: true });
        try {
            const created = await tableService.create(payload);
            set((state) => ({
                tables: [created, ...state.tables].sort((a, b) =>
                    a.table_number.localeCompare(b.table_number, undefined, {
                        numeric: true,
                        sensitivity: 'base',
                    }),
                ),
            }));
            return created;
        } finally {
            set({ isSubmitting: false });
        }
    },

    updateTable: async (id, payload) => {
        set({ isSubmitting: true });
        try {
            const updated = await tableService.update(id, payload);
            set((state) => ({
                tables: state.tables
                    .map((x) => (x._id === id ? updated : x))
                    .sort((a, b) =>
                        a.table_number.localeCompare(b.table_number, undefined, {
                            numeric: true,
                            sensitivity: 'base',
                        }),
                    ),
            }));
            return updated;
        } finally {
            set({ isSubmitting: false });
        }
    },

    regenerateQr: async (id) => {
        set({ isSubmitting: true });
        try {
            const updated = await tableService.regenerateQr(id);
            set((state) => ({
                tables: state.tables.map((x) => (x._id === id ? updated : x)),
            }));
            return updated;
        } finally {
            set({ isSubmitting: false });
        }
    },

    removeTable: async (id) => {
        set({ isSubmitting: true });
        try {
            await tableService.remove(id);
            set((state) => ({
                tables: state.tables.filter((x) => x._id !== id),
            }));
        } finally {
            set({ isSubmitting: false });
        }
    },
}));