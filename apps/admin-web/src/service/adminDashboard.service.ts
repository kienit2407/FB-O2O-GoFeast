import { API } from '@/lib/api';

export type AdminHeatmapPoint = {
  id: string;
  order_type: 'delivery' | 'dine_in';
  status: string;
  lat: number;
  lng: number;
  weight: number;
  created_at: string;
};

export type AdminDashboardSummary = {
  total_orders_today: number;
  gmv_today: number;
  active_users: number;
  active_drivers: number;
  cancellation_rate: number;
  acceptance_rate: number;
  pending_merchants: number;
  pending_drivers: number;
  orders_per_hour: Array<{ hour: string; orders: number }>;
  heatmap_hours: number;
  heatmap_points: AdminHeatmapPoint[];
  last_updated: string;
};

export const adminDashboardService = {
  async getSummary(heatmapHours = 6): Promise<AdminDashboardSummary> {
    const res = await API.get('/admin/dashboard/summary', {
      params: { heatmap_hours: heatmapHours },
    });
    return res.data?.data;
  },
};
