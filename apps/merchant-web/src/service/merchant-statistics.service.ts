/* eslint-disable @typescript-eslint/no-explicit-any */
import { API } from "@/lib/api";

export type MerchantStatisticsPeriod = "7d" | "30d" | "90d";

export interface MerchantRevenuePoint {
    date: string;
    revenue: number;
    gross_revenue: number;
    orders: number;
}

export interface MerchantBestSellerItem {
    product_id: string;
    product_name: string;
    quantity: number;
    revenue: number;
    avg_price: number;
}

export interface MerchantDashboardSummary {
    today_revenue: number;
    today_gross_revenue: number;
    yesterday_revenue: number;
    revenue_change_pct: number;
    new_orders: number;
    preparing_orders: number;
    average_rating: number;
    total_reviews: number;
    average_prep_time_min: number;
}

export interface MerchantDashboardResponse {
    summary: MerchantDashboardSummary;
    revenue_chart: MerchantRevenuePoint[];
    best_sellers: MerchantBestSellerItem[];
}

export interface MerchantRevenueSummary {
    total_revenue: number;
    total_gross_revenue: number;
    total_orders: number;
    avg_order_value: number;
    avg_orders_per_day: number;
    revenue_change_pct: number;
}

export interface MerchantRevenueReportResponse {
    period: MerchantStatisticsPeriod;
    summary: MerchantRevenueSummary;
    chart: MerchantRevenuePoint[];
    breakdown: MerchantRevenuePoint[];
}

export interface MerchantBestSellerSummary {
    total_quantity: number;
    total_revenue: number;
    top_product_name: string | null;
    top_product_quantity: number;
    top_product_revenue: number;
}

export interface MerchantBestSellersResponse {
    period: MerchantStatisticsPeriod;
    summary: MerchantBestSellerSummary;
    items: MerchantBestSellerItem[];
}

export const merchantStatisticsService = {
    async getDashboard(): Promise<MerchantDashboardResponse> {
        const res = await API.get("/merchant/statistics/dashboard");
        return res.data.data;
    },

    async getRevenue(
        period: MerchantStatisticsPeriod = "7d",
    ): Promise<MerchantRevenueReportResponse> {
        const res = await API.get("/merchant/statistics/revenue", {
            params: { period },
        });
        return res.data.data;
    },

    async getBestSellers(
        period: MerchantStatisticsPeriod = "7d",
        limit = 10,
    ): Promise<MerchantBestSellersResponse> {
        const res = await API.get("/merchant/statistics/best-sellers", {
            params: { period, limit },
        });
        return res.data.data;
    },
};