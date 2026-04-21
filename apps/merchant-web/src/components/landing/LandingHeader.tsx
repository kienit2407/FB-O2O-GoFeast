import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useMerchantAuth } from '@/store/authStore';
import { LogOut, ClipboardList, BarChart3, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@radix-ui/react-avatar';

interface LandingHeaderProps {
  children?: React.ReactNode;
}
const getInitials = (name?: string) => {
  if (!name) return "U";
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
};
export function LandingHeader({ children }: LandingHeaderProps) {
  const navigate = useNavigate();
  const { user, logout, bootstrap, accessToken, onboarding, fetchOnboarding, merchant } = useMerchantAuth();
  const [hydrated, setHydrated] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    setHydrated(true);
  }, []);

  // Bootstrap và fetch onboarding khi có accessToken
  useEffect(() => {
    const initAuth = async () => {
      if (!hydrated || isLoggingOut) return;

      if (!accessToken) {
        setIsInitializing(false);
        return;
      }

      try {
        await bootstrap();
        try {
          await fetchOnboarding();
        } catch (e) {
          console.warn('fetchOnboarding failed in init:', e);
        }
      } catch (e) {
        console.error('Bootstrap failed:', e);
      } finally {
        setIsInitializing(false);
      }
    };

    initAuth();
  }, [hydrated, accessToken, isLoggingOut, bootstrap, fetchOnboarding]);

  // Redirect theo rule
  // 

  if (!hydrated || isInitializing) {
    return (
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/">
              <img src="/icon_app.png" alt="Go Feast Logo" className="w-10 h-10" />
            </Link>
            <Link to="/">
              <span className="text-xl font-bold text-gray-900">Merchant Management</span>
            </Link>
          </div>
          <Button variant="ghost" disabled>...</Button>
        </div>
      </header>
    );
  }

  const hasOnboarding = onboarding?.has_onboarding === true;
  const displayName = user?.full_name || user?.name || user?.email || 'User';
  const status = onboarding?.merchant_approval_status;
  const step = onboarding?.current_step;

  const isApproved = status === "approved";
  const isPending = status === "pending_approval" || step === "waiting_approval";
  const isRejected = status === "rejected";
  const isInProgress = hasOnboarding && !isApproved && !isPending && !isRejected;

  const mainCta = isRejected ? "Hồ sơ bị từ chối"
    : isPending ? "Đang chờ duyệt"
      : isInProgress ? "Tiếp tục đăng ký"
        : isApproved ? "Dashboard"
          : "Trở thành đối tác";

  const mainHref = isApproved ? "/app/dashboard"
    : (isPending || isRejected) ? "/merchant/status"
      : "/merchant/register";

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setShowDropdown(false);
    await logout();
    setIsLoggingOut(false);
    navigate('/');
  };

  return (
    <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to="/">
            <img src="/icon_app.png" alt="Go Feast Logo" className="w-10 h-10" />
          </Link>
          <Link to="/">
            <span className="text-xl font-bold text-gray-900">Merchant Management</span>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          {/* Nếu chưa đăng nhập */}
          {!user && (
            <>
              <Link to="/login">
                <Button variant="ghost">Đăng nhập</Button>
              </Link>
              <Link to={mainHref}>
                <Button className="bg-orange-500 hover:bg-orange-600">
                  {mainCta}
                </Button>
              </Link>
            </>
          )}

          {/* Nếu đã đăng nhập - hiển thị dropdown */}
          {user && (
            <>
              <Link to={mainHref}>
                <Button className="bg-orange-500 hover:bg-orange-600">
                  {mainCta}
                </Button>
              </Link>

              <DropdownMenu open={showDropdown} onOpenChange={setShowDropdown}>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors group">
                    {/* Thêm dấu ? sau merchant */}
                    {merchant?.logo_url ? (
                      <img
                        src={merchant.logo_url}
                        alt={displayName}
                        className="w-8 h-8 rounded-full object-cover border border-gray-100"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                        <span className="text-orange-500 font-bold text-sm">
                          {/* Thêm dấu ? và dự phòng thêm email từ user nếu merchant null */}
                          {getInitials(merchant?.email || user?.email)}
                        </span>
                      </div>
                    )}

                    {/* Thêm dấu ? ở đây nữa */}
                    <span className="text-sm font-medium text-gray-700">{merchant?.email || user?.email}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {isApproved && (
                    <DropdownMenuItem onClick={() => navigate('/app/dashboard')}>
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Dashboard
                    </DropdownMenuItem>
                  )}

                  {(isPending || isRejected) && (
                    <DropdownMenuItem onClick={() => navigate('/merchant/status')}>
                      <ClipboardList className="w-4 h-4 mr-2" />
                      {isRejected ? 'Xem lý do từ chối' : 'Trạng thái duyệt'}
                    </DropdownMenuItem>
                  )}

                  {isInProgress && (
                    <DropdownMenuItem onClick={() => navigate('/merchant/register')}>
                      <ClipboardList className="w-4 h-4 mr-2" />
                      Tiếp tục đăng ký
                    </DropdownMenuItem>
                  )}

                  {!isApproved && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                        <LogOut className="w-4 h-4 mr-2" />
                        Đăng xuất
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>

      {/* Content children nếu có */}
      {children}
    </header>
  );
}
