// src/pages/SettingsPage.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Store, Clock, Save, MapPin, LocateFixed } from 'lucide-react';

import { geoService } from '@/service/geo.service';
import { useToast } from '@/hooks/use-toast';
import { useMerchantAuth } from '@/store/authStore';
import { useMerchantActions } from '@/store/merchantStore';
import { TrackAsiaMapPicker } from '@/components/setting/TrackAsiaMapPicker';

// ✅ Antd Upload
import { Upload as AntUpload, message } from 'antd';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import { DeleteOutlined, InboxOutlined, PlusOutlined } from '@ant-design/icons';

const { Dragger } = AntUpload;

function dedupeAddress(s: string) {
  const parts = s.split(',').map((x) => x.trim()).filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const key = p.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(p);
    }
  }
  return out.join(', ');
}

const dayLabel = (day: number) => {
  const map: Record<number, string> = {
    1: 'Thứ 2',
    2: 'Thứ 3',
    3: 'Thứ 4',
    4: 'Thứ 5',
    5: 'Thứ 6',
    6: 'Thứ 7',
    7: 'Chủ nhật',
  };
  return map[day] ?? `Day ${day}`;
};

const fileFromUrl = (url: string, uid: string): UploadFile => ({
  uid,
  name: url.split('/').pop() || 'image',
  status: 'done',
  url,
});

