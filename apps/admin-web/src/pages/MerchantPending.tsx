/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, FileText, Image, MapPin, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useMerchantApprovalStore } from '@/store/merchantApprovalStore';

const rejectionReasons = [
  'Thiếu giấy tờ',
  'Giấy tờ không hợp lệ',
  'Ảnh không rõ ràng',
  'Thông tin không khớp',
  'Địa chỉ không chính xác',
  'Vi phạm điều khoản dịch vụ',
  'Khác',
];

export default function MerchantPending() {
  const {
    pending,
    rejected,
    loading,
    error,
    fetchReviewQueue,
    approveMerchant,
    rejectMerchant,
  } = useMerchantApprovalStore() as any;

  const [tab, setTab] = useState<'pending' | 'rejected'>('pending');

  const [selectedMerchant, setSelectedMerchant] = useState<any>(null);

  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);

  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const navigate = useNavigate();
  useEffect(() => {
    fetchReviewQueue();
  }, [fetchReviewQueue]);

  const list = useMemo(() => (tab === 'pending' ? pending : rejected), [tab, pending, rejected]);

  const resetRejectForm = () => {
    setSelectedReasons([]);
    setNote('');
  };

  const closeApproveDialog = () => {
    setApproveDialogOpen(false);
    setSelectedMerchant(null);
  };

  const closeRejectDialog = () => {
    setRejectDialogOpen(false);
    setSelectedMerchant(null);
    resetRejectForm();
  };

  const toggleReason = (r: string) => {
    setSelectedReasons((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  };

  const onApprove = async () => {
    if (!selectedMerchant?.owner_user_id) return;
    await approveMerchant(selectedMerchant.owner_user_id);
    closeApproveDialog();
  };

  const onReject = async () => {
    if (!selectedMerchant?.owner_user_id) return;
    await rejectMerchant(selectedMerchant.owner_user_id, {
      reasons: selectedReasons,
      note: note?.trim() ? note.trim() : undefined,
    });
    closeRejectDialog();
  };
  const DOC_LABEL: Record<string, string> = {
    business_license_url: 'Giấy phép kinh doanh',
    id_card_front_url: 'CCCD mặt trước',
    id_card_back_url: 'CCCD mặt sau',
    store_front_image_url: 'Ảnh mặt tiền',
  };

  const getDocEntries = (merchant: any) =>
    Object.entries(merchant?.documents ?? {}).filter(([, url]) => !!url);

  const renderEmpty = (type: 'pending' | 'rejected') => (
    <Card className="p-12 text-center">
      {type === 'pending' ? (
        <>
          <CheckCircle className="h-14 w-14 mx-auto text-success mb-4" />
          <h2 className="text-xl font-semibold">Không có merchant nào chờ duyệt</h2>
          <p className="text-muted-foreground mt-2">Tất cả đã được xử lý</p>
        </>
      ) : (
        <>
          <XCircle className="h-14 w-14 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold">Chưa có merchant bị từ chối</h2>
          <p className="text-muted-foreground mt-2">Danh sách từ chối sẽ hiển thị tại đây</p>
        </>
      )}

      <Link to="/merchants" className="mt-6 inline-block">
        <Button variant="outline">Về danh sách Merchant</Button>
      </Link>
    </Card>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Review Queue</h1>
          <p className="text-muted-foreground text-sm">
            Duyệt / từ chối hồ sơ merchant
            {loading ? ' • Đang tải...' : ''}
          </p>
          {error ? <p className="text-sm text-destructive mt-1">{error}</p> : null}
        </div>

        <Button variant="outline" onClick={() => fetchReviewQueue()}>
          Tải lại
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="pending">Chưa duyệt ({pending?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="rejected">Đã từ chối ({rejected?.length ?? 0})</TabsTrigger>
        </TabsList>

        {/* PENDING TAB */}
        <TabsContent value="pending" className="mt-4">
          {(!pending || pending.length === 0) ? (
            renderEmpty('pending')
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {pending.map((merchant: any) => (
                <Card
                  key={merchant.id}
                  className="overflow-hidden cursor-pointer"
                  onClick={() => navigate(`/merchants/${merchant.id}`)}
                >
                  {/* Cover */}
                  <div className="h-32 bg-gradient-to-r from-primary/20 to-primary/5 relative">
                    {merchant.coverImage ? (
                      <img src={merchant.coverImage} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-4xl">🏪</div>
                    )}
                    <Badge className="absolute top-3 right-3" variant="secondary">
                      <StatusBadge status="pending" />
                    </Badge>
                  </div>

                  <CardContent className="pt-4">
                    {/* Basic Info */}
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-lg bg-card border-2 border-background shadow-lg overflow-hidden -mt-10 relative z-10">
                        {merchant.logo ? (
                          <img src={merchant.logo} alt={merchant.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted text-2xl">
                            🍜
                          </div>
                        )}
                      </div>
                      <div className="flex-1 pt-2">
                        <h3 className="font-semibold text-lg">{merchant.name}</h3>
                        {merchant.email ? <p className="text-sm text-muted-foreground">{merchant.email}</p> : null}
                        {merchant.phone ? <p className="text-sm text-muted-foreground">{merchant.phone}</p> : null}
                      </div>
                    </div>

                    {/* Address */}
                    {(merchant.address || merchant.district || merchant.city) && (
                      <div className="mt-4 flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <p className="text-sm">
                          {[merchant.address, merchant.district, merchant.city].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    )}

                    {/* Documents */}
                    <div className="mt-4">
                      <p className="text-sm font-medium mb-2">Hồ sơ đã nộp:</p>

                      <div className="flex flex-wrap gap-2">
                        {getDocEntries(merchant).length ? (
                          getDocEntries(merchant).map(([key, url]) => (
                            <a key={key} href={String(url)} target="_blank" rel="noreferrer">
                              <Badge variant="outline" className="gap-1 cursor-pointer">
                                <FileText className="h-3 w-3" />
                                {DOC_LABEL[key] ?? key}
                              </Badge>
                            </a>
                          ))
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <FileText className="h-3 w-3" />
                            Chưa có giấy tờ
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Submitted Date */}
                    <p className="mt-4 text-xs text-muted-foreground">
                      Đăng ký:{' '}
                      {merchant.createdAt || merchant.created_at
                        ? new Date(merchant.createdAt || merchant.created_at).toLocaleDateString('vi-VN')
                        : '-'}
                    </p>

                    {/* Actions */}
                    <div className="mt-4 pt-4 border-t flex gap-3">
                      <Button
                        className="flex-1"
                        disabled={loading}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedMerchant(merchant);
                          setApproveDialogOpen(true);
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Duyệt
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        disabled={loading}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedMerchant(merchant);
                          setRejectDialogOpen(true);
                        }}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Từ chối
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* REJECTED TAB */}
        <TabsContent value="rejected" className="mt-4">
          {(!rejected || rejected.length === 0) ? (
            renderEmpty('rejected')
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {rejected.map((merchant: any) => (
                <Card key={merchant.id} className="overflow-hidden">
                  <div className="h-32 bg-gradient-to-r from-destructive/15 to-destructive/5 relative">
                    {merchant.coverImage ? (
                      <img src={merchant.coverImage} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-4xl">🏪</div>
                    )}
                    <Badge className="absolute top-3 right-3" variant="secondary">
                      <StatusBadge status="rejected" />
                    </Badge>
                  </div>

                  <CardContent className="pt-4">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-lg bg-card border-2 border-background shadow-lg overflow-hidden -mt-10 relative z-10">
                        {merchant.logo ? (
                          <img src={merchant.logo} alt={merchant.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted text-2xl">
                            🍜
                          </div>
                        )}
                      </div>
                      <div className="flex-1 pt-2">
                        <h3 className="font-semibold text-lg">{merchant.name}</h3>
                        {merchant.email ? <p className="text-sm text-muted-foreground">{merchant.email}</p> : null}
                        {merchant.phone ? <p className="text-sm text-muted-foreground">{merchant.phone}</p> : null}
                      </div>
                    </div>

                    {(merchant.address || merchant.district || merchant.city) && (
                      <div className="mt-4 flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <p className="text-sm">
                          {[merchant.address, merchant.district, merchant.city].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    )}

                    {/* Optional: hiển thị lý do nếu BE trả */}
                    {(merchant.rejection_reasons?.length || merchant.rejection_reason) && (
                      <div className="mt-4">
                        <p className="text-sm font-medium mb-2">Lý do từ chối:</p>
                        <div className="flex flex-wrap gap-2">
                          {(merchant.rejection_reasons ?? [])
                            .slice(0, 6)
                            .map((r: string, idx: number) => (
                              <Badge key={idx} variant="outline">
                                {r}
                              </Badge>
                            ))}
                          {!merchant.rejection_reasons?.length && merchant.rejection_reason ? (
                            <Badge variant="outline">{merchant.rejection_reason}</Badge>
                          ) : null}
                        </div>
                        {merchant.rejection_note ? (
                          <p className="text-sm text-muted-foreground mt-2">{merchant.rejection_note}</p>
                        ) : null}
                      </div>
                    )}

                    {/* Action: có thể cho duyệt lại */}
                    {/* <div className="mt-4 pt-4 border-t">
                      <Button
                        className="w-full"
                        disabled={loading}
                        onClick={() => {
                          setSelectedMerchant(merchant);
                          setApproveDialogOpen(true);
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Duyệt lại
                      </Button>
                    </div> */}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Approve Dialog */}
      <Dialog
        open={approveDialogOpen}
        onOpenChange={(open) => {
          setApproveDialogOpen(open);
          if (!open) setSelectedMerchant(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận duyệt Merchant</DialogTitle>
            <DialogDescription>
              Bạn đang duyệt <span className="font-medium">{selectedMerchant?.name}</span>. Merchant sẽ có thể bắt đầu
              nhận đơn sau khi được duyệt.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeApproveDialog} disabled={loading}>
              Hủy
            </Button>
            <Button onClick={onApprove} disabled={loading}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Xác nhận duyệt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog
        open={rejectDialogOpen}
        onOpenChange={(open) => {
          setRejectDialogOpen(open);
          if (!open) closeRejectDialog();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Từ chối Merchant</DialogTitle>
            <DialogDescription>
              Vui lòng chọn lý do từ chối <span className="font-medium">{selectedMerchant?.name}</span>
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
            placeholder="Ghi chú thêm (tùy chọn)..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
          />

          <DialogFooter>
            <Button variant="outline" onClick={closeRejectDialog} disabled={loading}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={onReject} disabled={loading || selectedReasons.length === 0}>
              <XCircle className="h-4 w-4 mr-2" />
              Nộp từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
