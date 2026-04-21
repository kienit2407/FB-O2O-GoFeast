import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  XCircle,
  Phone,
  MapPin,
  ChefHat,
  Truck,
  User,
  MessageSquare,
} from 'lucide-react';
import { Select } from 'antd';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  MerchantOrderStatus,
  MerchantOrderType,
  MerchantOrderView,
} from '@/service/merchant-order.service';
import { useMerchantOrderStore } from '@/store/merchantOrderStore';
import { useMerchantSocketStore } from '@/store/merchantSocketStore';

type TabValue = MerchantOrderStatus | 'all';
type TypeValue = MerchantOrderType | 'all';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);

const statusMeta: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: {
    label: 'Mới',
    color: 'bg-warning/10 text-warning border-warning',
    icon: Clock,
  },
  confirmed: {
    label: 'Đã xác nhận',
    color: 'bg-primary/10 text-primary border-primary',
    icon: CheckCircle2,
  },
  preparing: {
    label: 'Đang chuẩn bị',
    color: 'bg-accent/10 text-accent border-accent',
    icon: ChefHat,
  },
  ready_for_pickup: {
    label: 'Sẵn sàng lấy',
    color: 'bg-success/10 text-success border-success',
    icon: CheckCircle2,
  },
  driver_assigned: {
    label: 'Đã có tài xế',
    color: 'bg-primary/10 text-primary border-primary',
    icon: Truck,
  },
  driver_arrived: {
    label: 'Tài xế đã tới',
    color: 'bg-primary/10 text-primary border-primary',
    icon: Truck,
  },
  picked_up: {
    label: 'Đã lấy món',
    color: 'bg-primary/10 text-primary border-primary',
    icon: Truck,
  },
  delivering: {
    label: 'Đang giao',
    color: 'bg-primary/10 text-primary border-primary',
    icon: Truck,
  },
  delivered: {
    label: 'Đã giao',
    color: 'bg-success/10 text-success border-success',
    icon: CheckCircle2,
  },
  completed: {
    label: 'Hoàn thành',
    color: 'bg-muted text-muted-foreground border-muted',
    icon: CheckCircle2,
  },
  cancelled: {
    label: 'Đã huỷ',
    color: 'bg-destructive/10 text-destructive border-destructive',
    icon: XCircle,
  },
};

