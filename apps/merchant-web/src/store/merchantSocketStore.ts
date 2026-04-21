/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";

export type MerchantRealtimeNotificationType =
    | "new_order"
    | "order_status"
    | "dispatch_expired"
    | "dispatch_cancelled"
    | "review_received"
    | "system";

export interface MerchantRealtimeNotification {
    id: string;
    type: MerchantRealtimeNotificationType;
    orderId: string;
    title: string;
    message: string;
    createdAt: number;
    read: boolean;
    raw?: any;
}

export interface MerchantRealtimeOrder {
    orderId: string;
    status?: string;
    type?: string;
    tableNumber?: string | number | null;
    merchantId?: string;
    branchId?: string;
    updatedAt?: number;
    raw?: any;
}

interface MerchantSocketState {
    connected: boolean;
    notifications: MerchantRealtimeNotification[];
    ordersMap: Record<string, MerchantRealtimeOrder>;
    activeOrderId: string | null;
    lastEventAt: number | null;

    setConnected: (connected: boolean) => void;
    setActiveOrderId: (orderId: string | null) => void;

    pushNotification: (item: MerchantRealtimeNotification) => void;
    markAllAsRead: () => void;
    markRead: (id: string) => void;
    clearNotifications: () => void;

    upsertOrder: (order: MerchantRealtimeOrder) => void;
    removeOrder: (orderId: string) => void;
    reset: () => void;
}

export const useMerchantSocketStore = create<MerchantSocketState>((set) => ({
    connected: false,
    notifications: [],
    ordersMap: {},
    activeOrderId: null,
    lastEventAt: null,

    setConnected: (connected) => set({ connected }),

    setActiveOrderId: (orderId) => set({ activeOrderId: orderId }),

    pushNotification: (item) =>
        set((state) => {
            const existed = state.notifications.find((x) => x.id === item.id);
            if (existed) return state;

            return {
                notifications: [item, ...state.notifications].slice(0, 100),
                lastEventAt: Date.now(),
            };
        }),

    markAllAsRead: () =>
        set((state) => ({
            notifications: state.notifications.map((x) => ({ ...x, read: true })),
        })),

    markRead: (id) =>
        set((state) => ({
            notifications: state.notifications.map((x) =>
                x.id === id ? { ...x, read: true } : x,
            ),
        })),

    clearNotifications: () => set({ notifications: [] }),

    upsertOrder: (order) =>
        set((state) => ({
            ordersMap: {
                ...state.ordersMap,
                [order.orderId]: {
                    ...state.ordersMap[order.orderId],
                    ...order,
                },
            },
            lastEventAt: Date.now(),
        })),

    removeOrder: (orderId) =>
        set((state) => {
            const next = { ...state.ordersMap };
            delete next[orderId];
            return {
                ordersMap: next,
                lastEventAt: Date.now(),
            };
        }),

    reset: () =>
        set({
            connected: false,
            notifications: [],
            ordersMap: {},
            activeOrderId: null,
            lastEventAt: null,
        }),
}));

export const selectMerchantUnreadCount = (state: MerchantSocketState) =>
    state.notifications.filter((x) => !x.read).length;