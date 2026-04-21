/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  XCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Wifi,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/ui/status-badge';
import { useToast } from '@/hooks/use-toast';
import { useAdminAuth } from '@/store/authStore';
import {
  adminOrdersService,
  type AdminOrderDetail,
  type AdminOrderListItem,
  type AdminOrderType,
} from '@/service/adminOrders.service';
import { adminSocketService } from '@/service/adminSocket.service';

type OrdersMonitorProps = {
  orderType: AdminOrderType;
  title: string;
  description: string;
};

const DELIVERY_STATUS_OPTIONS = [
  'pending',
  'confirmed',
  'preparing',
  'ready_for_pickup',
  'driver_assigned',
  'driver_arrived',
  'picked_up',
  'delivering',
  'delivered',
  'completed',
  'cancelled',
];

const DINE_IN_STATUS_OPTIONS = [
  'pending',
  'confirmed',
  'preparing',
  'served',
  'completed',
  'cancelled',
];

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Tiền mặt',
  card: 'Thẻ',
  wallet: 'Ví',
  vnpay: 'VNPay',
  momo: 'MoMo',
  zalopay: 'ZaloPay',
};

function formatCurrency(value: number) {
  return `${new Intl.NumberFormat('vi-VN').format(value)}₫`;
}

function getTimeAgo(date: string) {
  const ts = new Date(date).getTime();
  if (!Number.isFinite(ts)) return '-';

  const minutes = Math.floor((Date.now() - ts) / 60000);
  if (minutes < 60) return `${Math.max(minutes, 0)} phút trước`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;

  return `${Math.floor(hours / 24)} ngày trước`;
}

function getItemDisplayName(item: {
  item_type?: 'product' | 'topping';
  product_name?: string;
  topping_name?: string;
}) {
  if (item.item_type === 'topping') return item.topping_name || 'Topping';
  return item.product_name || 'Món';
}

function mapPaymentMethod(method: string | null) {
  if (!method) return '-';
  return PAYMENT_LABELS[method] ?? method;
}

