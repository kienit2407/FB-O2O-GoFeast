import { useState } from 'react';
import {
  Plus,
  Search,
  Users,
  MoreHorizontal,
  Pencil,
  Lock,
  Unlock,
  Key,
  Trash2,
  Shield,
  User,
  Mail,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { mockUsers, mockBranches } from '@/data/mockData';
import { User as UserType, UserRole } from '@/types';

const roleConfig: Record<UserRole, { label: string; color: string; description: string }> = {
  OWNER: { 
    label: 'Chủ quán', 
    color: 'bg-primary text-primary-foreground',
    description: 'Toàn quyền quản lý tất cả chi nhánh'
  },
  MANAGER: { 
    label: 'Quản lý', 
    color: 'bg-accent text-accent-foreground',
    description: 'Quản lý đơn hàng, menu, nhân viên của chi nhánh được gán'
  },
  STAFF: { 
    label: 'Nhân viên', 
    color: 'bg-muted text-muted-foreground',
    description: 'Xử lý đơn hàng, xem menu'
  },
};

export default function TeamPage() {
  const [users, setUsers] = useState<UserType[]>(mockUsers);
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialog, setCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'STAFF' as UserRole,
    branchId: '',
  });
  const { toast } = useToast();

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getBranchName = (branchId?: string) => {
    if (!branchId) return 'Tất cả chi nhánh';
    return mockBranches.find(b => b.id === branchId)?.name || 'Không xác định';
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleCreate = () => {
    const newUser: UserType = {
      id: `user-${Date.now()}`,
      name: formData.name,
      email: formData.email,
      role: formData.role,
      branchId: formData.branchId || undefined,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    setUsers(prev => [...prev, newUser]);
    setCreateDialog(false);
    setFormData({ name: '', email: '', role: 'STAFF', branchId: '' });
    toast({ 
      title: 'Đã thêm nhân sự mới', 
      description: `Email mời đã được gửi đến ${formData.email}` 
    });
  };

  const handleToggleLock = (id: string) => {
    setUsers(prev => prev.map(u =>
      u.id === id ? { ...u, isActive: !u.isActive } : u
    ));
    const user = users.find(u => u.id === id);
    toast({ 
      title: user?.isActive ? 'Đã khoá tài khoản' : 'Đã mở khoá tài khoản',
      variant: user?.isActive ? 'destructive' : 'default',
    });
  };

  const handleResetPassword = (id: string) => {
    const user = users.find(u => u.id === id);
    toast({ 
      title: 'Đã gửi email đặt lại mật khẩu', 
      description: `Email đã được gửi đến ${user?.email}` 
    });
  };

  const handleDelete = (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
    toast({ title: 'Đã xoá nhân sự', variant: 'destructive' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Nhân sự</h1>
          <p className="text-muted-foreground">Quản lý đội ngũ và phân quyền</p>
        </div>
        <Dialog open={createDialog} onOpenChange={setCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Thêm nhân sự
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Thêm nhân sự mới</DialogTitle>
              <DialogDescription>
                Mời thành viên mới tham gia quản lý quán
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Họ tên *</Label>
                <Input
                  placeholder="Nguyễn Văn A"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Vai trò *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(v: UserRole) => setFormData(prev => ({ ...prev, role: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MANAGER">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Quản lý
                      </div>
                    </SelectItem>
                    <SelectItem value="STAFF">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Nhân viên
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {roleConfig[formData.role].description}
                </p>
              </div>
              {formData.role !== 'OWNER' && (
                <div className="space-y-2">
                  <Label>Chi nhánh *</Label>
                  <Select
                    value={formData.branchId}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, branchId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn chi nhánh" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockBranches.filter(b => b.status === 'ACTIVE').map(branch => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialog(false)}>Huỷ</Button>
              <Button 
                onClick={handleCreate} 
                disabled={!formData.name || !formData.email || (formData.role !== 'OWNER' && !formData.branchId)}
              >
                Gửi lời mời
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(roleConfig).map(([role, config]) => {
          const count = users.filter(u => u.role === role).length;
          return (
            <Card key={role}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${config.color}`}>
                    <Users className="w-5 h-5" />
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

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm nhân sự..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nhân sự</TableHead>
                <TableHead>Vai trò</TableHead>
                <TableHead>Chi nhánh</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map(user => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={roleConfig[user.role].color}>
                      {roleConfig[user.role].label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">
                      {getBranchName(user.branchId)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? 'default' : 'secondary'}>
                      {user.isActive ? 'Hoạt động' : 'Đã khoá'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Pencil className="w-4 h-4 mr-2" />
                          Chỉnh sửa
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleResetPassword(user.id)}>
                          <Key className="w-4 h-4 mr-2" />
                          Đặt lại mật khẩu
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleToggleLock(user.id)}>
                          {user.isActive ? (
                            <>
                              <Lock className="w-4 h-4 mr-2" />
                              Khoá tài khoản
                            </>
                          ) : (
                            <>
                              <Unlock className="w-4 h-4 mr-2" />
                              Mở khoá
                            </>
                          )}
                        </DropdownMenuItem>
                        {user.role !== 'OWNER' && (
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(user.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Xoá
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
