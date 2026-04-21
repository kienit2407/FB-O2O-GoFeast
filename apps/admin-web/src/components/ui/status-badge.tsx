import { cn } from '@/lib/utils';

type StatusType = 
  | 'pending' | 'approved' | 'rejected' | 'blocked'
  | 'active' | 'inactive' | 'expired'
  | 'completed' | 'cancelled' | 'preparing' | 'delivering' | 'confirmed'
  | 'ready_for_pickup' | 'driver_assigned' | 'driver_arrived' | 'picked_up' | 'delivered'
  | 'searching' | 'on_trip' | 'placed' | 'served' | 'paid'
  | 'accepted' | 'open' | 'acknowledged' | 'resolved'
  | 'scheduled' | 'ended';

interface StatusBadgeProps {
  status: StatusType | string;
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  // General
  pending: { label: 'Chờ duyệt', className: 'status-pending' },
  approved: { label: 'Đã duyệt', className: 'status-approved' },
  rejected: { label: 'Từ chối', className: 'status-rejected' },
  blocked: { label: 'Đã khóa', className: 'status-blocked' },
  active: { label: 'Hoạt động', className: 'status-active' },
  inactive: { label: 'Tạm ngưng', className: 'status-blocked' },
  expired: { label: 'Hết hạn', className: 'status-blocked' },
  
  // Orders - Food
  accepted: { label: 'Đã xác nhận', className: 'status-processing' },
  confirmed: { label: 'Đã xác nhận', className: 'status-processing' },
  preparing: { label: 'Đang chuẩn bị', className: 'status-processing' },
  ready_for_pickup: { label: 'Sẵn sàng lấy món', className: 'status-processing' },
  driver_assigned: { label: 'Đã có tài xế', className: 'status-processing' },
  driver_arrived: { label: 'Tài xế đã tới', className: 'status-processing' },
  picked_up: { label: 'Đã lấy hàng', className: 'status-processing' },
  delivering: { label: 'Đang giao', className: 'status-processing' },
  delivered: { label: 'Đã giao', className: 'status-processing' },
  completed: { label: 'Hoàn thành', className: 'status-completed' },
  cancelled: { label: 'Đã hủy', className: 'status-cancelled' },
  
  // Orders - Ride
  searching: { label: 'Đang tìm tài xế', className: 'status-pending' },
  on_trip: { label: 'Đang di chuyển', className: 'status-processing' },
  
  // Orders - Dine-in
  placed: { label: 'Đã đặt', className: 'status-pending' },
  served: { label: 'Đã phục vụ', className: 'status-processing' },
  paid: { label: 'Đã thanh toán', className: 'status-completed' },
  
  // Events
  open: { label: 'Mới', className: 'status-pending' },
  acknowledged: { label: 'Đã xác nhận', className: 'status-processing' },
  resolved: { label: 'Đã xử lý', className: 'status-completed' },
  
  // Campaigns
  scheduled: { label: 'Đã lên lịch', className: 'status-pending' },
  ended: { label: 'Kết thúc', className: 'status-blocked' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, className: 'status-pending' };
  
  return (
    <span className={cn('status-badge', config.className, className)}>
      {config.label}
    </span>
  );
}
