import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useAdminAuth } from "@/store/authStore";
import { AdminLayout } from "@/components/layout/AdminLayout";
import Dashboard from "./pages/Dashboard";
import OrdersDeliveryMonitor from "./pages/OrdersDeliveryMonitor";
import OrdersDineInMonitor from "./pages/OrdersDineInMonitor";
import MerchantList from "./pages/MerchantList";
import MerchantPending from "./pages/MerchantPending";
import DriverList from "./pages/DriverList";
import DriverPending from "./pages/DriverPending";
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";
import MerchantDetail from "./pages/MerchantDetail";
import DriverDetail from "./pages/DriverDetail";
import UsersPage from "./pages/UsersPage";
import PlatformPromotions from "./pages/PlatformPromotions";
import PlatformVouchers from "./pages/PlatformVouchers";
import CommissionConfig from "./pages/CommissionConfig";

const queryClient = new QueryClient();

function FullscreenSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800" />
    </div>
  );
}

/**
 * AdminAuthGuard
 * - Nếu chưa login -> về /login
 * - Nếu đã login -> cho vào
 */


function AdminAuthGuard() {
  const { accessToken, bootstrap, isBootstrapping, _isHydrated } = useAdminAuth();
  const [checked, setChecked] = useState(false);
  const bootstrapCalled = useRef(false);

  useEffect(() => {
    if (!_isHydrated || bootstrapCalled.current) return;
    bootstrapCalled.current = true;
    bootstrap().finally(() => setChecked(true));
  }, [_isHydrated, bootstrap]);

  if (!_isHydrated || isBootstrapping || !checked) return <FullscreenSpinner />;
  if (!accessToken) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function GuestGuard() {
  const { accessToken, bootstrap, isBootstrapping, _isHydrated } = useAdminAuth();
  const [checked, setChecked] = useState(false);
  const bootstrapCalled = useRef(false);

  useEffect(() => {
    if (!_isHydrated || bootstrapCalled.current) return;
    bootstrapCalled.current = true;
    bootstrap().finally(() => setChecked(true));
  }, [_isHydrated, bootstrap]);

  if (!_isHydrated || isBootstrapping || !checked) return <FullscreenSpinner />;
  if (accessToken) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}


const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public routes - chỉ dành cho guest */}
          <Route element={<GuestGuard />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>

          {/* Protected routes - yêu cầu login */}
          <Route element={<AdminAuthGuard />}>
            <Route element={<AdminLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/orders/food" element={<Navigate to="/orders/delivery" replace />} />
              <Route path="/orders/delivery" element={<OrdersDeliveryMonitor />} />
              <Route path="/orders/dine-in" element={<OrdersDineInMonitor />} />
              <Route path="/merchants" element={<MerchantList />} />
              <Route path="/merchants/pending" element={<MerchantPending />} />
              <Route path="/merchants/:id" element={<MerchantDetail />} />
              <Route path="/drivers" element={<DriverList />} />
              <Route path="/drivers/pending" element={<DriverPending />} />
              <Route path="/drivers/:userId" element={<DriverDetail />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/promotions/platform-promotions" element={<PlatformPromotions />} />
              <Route path="/promotions/platform-vouchers" element={<PlatformVouchers />} />

              {/* Placeholder routes */}
              <Route path="/users" element={<ComingSoon title="Users" />} />
              <Route path="/promotions/*" element={<ComingSoon title="Promotions" />} />
              <Route path="/brands" element={<ComingSoon title="Brands" />} />
              <Route path="/config/*" element={<ComingSoon title="System Config" />} />
              <Route path="/config/commission" element={<CommissionConfig />} />
              <Route path="/ai/*" element={<ComingSoon title="AI & Search Ops" />} />
              <Route path="/audit-logs" element={<ComingSoon title="Audit Logs" />} />
              <Route path="/system-events" element={<ComingSoon title="System Events" />} />
              <Route path="/admin/*" element={<ComingSoon title="Admin Management" />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

// Simple coming soon placeholder
function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
      <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mb-6">
        <span className="text-3xl">🚧</span>
      </div>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-muted-foreground mt-2">Tính năng đang được phát triển</p>
    </div>
  );
}

export default App;
