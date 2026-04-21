/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/AppHeader.tsx
import { Bell, ChevronDown, LogOut, Search, Settings, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useNavigate } from 'react-router-dom';
import { useMerchantAuth } from '@/store/authStore';
import { useToast } from '@/hooks/use-toast';
import { useMerchantActions } from '@/store/merchantStore';
import { Switch } from '@/components/ui/switch';
import { useMerchantSocketStore } from '@/store/merchantSocketStore';

const roleMeta: Record<string, { label: string; cls: string }> = {
  OWNER: { label: 'Chủ quán', cls: 'bg-primary text-primary-foreground' },
  MERCHANT: { label: 'Chủ quán', cls: 'bg-primary text-primary-foreground' },
  ADMIN: { label: 'Admin', cls: 'bg-destructive text-destructive-foreground' },
  MANAGER: { label: 'Quản lý', cls: 'bg-accent text-accent-foreground' },
  STAFF: { label: 'Nhân viên', cls: 'bg-muted text-muted-foreground' },
  DRIVER: { label: 'Tài xế', cls: 'bg-accent text-accent-foreground' },
  CUSTOMER: { label: 'Khách', cls: 'bg-muted text-muted-foreground' },
};

const missingLabel: Record<string, string> = {
  approval_status: 'Trạng thái duyệt',
  name: 'Tên quán',
  phone: 'Hotline',
  category: 'Danh mục',
  address: 'Địa chỉ',
  location: 'Tọa độ (pin/GPS)',
  business_hours: 'Giờ hoạt động',
  average_prep_time_min: 'Thời gian chuẩn bị',
  delivery_radius_km: 'Bán kính giao hàng',
  menu: 'Thực đơn',
};

export function AppHeader() {
  const { user, logout, merchant } = useMerchantAuth();
  const navigate = useNavigate();
  const { updateMe } = useMerchantActions();
  const { toast } = useToast();
  const notifications = useMerchantSocketStore((s) => s.notifications);
  const unreadCount = useMerchantSocketStore((s) =>
    s.notifications.filter((x) => !x.read).length,
  );
  const markRead = useMerchantSocketStore((s) => s.markRead);
  const markAllAsRead = useMerchantSocketStore((s) => s.markAllAsRead);
  const getInitials = (name: string = '') =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  const userName = user?.email?.split('@')[0] || 'User';
  const roleKey = (user?.role || 'STAFF').toUpperCase();
  const role = roleMeta[roleKey] || roleMeta.STAFF;

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast({ title: 'Đăng xuất thành công' });
  };

  const isAccepting = Boolean(merchant?.is_accepting_orders);

  const toggleAccepting = async (v: boolean) => {
    try {
      await updateMe({ is_accepting_orders: v });
      toast({ title: v ? 'Đã mở bán' : 'Đã tạm đóng' });
    } catch (e: any) {
      const data = e?.response?.data;
      const missing = data?.missing_fields ?? data?.missing ?? data?.message?.missing_fields ?? data?.message?.missing;
      console.log('updateMe error:', missing);
      if (Array.isArray(missing) && missing.length) {
        const nice = missing.map((k: string) => missingLabel[k] || k).join(', ');
        toast({
          title: 'Không thể mở bán',
          description: `Bạn còn thiếu: ${nice}`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Cập nhật thất bại',
          description: e?.response?.data?.message || e?.message || 'Có lỗi xảy ra',
          variant: 'destructive',
        });
      }
    }
  };

  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-4 gap-4">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="-ml-1" />

        <div className="flex items-center gap-4 px-3 py-1.5 bg-muted rounded-lg">
          <Switch checked={isAccepting} onCheckedChange={toggleAccepting} />
          <span className={`w-2 h-2 rounded-full ${isAccepting ? 'bg-success' : 'bg-muted-foreground'}`} />
          <span className="text-sm font-medium">{merchant?.address ?? '---'}</span>
          <span className="text-xs">{isAccepting ? 'Đang nhận đơn' : 'Tạm đóng'}</span>
        </div>
      </div>


      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-[360px] p-0">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <span className="font-semibold text-sm">Thông báo</span>
              {notifications.length > 0 && unreadCount > 0 && (
                <button
                  className="text-xs text-primary hover:underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    markAllAsRead();
                  }}
                >
                  Đánh dấu đã đọc hết
                </button>
              )}
            </div>

            <div className="max-h-[360px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Chưa có thông báo nào
                </div>
              ) : (
                notifications.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`w-full text-left px-4 py-3 border-b hover:bg-muted/40 ${!item.read ? 'bg-muted/20' : ''
                      }`}
                    onClick={() => {
                      markRead(item.id);

                      if (item.type === 'review_received') {
                        navigate('/reviews');
                        return;
                      }

                      navigate('/orders');
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <Bell className="w-4 h-4 text-muted-foreground" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold line-clamp-1">
                            {item.title}
                          </p>
                          {!item.read && (
                            <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {item.message}
                        </p>

                        <p className="text-[11px] text-muted-foreground mt-1">
                          {new Date(item.createdAt).toLocaleString('vi-VN')}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 pl-2 pr-3">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {getInitials(userName)}
                </AvatarFallback>
              </Avatar>

              <div className="hidden md:flex flex-col items-start">
                <span className="text-sm font-medium">{userName}</span>
                <Badge variant="secondary" className={`${role.cls} text-xs py-0`}>
                  {role.label}
                </Badge>
              </div>

              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{user?.name}</span>
                <span className="text-xs font-normal text-muted-foreground">{user?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings className="w-4 h-4 mr-2" />
              Cài đặt
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/profile')}>
              <User className="w-4 h-4 mr-2" />
              Hồ sơ
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}