import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  Tag,
  BarChart3,
  Settings,
  FileText,
  ChefHat,
  Utensils,
  ListOrdered,
  Layers,
  Armchair,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronRight } from 'lucide-react';
import { useMerchantAuth } from '@/store/authStore';

const APP_BASE = '/app';
const appPath = (p: string) => `${APP_BASE}${p.startsWith('/') ? p : `/${p}`}`;

const menuItems = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    path: appPath('/dashboard'),
    permission: 'all',
  },
  {
    title: 'Đơn hàng',
    icon: ShoppingBag,
    permission: 'orders',
    children: [
      { title: 'Giao hàng', path: appPath('/orders/delivery'), icon: ShoppingBag },
      { title: 'Tại quán', path: appPath('/orders/dine-in'), icon: Utensils },
      { title: 'Quản lý bàn', path: appPath('/dine-in/tables'), icon: Armchair },
    ],
  },
  {
    title: 'Thực đơn',
    icon: UtensilsCrossed,
    permission: 'menu',
    children: [
      { title: 'Danh mục', path: appPath('/menu/categories'), icon: Layers },
      { title: 'Sản phẩm', path: appPath('/menu/products'), icon: ChefHat },
      { title: 'Topping', path: appPath('/menu/toppings'), icon: ListOrdered },
    ],
  },
  {
    title: 'Khuyến mãi',
    icon: Tag,
    path: appPath('/promotions'),
    permission: 'promotions',
    children: [
      { title: 'Promotion', path: appPath('/promotions/promotion') },
      { title: 'Voucher', path: appPath('/promotions/voucher') },
    ],
  },
  {
    title: 'Báo cáo',
    icon: BarChart3,
    permission: 'reports',
    children: [
      { title: 'Doanh thu', path: appPath('/reports/revenue') },
      { title: 'Bán chạy', path: appPath('/reports/best-sellers') },
      { title: 'Đánh giá', path: appPath('/reports/reviews') },
    ],
  },
  {
    title: 'Cài đặt',
    icon: Settings,
    path: appPath('/settings'),
    permission: 'settings',
  },
 
];

export function AppSidebar() {
  const location = useLocation();
  const { user } = useMerchantAuth();

  // active: match exact OR any nested path (ví dụ /app/reports/reviews/123)
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const isParentActive = (children: { path: string }[]) =>
    children.some((child) => location.pathname === child.path || location.pathname.startsWith(child.path + '/'));

  return (
    <Sidebar className="border-r-0">
      <SidebarHeader className="h-16 flex items-center px-6 sidebar-gradient border-b border-sidebar-border">
        <Link to={appPath('/dashboard')} className="flex items-center gap-3">
          <img src="/icon_app.png" alt="FaB-O2O Logo" className="w-10 h-10" />
          <div>
            <h1 className="font-semibold text-lg text-sidebar-foreground">Go Feast</h1>
            <p className="text-xs text-sidebar-muted">Merchant Portal</p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="sidebar-gradient">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-muted px-3 text-xs uppercase tracking-wider">
            Menu chính
          </SidebarGroupLabel>

          <SidebarMenu>
            {menuItems.map((item) => {
              if (item.children) {
                return (
                  <Collapsible
                    key={item.title}
                    defaultOpen={isParentActive(item.children)}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          className={cn(
                            'w-full hover:bg-sidebar-accent',
                            isParentActive(item.children) && 'bg-sidebar-accent text-sidebar-primary'
                          )}
                        >
                          <item.icon className="w-5 h-5" />
                          <span>{item.title}</span>
                          <ChevronRight className="ml-auto w-4 h-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.children.map((child) => (
                            <SidebarMenuSubItem key={child.path}>
                              <SidebarMenuSubButton asChild isActive={isActive(child.path)}>
                                <Link to={child.path}>
                                  {child.icon && <child.icon className="w-4 h-4" />}
                                  <span>{child.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              }

              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.path!)}
                    className="hover:bg-sidebar-accent"
                  >
                    <Link to={item.path!}>
                      <item.icon className="w-5 h-5" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
