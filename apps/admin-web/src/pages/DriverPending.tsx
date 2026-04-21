/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, XCircle, ArrowLeft, FileText, CreditCard, Car, Image, ImageIcon } from 'lucide-react';
import { Image as AntImage, Avatar, Tag } from 'antd';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';

import { useDriverApprovalStore } from '@/store/driverApprovalStore';

const rejectionReasons = [
  'CMND/CCCD không hợp lệ',
  'Bằng lái không hợp lệ',
  'Ảnh xe không rõ ràng',
  'Biển số không khớp',
  'Phương tiện không đủ điều kiện',
  'Khác',
];

export default function DriverPending() {
  const { drivers, fetchDrivers, approveDriver, rejectDriver, loading } = useDriverApprovalStore();

  useEffect(() => {
    fetchDrivers('list');
  }, [fetchDrivers]);

  const pendingDrivers = useMemo(
    () => drivers.filter((d) => d.verification_status === 'pending'),
    [drivers],
  );

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const selectedDriver = useMemo(
    () => pendingDrivers.find((d) => d.user.id === selectedUserId) ?? null,
    [pendingDrivers, selectedUserId],
  );

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [additionalNote, setAdditionalNote] = useState('');
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);

  const handleApprove = async () => {
    if (!selectedUserId) return;
    await approveDriver(selectedUserId);
    setApproveDialogOpen(false);
    setSelectedUserId(null);
  };

  const handleReject = async () => {
    if (!selectedUserId) return;
    await rejectDriver(selectedUserId, {
      reasons: selectedReasons,
      note: additionalNote?.trim() || undefined,
    });

    setRejectDialogOpen(false);
    setSelectedReasons([]);
    setAdditionalNote('');
    setSelectedUserId(null);
  };

  const toggleReason = (reason: string) => {
    setSelectedReasons((prev) =>
      prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason],
    );
  };

  if (!loading && pendingDrivers.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Link to="/drivers">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Duyệt Driver</h1>
        </div>

        <Card className="p-12 text-center">
          <CheckCircle className="h-16 w-16 mx-auto text-success mb-4" />
          <h2 className="text-xl font-semibold">Không có driver nào chờ duyệt</h2>
          <p className="text-muted-foreground mt-2">Tất cả đã được xử lý</p>
          <Link to="/drivers" className="mt-6 inline-block">
            <Button>Về danh sách Driver</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/drivers">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Duyệt Driver</h1>
          <p className="text-muted-foreground text-sm">
            {loading ? 'Đang tải...' : `${pendingDrivers.length} driver đang chờ duyệt`}
          </p>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {pendingDrivers.map((row) => {
          const p = row.driver_profile;
          return (
            <Card key={row.user.id} className="overflow-hidden">
              <CardContent className="pt-6">
                {/* Basic */}
                <div className="flex items-start gap-4">
                  <AntImage
                    width={64}
                    height={64}
                    src={row.user.avatar_url ?? undefined}
                    alt={row.user.full_name ?? row.user.email ?? 'avatar'}
                    preview={{ mask: 'Xem' }} // có thể bỏ nếu không muốn preview
                    style={{
                      borderRadius: '50%',
                      objectFit: 'cover',
                    }}
                    fallback="/images/avatar-fallback.png" // optional: ảnh local fallback
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">
                        {row.user.full_name ?? row.user.email ?? '-'}
                      </h3>
                      <Link to={`/drivers/${row.user.id}`}>
                        <Button variant="outline" size="sm">Xem chi tiết</Button>
                      </Link>

                      <StatusBadge status="pending" />
                    </div>
                    <p className="text-sm text-muted-foreground">{row.user.phone ?? '-'}</p>
                    <p className="text-sm text-muted-foreground">{row.user.email ?? '-'}</p>
                  </div>
                </div>
                {/* Vehicle */}
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{p?.vehicle_brand ?? '—'}</span>
                    </div>
                    <Badge variant="outline" className="font-mono">
                      {p?.vehicle_plate ?? '—'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Bằng lái: {p?.license_type ?? '—'} • HSD: {p?.license_expiry ? new Date(p.license_expiry).toLocaleDateString('vi-VN') : '—'}
                  </p>
                </div>

                {/* Documents */}
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Hồ sơ đã nộp:</p>

                  <div className="grid grid-cols-3 gap-2">
                    {/* CCCD (front/back) */}
                    <div className="aspect-[4/3] rounded-lg bg-muted overflow-hidden">
                      {p?.id_card_front_url ? (
                        <AntImage.PreviewGroup
                          items={[
                            p.id_card_front_url,
                            ...(p.id_card_back_url ? [p.id_card_back_url] : []),
                          ]}
                        >
                          <div className="relative w-full h-full">
                            <AntImage
                              src={p.id_card_front_url}
                              alt="CMND/CCCD"
                              width="100%"
                              height="100%"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              preview={{ mask: 'Xem ảnh' }}
                              fallback="" // để antd không văng lỗi broken image icon quá xấu
                            />
                            {p?.id_card_back_url ? (
                              <span className="absolute top-2 right-2">
                                <Tag color="blue">2 ảnh</Tag>
                              </span>
                            ) : null}
                          </div>
                        </AntImage.PreviewGroup>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-2">
                          <CreditCard className="h-6 w-6 text-muted-foreground mb-1" />
                          <span className="text-xs text-muted-foreground text-center">CMND/CCCD</span>
                        </div>
                      )}
                    </div>

                    {/* Bằng lái */}
                    <div className="aspect-[4/3] rounded-lg bg-muted overflow-hidden">
                      {p?.license_image_url ? (
                        <AntImage
                          src={p.license_image_url}
                          alt="Bằng lái"
                          width="100%"
                          height="100%"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          preview={{ mask: 'Xem ảnh' }}
                          fallback=""
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-2">
                          <FileText className="h-6 w-6 text-muted-foreground mb-1" />
                          <span className="text-xs text-muted-foreground text-center">Bằng lái</span>
                        </div>
                      )}
                    </div>

                    {/* Ảnh xe */}
                    <div className="aspect-[4/3] rounded-lg bg-muted overflow-hidden">
                      {p?.vehicle_image_url ? (
                        <AntImage
                          src={p.vehicle_image_url}
                          alt="Ảnh xe"
                          width="100%"
                          height="100%"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          preview={{ mask: 'Xem ảnh' }}
                          fallback=""
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-2">
                          <ImageIcon className="h-6 w-6 text-muted-foreground mb-1" />
                          <span className="text-xs text-muted-foreground text-center">Ảnh xe</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {/* Submitted */}
                <p className="mt-4 text-xs text-muted-foreground">
                  Nộp hồ sơ: {p?.submitted_at ? new Date(p.submitted_at).toLocaleString('vi-VN') : '—'}
                </p>

                {/* Actions */}
                <div className="mt-4 pt-4 border-t flex gap-3">
                  <Button
                    className="flex-1"
                    onClick={() => {
                      setSelectedUserId(row.user.id);
                      setApproveDialogOpen(true);
                    }}
                    disabled={loading}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Duyệt
                  </Button>

                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => {
                      setSelectedUserId(row.user.id);
                      setRejectDialogOpen(true);
                    }}
                    disabled={loading}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Từ chối
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận duyệt Driver</DialogTitle>
            <DialogDescription>
              Bạn đang duyệt <span className="font-medium">{selectedDriver?.user.full_name ?? selectedDriver?.user.email}</span>.
              Driver sẽ có thể bắt đầu nhận đơn sau khi được duyệt.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)} disabled={loading}>
              Hủy
            </Button>
            <Button onClick={handleApprove} disabled={loading}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Xác nhận duyệt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Từ chối Driver</DialogTitle>
            <DialogDescription>
              Chọn lý do từ chối <span className="font-medium">{selectedDriver?.user.full_name ?? selectedDriver?.user.email}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {rejectionReasons.map((reason) => (
              <div key={reason} className="flex items-center gap-2">
                <Checkbox
                  id={reason}
                  checked={selectedReasons.includes(reason)}
                  onCheckedChange={() => toggleReason(reason)}
                />
                <label htmlFor={reason} className="text-sm cursor-pointer">
                  {reason}
                </label>
              </div>
            ))}
          </div>

          <Textarea
            placeholder="Ghi chú thêm (note)..."
            value={additionalNote}
            onChange={(e) => setAdditionalNote(e.target.value)}
            rows={3}
          />

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              disabled={loading}
            >
              Hủy
            </Button>

            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={loading || selectedReasons.length === 0}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Xác nhận từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}