export default function OrdersMonitor({ orderType, title, description }: OrdersMonitorProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { accessToken } = useAdminAuth();
  const { toast } = useToast();

  const [searchDraft, setSearchDraft] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [orders, setOrders] = useState<AdminOrderListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});

  const [loading, setLoading] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [acting, setActing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedOrder, setSelectedOrder] = useState<AdminOrderDetail | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const [socketConnected, setSocketConnected] = useState(false);
  const [socketTick, setSocketTick] = useState(0);

  const statusOptions = orderType === 'delivery' ? DELIVERY_STATUS_OPTIONS : DINE_IN_STATUS_OPTIONS;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const loadOrders = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent === true;

      if (!silent) setLoading(true);
      setError(null);

      try {
        const data = await adminOrdersService.list({
          order_type: orderType,
          q: searchQuery || undefined,
          status: statusFilter === 'all' ? undefined : statusFilter,
          page,
          limit,
        });

        setOrders(data.items ?? []);
        setTotal(data.total ?? 0);
        setStatusCounts(data.status_counts ?? {});
      } catch (e: any) {
        const message = e?.message ?? 'Không tải được danh sách đơn hàng';
        setError(message);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [limit, orderType, page, searchQuery, statusFilter],
  );

  const loadOrderDetail = useCallback(async (orderId: string, silent = false) => {
    if (!silent) setLoadingDetail(true);

    try {
      const detail = await adminOrdersService.detail(orderId);
      setSelectedOrder(detail);
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Không tải được chi tiết đơn',
        description: e?.message ?? 'Vui lòng thử lại',
      });
    } finally {
      if (!silent) setLoadingDetail(false);
    }
  }, [toast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setSearchQuery(searchDraft.trim());
    }, 350);

    return () => clearTimeout(timer);
  }, [searchDraft]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders, socketTick]);

  useEffect(() => {
    if (!selectedOrder) return;
    void loadOrderDetail(selectedOrder.id, true);
  }, [loadOrderDetail, selectedOrder?.id, socketTick]);

  useEffect(() => {
    const highlightOrder = searchParams.get('highlight');
    if (!highlightOrder) return;

    const found = orders.find(
      (order) => order.id === highlightOrder || order.order_number === highlightOrder,
    );

    const targetId = found?.id ?? highlightOrder;
    void loadOrderDetail(targetId);

    const next = new URLSearchParams(searchParams);
    next.delete('highlight');
    setSearchParams(next, { replace: true });
  }, [loadOrderDetail, orders, searchParams, setSearchParams]);

  useEffect(() => {
    if (!accessToken) {
      setSocketConnected(false);
      return;
    }

    const socket = adminSocketService.connect(accessToken);

    const handleConnect = () => setSocketConnected(true);
    const handleDisconnect = () => setSocketConnected(false);
    const handleConnectError = () => setSocketConnected(false);

    const handleOrderRealtime = (payload: any) => {
      const payloadType = String(payload?.orderType ?? payload?.order_type ?? '').toLowerCase();
      if (payloadType && payloadType !== orderType) return;
      setSocketTick((prev) => prev + 1);
    };

    adminSocketService.onConnect(handleConnect);
    adminSocketService.onDisconnect(handleDisconnect);
    adminSocketService.onConnectError(handleConnectError);

    adminSocketService.on('admin:order:new', handleOrderRealtime);
    adminSocketService.on('admin:order:status', handleOrderRealtime);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);

      adminSocketService.off('admin:order:new', handleOrderRealtime);
      adminSocketService.off('admin:order:status', handleOrderRealtime);
    };
  }, [accessToken, orderType]);

  useEffect(() => {
    setPage(1);
    setStatusFilter('all');
    setSelectedOrder(null);
    setCancelDialogOpen(false);
    setCancelReason('');
  }, [orderType]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadOrders({ silent: true });
    if (selectedOrder) {
      await loadOrderDetail(selectedOrder.id, true);
    }
    setIsRefreshing(false);
  };

  const handleForceCancel = async () => {
    if (!selectedOrder) return;

    setActing(true);

    try {
      const updated = await adminOrdersService.forceCancel(selectedOrder.id, cancelReason.trim() || undefined);
      setSelectedOrder(updated);
      setCancelDialogOpen(false);
      setCancelReason('');
      await loadOrders({ silent: true });

      toast({
        title: 'Đã force cancel đơn hàng',
        description: `Đơn ${updated.order_number} đã được huỷ`,
      });
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Force cancel thất bại',
        description: e?.message ?? 'Vui lòng thử lại',
      });
    } finally {
      setActing(false);
    }
  };

  const headerTotal = useMemo(() => {
    const currentTypeTotal = statusFilter === 'all' ? total : (statusCounts[statusFilter] ?? 0);
    return currentTypeTotal;
  }, [statusCounts, statusFilter, total]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Wifi className={`h-3.5 w-3.5 ${socketConnected ? 'text-emerald-500' : 'text-muted-foreground'}`} />
            {socketConnected ? 'Socket online' : 'Socket reconnecting'}
          </span>

          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing || loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm theo mã đơn, khách hàng, merchant, driver..."
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={(value) => { setPage(1); setStatusFilter(value); }}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    <StatusBadge status={status} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <span className="pulse-live pl-4">{headerTotal.toLocaleString()} đơn hàng</span>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Khách hàng</th>
                  <th>Merchant</th>
                  {orderType === 'delivery' ? <th>Driver</th> : <th>Bàn</th>}
                  <th>Tổng tiền</th>
                  <th>Thanh toán</th>
                  <th>Trạng thái</th>
                  <th>Thời gian</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-muted-foreground">
                      Đang tải dữ liệu...
                    </td>
                  </tr>
                ) : orders.length > 0 ? (
                  orders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <div>
                          <p className="font-mono text-sm">{order.order_number}</p>
                          <p className="text-xs text-muted-foreground">{order.id.slice(0, 8)}...</p>
                        </div>
                      </td>

                      <td>
                        <div>
                          <p className="font-medium">{order.customer.full_name}</p>
                          <p className="text-xs text-muted-foreground">{order.customer.phone || '-'}</p>
                        </div>
                      </td>

                      <td>{order.merchant.name}</td>

                      {orderType === 'delivery' ? (
                        <td>
                          {order.driver ? (
                            <div>
                              <p>{order.driver.full_name}</p>
                              <p className="text-xs text-muted-foreground">{order.driver.phone || '-'}</p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Chưa có</span>
                          )}
                        </td>
                      ) : (
                        <td>
                          {order.table ? (
                            <div>
                              <p>Bàn {order.table.table_number}</p>
                              {order.table.table_name ? (
                                <p className="text-xs text-muted-foreground">{order.table.table_name}</p>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      )}

                      <td className="font-medium">{formatCurrency(order.total_amount)}</td>
                      <td>{mapPaymentMethod(order.payment_method)}</td>

                      <td>
                        <StatusBadge status={order.status} />
                      </td>

                      <td className="text-muted-foreground text-sm">{getTimeAgo(order.created_at)}</td>

                      <td>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>

                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => void loadOrderDetail(order.id)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Xem chi tiết
                            </DropdownMenuItem>

                            {order.status !== 'completed' && order.status !== 'cancelled' ? (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  void loadOrderDetail(order.id, true);
                                  setCancelDialogOpen(true);
                                }}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Force Cancel
                              </DropdownMenuItem>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-muted-foreground">
                      {error ?? 'Không có đơn hàng nào'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Trang {page}/{totalPages} • Tổng {total.toLocaleString()} đơn
            </p>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Trước
              </Button>

              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Sau
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Sheet open={!!selectedOrder && !cancelDialogOpen} onOpenChange={() => setSelectedOrder(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedOrder ? (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-3 flex-wrap">
                  <span className="font-mono">{selectedOrder.order_number}</span>
                  <StatusBadge status={selectedOrder.status} />
                  {loadingDetail ? <span className="text-xs text-muted-foreground">Đang cập nhật...</span> : null}
                </SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <div>
                  <h3 className="font-semibold mb-3">Timeline</h3>
                  <div className="space-y-3">
                    {(selectedOrder.status_history ?? []).length > 0 ? (
                      selectedOrder.status_history.map((event, index) => (
                        <div key={`${event.status}_${index}`} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className="w-2 h-2 rounded-full bg-primary" />
                            {index < selectedOrder.status_history.length - 1 ? (
                              <div className="w-0.5 h-full bg-border mt-1" />
                            ) : null}
                          </div>
                          <div className="flex-1 pb-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <StatusBadge status={event.status} />
                              {event.changed_by_name ? (
                                <span className="text-xs text-muted-foreground">bởi {event.changed_by_name}</span>
                              ) : null}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {event.changed_at ? new Date(event.changed_at).toLocaleString('vi-VN') : '-'}
                            </p>
                            {event.note ? (
                              <p className="text-xs text-muted-foreground mt-1">{event.note}</p>
                            ) : null}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Không có timeline</p>
                    )}
                  </div>
                </div>

                {selectedOrder.items?.length > 0 ? (
                  <div>
                    <h3 className="font-semibold mb-3">Chi tiết món</h3>
                    <div className="space-y-3">
                      {selectedOrder.items.map((item, index) => (
                        <div key={index} className="rounded-md border p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium">
                                {item.quantity}x {getItemDisplayName(item)}
                              </p>

                              {item.selected_options?.length ? (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {item.selected_options
                                    .map((opt) => `${opt.option_name}: ${opt.choice_name}`)
                                    .join(' • ')}
                                </p>
                              ) : null}

                              {item.selected_toppings?.length ? (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Topping: {item.selected_toppings
                                    .map((tp) => `${tp.quantity}x ${tp.topping_name}`)
                                    .join(' • ')}
                                </p>
                              ) : null}

                              {item.note ? (
                                <p className="text-xs text-muted-foreground mt-1">Ghi chú: {item.note}</p>
                              ) : null}
                            </div>

                            <p className="text-sm font-medium">{formatCurrency(item.item_total)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div>
                  <h3 className="font-semibold mb-3">Chi tiết phí</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tạm tính</span>
                      <span>{formatCurrency(selectedOrder.subtotal)}</span>
                    </div>

                    {selectedOrder.delivery_fee > 0 ? (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Phí giao hàng</span>
                        <span>{formatCurrency(selectedOrder.delivery_fee)}</span>
                      </div>
                    ) : null}

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phí nền tảng</span>
                      <span>{formatCurrency(selectedOrder.platform_fee)}</span>
                    </div>

                    {(selectedOrder.discounts?.total_discount ?? 0) > 0 ? (
                      <div className="flex justify-between text-success">
                        <span>Giảm giá</span>
                        <span>-{formatCurrency(selectedOrder.discounts.total_discount ?? 0)}</span>
                      </div>
                    ) : null}

                    <div className="flex justify-between font-semibold pt-2 border-t">
                      <span>Tổng cộng</span>
                      <span>{formatCurrency(selectedOrder.total_amount)}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold mb-2 text-sm">Khách hàng</h3>
                    <p className="text-sm">{selectedOrder.customer.full_name}</p>
                    <p className="text-xs text-muted-foreground">{selectedOrder.customer.phone || '-'}</p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2 text-sm">Merchant</h3>
                    <p className="text-sm">{selectedOrder.merchant.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedOrder.merchant.address || '-'}</p>
                  </div>

                  {selectedOrder.driver ? (
                    <div>
                      <h3 className="font-semibold mb-2 text-sm">Driver</h3>
                      <p className="text-sm">{selectedOrder.driver.full_name}</p>
                      <p className="text-xs text-muted-foreground">{selectedOrder.driver.phone || '-'}</p>
                    </div>
                  ) : null}

                  {selectedOrder.table ? (
                    <div>
                      <h3 className="font-semibold mb-2 text-sm">Thông tin bàn</h3>
                      <p className="text-sm">Bàn {selectedOrder.table.table_number}</p>
                      <p className="text-xs text-muted-foreground">{selectedOrder.table.table_name || '-'}</p>
                    </div>
                  ) : null}
                </div>

                {selectedOrder.delivery_address?.address ? (
                  <div>
                    <h3 className="font-semibold mb-2 text-sm">Địa chỉ giao hàng</h3>
                    <p className="text-sm">{selectedOrder.delivery_address.address}</p>
                    {selectedOrder.delivery_address.note ? (
                      <p className="text-xs text-muted-foreground mt-1">
                        Ghi chú: {selectedOrder.delivery_address.note}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {selectedOrder.status !== 'completed' && selectedOrder.status !== 'cancelled' ? (
                  <div className="pt-4 border-t">
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => setCancelDialogOpen(true)}
                      disabled={acting}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Force Cancel
                    </Button>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận hủy đơn</DialogTitle>
            <DialogDescription>
              Bạn đang hủy đơn{' '}
              <span className="font-mono font-medium">{selectedOrder?.order_number}</span>.
              Nhập lý do để lưu audit.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            placeholder="Nhập lý do hủy đơn..."
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={3}
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)} disabled={acting}>
              Hủy bỏ
            </Button>
            <Button variant="destructive" onClick={handleForceCancel} disabled={acting}>
              {acting ? 'Đang xử lý...' : 'Xác nhận hủy đơn'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
