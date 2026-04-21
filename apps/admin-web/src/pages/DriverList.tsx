/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, MoreHorizontal, Eye, Star, Clock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { StatusBadge } from '@/components/ui/status-badge';

import { useAdminAuth, isSuperAdmin as checkIsSuperAdmin } from '@/store/authStore';
import { useDriverApprovalStore } from '@/store/driverApprovalStore';

type VehicleFilter = 'all' | 'motorbike' | 'car' | 'bicycle';

const deriveVehicleType = (licenseType?: string | null): VehicleFilter => {
  const t = String(licenseType ?? '').toUpperCase();
  if (t === 'A1' || t === 'A2') return 'motorbike';
  if (t === 'B1' || t === 'B2') return 'car';
  return 'all';
};

export default function DriverList() {
  const { user } = useAdminAuth();
  const canManage = checkIsSuperAdmin(user);

  const { drivers, fetchDrivers, loading } = useDriverApprovalStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [vehicleFilter, setVehicleFilter] = useState<VehicleFilter>('all');

  useEffect(() => {
    fetchDrivers('list');
  }, [fetchDrivers]);

  const pendingCount = useMemo(
    () => drivers.filter((d) => d.verification_status === 'pending').length,
    [drivers],
  );

  const getTimeAgo = (date?: string | null) => {
    if (!date) return '-';
    const ts = new Date(date).getTime();
    if (Number.isNaN(ts)) return '-';

    const minutes = Math.floor((Date.now() - ts) / 60000);
    if (minutes < 60) return `${minutes}p trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h trước`;
    return `${Math.floor(hours / 24)}d trước`;
  };

  const filteredDrivers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return drivers.filter((row) => {
      const u = row.user;
      const p = row.driver_profile;

      const name = (u.full_name ?? '').toLowerCase();
      const phone = u.phone ?? '';
      const plate = (p?.vehicle_plate ?? '').toLowerCase();

      const matchesSearch =
        !q ||
        name.includes(q) ||
        phone.includes(q) ||
        plate.includes(q);

      const matchesStatus = statusFilter === 'all' || row.verification_status === statusFilter;

      const vType = deriveVehicleType(p?.license_type ?? null);
      const matchesVehicle = vehicleFilter === 'all' || vType === vehicleFilter;

      return matchesSearch && matchesStatus && matchesVehicle;
    });
  }, [drivers, searchQuery, statusFilter, vehicleFilter]);

  const stats = useMemo(() => {
    const total = drivers.length;
    const approved = drivers.filter((d) => d.verification_status === 'approved').length;
    const pending = drivers.filter((d) => d.verification_status === 'pending').length;
    const rejected = drivers.filter((d) => d.verification_status === 'rejected').length;
    return { total, approved, pending, rejected };
  }, [drivers]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Danh sách Driver</h1>
          <p className="text-muted-foreground text-sm">
            Quản lý tất cả driver trên hệ thống {loading ? '(đang tải...)' : ''}
          </p>
        </div>

        <Link to="/drivers/pending">
          <Button variant="outline">
            <Clock className="h-4 w-4 mr-2" />
            Chờ duyệt ({pendingCount})
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Tổng Driver</p>
          <p className="text-2xl font-bold mt-1">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Đã duyệt</p>
          <p className="text-2xl font-bold mt-1 text-success">{stats.approved}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Chờ duyệt</p>
          <p className="text-2xl font-bold mt-1 text-warning">{stats.pending}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Từ chối</p>
          <p className="text-2xl font-bold mt-1 text-destructive">{stats.rejected}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm theo tên, SĐT, biển số..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="pending">Chờ duyệt</SelectItem>
                <SelectItem value="approved">Đã duyệt</SelectItem>
                <SelectItem value="rejected">Từ chối</SelectItem>
                <SelectItem value="draft">Nháp</SelectItem>
              </SelectContent>
            </Select>

            <Select value={vehicleFilter} onValueChange={(v) => setVehicleFilter(v as VehicleFilter)}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Loại xe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="motorbike">Xe máy</SelectItem>
                <SelectItem value="car">Ô tô</SelectItem>
                <SelectItem value="bicycle">Xe đạp</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Driver</th>
                  <th>Hãng xe</th>
                  <th>Biển số</th>
                  <th>Trạng thái</th>
                  <th>Chuyến đi</th>
                  <th>Rating</th>
                  <th>Lần cập nhật</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredDrivers.length > 0 ? (
                  filteredDrivers.map((row) => {
                    const p = row.driver_profile;
                    return (
                      <tr key={row.user.id}>
                        <td>
                          <div>
                            <p className="font-medium">{row.user.full_name ?? row.user.email ?? '-'}</p>
                            <p className="text-xs text-muted-foreground">{row.user.phone ?? '-'}</p>
                          </div>
                        </td>

                        <td>{p?.vehicle_brand ?? '-'}</td>
                        <td className="font-mono text-sm">{p?.vehicle_plate ?? '-'}</td>

                        <td>
                          <StatusBadge status={row.verification_status} />
                        </td>

                        <td>{(p?.total_deliveries ?? 0).toLocaleString()}</td>

                        <td>
                          {(p?.average_rating ?? 0) > 0 ? (
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-warning text-warning" />
                              <span>{Number(p?.average_rating ?? 0).toFixed(1)}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>

                        <td className="text-sm text-muted-foreground">
                          {getTimeAgo(p?.updated_at ?? p?.submitted_at ?? p?.created_at ?? null)}
                        </td>

                        <td>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link to={`/drivers/${row.user.id}`}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Xem chi tiết
                                </Link>
                              </DropdownMenuItem>

                              {/* nếu bạn muốn quick action ở list thì thêm ở đây (optional)
                                  còn không thì duyệt ở /drivers/pending */}
                              {!canManage ? null : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-muted-foreground">
                      Không tìm thấy driver nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}