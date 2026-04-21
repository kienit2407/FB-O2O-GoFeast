import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { TrendingUp, Award, Calendar } from "lucide-react";
import { useMerchantStatisticsStore } from "@/store/merchantStatisticsStore";
import { MerchantStatisticsPeriod } from "@/service/merchant-statistics.service";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);
};

const colors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export default function BestSellersPage() {
  const [period, setPeriod] = useState<MerchantStatisticsPeriod>("7d");

  const bestSellersReport = useMerchantStatisticsStore((s) => s.bestSellersReport);
  const loadingBestSellers = useMerchantStatisticsStore((s) => s.loadingBestSellers);
  const errorBestSellers = useMerchantStatisticsStore((s) => s.errorBestSellers);
  const fetchBestSellers = useMerchantStatisticsStore((s) => s.fetchBestSellers);

  useEffect(() => {
    void fetchBestSellers(period, 10);
  }, [period, fetchBestSellers]);

  const summary = bestSellersReport?.summary;
  const items = bestSellersReport?.items ?? [];
  const chartItems = items.slice(0, 5);

  const totalQuantity = summary?.total_quantity ?? 0;
  const totalRevenue = summary?.total_revenue ?? 0;
  const topProductName = summary?.top_product_name ?? "-";
  const topProductQuantity = summary?.top_product_quantity ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Món bán chạy</h1>
          <p className="text-muted-foreground">
            Phân tích các món được yêu thích nhất
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

      {errorBestSellers && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="py-4 text-sm text-destructive">
            {errorBestSellers}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tổng số lượng bán</p>
                <p className="text-2xl font-bold mt-1">
                  {loadingBestSellers ? "..." : totalQuantity}
                </p>
                <p className="text-sm text-muted-foreground">sản phẩm</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Doanh thu từ top món</p>
                <p className="text-2xl font-bold mt-1">
                  {formatCurrency(totalRevenue)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                <Award className="w-6 h-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Món bán chạy nhất</p>
                <p className="text-xl font-bold mt-1">{topProductName}</p>
                <p className="text-sm text-muted-foreground">
                  {topProductQuantity} đã bán
                </p>
              </div>
              <div className="px-3 py-1 rounded-full bg-warning/10 text-warning font-semibold">
                #1
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Biểu đồ số lượng bán</CardTitle>
          <CardDescription>Top 5 món bán chạy nhất</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartItems} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis
                  type="category"
                  dataKey="product_name"
                  width={180}
                  className="text-xs"
                />
                <Tooltip
                  formatter={(value: number) => [value, "Số lượng"]}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="quantity" radius={[0, 4, 4, 0]}>
                  {chartItems.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={colors[index % colors.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Chi tiết sản phẩm</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Chưa có dữ liệu món bán chạy
              </p>
            ) : (
              items.map((item, index) => (
                <div
                  key={item.product_id}
                  className="flex items-center gap-4 p-4 rounded-lg bg-muted/50"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold
                    ${index === 0
                        ? "bg-warning/20 text-warning"
                        : index === 1
                          ? "bg-muted-foreground/20 text-muted-foreground"
                          : index === 2
                            ? "bg-orange-100 text-orange-600"
                            : "bg-muted text-muted-foreground"
                      }`}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{item.product_name}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span>{item.quantity} đã bán</span>
                      <span>•</span>
                      <span>{formatCurrency(item.revenue)} doanh thu</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(item.avg_price)}</p>
                    <p className="text-sm text-muted-foreground">Giá TB/món</p>
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