/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Upload,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  FileImage,
  Trash2,
  RefreshCw,
} from 'lucide-react';

import { useMerchantAuth } from '@/store/authStore';
import { merchantAuthService } from '@/service/merchant.auth.service';
import { useToast } from '@/hooks/use-toast';
import { LandingHeader } from '@/components/landing/LandingHeader';

type MerchantApprovalStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'suspended';
type OnboardingStep = 'basic_info' | 'documents' | 'ready_to_submit' | 'waiting_approval' | 'approved' | 'rejected';

interface OnboardingStatus {
  has_onboarding: boolean;
  current_step: OnboardingStep;
  step_number: number;
  merchant_approval_status: MerchantApprovalStatus;
  rejection_reason?: string | null;
  rejection_reasons?: string[];
  rejection_note?: string | null;
  basic_info?: any;
  documents?: any;
}

const steps = [
  { id: 1, title: 'Tài khoản' },
  { id: 2, title: 'Thông tin cửa hàng' },
  { id: 3, title: 'Giấy tờ' },
  { id: 4, title: 'Xác nhận' },
];

const storeCategories = [
  { value: "banh_truyen_thong", label: "Bánh truyền thống" },
  { value: "lau_nuong", label: "Lẩu & Nướng" },
  { value: "do_an_dinh_duong", label: "Đồ ăn dinh dưỡng" },
  { value: "do_uong_khong_con", label: "Đồ uống không cồn" },
  { value: "com", label: "Cơm" },
  { value: "tra_sua", label: "Trà sữa" },
  { value: "do_an_vat", label: "Đồ ăn vặt" },
  { value: "ga", label: "Gà" },
  { value: "ca_phe", label: "Cà phê" },
  { value: "trang_mieng", label: "Tráng miệng" },
  { value: "bun", label: "Bún" },
  { value: "tra", label: "Trà" },
  { value: "banh_au_a", label: "Bánh Âu Á" },
  { value: "bun_pho_my", label: "Bún/Phở/Mỳ" },
  { value: "nuoc_ep_sinh_to", label: "Nước ép & Sinh tố" },
  { value: "banh_trang", label: "Bánh tráng" },
  { value: "chao_sup", label: "Cháo/Súp" },
  { value: "do_an_nhanh", label: "Đồ ăn nhanh" },
  { value: "hai_san", label: "Hải sản" },
  { value: "banh_mi", label: "Bánh mì" },
  { value: "pasta", label: "Pasta" },
  { value: "heo", label: "Heo" },
  { value: "lau", label: "Lẩu" },
  { value: "ga_ran", label: "Gà rán" },
  { value: "bo", label: "Bò" },
  { value: "am_thuc_quoc_te", label: "Ẩm thực quốc tế" },
  { value: "cac_mon_cuon", label: "Các món cuốn" },
  { value: "ca", label: "Cá" },
  { value: "do_chay", label: "Đồ chay" },
  { value: "chuc_mung", label: "Chúc mừng" },
];

const REGISTRATION_STORAGE_KEY = 'merchant_registration';
const MAX_REGISTRATION_AGE = 7 * 24 * 60 * 60 * 1000;

type DocType = 'id_card_front' | 'id_card_back' | 'business_license' | 'store_front';

const DOCS: Array<{
  type: DocType;
  label: string;
  hint: string;
  accept: string;
  urlField: string; // field returned by BE
}> = [
    { type: 'id_card_front', label: 'CCCD/CMND mặt trước', hint: 'Ảnh rõ nét, không lóa', accept: 'image/*', urlField: 'id_card_front_url' },
    { type: 'id_card_back', label: 'CCCD/CMND mặt sau', hint: 'Ảnh rõ nét, không lóa', accept: 'image/*', urlField: 'id_card_back_url' },
    { type: 'business_license', label: 'Giấy phép kinh doanh', hint: 'Chụp đủ trang/khung', accept: 'image/*', urlField: 'business_license_url' },
    { type: 'store_front', label: 'Ảnh mặt tiền cửa hàng', hint: 'Thấy rõ bảng hiệu', accept: 'image/*', urlField: 'store_front_image_url' },
  ];

