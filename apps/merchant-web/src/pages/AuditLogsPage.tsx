import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Search, FileText, Calendar, Filter } from 'lucide-react';
import { mockAuditLogs } from '@/data/mockData';
import { UserRole } from '@/types';

const roleConfig: Record<UserRole, { label: string; color: string }> = {
  OWNER: { label: 'Chủ quán', color: 'bg-primary text-primary-foreground' },
  MANAGER: { label: 'Quản lý', color: 'bg-accent text-accent-foreground' },
  STAFF: { label: 'Nhân viên', color: 'bg-muted text-muted-foreground' },
};

const actionConfig: Record<string, { label: string; color: string }> = {
  CREATE: { label: 'Tạo mới', color: 'bg-success/10 text-success border-success' },
  UPDATE: { label: 'Cập nhật', color: 'bg-accent/10 text-accent border-accent' },
  DELETE: { label: 'Xoá', color: 'bg-destructive/10 text-destructive border-destructive' },
};

export default function AuditLogsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('7d');

  const filteredLogs = mockAuditLogs.filter(log => {
    const matchSearch = log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.target.toLowerCase().includes(searchQuery.toLowerCase());
    const matchAction = actionFilter === 'all' || log.action === actionFilter;
    return matchSearch && matchAction;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Nhật ký hoạt động</h1>
        <p className="text-muted-foreground">Theo dõi các thay đổi và hoạt động trong hệ thống</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Hành động" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="CREATE">Tạo mới</SelectItem>
            <SelectItem value="UPDATE">Cập nhật</SelectItem>
            <SelectItem value="DELETE">Xoá</SelectItem>
          </SelectContent>
        </Select>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-[140px]">
            <Calendar className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1d">Hôm nay</SelectItem>
            <SelectItem value="7d">7 ngày</SelectItem>
            <SelectItem value="30d">30 ngày</SelectItem>
            <SelectItem value="90d">90 ngày</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Lịch sử hoạt động
          </CardTitle>
          <CardDescription>{filteredLogs.length} bản ghi</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Thời gian</TableHead>
                <TableHead>Người thực hiện</TableHead>
                <TableHead>Hành động</TableHead>
                <TableHead>Đối tượng</TableHead>
                <TableHead>Chi tiết</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map(log => (
                <TableRow key={log.id}>
                  <TableCell className="text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString('vi-VN')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{log.userName}</span>
                      <Badge className={`${roleConfig[log.userRole].color} text-xs`}>
                        {roleConfig[log.userRole].label}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={actionConfig[log.action]?.color}>
                      {actionConfig[log.action]?.label || log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{log.target}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {log.details}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {filteredLogs.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Không có bản ghi nào</p>
            <p className="text-muted-foreground">Thử thay đổi bộ lọc để xem kết quả khác</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
