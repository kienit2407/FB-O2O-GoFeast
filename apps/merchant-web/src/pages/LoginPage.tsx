/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMerchantAuth } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChefHat, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { login, accessToken, onboarding, bootstrap, fetchOnboarding } = useMerchantAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Nếu đã có token thì bootstrap lấy user/onboarding và điều hướng phù hợp
  useEffect(() => {
    const run = async () => {
      if (!accessToken) return;

      try {
        await bootstrap();

        // Fetch onboarding mới từ API sau khi login
        try {
          await fetchOnboarding();
        } catch (e) {
          // Nếu fetchOnboarding lỗi (401), vẫn tiếp tục với onboarding từ bootstrap
          console.warn('fetchOnboarding failed, using bootstrap onboarding:', e);
        }

        const status = onboarding?.merchant_approval_status;
        const step = onboarding?.current_step;

        if (status === 'approved') {
          navigate('/app/dashboard', { replace: true });
          return;
        }

        // yêu cầu của bạn: pending thì về landing "/"
        if (status === 'pending_approval' || step === 'waiting_approval') {
          navigate('/', { replace: true });
          return;
        }

        // còn lại -> tiếp tục đăng ký
        navigate('/merchant/register', { replace: true });
      } catch {
        // ignore
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, password);

      toast({
        title: 'Đăng nhập thành công',
        description: 'Chào mừng bạn!',
      });

      // Fetch onboarding mới từ API sau khi login
      let currentOnboarding;
      try {
        currentOnboarding = await fetchOnboarding();
      } catch (e) {
        // Nếu fetchOnboarding lỗi, dùng onboarding từ login response
        console.warn('fetchOnboarding failed after login:', e);
        currentOnboarding = useMerchantAuth.getState().onboarding;
      }

      const status = currentOnboarding?.merchant_approval_status;
      const step = currentOnboarding?.current_step;

      if (status === 'approved') {
        navigate('/app/dashboard', { replace: true });
        return;
      }

      // pending => về landing "/"
      if (status === 'pending_approval' || step === 'waiting_approval') {
        navigate('/', { replace: true });
        return;
      }

      navigate('/merchant/register', { replace: true });
    } catch (error: any) {
      console.error('[LoginPage] Login error:', error);
      toast({
        title: 'Đăng nhập thất bại',
        description: error?.response?.data?.message || error?.message || 'Email hoặc mật khẩu không đúng',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-orange-500 to-orange-600 items-center justify-center p-12">
        <div className="max-w-md text-center text-white">
          <Link to="/" className="inline-flex items-center gap-2 mb-8">
            <img src="/icon_brand.png" alt="FaB-O2O Logo" className="w-10 h-10" />
            <span className="text-2xl font-bold">Go Feast</span>
          </Link>
          <h1 className="text-4xl font-bold mb-4">Quản lý cửa hàng thông minh</h1>
          <p className="text-orange-100 text-lg">
            Kết nối với hàng triệu khách hàng, theo dõi đơn hàng và tăng doanh thu
          </p>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <Card className="w-full max-w-md border-0 shadow-lg">
          <CardHeader className="text-center pb-2">
            <Link to="/" className="lg:hidden flex items-center justify-center gap-2 mb-4">
              <img src="/icon_brand.png" alt="FaB-O2O Logo" className="w-10 h-10" />
              <span className="text-xl font-bold">Go Feast</span>
            </Link>
            <CardTitle className="text-2xl">Đăng nhập</CardTitle>
            <CardDescription>Nhập thông tin để tiếp tục</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Mật khẩu</Label>
                  <Link to="/forgot-password" className="text-sm text-orange-500 hover:text-orange-600">
                    Quên mật khẩu?
                  </Link>
                </div>

                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'password' : 'text'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang đăng nhập...
                  </>
                ) : (
                  'Đăng nhập'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-600">
                Chưa có tài khoản?{' '}
                <Link to="/merchant/register" className="text-orange-500 hover:text-orange-600 font-medium">
                  Đăng ký ngay
                </Link>
              </p>
            </div>

            <div className="mt-6 pt-6 border-t">
              <Link to="/" className="flex items-center justify-center gap-2 text-gray-500 hover:text-gray-700">
                <ArrowLeft className="w-4 h-4" />
                Quay lại trang chủ
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