interface RegistrationData {
  email: string;
  step_number: number;
  basic_info?: any;
  documents?: any;
  saved_at: number;
}

function bytesToSize(bytes: number) {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (!bytes) return '0B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)}${sizes[i]}`;
}

export default function MerchantRegisterPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const { accessToken, user, onboarding, register, fetchOnboarding } = useMerchantAuth();

  const [currentStep, setCurrentStep] = useState(1); // 1: Account, 2: Store Info, 3: Documents, 4: Confirm
  const [showPassword, setShowPassword] = useState(false);

  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const submitLockRef = useRef(false);

  // State lưu thông tin từ chối để hiển thị
  const [rejectionInfo, setRejectionInfo] = useState<{
    reason?: string | null;
    rejection_reason?: string[];
    note?: string | null;
  } | null>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    storeName: '',
    storeAddress: '',
    storeCategory: '',
    description: '',
  });

  const [selectedFiles, setSelectedFiles] = useState<Record<DocType, File | null>>({
    id_card_front: null,
    id_card_back: null,
    business_license: null,
    store_front: null,
  });

  const [previewUrls, setPreviewUrls] = useState<Record<DocType, string>>({
    id_card_front: '',
    id_card_back: '',
    business_license: '',
    store_front: '',
  });

  const [uploadedUrls, setUploadedUrls] = useState<Record<DocType, string>>({
    id_card_front: '',
    id_card_back: '',
    business_license: '',
    store_front: '',
  });

  const [uploading, setUploading] = useState<Record<DocType, boolean>>({
    id_card_front: false,
    id_card_back: false,
    business_license: false,
    store_front: false,
  });

  const allSelected = useMemo(() => {
    return DOCS.every((d) => !!selectedFiles[d.type]);
  }, [selectedFiles]);

  const allUploaded = useMemo(() => {
    return DOCS.every((d) => !!uploadedUrls[d.type]);
  }, [uploadedUrls]);

  const saveLocal = () => {
    const data: RegistrationData = {
      email: formData.email,
      step_number: currentStep,
      basic_info: {
        store_name: formData.storeName,
        store_phone: formData.phone, // Dùng SĐT từ bước 1
        store_address: formData.storeAddress,
        store_category: formData.storeCategory,
        description: formData.description,
      },
      documents: {
        id_card_front_url: uploadedUrls.id_card_front,
        id_card_back_url: uploadedUrls.id_card_back,
        business_license_url: uploadedUrls.business_license,
        store_front_image_url: uploadedUrls.store_front,
      },
      saved_at: Date.now(),
    };
    localStorage.setItem(REGISTRATION_STORAGE_KEY, JSON.stringify(data));
  };

  const loadLocal = () => {
    const raw = localStorage.getItem(REGISTRATION_STORAGE_KEY);
    if (!raw) return;
    try {
      const data = JSON.parse(raw) as RegistrationData;
      if (Date.now() - data.saved_at > MAX_REGISTRATION_AGE) {
        localStorage.removeItem(REGISTRATION_STORAGE_KEY);
        return;
      }
      // restore basic fields (optional)
      if (data.basic_info) {
        setFormData((p) => ({
          ...p,
          email: data.email || p.email,
          phone: data.basic_info.store_phone || p.phone, // Dùng store_phone từ bước 1
          storeName: data.basic_info.store_name || '',
          storeAddress: data.basic_info.store_address || '',
          storeCategory: data.basic_info.store_category || '',
          description: data.basic_info.description || '',
        }));
      }
      // restore uploaded urls
      const docs = data.documents || {};
      setUploadedUrls({
        id_card_front: docs.id_card_front_url || '',
        id_card_back: docs.id_card_back_url || '',
        business_license: docs.business_license_url || '',
        store_front: docs.store_front_image_url || '',
      });
      setCurrentStep(Math.min(Math.max(data.step_number || 1, 1), 4));
    } catch {
      localStorage.removeItem(REGISTRATION_STORAGE_KEY);
    }
  };

  //  init + redirect rules - simplified
  useEffect(() => {
    const init = async () => {
      let ob: any = onboarding;

      // nếu đã login -> luôn fetch onboarding mới nhất
      if (accessToken && user) {
        try {
          ob = await fetchOnboarding();
        } catch {
          //
        }
      }

      // redirect theo ob
      if (ob?.merchant_approval_status === 'approved') {
        navigate('/app/dashboard', { replace: true });
        return;
      }
      if (ob?.merchant_approval_status === 'pending_approval' || ob?.current_step === 'waiting_approval') {
        navigate('/merchant/status', { replace: true });
        return;
      }

      // resume theo ob (KHÔNG dùng onboarding state cũ)
      if (accessToken && user && ob?.has_onboarding) {
        // Nếu bị từ chối, gọi API restart để lấy lý do từ chối và bắt đầu lại từ bước 2
        if (ob.merchant_approval_status === 'rejected') {
          try {
            const restartRes = await merchantAuthService.restart();
            const restartOb = restartRes.data?.data?.onboarding;

            // Fetch lại onboarding sau khi restart để lấy dữ liệu mới nhất
            ob = await fetchOnboarding();

            // Lưu thông tin từ chối để hiển thị
            setRejectionInfo({
              reason: restartOb?.rejection_reason || ob?.rejection_reason,
              rejection_reason: restartOb?.rejection_reasons || ob?.rejection_reasons,
              note: restartOb?.rejection_note || ob?.rejection_note,
            });

            // Hiển thị toast thông báo bị từ chối
            if (restartOb?.rejection_reason || restartOb?.rejection_note || ob?.rejection_reason) {
              toast({
                title: 'Hồ sơ bị từ chối',
                description: restartOb?.rejection_reason || restartOb?.rejection_note || ob?.rejection_reason || 'Vui lòng chỉnh sửa thông tin và nộp lại',
                variant: 'destructive',
              });
            }
          } catch (e) {
            console.error('Failed to restart onboarding:', e);
          }
        }

        const stepMap: Record<string, number> = {
          basic_info: 2,
          documents: 3,
          ready_to_submit: 4,
          waiting_approval: 4,
          approved: 4,
          rejected: 2, // Khi bị từ chối, cho phép chỉnh sửa từ bước 2 (thông tin cửa hàng)
        };
        setCurrentStep(stepFromOnboarding(ob));

        if (ob.basic_info) {
          setFormData((p) => ({
            ...p,
            storeName: ob.basic_info.store_name || '',
            phone: ob.basic_info.store_phone || p.phone, // Dùng store_phone từ bước 1
            storeAddress: ob.basic_info.store_address || '',
            storeCategory: ob.basic_info.store_category || '',
            description: ob.basic_info.description || '',
          }));
        }

        if (ob.documents) {
          setUploadedUrls({
            id_card_front: ob.documents.id_card_front_url || '',
            id_card_back: ob.documents.id_card_back_url || '',
            business_license: ob.documents.business_license_url || '',
            store_front: ob.documents.store_front_image_url || '', // ✅ đúng field
          });
        }
      } else if (!accessToken) {
        loadLocal();
      }

      setIsInitialized(true);
    };

    init();
  }, [accessToken, user]);

  const onPickFile = (type: DocType, file: File | null) => {
    if (!file) return;

    // Revoke old preview URL
    if (previewUrls[type]) URL.revokeObjectURL(previewUrls[type]);

    // Create a new preview URL
    const url = URL.createObjectURL(file);

    setSelectedFiles((p) => ({ ...p, [type]: file }));
    setPreviewUrls((p) => ({ ...p, [type]: url }));
  };
  const removeFile = (type: DocType) => {
    if (previewUrls[type]) URL.revokeObjectURL(previewUrls[type]);
    setSelectedFiles((p) => ({ ...p, [type]: null }));
    setPreviewUrls((p) => ({ ...p, [type]: '' }));
  };

  const uploadOne = async (type: DocType) => {
    const file = selectedFiles[type];
    if (!file) return;

    setUploading((p) => ({ ...p, [type]: true }));
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('documentType', type);

      const res = await merchantAuthService.uploadDocument(form);
      const docs = res.data?.data?.documents || {};

      const def = DOCS.find((d) => d.type === type)!;
      const url = docs[def.urlField] || docs[`${type}_url`] || '';

      if (url) {
        setUploadedUrls((p) => ({ ...p, [type]: url }));
      }

      // Clear selected preview
      removeFile(type);
    } finally {
      setUploading((p) => ({ ...p, [type]: false }));
    }
  };

  const stepFromOnboarding = (ob: any) => {
    // rejected luôn về step 2 theo yêu cầu UI
    if (ob?.merchant_approval_status === 'rejected') return 2;

    const map: Record<string, number> = {
      basic_info: 2,
      documents: 3,
      ready_to_submit: 4,
      waiting_approval: 4,
      approved: 4,
    };

    return map[ob?.current_step] ?? 2;
  };

  const handleRegister = async () => {
    if (submitLockRef.current) return;
    submitLockRef.current = true;

    const fail = (description: string) => {
      toast({ title: "Lỗi", description, variant: "destructive" });
      submitLockRef.current = false;  // ✅ mở khóa mọi đường return sớm
    };

    if (!formData.email || !formData.password || !formData.fullName || !formData.phone) {
      return fail("Vui lòng điền đầy đủ thông tin");
    }
    if (formData.password.length < 8) {
      return fail("Mật khẩu tối thiểu 8 ký tự");
    }
    if (formData.password !== formData.confirmPassword) {
      return fail("Mật khẩu không khớp");
    }

    setIsLoading(true);
    try {
      await register({ email: formData.email, password: formData.password, full_name: formData.fullName, phone: formData.phone });
      saveLocal();
      setCurrentStep(2);
      toast({ title: "Đăng ký thành công", description: "Vui lòng tiếp tục nhập thông tin cửa hàng" });
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? "Không thể đăng ký";
      toast({ title: "Lỗi", description: Array.isArray(msg) ? msg.join(", ") : msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
      submitLockRef.current = false; //
    }
  };

  // Bước 2: Lưu thông tin cửa hàng -> chuyển sang bước 3
  const handleSaveBasicInfo = async () => {
    if (!formData.storeName || !formData.storeAddress || !formData.storeCategory) {
      toast({ title: 'Lỗi', description: 'Vui lòng điền đủ thông tin cửa hàng', variant: 'destructive' });
      return;
    }
    if (!accessToken) {
      toast({ title: 'Lỗi', description: 'Bạn cần đăng nhập lại', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      await merchantAuthService.saveBasicInfo({
        store_name: formData.storeName,
        store_phone: formData.phone, // Dùng SĐT từ bước 1
        store_address: formData.storeAddress,
        store_category: formData.storeCategory,
        description: formData.description,
      });
      saveLocal();
      toast({ title: 'Đã lưu thông tin cửa hàng', description: 'Tiếp tục tải lên giấy tờ' });
      setCurrentStep(3); // Chuyển sang bước 3
    } catch (e: any) {
      toast({
        title: 'Lỗi',
        description: e?.response?.data?.message || e?.message || 'Không thể lưu thông tin',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Bước 3: Upload tất cả giấy tờ -> chuyển sang bước 4
  const uploadAllSequential = async () => {
    if (!allSelected) return;

    setIsLoading(true);
    try {
      for (const d of DOCS) {
        await uploadOne(d.type);
      }
      saveLocal();
      toast({ title: 'Tải lên thành công', description: 'Tiếp tục xác nhận thông tin' });
      setCurrentStep(4); // Chuyển sang bước 4
    } catch (e: any) {
      toast({
        title: 'Lỗi tải lên',
        description: e?.response?.data?.message || e?.message || 'Không thể tải ảnh lên',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Bước 4: Submit -> chuyển sang trang chờ duyệt
  const handleSubmit = async () => {
    if (!allUploaded) {
      toast({ title: 'Thiếu giấy tờ', description: 'Vui lòng tải lên đủ 4 giấy tờ', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      await merchantAuthService.submit();
      localStorage.removeItem(REGISTRATION_STORAGE_KEY);

      toast({
        title: 'Đã gửi hồ sơ!',
        description: 'Hồ sơ đang chờ duyệt.',
      });

      // Chuyển sang trang chờ duyệt
      navigate('/merchant/status', { replace: true });
    } catch (e: any) {
      toast({
        title: 'Lỗi gửi hồ sơ',
        description: e?.response?.data?.message || e?.message || 'Có lỗi xảy ra',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const Stepper = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((s, idx) => (
          <div key={s.id} className="flex items-center flex-1">
            <div
              className={[
                'w-10 h-10 rounded-full flex items-center justify-center font-semibold',
                currentStep >= s.id ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-500',
                currentStep > s.id ? 'bg-green-500' : '',
              ].join(' ')}
            >
              {currentStep > s.id ? <CheckCircle2 className="w-5 h-5" /> : s.id}
            </div>
            <span className={`ml-2 text-sm font-medium hidden sm:block ${currentStep >= s.id ? 'text-orange-500' : 'text-gray-400'}`}>
              {s.title}
            </span>
            {idx < steps.length - 1 && (
              <div className={`flex-1 h-1 mx-2 ${currentStep > s.id ? 'bg-green-500' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const DocCard = ({ type, label, hint }: { type: DocType; label: string; hint: string }) => {
    const selected = selectedFiles[type];  // File được chọn
    const preview = previewUrls[type];     // URL tạm thời cho ảnh đã chọn
    const uploaded = uploadedUrls[type];   // URL ảnh đã upload từ server
    const isUploading = uploading[type];   // Kiểm tra trạng thái đang upload

    // Thiết lập badge để hiển thị trạng thái
    const stateBadge = uploaded
      ? { text: 'Đã tải lên', cls: 'bg-green-50 text-green-700 border-green-200' }
      : selected
        ? { text: 'Đã chọn', cls: 'bg-orange-50 text-orange-700 border-orange-200' }
        : { text: 'Chưa chọn', cls: 'bg-gray-50 text-gray-700 border-gray-200' };

    return (
      <div className="border rounded-xl p-4 bg-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-semibold text-gray-900">{label} *</div>
            <div className="text-xs text-gray-500 mt-1">{hint}</div>
          </div>
          <div className={`text-xs px-2 py-1 border rounded-full ${stateBadge.cls}`}>
            {stateBadge.text}
          </div>
        </div>

        <div className="mt-4">
          {/* Hiển thị preview nếu đã có ảnh được chọn hoặc đã upload */}
          {uploaded || preview ? (
            <div className="relative">
              <img
                src={preview || uploaded}  // Chọn ảnh từ preview hoặc ảnh đã upload
                alt={label}
                className="w-full h-40 object-cover rounded-lg border"
              />

              {/* Hiển thị các nút Xoá hoặc Đổi ảnh */}
              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  <FileImage className="w-4 h-4" />
                  {selected ? (
                    <span>{selected.name} • {bytesToSize(selected.size)}</span>
                  ) : uploaded ? (
                    <span>Đã có ảnh trên server</span>
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  {/* Đổi ảnh */}
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => onPickFile(type, e.target.files?.[0] || null)}  // Chọn lại ảnh
                    />
                    <Button variant="outline" size="sm">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Đổi ảnh
                    </Button>
                  </label>

                  {/* Xoá ảnh đã chọn */}
                  {(preview || selected) && (
                    <Button variant="outline" size="sm" onClick={() => removeFile(type)}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Xoá
                    </Button>
                  )}
                </div>
              </div>

              {/* Nút Tải lên ảnh */}
              {selected && !uploaded && (
                <div className="mt-3">
                  <Button
                    className="w-full bg-orange-500 hover:bg-orange-600"
                    onClick={() => uploadOne(type)}  // Tải lên ảnh
                    disabled={isUploading || isLoading}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Đang tải lên...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Tải lên ảnh này
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            // Nếu chưa có ảnh, cho phép chọn ảnh
            <label className="block cursor-pointer">
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => onPickFile(type, e.target.files?.[0] || null)}  // Chọn ảnh
              />
              <div className="border-2 border-dashed rounded-xl p-6 text-center hover:border-orange-400 hover:bg-orange-50 transition-colors">
                <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                <div className="text-sm font-medium text-gray-700">Click để chọn ảnh</div>
                <div className="text-xs text-gray-500 mt-1">JPG/PNG • khuyến nghị ảnh rõ nét</div>
              </div>
            </label>
          )}
        </div>

        {/* Hiển thị trạng thái đã lưu ảnh trên hệ thống */}
        {uploaded && (
          <div className="mt-3 text-xs text-green-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Đã lưu trên hệ thống
          </div>
        )}
      </div>
    );
  };


  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <LandingHeader />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Stepper />

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>
                {currentStep === 1 && 'Tạo tài khoản'}
                {currentStep === 2 && 'Thông tin cửa hàng'}
                {currentStep === 3 && 'Tải lên giấy tờ'}
                {currentStep === 4 && 'Xác nhận'}
              </CardTitle>
              <CardDescription>
                {currentStep === 1 && 'Nhập thông tin đăng nhập'}
                {currentStep === 2 && 'Thông tin cơ bản về cửa hàng'}
                {currentStep === 3 && 'Tải đủ 4 giấy tờ để gửi hồ sơ'}
                {currentStep === 4 && 'Kiểm tra lại trước khi gửi'}
              </CardDescription>
            </CardHeader>

            <CardContent>
              {/* STEP 1 */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Họ và tên *</Label>
                      <Input
                        id="fullName"
                        placeholder="Nguyễn Văn A"
                        value={formData.fullName}
                        onChange={(e) => setFormData((p) => ({ ...p, fullName: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Số điện thoại *</Label>
                      <Input
                        id="phone"
                        placeholder="0123456789"
                        value={formData.phone}
                        onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@cuahang.com"
                      value={formData.email}
                      onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="password">Mật khẩu *</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="********"
                          value={formData.password}
                          onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                          onClick={() => setShowPassword((v) => !v)}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500">Tối thiểu 8 ký tự</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Nhập lại mật khẩu *</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="********"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData((p) => ({ ...p, confirmPassword: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2 */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  {/* Hiển thị thông báo từ chối nếu có */}
                  {(rejectionInfo?.reason || rejectionInfo?.note) && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm">
                      <div className="font-semibold text-red-800 mb-1">Lý do từ chối:</div>
                      <div className="text-red-700">
                        {rejectionInfo.rejection_reason?.join(', ')}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="storeName">Tên cửa hàng *</Label>
                    <Input
                      id="storeName"
                      placeholder="Quán ABC"
                      value={formData.storeName}
                      onChange={(e) => setFormData((p) => ({ ...p, storeName: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="storeCategory">Loại hình *</Label>
                    <select
                      id="storeCategory"
                      className="w-full h-10 px-3 border rounded-md"
                      value={formData.storeCategory}
                      onChange={(e) => setFormData((p) => ({ ...p, storeCategory: e.target.value }))}
                    >
                      <option value="">Chọn loại hình</option>
                      {storeCategories.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="storeAddress">Địa chỉ cửa hàng *</Label>
                    <Input
                      id="storeAddress"
                      placeholder="123 Đường ABC, Quận 1, TP.HCM"
                      value={formData.storeAddress}
                      onChange={(e) => setFormData((p) => ({ ...p, storeAddress: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Mô tả</Label>
                    <textarea
                      id="description"
                      className="w-full min-h-[90px] px-3 py-2 border rounded-md resize-none"
                      placeholder="Giới thiệu về cửa hàng..."
                      value={formData.description}
                      onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              {/* STEP 3 */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-sm text-orange-800 flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 mt-0.5" />
                    <div>
                      <div className="font-semibold">Yêu cầu</div>
                      <div className="text-orange-700">Tải đủ 4 giấy tờ. Bạn có thể tải từng ảnh hoặc bấm “Tải lên tất cả”.</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {DOCS.map((d) => (
                      <DocCard key={d.type} type={d.type} label={d.label} hint={d.hint} />
                    ))}
                  </div>

                  <div className="pt-2">
                    <Button
                      className="w-full bg-orange-500 hover:bg-orange-600"
                      onClick={uploadAllSequential}
                      disabled={!allSelected || isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Đang tải lên...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Tải lên tất cả (4 ảnh)
                        </>
                      )}
                    </Button>

                    <div className="text-xs text-gray-500 mt-2 text-center">
                      {allUploaded ? '✓ Đã tải đủ 4 giấy tờ' : allSelected ? 'Đã chọn đủ 4 ảnh (có thể tải lên)' : 'Chưa chọn đủ 4 ảnh'}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4 */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="font-semibold text-orange-800 mb-2">Thông tin cửa hàng</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div><span className="text-gray-500">Tên:</span> {formData.storeName}</div>
                      <div><span className="text-gray-500">SĐT:</span> {formData.phone}</div>
                      <div><span className="text-gray-500">Loại:</span> {formData.storeCategory}</div>
                      <div className="md:col-span-2"><span className="text-gray-500">Địa chỉ:</span> {formData.storeAddress}</div>
                    </div>
                  </div>

                  <div className="bg-white border rounded-lg p-4">
                    <div className="font-semibold text-gray-900 mb-3">Giấy tờ</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      {DOCS.map((d) => (
                        <div key={d.type} className="flex items-center gap-2">
                          {uploadedUrls[d.type] ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-red-500" />
                          )}
                          <span>{d.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>

            <CardFooter className="flex justify-between">
              {currentStep > 1 ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    // đã login thì không quay về step 1
                    if (accessToken && user && currentStep === 2) {
                      navigate('/', { replace: true });
                      return;
                    }
                    setCurrentStep((p) => p - 1);
                  }}
                  disabled={isLoading}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Quay lại
                </Button>
              ) : (
                <Link to="/"><Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Về Landing</Button></Link>
              )}

              {currentStep === 1 && (
                <Button onClick={handleRegister} className="bg-orange-500 hover:bg-orange-600" disabled={isLoading}>
                  {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Đang đăng ký...</> : <>Đăng ký <ArrowRight className="w-4 h-4 ml-2" /></>}
                </Button>
              )}

              {currentStep === 2 && (
                <Button onClick={handleSaveBasicInfo} className="bg-orange-500 hover:bg-orange-600" disabled={isLoading}>
                  {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Đang lưu...</> : <>Tiếp tục <ArrowRight className="w-4 h-4 ml-2" /></>}
                </Button>
              )}

              {currentStep === 3 && (
                <Button
                  onClick={() => setCurrentStep(4)}
                  className="bg-orange-500 hover:bg-orange-600"
                  disabled={!allUploaded || isLoading}
                >
                  {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Đang xử lý...</> : <>Tiếp tục <ArrowRight className="w-4 h-4 ml-2" /></>}
                </Button>
              )}

              {currentStep === 4 && (
                <Button onClick={handleSubmit} className="bg-orange-500 hover:bg-orange-600" disabled={isLoading || !allUploaded}>
                  {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Đang gửi...</> : <>Gửi hồ sơ <CheckCircle2 className="w-4 h-4 ml-2" /></>}
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
