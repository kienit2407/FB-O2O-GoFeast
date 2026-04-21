/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import {
  ShoppingCart,
  DollarSign,
  Users,
  Car,
  XCircle,
  CheckCircle,
  Store,
  Plus,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Link } from 'react-router-dom';

import { KPICard } from '@/components/ui/kpi-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OrderHeatmap } from '@/components/dashboard/OrderHeatmap';
import { adminDashboardService, type AdminDashboardSummary } from '@/service/adminDashboard.service';
import { useMerchantApprovalStore } from '@/store/merchantApprovalStore';

function formatCompactCurrency(value: number) {
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toString();
}

export default function Dashboard() {
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const { pending, fetchReviewQueue } = useMerchantApprovalStore();
  const pendingDrivers = summary?.pending_drivers ?? 0;

  const loadDashboard = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);

    try {
      const data = await adminDashboardService.getSummary(6);
      setSummary(data);
      setLastUpdated(data?.last_updated ? new Date(data.last_updated) : new Date());
    } catch (e: any) {
      setError(e?.message ?? 'Không tải được dữ liệu dashboard');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
    void fetchReviewQueue();

    const interval = setInterval(() => {
      void loadDashboard(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchReviewQueue, loadDashboard]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      loadDashboard(true),
      fetchReviewQueue(),
    ]);
    setLastUpdated(new Date());
    setIsRefreshing(false);
  };

  const ordersPerHour = summary?.orders_per_hour ?? [];
  const heatmapPoints = summary?.heatmap_points ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Cập nhật lúc: {lastUpdated.toLocaleTimeString('vi-VN')}
          </p>
          {error ? <p className="text-sm text-destructive mt-1">{error}</p> : null}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing || loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Làm mới
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard
          title="Đơn hàng hôm nay"
          value={(summary?.total_orders_today ?? 0).toLocaleString()}
          icon={<ShoppingCart className="h-5 w-5" />}
        />

        <KPICard
          title="GMV hôm nay"
          value={`${formatCompactCurrency(summary?.gmv_today ?? 0)}₫`}
          icon={<DollarSign className="h-5 w-5" />}
        />

        <KPICard
          title="User hoạt động"
          value={(summary?.active_users ?? 0).toLocaleString()}
          icon={<Users className="h-5 w-5" />}
        />

        <KPICard
          title="Driver online"
          value={(summary?.active_drivers ?? 0).toLocaleString()}
          icon={<Car className="h-5 w-5" />}
        />

        <KPICard
          title="Tỷ lệ hủy"
          value={`${summary?.cancellation_rate ?? 0}%`}
          icon={<XCircle className="h-5 w-5" />}
        />

        <KPICard
          title="Tỷ lệ chấp nhận"
          value={`${summary?.acceptance_rate ?? 0}%`}
          icon={<CheckCircle className="h-5 w-5" />}
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">
              <span className="pulse-live pl-4">Đơn hàng theo giờ</span>
            </CardTitle>

            <Link to="/orders/delivery">
              <Button variant="ghost" size="sm">
                Xem chi tiết <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </CardHeader>

        <CardContent>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ordersPerHour}>
                <defs>
                  <linearGradient id="dashboardOrdersGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />

                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />

                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />

                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [value.toLocaleString(), 'Đơn hàng']}
                />

                <Area
                  type="monotone"
                  dataKey="orders"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#dashboardOrdersGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Thao tác nhanh</CardTitle>
          </CardHeader>

          <CardContent className="grid grid-cols-2 gap-3">
            <Link to="/promotions/platform-promotions">
              <Button variant="outline" className="w-full justify-start h-auto py-3">
                <Plus className="h-4 w-4 mr-2 text-primary" />
                <div className="text-left">
                  <p className="font-medium">Tạo voucher</p>
                  <p className="text-xs text-muted-foreground">Platform promotion</p>
                </div>
              </Button>
            </Link>

            <Link to="/merchants/pending">
              <Button variant="outline" className="w-full justify-start h-auto py-3">
                <Store className="h-4 w-4 mr-2 text-primary" />
                <div className="text-left">
                  <p className="font-medium">Duyệt Merchant</p>
                  <p className="text-xs text-muted-foreground">{pending.length} đang chờ</p>
                </div>
              </Button>
            </Link>

            <Link to="/drivers/pending">
              <Button variant="outline" className="w-full justify-start h-auto py-3">
                <Car className="h-4 w-4 mr-2 text-primary" />
                <div className="text-left">
                  <p className="font-medium">Duyệt Driver</p>
                  <p className="text-xs text-muted-foreground">{pendingDrivers} đang chờ</p>
                </div>
              </Button>
            </Link>

            <Link to="/orders/delivery">
              <Button variant="outline" className="w-full justify-start h-auto py-3">
                <ShoppingCart className="h-4 w-4 mr-2 text-primary" />
                <div className="text-left">
                  <p className="font-medium">Giám sát đơn</p>
                  <p className="text-xs text-muted-foreground">Realtime monitor</p>
                </div>
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Heatmap đơn hàng</CardTitle>
          </CardHeader>

          <CardContent>
            <OrderHeatmap points={heatmapPoints} height={260} />
            <p className="text-xs text-muted-foreground mt-3">
              Nguồn dữ liệu {summary?.heatmap_hours ?? 6} giờ gần nhất • {heatmapPoints.length} điểm
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
