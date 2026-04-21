/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import {
    merchantStatisticsService,
    MerchantBestSellersResponse,
    MerchantDashboardResponse,
    MerchantRevenueReportResponse,
    MerchantStatisticsPeriod,
} from "@/service/merchant-statistics.service";

interface MerchantStatisticsState {
    dashboard: MerchantDashboardResponse | null;
    revenueReport: MerchantRevenueReportResponse | null;
    bestSellersReport: MerchantBestSellersResponse | null;

    loadingDashboard: boolean;
    loadingRevenue: boolean;
    loadingBestSellers: boolean;

    errorDashboard: string | null;
    errorRevenue: string | null;
    errorBestSellers: string | null;

    fetchDashboard: () => Promise<void>;
    fetchRevenue: (period?: MerchantStatisticsPeriod) => Promise<void>;
    fetchBestSellers: (
        period?: MerchantStatisticsPeriod,
        limit?: number,
    ) => Promise<void>;

    reset: () => void;
}

export const useMerchantStatisticsStore = create<MerchantStatisticsState>(
    (set) => ({
        dashboard: null,
        revenueReport: null,
        bestSellersReport: null,

        loadingDashboard: false,
        loadingRevenue: false,
        loadingBestSellers: false,

        errorDashboard: null,
        errorRevenue: null,
        errorBestSellers: null,

        fetchDashboard: async () => {
            set({ loadingDashboard: true, errorDashboard: null });
            try {
                const data = await merchantStatisticsService.getDashboard();
                set({
                    dashboard: data,
                    loadingDashboard: false,
                });
            } catch (e: any) {
                set({
                    loadingDashboard: false,
                    errorDashboard: e?.message ?? "Không tải được dashboard",
                });
            }
        },

        fetchRevenue: async (period: MerchantStatisticsPeriod = "7d") => {
            set({ loadingRevenue: true, errorRevenue: null });
            try {
                const data = await merchantStatisticsService.getRevenue(period);
                set({
                    revenueReport: data,
                    loadingRevenue: false,
                });
            } catch (e: any) {
                set({
                    loadingRevenue: false,
                    errorRevenue: e?.message ?? "Không tải được báo cáo doanh thu",
                });
            }
        },

        fetchBestSellers: async (
            period: MerchantStatisticsPeriod = "7d",
            limit = 10,
        ) => {
            set({ loadingBestSellers: true, errorBestSellers: null });
            try {
                const data = await merchantStatisticsService.getBestSellers(
                    period,
                    limit,
                );
                set({
                    bestSellersReport: data,
                    loadingBestSellers: false,
                });
            } catch (e: any) {
                set({
                    loadingBestSellers: false,
                    errorBestSellers: e?.message ?? "Không tải được món bán chạy",
                });
            }
        },

        reset: () =>
            set({
                dashboard: null,
                revenueReport: null,
                bestSellersReport: null,
                loadingDashboard: false,
                loadingRevenue: false,
                loadingBestSellers: false,
                errorDashboard: null,
                errorRevenue: null,
                errorBestSellers: null,
            }),
    }),
);