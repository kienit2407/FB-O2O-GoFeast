import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  Users,
  Calendar,
} from "lucide-react";
import { useMerchantStatisticsStore } from "@/store/merchantStatisticsStore";
import { MerchantStatisticsPeriod } from "@/service/merchant-statistics.service";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);
};

const formatShortCurrency = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toString();
};

export default function RevenueReportPage() {
  const [period, setPeriod] = useState<MerchantStatisticsPeriod>("7d");

  const revenueReport = useMerchantStatisticsStore((s) => s.revenueReport);
  const loadingRevenue = useMerchantStatisticsStore((s) => s.loadingRevenue);
  const errorRevenue = useMerchantStatisticsStore((s) => s.errorRevenue);
  const fetchRevenue = useMerchantStatisticsStore((s) => s.fetchRevenue);

  useEffect(() => {
    void fetchRevenue(period);
  }, [period, fetchRevenue]);

  const summary = revenueReport?.summary;
  const chart = revenueReport?.chart ?? [];
  const breakdown = revenueReport?.breakdown ?? [];

  const totalRevenue = summary?.total_revenue ?? 0;
  const totalOrders = summary?.total_orders ?? 0;
  const avgOrderValue = summary?.avg_order_value ?? 0;
  const avgOrdersPerDay = summary?.avg_orders_per_day ?? 0;
  const revenueChange = summary?.revenue_change_pct ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Báo cáo doanh thu</h1>
          <p className="text-muted-foreground">
            Theo dõi doanh thu theo thời gian
          </p>
        </div>

        <div className="flex gap-2">
          <Select
            value={period}
            onValueChange={(v: MerchantStatisticsPeriod) => setPeriod(v)}
          >
            <SelectTrigger className="w-[140px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 ngày</SelectItem>
              <SelectItem value="30d">30 ngày</SelectItem>
              <SelectItem value="90d">90 ngày</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {errorRevenue && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="py-4 text-sm text-destructive">
            {errorRevenue}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tổng doanh thu</p>
                <p className="text-2xl font-bold mt-1">
                  {loadingRevenue ? "..." : formatCurrency(totalRevenue)}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  {Number(revenueChange) >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-success" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-destructive" />
                  )}
                  <span
                    className={`text-sm ${Number(revenueChange) >= 0
                        ? "text-success"
                        : "text-destructive"
                      }`}
                  >
                    {revenueChange}%
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tổng đơn hàng</p>
                <p className="text-2xl font-bold mt-1">{totalOrders}</p>
                <p className="text-sm text-muted-foreground mt-1">đơn</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Giá trị TB/đơn</p>
                <p className="text-2xl font-bold mt-1">
                  {formatCurrency(avgOrderValue)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">VNĐ/đơn</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Đơn hàng TB/ngày</p>
                <p className="text-2xl font-bold mt-1">
                  {Math.round(avgOrdersPerDay)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">đơn/ngày</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Biểu đồ doanh thu</CardTitle>
          <CardDescription>Doanh thu và số đơn hàng theo ngày</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="hsl(var(--primary))"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(var(--primary))"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) =>
                    new Date(value).toLocaleDateString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                    })
                  }
                  className="text-xs"
                />
                <YAxis
                  yAxisId="left"
                  tickFormatter={formatShortCurrency}
                  className="text-xs"
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  className="text-xs"
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    name === "revenue" ? formatCurrency(value) : value,
                    name === "revenue" ? "Doanh thu" : "Đơn hàng",
                  ]}
                  labelFormatter={(value) =>
                    new Date(value).toLocaleDateString("vi-VN")
                  }
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                  strokeWidth={2}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="orders"
                  stroke="hsl(var(--accent))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--accent))" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Chi tiết theo ngày</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {breakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Chưa có dữ liệu doanh thu
              </p>
            ) : (
              breakdown.map((day, idx) => (
                <div
                  key={day.date}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-medium">
                      {new Date(day.date).getDate()}
                    </div>
                    <div>
                      <p className="font-medium">
                        {new Date(day.date).toLocaleDateString("vi-VN", {
                          weekday: "long",
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {day.orders} đơn hàng
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(day.revenue)}</p>
                    {idx < breakdown.length - 1 && (
                      <div className="flex items-center gap-1 justify-end">
                        {day.revenue >= (breakdown[idx + 1]?.revenue ?? 0) ? (
                          <TrendingUp className="w-3 h-3 text-success" />
                        ) : (
                          <TrendingDown className="w-3 h-3 text-destructive" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}