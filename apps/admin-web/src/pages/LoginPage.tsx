/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAdminAuth } from '@/store/authStore';
import { adminAuthService } from '@/service/adminAuth.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { login, accessToken, user, bootstrap } = useAdminAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Nếu đã login thì vào dashboard
  useEffect(() => {
    if (accessToken) {
      navigate('/dashboard', { replace: true });
    }
  }, [accessToken, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isRegisterMode) {
        // Validate passwords match
        if (password !== confirmPassword) {
          toast({
            title: 'Lỗi',
            description: 'Mật khẩu không khớp',
            variant: 'destructive',
          });
          return;
        }

        if (password.length < 6) {
          toast({
            title: 'Lỗi',
            description: 'Mật khẩu phải có ít nhất 6 ký tự',
            variant: 'destructive',
          });
          return;
        }

        // Gọi API register - admin registration is direct (no approval needed)
        await adminAuthService.register({ email, password });
        toast({
          title: 'Đăng ký thành công',
          description: 'Vui lòng đăng nhập',
        });

        // Chuyển sang mode login
        setIsRegisterMode(false);
        setConfirmPassword('');
        return;
      }

      // Login
      await login(email, password);

      toast({
        title: 'Đăng nhập thành công',
        description: 'Chào mừng bạn trở lại!',
      });

      // Redirect trực tiếp sau khi login xong
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      console.error('[LoginPage] Error:', error);
      toast({
        title: isRegisterMode ? 'Đăng ký thất bại' : 'Đăng nhập thất bại',
        description: error?.response?.data?.message || error?.message || 'Có lỗi xảy ra',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-800 to-slate-900 items-center justify-center p-12">
        <div className="max-w-md text-center text-white">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl mb-8">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-bold mb-4">Super Admin</h1>
          <p className="text-slate-300 text-lg">
            Hệ thống quản trị FaB-O2O
          </p>
        </div>
      </div>

      {/* Right side - Login/Register form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <Card className="w-full max-w-md border-0 shadow-lg">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">
              {isRegisterMode ? 'Đăng ký tài khoản' : 'Đăng nhập'}
            </CardTitle>
            <CardDescription>
              {isRegisterMode
                ? 'Tạo tài khoản quản trị mới'
                : 'Nhập thông tin để tiếp tục'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mật khẩu</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
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

              {isRegisterMode && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Nhập lại mật khẩu</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-slate-800 hover:bg-slate-900"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isRegisterMode ? 'Đang đăng ký...' : 'Đang đăng nhập...'}
                  </>
                ) : (
                  isRegisterMode ? 'Đăng ký' : 'Đăng nhập'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsRegisterMode(!isRegisterMode);
                  setConfirmPassword('');
                }}
                className="text-slate-600 hover:text-slate-800 text-sm"
              >
                {isRegisterMode
                  ? 'Đã có tài khoản? Đăng nhập'
                  : 'Chưa có tài khoản? Đăng ký'}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
