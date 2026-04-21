import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MoreHorizontal, Eye, Ban, CheckCircle, Clock, ShoppingCart, Star } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusBadge } from '@/components/ui/status-badge';

import { useAdminAuth, isSuperAdmin as checkIsSuperAdmin } from '@/store/authStore';
import { useMerchantApprovalStore } from '@/store/merchantApprovalStore';
import { Statistic, StatisticProps } from 'antd';
import CountUp from 'react-countup'

export default function MerchantList() {
  const formatter: StatisticProps['formatter'] = (value) => (
    <CountUp end={value as number} separator="," />
  );
  const { user } = useAdminAuth();
  const canManage = checkIsSuperAdmin(user);
  const navigate = useNavigate();
  const { merchants, pending, fetchMerchants, fetchReviewQueue, loading, error } = useMerchantApprovalStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedMerchants, setSelectedMerchants] = useState<string[]>([]);

  useEffect(() => {
    fetchMerchants();
    fetchReviewQueue(); // để show count pending trên nút Review Queue
  }, [fetchMerchants, fetchReviewQueue]);

  const filteredMerchants = useMemo(() => {
    return (merchants ?? []).filter((m) => {
      const q = searchQuery.trim().toLowerCase();

      const matchesSearch =
        !q ||
        (m.name ?? '').toLowerCase().includes(q) ||
        (m.email ?? '').toLowerCase().includes(q) ||
        (m.address ?? '').toLowerCase().includes(q) ||
        (m.district ?? '').toLowerCase().includes(q) ||
        (m.city ?? '').toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'all' || m.approval_status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [merchants, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const total = merchants.length;
    const active = merchants.filter((m) => m.is_active).length;
    const blocked = merchants.filter((m) => m.approval_status === 'blocked').length;
    return { total, active, blocked };
  }, [merchants]);

  const toggleSelectMerchant = (id: string) => {
    setSelectedMerchants((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (selectedMerchants.length === filteredMerchants.length) setSelectedMerchants([]);
    else setSelectedMerchants(filteredMerchants.map((m) => m.id));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Danh sách Merchant</h1>
          <p className="text-muted-foreground text-sm">
            Quản lý merchant sau duyệt {loading ? '• Đang tải...' : ''}
          </p>
          {error ? <p className="text-sm text-destructive mt-1">{error}</p> : null}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fetchMerchants()}>
            Tải lại
          </Button>
          <Link to="/merchants/pending">
            <Button variant="outline">
              <Clock className="h-4 w-4 mr-2" />
              Chờ duyệt ({pending.length})
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Tổng Merchant</p>
          <Statistic
            className='text-2xl font-bold mt-1'
            value={stats.total} formatter={formatter} />
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Đang hoạt động</p>
          <Statistic
            valueStyle={{ color: '#52c41a' }}
            className='text-2xl text-success font-bold mt-1'
            value={stats.active} formatter={formatter} />
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Đã khóa</p>
          <Statistic
            valueStyle={{ color: '#D83131' }}
            className='text-2xl text-red-600 font-bold mt-1'
            value={stats.blocked} formatter={formatter} />
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm theo tên, email, địa chỉ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="approved">Đã duyệt</SelectItem>
                <SelectItem value="blocked">Đã khóa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Merchants Table */}
      <Card
      >
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  {canManage && (
                    <th className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedMerchants.length === filteredMerchants.length && filteredMerchants.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-input"
                      />
                    </th>
                  )}
                  <th>Merchant</th>
                  <th>Trạng thái</th>
                  <th>Hoạt động</th>
                  <th>Rating</th>
                  <th>Đơn hàng</th>
                  <th>Acceptance</th>
                  <th>Cancel</th>
                  <th>Prep Time</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {filteredMerchants.length > 0 ? (
                  filteredMerchants.map((merchant) => (
                    <tr
                      key={merchant.id}
                      className="overflow-hidden cursor-pointer"
                      onClick={() => navigate(`/merchants/${merchant.id}`)}
                    >
                      {canManage && (
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedMerchants.includes(merchant.id)}
                            onChange={() => toggleSelectMerchant(merchant.id)}
                            className="rounded border-input"
                          />
                        </td>
                      )}

                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden">
                            {merchant.logo ? (
                              <img src={merchant.logo} alt={merchant.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                🏪
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{merchant.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {[merchant.district, merchant.city].filter(Boolean).join(', ')}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td>
                        <StatusBadge status={merchant.approval_status} />
                      </td>

                      <td>
                        {merchant.is_active ? (
                          <span className="text-success">Đang hoạt động</span>
                        ) : (
                          <span className="text-muted-foreground">Ngừng hoạt động</span>
                        )}
                      </td>

                      <td>
                        {typeof merchant.rating === 'number' && merchant.rating > 0 ? (
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-warning text-warning" />
                            <span>{merchant.rating.toFixed(1)}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>

                      <td>
                        <div className="flex items-center gap-1">
                          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                          {(merchant.totalOrders ?? 0).toLocaleString()}
                        </div>
                      </td>

                      <td>
                        {merchant.acceptanceRate ? (
                          <span
                            className={
                              merchant.acceptanceRate >= 95
                                ? 'text-success'
                                : merchant.acceptanceRate >= 90
                                  ? 'text-warning'
                                  : 'text-destructive'
                            }
                          >
                            {merchant.acceptanceRate}%
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>

                      <td>
                        {merchant.cancellationRate ? (
                          <span
                            className={
                              merchant.cancellationRate <= 3
                                ? 'text-success'
                                : merchant.cancellationRate <= 5
                                  ? 'text-warning'
                                  : 'text-destructive'
                            }
                          >
                            {merchant.cancellationRate}%
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>

                      <td>{merchant.avgPrepTime ? <span>{merchant.avgPrepTime}p</span> : '-'}</td>

                      <td>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>

                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link to={`/merchants/${merchant.id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                Xem chi tiết
                              </Link>
                            </DropdownMenuItem>

                            {canManage && (
                              <>
                                <DropdownMenuSeparator />
                                {merchant.approval_status === 'approved' && (
                                  <DropdownMenuItem className="text-destructive">
                                    <Ban className="h-4 w-4 mr-2" />
                                    Khóa tài khoản
                                  </DropdownMenuItem>
                                )}
                                {merchant.approval_status === 'blocked' && (
                                  <DropdownMenuItem className="text-success">
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Mở khóa
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={canManage ? 10 : 9} className="text-center py-12 text-muted-foreground">
                      Không tìm thấy merchant nào
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
