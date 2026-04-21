/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useMemo, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  Store,
  Car,
  Users,
  Gift,
  Settings,
  Brain,
  ClipboardList,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Bell,
  Search,
  LogOut,
  Loader2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

import { useAdminAuth } from "@/store/authStore";
import { adminSearchService, type AdminSearchTopResult } from "@/service/adminSearch.service";
import { toast } from "sonner";

interface NavItem {
  title: string;
  href?: string;
  icon: React.ElementType;
  children?: { title: string; href: string }[];
}

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    title: "Orders Monitor",
    icon: ShoppingCart,
    children: [
      { title: "Đơn giao hàng", href: "/orders/delivery" },
      { title: "Đơn tại quán", href: "/orders/dine-in" },
    ],
  },
  {
    title: " Quản lý Merchant",
    icon: Store,
    children: [
      { title: "Danh sách Merchant", href: "/merchants" },
      { title: "Duyệt Merchant", href: "/merchants/pending" },
    ],
  },
  {
    title: "Quản lý tài xế",
    icon: Car,
    children: [
      { title: "Danh sách Tài xế", href: "/drivers" },
      { title: "Duyệt Tài xế", href: "/drivers/pending" },
    ],
  },
  { title: "Người dùng", href: "/users", icon: Users },
  {
    title: "Promotions",
    icon: Gift,
    children: [
      { title: "Khuyến mãi", href: "/promotions/platform-promotions" },
      { title: "Mã giảm giá", href: "/promotions/platform-vouchers" },
    ],
  },
  {
    title: "System Config",
    icon: Settings,
    children: [
      { title: "Delivery Fee", href: "/config/delivery-fee" },
      { title: "Commission", href: "/config/commission" },
      { title: "Quản lý Carousel", href: "/config/carousel" },
    ],
  },
  // {
  //   title: "AI & Search Ops",
  //   icon: Brain,
  //   children: [
  //     { title: "Recommendation Health", href: "/ai/recommendations" },
  //     { title: "Search Analytics", href: "/ai/search" },
  //   ],
  // },
  // { title: "Audit Logs", href: "/audit-logs", icon: ClipboardList },
  // { title: "System Events", href: "/system-events", icon: AlertTriangle },
];

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([
    "Orders Monitor",
    "Quản lý Merchant",
    "Quản lý tài xế",
    "Promotions",
  ]);

  const location = useLocation();
  const navigate = useNavigate();

  const { user, logout } = useAdminAuth();
  const [headerSearch, setHeaderSearch] = useState("");
  const [isSearchingHeader, setIsSearchingHeader] = useState(false);

  const toggleExpanded = (title: string) => {
    setExpandedItems((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  const isMatch = (pathname: string, href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const getActiveChildHref = (pathname: string, children: { href: string }[]) => {
    const matched = children.filter((c) => isMatch(pathname, c.href));
    if (matched.length === 0) return null;
    return matched.reduce((best, cur) => (cur.href.length > best.href.length ? cur : best)).href;
  };

  const adminView = useMemo(() => {
    const email = user?.email ?? "";
    return {
      name: user?.email?.split("@")[0] ?? "Admin",
      avatar: "",
      email,
    };
  }, [user]);

  const onLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const navigateBySearchResult = useCallback(
    (result: AdminSearchTopResult) => {
      if (!result) return;

      if (result.type === "order") {
        const nextPath = result.order_type === "dine_in" ? "/orders/dine-in" : "/orders/delivery";
        navigate(`${nextPath}?highlight=${result.id}`);
        return;
      }

      if (result.type === "merchant") {
        navigate(`/merchants/${result.id}`);
        return;
      }

      if (result.type === "driver") {
        navigate(`/drivers/${result.user_id}`);
      }
    },
    [navigate]
  );

  const handleHeaderSearch = useCallback(async () => {
    const keyword = headerSearch.trim();
    if (!keyword || isSearchingHeader) return;

    setIsSearchingHeader(true);
    try {
      const data = await adminSearchService.searchGlobal(keyword, 5);

      if (!data?.top_result) {
        toast("Không tìm thấy driver, merchant hoặc đơn hàng phù hợp");
        return;
      }

      navigateBySearchResult(data.top_result);
    } catch (e: any) {
      toast.error(e?.message ?? "Không thể tìm kiếm lúc này");
    } finally {
      setIsSearchingHeader(false);
    }
  }, [headerSearch, isSearchingHeader, navigateBySearchResult]);

  const renderNavItem = (item: NavItem) => {
    const hasChildren = !!item.children?.length;
    const expanded = expandedItems.includes(item.title);

    const activeChildHref = hasChildren ? getActiveChildHref(location.pathname, item.children!) : null;
    const active = item.href ? isMatch(location.pathname, item.href) : !!activeChildHref;

    if (hasChildren) {
      return (
        <div key={item.title}>
          <button
            type="button"
            onClick={() => toggleExpanded(item.title)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            )}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {sidebarOpen && (
              <>
                <span className="flex-1 text-left">{item.title}</span>
                {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </>
            )}
          </button>

          {sidebarOpen && expanded && (
            <div className="ml-5 mt-1 space-y-1 border-l border-sidebar-border pl-3">
              {item.children!.map((child) => {
                const childActive = child.href === activeChildHref;
                return (
                  <Link
                    key={child.href}
                    to={child.href}
                    className={cn(
                      "block px-3 py-2 rounded-lg text-sm transition-colors",
                      childActive
                        ? "bg-primary text-primary-foreground font-medium"
                        : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    )}
                  >
                    {child.title}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.href}
        to={item.href!}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
          active
            ? "bg-primary text-primary-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        )}
      >
        <item.icon className="h-5 w-5 shrink-0" />
        {sidebarOpen && <span>{item.title}</span>}
      </Link>
    );
  };

  return (
    <div className="min-h-screen flex w-full">
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar transition-all duration-300",
          sidebarOpen ? "w-64" : "w-16",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex items-center gap-3 h-16 px-4 border-b border-sidebar-border shrink-0">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
            <span className="text-white font-bold text-sm">F</span>
          </div>
          {sidebarOpen && (
            <div>
              <h1 className="font-bold text-sidebar-foreground">FaB-O2O</h1>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">{navItems.map(renderNavItem)}</nav>

        <div className="p-3 border-t border-sidebar-border">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
          >
            <Menu className="h-5 w-5" />
            {sidebarOpen && <span className="text-sm">Thu gọn</span>}
          </button>
        </div>
      </aside>

      <div className={cn("flex-1 flex flex-col transition-all duration-300", sidebarOpen ? "lg:ml-64" : "lg:ml-16")}>
        <header className="sticky top-0 z-30 h-16 bg-card border-b flex items-center gap-4 px-4 lg:px-6">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-muted"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div className="hidden md:flex flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm order, merchant, driver..."
                className="pl-10 pr-10 bg-muted/50 border-0"
                value={headerSearch}
                onChange={(e) => setHeaderSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleHeaderSearch();
                  }
                }}
              />
              <button
                type="button"
                onClick={() => void handleHeaderSearch()}
                disabled={isSearchingHeader}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-muted text-muted-foreground disabled:opacity-60"
              >
                {isSearchingHeader ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex-1 md:hidden" />

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                3
              </Badge>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={adminView.avatar} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {adminView.name?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium">{adminView.name}</p>
                  </div>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Tài khoản</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={onLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Đăng xuất
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