export default function SettingsPage() {
  const { toast } = useToast();
  const [isSavingHours, setIsSavingHours] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  const merchant = useMerchantAuth((s) => s.merchant);
  const fetchMe = useMerchantAuth((s) => s.fetchMe);
  const isBootstrapping = useMerchantAuth((s) => s.isBootstrapping);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const { updateMe, uploadLogo, uploadCover } = useMerchantActions();

  //  tránh “xóa rồi effect restore lại ảnh cũ”
  const logoClearedRef = useRef(false);
  const coverClearedRef = useRef(false);

  const [logoFileList, setLogoFileList] = useState<UploadFile[]>([]);
  const [coverFileList, setCoverFileList] = useState<UploadFile[]>([]);

  const [storeInfo, setStoreInfo] = useState({
    name: '',
    description: '',
    hotline: '',
    email: '',
    prepTime: '',
    deliveryRadius: '',
    address: '',
    category: '',
    isAcceptingOrders: false,
    location: null as null | { lat: number; lng: number },
  });

  const defaultHours = useMemo(
    () => [
      { day: 1, isOpen: true, openTime: '07:00', closeTime: '22:00' },
      { day: 2, isOpen: true, openTime: '07:00', closeTime: '22:00' },
      { day: 3, isOpen: true, openTime: '07:00', closeTime: '22:00' },
      { day: 4, isOpen: true, openTime: '07:00', closeTime: '22:00' },
      { day: 5, isOpen: true, openTime: '07:00', closeTime: '23:00' },
      { day: 6, isOpen: true, openTime: '08:00', closeTime: '23:00' },
      { day: 7, isOpen: true, openTime: '08:00', closeTime: '21:00' },
    ],
    [],
  );

  const [operatingHours, setOperatingHours] = useState<any[]>(defaultHours);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  // ✅ Sync fileList từ merchant (nhưng tôn trọng thao tác remove)
  useEffect(() => {
    if (!merchant) return;

    if (!logoClearedRef.current) {
      setLogoFileList(merchant.logo_url ? [fileFromUrl(merchant.logo_url, 'existing-logo')] : []);
    }
    if (!coverClearedRef.current) {
      setCoverFileList(merchant.cover_image_url ? [fileFromUrl(merchant.cover_image_url, 'existing-cover')] : []);
    }
  }, [merchant?.logo_url, merchant?.cover_image_url, merchant]);

  useEffect(() => {
    if (!merchant) return;

    const coords = merchant.location?.coordinates;
    const location =
      Array.isArray(coords) && coords.length === 2 ? { lng: coords[0], lat: coords[1] } : null;

    setStoreInfo({
      name: merchant.name ?? '',
      description: merchant.description ?? '',
      hotline: merchant.phone ?? '',
      email: merchant.email ?? '',
      prepTime: String(merchant.average_prep_time_min ?? 15),
      deliveryRadius: String(merchant.delivery_radius_km ?? 5),
      address: merchant.address ?? '',
      category: merchant.category ?? '',
      isAcceptingOrders: Boolean(merchant.is_accepting_orders),
      location,
    });

    const bh = (merchant.business_hours ?? []) as any[];
    if (bh.length) {
      setOperatingHours(
        bh
          .slice()
          .sort((a, b) => a.day - b.day)
          .map((x) => ({
            day: x.day,
            isOpen: !x.is_closed,
            openTime: x.open_time ?? '07:00',
            closeTime: x.close_time ?? '22:00',
          })),
      );
    } else {
      setOperatingHours(defaultHours);
    }
  }, [merchant, defaultHours]);

  // ✅ giống production: JPG/PNG/WebP + < 5MB
  const validateImage: UploadProps['beforeUpload'] = (file) => {
    const okType = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
    if (!okType) {
      message.error('Chỉ cho phép JPG/PNG/WebP');
      return AntUpload.LIST_IGNORE;
    }
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error('Ảnh phải < 5MB');
      return AntUpload.LIST_IGNORE;
    }
    return true;
  };

  const reverseAndFillAddress = async (lat: number, lng: number) => {
    try {
      setIsGeocoding(true);
      const r = await geoService.reverse(lat, lng);
      const address = r.address ?? '';
      setStoreInfo((prev) => ({ ...prev, address, location: { lat, lng } }));
    } catch (e: any) {
      setStoreInfo((prev) => ({ ...prev, location: { lat, lng } }));
      toast({
        title: 'Không lấy được địa chỉ từ tọa độ',
        description: e?.response?.data?.message || e?.message || 'Có lỗi xảy ra',
        variant: 'destructive',
      });
    } finally {
      setIsGeocoding(false);
    }
  };

  const handlePickOnMap = async (v: { lat: number; lng: number }) => {
    await reverseAndFillAddress(v.lat, v.lng);
  };

  const handleUseGPS = async () => {
    if (!navigator.geolocation) {
      toast({ title: 'Thiết bị không hỗ trợ GPS', variant: 'destructive' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await reverseAndFillAddress(pos.coords.latitude, pos.coords.longitude);
      },
      () => { },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handlePinByAddress = async () => {
    const text = storeInfo.address?.trim();
    if (!text) {
      toast({ title: 'Nhập địa chỉ trước', variant: 'destructive' });
      return;
    }

    try {
      setIsGeocoding(true);
      const res = await geoService.search(text);
      const first = res.items?.[0];
      if (!first?.lat || !first?.lng) {
        toast({ title: 'Không tìm thấy địa chỉ phù hợp', variant: 'destructive' });
        return;
      }

      const lat = Number(first.lat);
      const lng = Number(first.lng);
      const label = dedupeAddress(first.label || text);

      setStoreInfo((prev) => ({ ...prev, address: label, location: { lat, lng } }));
    } catch (e: any) {
      toast({
        title: 'Tìm địa chỉ thất bại',
        description: e?.response?.data?.message || e?.message || 'Có lỗi xảy ra',
        variant: 'destructive',
      });
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleSave = async () => {
    try {

      if (!logoFileList.length) {
        toast({ title: 'Thiếu logo', description: 'Vui lòng tải logo quán trước khi lưu', variant: 'destructive' });
        return;
      }
      if (!coverFileList.length) {
        toast({ title: 'Thiếu ảnh bìa', description: 'Vui lòng tải ảnh bìa trước khi lưu', variant: 'destructive' });
        return;
      }

      //  nếu đang upload thì chặn
      if (uploadingLogo || uploadingCover) {
        toast({ title: 'Đang tải ảnh', description: 'Vui lòng đợi upload ảnh xong rồi hãy lưu', variant: 'destructive' });
        return;
      }
      const business_hours = operatingHours.map((x: any) => ({
        day: x.day,
        open_time: x.isOpen ? x.openTime : undefined,
        close_time: x.isOpen ? x.closeTime : undefined,
        is_closed: !x.isOpen,
      }));

      await updateMe({
        name: storeInfo.name,
        description: storeInfo.description,
        phone: storeInfo.hotline,
        address: storeInfo.address,
        category: storeInfo.category,
        average_prep_time_min: Number(storeInfo.prepTime),
        delivery_radius_km: Number(storeInfo.deliveryRadius),
        business_hours,
        is_accepting_orders: storeInfo.isAcceptingOrders,
        location: storeInfo.location ?? undefined,
      });

      toast({ title: 'Đã lưu cài đặt', description: 'Thay đổi sẽ được áp dụng ngay' });
    } catch (e: any) {
      const missing = e?.response?.data?.missing;
      toast({
        title: 'Lưu thất bại',
        description:
          (Array.isArray(missing) && missing.length
            ? `Thiếu: ${missing.join(', ')}`
            : e?.response?.data?.message || e?.message || 'Có lỗi xảy ra'),
        variant: 'destructive',
      });
    }
  };
  const revokeBlobThumb = (f?: UploadFile) => {
    const u = f?.thumbUrl;
    if (u && u.startsWith('blob:')) URL.revokeObjectURL(u);
  };
  const handleSaveHours = async () => {
    try {
      setIsSavingHours(true);

      const business_hours = operatingHours.map((x: any) => ({
        day: x.day,
        open_time: x.isOpen ? x.openTime : undefined,
        close_time: x.isOpen ? x.closeTime : undefined,
        is_closed: !x.isOpen,
      }));

      await updateMe({ business_hours });
      toast({ title: 'Đã lưu giờ hoạt động', description: 'Thay đổi sẽ được áp dụng ngay' });
    } catch (e: any) {
      toast({
        title: 'Lưu giờ thất bại',
        description: e?.response?.data?.message || e?.message || 'Có lỗi xảy ra',
        variant: 'destructive',
      });
    } finally {
      setIsSavingHours(false);
    }
  };

  if (isBootstrapping && !merchant) {
    return <div className="p-6 text-muted-foreground">Đang tải thông tin quán...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cài đặt</h1>
        <p className="text-muted-foreground">Quản lý thông tin và cấu hình của quán</p>
      </div>

      <Tabs defaultValue="store" className="space-y-6">
        <TabsList>
          <TabsTrigger value="store" className="gap-2">
            <Store className="w-4 h-4" />
            Thông tin quán
          </TabsTrigger>
          <TabsTrigger value="hours" className="gap-2">
            <Clock className="w-4 h-4" />
            Giờ hoạt động
          </TabsTrigger>
        </TabsList>

        {/* ================= STORE TAB ================= */}
        <TabsContent value="store">
          <Card>
            <CardHeader>
              <CardTitle>Thông tin quán</CardTitle>
              <CardDescription>Cập nhật thông tin cơ bản của quán</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* LOGO + COVER (Antd Upload) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 ">
                {/* LOGO */}
                <div>
                  <Label className="text-base">Logo quán</Label>
                  <AntUpload
                    listType="picture-card"
                    maxCount={1}
                    accept="image/*"
                    fileList={logoFileList}
                    beforeUpload={validateImage}
                    onChange={({ fileList }) => setLogoFileList(fileList.slice(-1))}
                    onRemove={() => {
                      logoClearedRef.current = true;
                      setLogoFileList([]);
                      return true;
                    }}
                    customRequest={async ({ file, onSuccess, onError }) => {
                      try {
                        const data = await uploadLogo(file as File);
                        logoClearedRef.current = false;

                        const url = data?.logo_url || '';
                        setLogoFileList(url ? [fileFromUrl(url, 'uploaded-logo')] : []);

                        onSuccess?.(data as any);
                        message.success('Đã tải logo');
                      } catch (e: any) {
                        onError?.(e);
                        message.error(e?.response?.data?.message || e?.message || 'Upload logo thất bại');
                      }
                    }}
                    showUploadList={{ showRemoveIcon: true }}
                  >
                    {logoFileList.length >= 1 ? null : (
                      <div>
                        <PlusOutlined />
                        <div style={{ marginTop: 8 }}>Tải logo</div>
                      </div>
                    )}
                  </AntUpload>
                </div>

                {/* COVER - DRAGGER */}
                <div>
                  <Label className="text-base">Cover quán</Label>

                  {(() => {
                    const cover = coverFileList?.[0];
                    const coverUrl = cover?.url || cover?.thumbUrl;

                    return (
                      <Dragger
                        multiple={false}
                        maxCount={1}
                        accept="image/*"
                        fileList={coverFileList}
                        beforeUpload={validateImage}
                        showUploadList={false}
                        // ✅ tạo preview ngay khi chọn file (trước khi upload xong)
                        onChange={({ fileList }) => {
                          // revoke blob cũ nếu có
                          revokeBlobThumb(coverFileList?.[0]);

                          const last = fileList.slice(-1).map((f) => ({
                            ...f,
                            thumbUrl:
                              f.thumbUrl ||
                              (f.originFileObj ? URL.createObjectURL(f.originFileObj as File) : undefined),
                          }));

                          coverClearedRef.current = false;
                          setCoverFileList(last);
                        }}
                        customRequest={async ({ file, onSuccess, onError }) => {
                          try {
                            const data = await uploadCover(file as File);
                            coverClearedRef.current = false;

                            // ✅ set url thật từ server để preview chuẩn
                            const url = data?.cover_image_url || '';
                            revokeBlobThumb(coverFileList?.[0]);
                            setCoverFileList(url ? [fileFromUrl(url, 'uploaded-cover')] : []);

                            onSuccess?.(data as any);
                            message.success('Đã tải cover');
                          } catch (e: any) {
                            onError?.(e);
                            message.error(e?.response?.data?.message || e?.message || 'Upload cover thất bại');
                          }
                        }}
                      >
                        {coverUrl ? (
                          // ✅ preview cover ngay trong vùng dragger
                          <div className="relative h-[160px] md:h-[200px] rounded-lg overflow-hidden">
                            <img src={coverUrl} alt="cover" className="w-full h-full object-cover" />

                            {/* hint */}
                            <div className="absolute left-2 bottom-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                              Kéo thả hoặc bấm để đổi ảnh
                            </div>

                            {/* nút xoá */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation(); // ✅ không mở file dialog
                                coverClearedRef.current = true;
                                revokeBlobThumb(coverFileList?.[0]);
                                setCoverFileList([]);
                              }}
                              className="absolute top-2 right-2 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center"
                              title="Xoá cover"
                            >
                              <DeleteOutlined />
                            </button>
                          </div>
                        ) : (
                          // trạng thái chưa có ảnh
                          <div className="py-8">
                            <p className="ant-upload-drag-icon">
                              <InboxOutlined />
                            </p>
                            <p className="ant-upload-text">Kéo thả ảnh bìa vào đây hoặc bấm để chọn</p>
                            <p className="ant-upload-hint">JPG/PNG/WebP • 16:9 • &lt; 5MB</p>
                          </div>
                        )}
                      </Dragger>
                    );
                  })()}
                </div>
              </div>

              <Separator />

              {/* BASIC FIELDS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tên quán</Label>
                  <Input value={storeInfo.name} onChange={(e) => setStoreInfo((p) => ({ ...p, name: e.target.value }))} />
                </div>

                <div className="space-y-2">
                  <Label>Hotline</Label>
                  <Input value={storeInfo.hotline} onChange={(e) => setStoreInfo((p) => ({ ...p, hotline: e.target.value }))} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email liên hệ</Label>
                <Input type="email" value={storeInfo.email} disabled />
                <p className="text-xs text-muted-foreground">Email lấy theo tài khoản đăng ký (không chỉnh ở đây).</p>
              </div>

              <div className="space-y-2">
                <Label>Mô tả</Label>
                <Textarea
                  rows={3}
                  value={storeInfo.description}
                  onChange={(e) => setStoreInfo((p) => ({ ...p, description: e.target.value }))}
                />
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Thời gian chuẩn bị (phút)</Label>
                  <Input
                    type="number"
                    value={storeInfo.prepTime}
                    onChange={(e) => setStoreInfo((p) => ({ ...p, prepTime: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Bán kính giao hàng (km)</Label>
                  <Input
                    type="number"
                    value={storeInfo.deliveryRadius}
                    onChange={(e) => setStoreInfo((p) => ({ ...p, deliveryRadius: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="font-medium">Nhận đơn</div>
                  <div className="text-xs text-muted-foreground">Bật/tắt nhận đơn từ khách</div>
                </div>
                <Switch
                  checked={storeInfo.isAcceptingOrders}
                  onCheckedChange={(checked) => setStoreInfo((p) => ({ ...p, isAcceptingOrders: checked }))}
                />
              </div>

              <Separator />

              {/* LOCATION (INPUTS) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <Label className="text-base">Vị trí quán</Label>
                    <p className="text-xs text-muted-foreground">
                      Dùng GPS / tìm theo địa chỉ / pick pin trên bản đồ.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={handleUseGPS} disabled={isGeocoding}>
                      <LocateFixed className="w-4 h-4 mr-2" />
                      Dùng GPS
                    </Button>
                    <Button variant="secondary" onClick={handlePinByAddress} disabled={isGeocoding}>
                      <MapPin className="w-4 h-4 mr-2" />
                      Pin theo địa chỉ
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Địa chỉ</Label>
                  <Input
                    value={storeInfo.address}
                    onChange={(e) => setStoreInfo((p) => ({ ...p, address: e.target.value }))}
                    placeholder="Nhập địa chỉ hoặc pick pin để tự điền"
                  />
                  <p className="text-xs text-muted-foreground">
                    {storeInfo.location
                      ? `Tọa độ: ${storeInfo.location.lat.toFixed(6)}, ${storeInfo.location.lng.toFixed(6)}`
                      : 'Chưa có tọa độ'}
                  </p>
                </div>

                {/* ✅ MAP to hơn + nằm dưới cùng */}
                <div className="border rounded-lg overflow-hidden h-[420px] md:h-[520px]">
                  <TrackAsiaMapPicker value={storeInfo.location} onChange={handlePickOnMap} />
                </div>
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button onClick={handleSave}>
                  <Save className="w-4 h-4 mr-2" />
                  Lưu thay đổi
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= HOURS TAB ================= */}
        <TabsContent value="hours">
          <Card>
            <CardHeader>
              <CardTitle>Giờ hoạt động</CardTitle>
              <CardDescription>Thiết lập giờ mở cửa cho từng ngày trong tuần</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {operatingHours.map((day: any, index: number) => (
                <div key={day.day} className="flex items-center gap-4 p-3 rounded-lg border">
                  <div className="w-24 font-medium">{dayLabel(day.day)}</div>

                  <Switch
                    checked={day.isOpen}
                    onCheckedChange={(checked) => {
                      const newHours = [...operatingHours];
                      newHours[index].isOpen = checked;
                      setOperatingHours(newHours);
                    }}
                  />

                  <span className="text-sm text-muted-foreground w-16">{day.isOpen ? 'Mở cửa' : 'Đóng cửa'}</span>

                  {day.isOpen && (
                    <>
                      <Input
                        type="time"
                        className="w-32"
                        value={day.openTime}
                        onChange={(e) => {
                          const newHours = [...operatingHours];
                          newHours[index].openTime = e.target.value;
                          setOperatingHours(newHours);
                        }}
                      />
                      <span>-</span>
                      <Input
                        type="time"
                        className="w-32"
                        value={day.closeTime}
                        onChange={(e) => {
                          const newHours = [...operatingHours];
                          newHours[index].closeTime = e.target.value;
                          setOperatingHours(newHours);
                        }}
                      />
                    </>
                  )}
                </div>
              ))}

              <div className="flex justify-end pt-4">
                <Button onClick={handleSaveHours} disabled={isSavingHours}>
                  <Save className="w-4 h-4 mr-2" />
                  {isSavingHours ? 'Đang lưu...' : 'Lưu giờ hoạt động'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}