/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, CheckCircle2, Bell, Shield, RefreshCw, AlertCircle, Edit3 } from 'lucide-react';
import { useMerchantAuth } from '@/store/authStore';
import { merchantAuthService } from '@/service/merchant.auth.service';
import { useToast } from '@/components/ui/use-toast';
import { LandingHeader } from '@/components/landing/LandingHeader';

export default function WaitingApprovalPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { fetchOnboarding, onboarding, accessToken, bootstrap } = useMerchantAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Local state để lưu onboarding data - đảm bảo hiển thị đúng sau khi fetch
  const [localOnboarding, setLocalOnboarding] = useState<any>(null);

  useEffect(() => {
    setHydrated(true);
  }, []);

  // Fetch onboarding when component mounts
  useEffect(() => {
    const init = async () => {
      if (!accessToken) {
        setIsLoading(false);
        return;
      }

      try {
        await bootstrap();
        const ob = await fetchOnboarding();
        setLocalOnboarding(ob); // Lưu vào local state
      } catch (e) {
        console.error('Failed to fetch onboarding:', e);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [accessToken, bootstrap, fetchOnboarding]);

  const checkApproval = async () => {
    const ob = await fetchOnboarding();
    setLocalOnboarding(ob); // Cập nhật local state
    if (ob.merchant_approval_status === 'approved') {
      navigate('/app/dashboard', { replace: true });
    }
  };

  useEffect(() => {
    checkApproval();
    const interval = setInterval(checkApproval, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await checkApproval();
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };


  // Handle restart onboarding after rejection
  const handleRestart = async () => {
    setIsRestarting(true);
    try {
      const res = await merchantAuthService.restart();
      const restartOb = res.data?.data?.onboarding;

      // Fetch lại onboarding để cập nhật store
      const ob = await fetchOnboarding();
      setLocalOnboarding(ob);

      toast({
        title: 'Chỉnh sửa hồ sơ',
        description: 'Vui lòng cập nhật lại thông tin và giấy tờ',
      });

      // Navigate to register page - MerchantRegisterPage sẽ tự load dữ liệu từ onboarding state
      navigate('/merchant/register');
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error?.response?.data?.message || 'Không thể chỉnh sửa hồ sơ',
        variant: 'destructive',
      });
    } finally {
      setIsRestarting(false);
    }
  };

  if (!hydrated || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  // Nếu chưa đăng nhập, chuyển về trang đăng nhập
  if (!accessToken) {
    navigate('/login', { replace: true });
    return null;
  }

  // Sử dụng localOnboarding để đảm bảo dữ liệu được cập nhật
  const currentOnboarding = localOnboarding || onboarding;
  const isApproved = currentOnboarding?.merchant_approval_status === 'approved';
  const isRejected = currentOnboarding?.merchant_approval_status === 'rejected';
  const rejectionReasons = currentOnboarding?.rejection_reasons || [];
  const rejectionNote = currentOnboarding?.rejection_note;
  const rejectionReason = currentOnboarding?.rejection_reason;

  return (
    <div className="min-h-screen bg-gray-50">
      <LandingHeader />

      <div className="flex items-center justify-center p-4 mt-8">
        <Card className="max-w-lg w-full text-center">
          <CardContent className="pt-8 pb-8">
            {/* Show rejection state */}
            {isRejected ? (
              <>
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertCircle className="w-10 h-10 text-red-500" />
                </div>

                <h1 className="text-2xl font-bold text-red-600 mb-2">Hồ sơ bị từ chối</h1>
                <p className="text-gray-600 mb-6">Hồ sơ của bạn không được duyệt. Vui lòng chỉnh sửa và gửi lại.</p>

                {/* Rejection reasons */}
                {(rejectionReasons.length > 0 || rejectionReason) && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
                    <h3 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      Lý do từ chối
                    </h3>

                    {rejectionReasons.length > 0 ? (
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                        {rejectionReasons.map((reason, index) => (
                          <li key={index}>{reason}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-700">{rejectionReason}</p>
                    )}

                    {rejectionNote ? (
                      <div className="mt-3 pt-3 border-t border-red-200">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Ghi chú:</span> {rejectionNote}
                        </p>
                      </div>
                    ) : null}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    onClick={handleRestart}
                    disabled={isRestarting}
                    className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600"
                  >
                    {isRestarting ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Đang xử lý...
                      </>
                    ) : (
                      <>
                        <Edit3 className="w-4 h-4 mr-2" />
                        Chỉnh sửa hồ sơ
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/* Show pending state */}
                <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Clock className="w-10 h-10 text-orange-500" />
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-2">Hồ sơ của bạn đang được xử lý</h1>
                <p className="text-gray-600 mb-6">Cảm ơn bạn đã đăng ký! Hồ sơ đang chờ được duyệt.</p>

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 text-left">
                  <h3 className="font-semibold text-orange-800 mb-3 flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Thông báo
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Sẽ có thông báo khi hồ sơ được duyệt</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Clock className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                      <span>Thời gian xử lý: 24–48 giờ làm việc</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-gray-100 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Trong thời gian chờ
                  </h3>
                  <p className="text-sm text-gray-600">Bạn vẫn giữ phiên đăng nhập. Có thể về landing và đợi.</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link to="/">
                    <Button className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600">Về Landing</Button>
                  </Link>
                  <Button
                    variant="outline"
                    onClick={handleManualRefresh}
                    disabled={isRefreshing}
                    className="w-full sm:w-auto"
                  >
                    {isRefreshing ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Đang kiểm tra...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Kiểm tra trạng thái
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
