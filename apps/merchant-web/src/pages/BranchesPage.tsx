import { useState } from 'react';
import {
  Plus,
  Search,
  Building2,
  MapPin,
  Clock,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
  FileText,
  Send,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { mockBranches } from '@/data/mockData';
import { Branch, BranchStatus } from '@/types';

const statusConfig: Record<BranchStatus, { label: string; color: string; icon: React.ElementType }> = {
  DRAFT: { label: 'Bản nháp', color: 'bg-muted text-muted-foreground', icon: FileText },
  PENDING_REVIEW: { label: 'Chờ duyệt', color: 'bg-warning/10 text-warning border-warning', icon: Clock },
  ACTIVE: { label: 'Hoạt động', color: 'bg-success/10 text-success border-success', icon: CheckCircle2 },
  REJECTED: { label: 'Từ chối', color: 'bg-destructive/10 text-destructive border-destructive', icon: AlertCircle },
};

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>(mockBranches);
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialog, setCreateDialog] = useState(false);
  const [detailSheet, setDetailSheet] = useState<Branch | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    prepTime: '15',
    deliveryRadius: '5',
  });
  const { toast } = useToast();

  const filteredBranches = branches.filter(b =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleAcceptingOrders = (id: string) => {
    setBranches(prev => prev.map(b =>
      b.id === id ? { ...b, isAcceptingOrders: !b.isAcceptingOrders } : b
    ));
    toast({ title: 'Đã cập nhật trạng thái nhận đơn' });
  };

  const handleCreate = () => {
    const newBranch: Branch = {
      id: `branch-${Date.now()}`,
      merchantId: 'merchant-1',
      name: formData.name,
      address: formData.address,
      status: 'DRAFT',
      isAcceptingOrders: false,
      operatingHours: [
        { day: 'monday', isOpen: true, openTime: '07:00', closeTime: '22:00' },
        { day: 'tuesday', isOpen: true, openTime: '07:00', closeTime: '22:00' },
        { day: 'wednesday', isOpen: true, openTime: '07:00', closeTime: '22:00' },
        { day: 'thursday', isOpen: true, openTime: '07:00', closeTime: '22:00' },
        { day: 'friday', isOpen: true, openTime: '07:00', closeTime: '22:00' },
        { day: 'saturday', isOpen: true, openTime: '07:00', closeTime: '22:00' },
        { day: 'sunday', isOpen: true, openTime: '07:00', closeTime: '22:00' },
      ],
      prepTime: parseInt(formData.prepTime) || 15,
      deliveryRadius: parseInt(formData.deliveryRadius) || 5,
      documents: {},
      createdAt: new Date().toISOString(),
    };
    setBranches(prev => [...prev, newBranch]);
    setCreateDialog(false);
    setFormData({ name: '', address: '', prepTime: '15', deliveryRadius: '5' });
    toast({ title: 'Đã tạo chi nhánh mới', description: 'Chi nhánh đang ở trạng thái bản nháp' });
  };

  const handleSubmitForReview = (id: string) => {
    setBranches(prev => prev.map(b =>
      b.id === id ? { ...b, status: 'PENDING_REVIEW' as BranchStatus } : b
    ));
    toast({ title: 'Đã gửi yêu cầu duyệt', description: 'Chúng tôi sẽ xem xét trong 24-48 giờ' });
    setDetailSheet(null);
  };

  const handleDelete = (id: string) => {
    setBranches(prev => prev.filter(b => b.id !== id));
    toast({ title: 'Đã xoá chi nhánh', variant: 'destructive' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Chi nhánh</h1>
          <p className="text-muted-foreground">Quản lý các chi nhánh của quán</p>
        </div>
        <Dialog open={createDialog} onOpenChange={setCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Thêm chi nhánh
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Thêm chi nhánh mới</DialogTitle>
              <DialogDescription>
                Tạo chi nhánh mới và gửi yêu cầu duyệt sau khi hoàn tất thông tin
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tên chi nhánh *</Label>
                <Input
                  placeholder="VD: FaB Café - Quận 7"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Địa chỉ *</Label>
                <Textarea
                  placeholder="Địa chỉ chi tiết của chi nhánh..."
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Thời gian chuẩn bị (phút)</Label>
                  <Input
                    type="number"
                    value={formData.prepTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, prepTime: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bán kính giao hàng (km)</Label>
                  <Input
                    type="number"
                    value={formData.deliveryRadius}
                    onChange={(e) => setFormData(prev => ({ ...prev, deliveryRadius: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialog(false)}>Huỷ</Button>
              <Button onClick={handleCreate} disabled={!formData.name || !formData.address}>
                Tạo chi nhánh
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm chi nhánh..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Object.entries(statusConfig).map(([status, config]) => {
          const count = branches.filter(b => b.status === status).length;
          const Icon = config.icon;
          return (
            <Card key={status}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${config.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-sm text-muted-foreground">{config.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Branches List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBranches.map(branch => {
          const StatusIcon = statusConfig[branch.status].icon;
          return (
            <Card key={branch.id} className="hover:shadow-card-hover transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">{branch.name}</h3>
                      <Badge variant="outline" className={statusConfig[branch.status].color}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusConfig[branch.status].label}
                      </Badge>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setDetailSheet(branch)}>
                        <Eye className="w-4 h-4 mr-2" />
                        Xem chi tiết
                      </DropdownMenuItem>
                      {(branch.status === 'DRAFT' || branch.status === 'REJECTED') && (
                        <DropdownMenuItem>
                          <Pencil className="w-4 h-4 mr-2" />
                          Chỉnh sửa
                        </DropdownMenuItem>
                      )}
                      {branch.status === 'DRAFT' && (
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(branch.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Xoá
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <span className="text-muted-foreground line-clamp-2">{branch.address}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {branch.prepTime} phút
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {branch.deliveryRadius} km
                    </div>
                  </div>
                </div>

                {branch.status === 'REJECTED' && branch.rejectionReason && (
                  <div className="p-2 bg-destructive/10 rounded-md mb-4">
                    <p className="text-sm text-destructive">
                      <AlertCircle className="w-4 h-4 inline mr-1" />
                      {branch.rejectionReason}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t">
                  {branch.status === 'ACTIVE' ? (
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={branch.isAcceptingOrders}
                        onCheckedChange={() => handleToggleAcceptingOrders(branch.id)}
                      />
                      <span className="text-sm">
                        {branch.isAcceptingOrders ? 'Đang nhận đơn' : 'Tạm ngưng'}
                      </span>
                    </div>
                  ) : branch.status === 'DRAFT' ? (
                    <Button 
                      size="sm" 
                      className="w-full"
                      onClick={() => handleSubmitForReview(branch.id)}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Gửi duyệt
                    </Button>
                  ) : branch.status === 'REJECTED' ? (
                    <Button size="sm" variant="outline" className="w-full">
                      <Pencil className="w-4 h-4 mr-2" />
                      Chỉnh sửa & gửi lại
                    </Button>
                  ) : (
                    <span className="text-sm text-muted-foreground">Đang chờ xét duyệt...</span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!detailSheet} onOpenChange={() => setDetailSheet(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {detailSheet && (
            <>
              <SheetHeader>
                <SheetTitle>{detailSheet.name}</SheetTitle>
                <SheetDescription>Chi tiết chi nhánh</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <div className="space-y-3">
                  <h4 className="font-medium">Trạng thái</h4>
                  <Badge variant="outline" className={statusConfig[detailSheet.status].color}>
                    {statusConfig[detailSheet.status].label}
                  </Badge>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-medium">Địa chỉ</h4>
                  <p className="text-muted-foreground">{detailSheet.address}</p>
                  <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                    <MapPin className="w-8 h-8 text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">Bản đồ (Track Asia)</span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-medium">Giờ hoạt động</h4>
                  <div className="space-y-2">
                    {detailSheet.operatingHours.map(h => (
                      <div key={h.day} className="flex items-center justify-between text-sm">
                        <span className="capitalize">{h.day}</span>
                        <span className={h.isOpen ? '' : 'text-muted-foreground'}>
                          {h.isOpen ? `${h.openTime} - ${h.closeTime}` : 'Đóng cửa'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-medium">Cấu hình</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Thời gian chuẩn bị</p>
                      <p className="font-medium">{detailSheet.prepTime} phút</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Bán kính giao</p>
                      <p className="font-medium">{detailSheet.deliveryRadius} km</p>
                    </div>
                  </div>
                </div>

                {detailSheet.status === 'DRAFT' && (
                  <Button className="w-full" onClick={() => handleSubmitForReview(detailSheet.id)}>
                    <Send className="w-4 h-4 mr-2" />
                    Gửi yêu cầu duyệt
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