function OrderCard({
  order,
  onAccept,
  onReject,
  onPreparing,
  onReadyForPickup,
  onViewDetail,
}: {
  order: MerchantOrderView;
  onAccept: (order: MerchantOrderView) => void;
  onReject: (order: MerchantOrderView) => void;
  onPreparing: (order: MerchantOrderView) => void;
  onReadyForPickup: (order: MerchantOrderView) => void;
  onViewDetail: (order: MerchantOrderView) => void;
}) {
  const status = statusMeta[order.status] ?? statusMeta.pending;
  const StatusIcon = status.icon;

  return (
    <Card
      className={`h-full cursor-pointer transition-all hover:shadow-card-hover ${order.status === 'pending' ? 'border-warning' : ''
        }`}
      onClick={() => onViewDetail(order)}
    >
      <CardContent className="flex h-full flex-col p-4">
        <div className="mb-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg font-bold">#{order.order_number}</span>
                <Badge variant="outline" className={status.color}>
                  <StatusIcon className="mr-1 h-3 w-3" />
                  {status.label}
                </Badge>
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge variant={order.order_type === 'delivery' ? 'default' : 'secondary'}>
                  {order.order_type === 'delivery' ? (
                    <>
                      <Truck className="mr-1 h-3 w-3" />
                      Giao hàng
                    </>
                  ) : (
                    <>
                      <ChefHat className="mr-1 h-3 w-3" />
                      Tại quán
                    </>
                  )}
                </Badge>

                <span className="text-sm text-muted-foreground">
                  {order.created_at
                    ? new Date(order.created_at).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                    : '--:--'}
                </span>
              </div>
            </div>
          </div>

          <div className="mb-3 space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{order.customer.full_name}</span>
              {order.customer.phone && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <span className="truncate text-muted-foreground">
                    {order.customer.phone}
                  </span>
                </>
              )}
            </div>

            {order.order_type === 'delivery' && order.delivery_address?.address && (
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="line-clamp-2 text-muted-foreground">
                  {order.delivery_address.address}
                </span>
              </div>
            )}

            {order.order_type === 'dine_in' && order.table_session_id && (
              <div className="flex items-center gap-2">
                <ChefHat className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>Table session: {order.table_session_id}</span>
              </div>
            )}
          </div>

          <div className="mb-3 space-y-1">
            {order.items.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 text-sm"
              >
                <span className="min-w-0 flex-1">
                  {item.quantity}x {item.name}
                </span>
                <span className="shrink-0">{formatCurrency(item.item_total)}</span>
              </div>
            ))}

            {order.items.length > 3 && (
              <p className="text-sm text-muted-foreground">
                +{order.items.length - 3} món khác
              </p>
            )}
          </div>

          {order.order_note && (
            <div className="mb-3 flex items-start gap-2 rounded-md bg-muted p-2">
              <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {order.order_note}
              </p>
            </div>
          )}
        </div>

        <div className="flex-1" />

        <div className="mt-auto">
          <div className="flex items-center justify-between border-t pt-3">
            <div />
            <p className="text-lg font-bold">{formatCurrency(order.total_amount)}</p>
          </div>

          <div className="mt-4 flex gap-2" onClick={(e) => e.stopPropagation()}>
            {order.actions.can_reject && (
              <Button
                variant="outline"
                className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => onReject(order)}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Từ chối
              </Button>
            )}

            {order.actions.can_confirm && (
              <Button className="flex-1" onClick={() => onAccept(order)}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Xác nhận
              </Button>
            )}

            {!order.actions.can_confirm &&
              !order.actions.can_reject &&
              order.actions.can_preparing && (
                <Button className="w-full" onClick={() => onPreparing(order)}>
                  <ChefHat className="mr-2 h-4 w-4" />
                  Bắt đầu chuẩn bị
                </Button>
              )}

            {!order.actions.can_confirm &&
              !order.actions.can_reject &&
              !order.actions.can_preparing &&
              order.actions.can_ready_for_pickup && (
                <Button
                  className="w-full bg-success hover:bg-success/90"
                  onClick={() => onReadyForPickup(order)}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Sẵn sàng lấy món
                </Button>
              )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function OrdersPage() {
  const { toast } = useToast();
  const location = useLocation();

  const {
    items,
    loading,
    selectedTab,
    selectedType,
    selectedOrder,
    setTab,
    setType,
    setSelectedOrder,
    fetchOrders,
    fetchOrderDetail,
    confirmOrder,
    rejectOrder,
    preparingOrder,
    readyForPickupOrder,
  } = useMerchantOrderStore();

  const [rejectDialog, setRejectDialog] = useState<MerchantOrderView | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const lastSocketEventAt = useMerchantSocketStore((s) => s.lastEventAt);

  useEffect(() => {
    const routeType: TypeValue | null = location.pathname.endsWith('/orders/delivery')
      ? 'delivery'
      : location.pathname.endsWith('/orders/dine-in')
        ? 'dine_in'
        : null;

    if (!routeType || selectedType === routeType) return;
    setType(routeType);
  }, [location.pathname, selectedType, setType]);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders, selectedTab, selectedType]);
  useEffect(() => {
    if (!lastSocketEventAt) return;

    const t = setTimeout(() => {
      void fetchOrders();

      if (selectedOrder?.id) {
        void fetchOrderDetail(selectedOrder.id);
      }
    }, 200);

    return () => clearTimeout(t);
  }, [lastSocketEventAt, fetchOrders, fetchOrderDetail, selectedOrder?.id]);
  const orderCounts = useMemo(
    () => ({
      pending: items.filter((o) => o.status === 'pending').length,
      confirmed: items.filter((o) => o.status === 'confirmed').length,
      preparing: items.filter((o) => o.status === 'preparing').length,
      ready_for_pickup: items.filter((o) => o.status === 'ready_for_pickup').length,
      completed: items.filter((o) => o.status === 'completed').length,
      cancelled: items.filter((o) => o.status === 'cancelled').length,
    }),
    [items],
  );

  const handleAccept = async (order: MerchantOrderView) => {
    const data = await confirmOrder(order.id);
    if (!data) return;

    await fetchOrders();

    toast({
      title: 'Đã xác nhận đơn hàng',
      description: `Đơn #${data.order_number} đã được xác nhận và bắt đầu tìm tài xế`,
    });
  };
  const handlePreparing = async (order: MerchantOrderView) => {
    const data = await preparingOrder(order.id);
    if (!data) return;

    await fetchOrders();

    toast({
      title: 'Đã chuyển sang chuẩn bị',
      description: `Đơn #${data.order_number} đang được chuẩn bị`,
    });
  };
  const handleReadyForPickup = async (order: MerchantOrderView) => {
    const data = await readyForPickupOrder(order.id);
    if (!data) return;

    await fetchOrders();

    toast({
      title: 'Đơn đã sẵn sàng lấy',
      description: `Đơn #${data.order_number} đã sẵn sàng để tài xế lấy`,
    });
  };

  const confirmReject = async () => {
    if (!rejectDialog) return;

    const data = await rejectOrder(rejectDialog.id, rejectReason.trim());
    if (!data) return;

    toast({
      title: 'Đã từ chối đơn hàng',
      description: `Đơn #${data.order_number} đã bị từ chối`,
      variant: 'destructive',
    });

    setRejectDialog(null);
    setRejectReason('');
  };

  const openDetail = async (order: MerchantOrderView) => {
    setSelectedOrder(order);
    await fetchOrderDetail(order.id);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Đơn hàng</h1>
        <p className="mt-1 text-muted-foreground">
          Quản lý đơn hàng giao hàng và tại quán
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="order-type-filter">Loại đơn</Label>
        <div className="w-full max-w-[280px]">
          <Select
            id="order-type-filter"
            value={selectedType}
            onChange={(value) => setType(value)}
            className="w-full"
            size="large"
            options={[
              { value: 'all', label: 'Tất cả' },
              { value: 'delivery', label: 'Giao hàng' },
              { value: 'dine_in', label: 'Tại quán' },
            ]}
          />
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={(v) => setTab(v as TabValue)}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="pending">
            Mới
            {orderCounts.pending > 0 && (
              <Badge className="ml-2 bg-warning text-warning-foreground">
                {orderCounts.pending}
              </Badge>
            )}
          </TabsTrigger>

          <TabsTrigger value="confirmed">
            Đã xác nhận
            {orderCounts.confirmed > 0 && (
              <Badge variant="secondary" className="ml-2">
                {orderCounts.confirmed}
              </Badge>
            )}
          </TabsTrigger>

          <TabsTrigger value="preparing">
            Đang chuẩn bị
            {orderCounts.preparing > 0 && (
              <Badge variant="secondary" className="ml-2">
                {orderCounts.preparing}
              </Badge>
            )}
          </TabsTrigger>

          <TabsTrigger value="ready_for_pickup">
            Sẵn sàng lấy
            {orderCounts.ready_for_pickup > 0 && (
              <Badge variant="secondary" className="ml-2">
                {orderCounts.ready_for_pickup}
              </Badge>
            )}
          </TabsTrigger>

          <TabsTrigger value="completed">Hoàn thành</TabsTrigger>
          <TabsTrigger value="cancelled">Đã huỷ</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="mt-6">
          {loading ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Đang tải đơn hàng...
              </CardContent>
            </Card>
          ) : items.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ShoppingBag className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-lg font-medium">Không có đơn hàng nào</p>
                <p className="text-muted-foreground">
                  Các đơn hàng mới sẽ hiển thị ở đây
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 lg:grid-cols-3">
              {items.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onAccept={handleAccept}
                  onReject={(o) => setRejectDialog(o)}
                  onPreparing={handlePreparing}
                  onReadyForPickup={handleReadyForPickup}
                  onViewDetail={openDetail}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog
        open={!!rejectDialog}
        onOpenChange={(open) => {
          if (!open) {
            setRejectDialog(null);
            setRejectReason('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Từ chối đơn hàng #{rejectDialog?.order_number}
            </DialogTitle>
            <DialogDescription>
              Vui lòng cho biết lý do từ chối đơn hàng này
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label>Lý do từ chối</Label>
            <Textarea
              placeholder="Nhập lý do từ chối..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialog(null);
                setRejectReason('');
              }}
            >
              Huỷ
            </Button>
            <Button
              variant="destructive"
              onClick={confirmReject}
              disabled={!rejectReason.trim()}
            >
              Xác nhận từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet
        open={!!selectedOrder}
        onOpenChange={(open) => {
          if (!open) setSelectedOrder(null);
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {selectedOrder && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  #{selectedOrder.order_number}
                  <Badge
                    variant="outline"
                    className={(statusMeta[selectedOrder.status] ?? statusMeta.pending).color}
                  >
                    {(statusMeta[selectedOrder.status] ?? statusMeta.pending).label}
                  </Badge>
                </SheetTitle>
                <SheetDescription>
                  {selectedOrder.created_at
                    ? new Date(selectedOrder.created_at).toLocaleString('vi-VN')
                    : '--'}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <div className="space-y-3">
                  <h4 className="font-medium">Thông tin khách hàng</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {selectedOrder.customer.full_name}
                    </div>
                    {selectedOrder.customer.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {selectedOrder.customer.phone}
                      </div>
                    )}
                    {selectedOrder.delivery_address?.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {selectedOrder.delivery_address.address}
                      </div>
                    )}
                  </div>
                </div>

                {selectedOrder.driver && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="font-medium">Tài xế</h4>
                      <div className="rounded-lg bg-muted p-3 text-sm">
                        <div>{selectedOrder.driver.full_name}</div>
                        <div className="text-muted-foreground">
                          {selectedOrder.driver.phone ?? '—'}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-medium">Chi tiết đơn hàng</h4>
                  <div className="space-y-3">
                    {selectedOrder.items.map((item) => (
                      <div key={item.id} className="space-y-1">
                        <div className="flex justify-between gap-3">
                          <span className="font-medium">
                            {item.quantity}x {item.name}
                          </span>
                          <span>{formatCurrency(item.item_total)}</span>
                        </div>

                        {item.selected_options.length > 0 && (
                          <p className="pl-4 text-sm text-muted-foreground">
                            {item.selected_options
                              .map((o) => `${o.option_name}: ${o.choice_name}`)
                              .join(', ')}
                          </p>
                        )}

                        {item.selected_toppings.length > 0 && (
                          <p className="pl-4 text-sm text-muted-foreground">
                            +{' '}
                            {item.selected_toppings
                              .map(
                                (t) =>
                                  `${t.topping_name} x${t.quantity} (+${formatCurrency(
                                    t.unit_price,
                                  )})`,
                              )
                              .join(', ')}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tạm tính</span>
                    <span>{formatCurrency(selectedOrder.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Phí giao</span>
                    <span>{formatCurrency(selectedOrder.delivery_fee)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 text-lg font-bold">
                    <span>Tổng cộng</span>
                    <span>{formatCurrency(selectedOrder.total_amount)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
