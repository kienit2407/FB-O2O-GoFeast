import OrdersMonitor from './OrdersMonitor';

export default function OrdersDeliveryMonitor() {
  return (
    <OrdersMonitor
      orderType="delivery"
      title="Giám sát đơn giao hàng"
      description="Theo dõi realtime đơn delivery toàn hệ thống"
    />
  );
}
