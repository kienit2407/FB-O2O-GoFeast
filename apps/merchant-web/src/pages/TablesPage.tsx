/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from 'react';
import {
    Badge,
    Button,
    Card,
    Col,
    Empty,
    Input,
    Popconfirm,
    Row,
    Select,
    Space,
    Statistic,
    Table,
    Tag,
    Tooltip,
    Tabs,
    message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
    DeleteOutlined,
    EditOutlined,
    EyeOutlined,
    PlusOutlined,
    ReloadOutlined,
    SearchOutlined,
    UserOutlined,
} from '@ant-design/icons';

import { useTableStore } from '@/store/tableStore';
import type { MerchantTable, MerchantTableStatus } from '@/service/table.service';
import { useMerchantAuth } from '@/store/authStore';
import TableFormModal from '@/components/dine-in/TableFormModal';
import TableQrModal from '@/components/dine-in/TableQrModal';

type StatusFilter = 'all' | MerchantTableStatus;
type ActiveFilter = 'all' | 'active' | 'inactive';

type VisualTableState = 'available' | 'occupied' | 'reserved' | 'inactive';

const statusColorMap: Record<MerchantTableStatus, string> = {
    available: 'green',
    occupied: 'blue',
    reserved: 'orange',
};

const statusLabelMap: Record<MerchantTableStatus, string> = {
    available: 'Trống',
    occupied: 'Đang dùng',
    reserved: 'Đã đặt',
};

const visualStateConfig: Record<
    VisualTableState,
    {
        label: string;
        cardBg: string;
        borderColor: string;
        textColor: string;
        tagColor: string;
    }
> = {
    available: {
        label: 'Bàn trống',
        cardBg: '#f6ffed',
        borderColor: '#b7eb8f',
        textColor: '#389e0d',
        tagColor: 'green',
    },
    occupied: {
        label: 'Có khách',
        cardBg: '#e6f4ff',
        borderColor: '#91caff',
        textColor: '#0958d9',
        tagColor: 'blue',
    },
    reserved: {
        label: 'Đã đặt',
        cardBg: '#fff7e6',
        borderColor: '#ffd591',
        textColor: '#d46b08',
        tagColor: 'orange',
    },
    inactive: {
        label: 'Tạm tắt',
        cardBg: '#fafafa',
        borderColor: '#d9d9d9',
        textColor: '#8c8c8c',
        tagColor: 'default',
    },
};

function getVisualTableState(row: MerchantTable): VisualTableState {
    if (!row.is_active) return 'inactive';

    // Ưu tiên session/current_session trước
    if (row.current_session_id) return 'occupied';

    if (row.status === 'occupied') return 'occupied';
    if (row.status === 'reserved') return 'reserved';

    return 'available';
}

export default function TablesPage() {
    const tables = useTableStore((s) => s.tables);
    const isLoading = useTableStore((s) => s.isLoading);
    const isSubmitting = useTableStore((s) => s.isSubmitting);
    const fetchTables = useTableStore((s) => s.fetchTables);
    const createTable = useTableStore((s) => s.createTable);
    const updateTable = useTableStore((s) => s.updateTable);
    const regenerateQr = useTableStore((s) => s.regenerateQr);
    const removeTable = useTableStore((s) => s.removeTable);

    const merchant = useMerchantAuth((s) => s.merchant as any);

    const merchantName =
        merchant?.name ||
        merchant?.merchant_name ||
        merchant?.business_name ||
        'Nhà hàng';

    const [keyword, setKeyword] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');

    const [openForm, setOpenForm] = useState(false);
    const [openQr, setOpenQr] = useState(false);
    const [editingTable, setEditingTable] = useState<MerchantTable | null>(null);
    const [selectedTable, setSelectedTable] = useState<MerchantTable | null>(null);

    useEffect(() => {
        fetchTables().catch((e: any) => {
            message.error(e?.response?.data?.message || 'Không tải được danh sách bàn');
        });
    }, [fetchTables]);

    const stats = useMemo(() => {
        const total = tables.length;
        const active = tables.filter((x) => x.is_active).length;
        const available = tables.filter((x) => getVisualTableState(x) === 'available').length;
        const occupied = tables.filter((x) => getVisualTableState(x) === 'occupied').length;
        const reserved = tables.filter((x) => getVisualTableState(x) === 'reserved').length;

        return { total, active, available, occupied, reserved };
    }, [tables]);

    const filteredTables = useMemo(() => {
        return tables.filter((item) => {
            const q = keyword.trim().toLowerCase();

            const matchKeyword =
                !q ||
                item.table_number?.toLowerCase().includes(q) ||
                item.name?.toLowerCase().includes(q);

            const matchStatus =
                statusFilter === 'all' ? true : item.status === statusFilter;

            const matchActive =
                activeFilter === 'all'
                    ? true
                    : activeFilter === 'active'
                        ? item.is_active
                        : !item.is_active;

            return matchKeyword && matchStatus && matchActive;
        });
    }, [tables, keyword, statusFilter, activeFilter]);

    const handleCreate = async (values: any) => {
        try {
            await createTable(values);
            message.success('Tạo bàn thành công');
            setOpenForm(false);
            setEditingTable(null);
        } catch (e: any) {
            message.error(e?.response?.data?.message || 'Tạo bàn thất bại');
        }
    };

    const handleUpdate = async (values: any) => {
        if (!editingTable) return;

        try {
            await updateTable(editingTable._id, values);
            message.success('Cập nhật bàn thành công');
            setOpenForm(false);
            setEditingTable(null);
        } catch (e: any) {
            message.error(e?.response?.data?.message || 'Cập nhật bàn thất bại');
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await removeTable(id);
            message.success('Xoá bàn thành công');
            if (selectedTable?._id === id) {
                setSelectedTable(null);
                setOpenQr(false);
            }
        } catch (e: any) {
            message.error(e?.response?.data?.message || 'Xoá bàn thất bại');
        }
    };

    const handleRegenerateQr = async (id: string) => {
        try {
            const updated = await regenerateQr(id);
            message.success('Tạo lại QR thành công');

            if (selectedTable?._id === id) {
                setSelectedTable(updated);
            }
        } catch (e: any) {
            message.error(e?.response?.data?.message || 'Tạo lại QR thất bại');
        }
    };

    const columns: ColumnsType<MerchantTable> = [
        {
            title: 'Bàn',
            key: 'table',
            width: 220,
            render: (_, row) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>
                        Bàn {row.table_number}
                    </span>
                    <span style={{ color: '#8c8c8c', fontSize: 13 }}>
                        {row.name?.trim() || 'Chưa đặt tên bàn'}
                    </span>
                </div>
            ),
        },
        {
            title: 'Sức chứa',
            dataIndex: 'capacity',
            key: 'capacity',
            width: 120,
            render: (v: number) => `${v || 0} khách`,
        },
        {
            title: 'Tình trạng',
            dataIndex: 'status',
            key: 'status',
            width: 130,
            render: (v: MerchantTableStatus) => (
                <Tag color={statusColorMap[v]}>{statusLabelMap[v]}</Tag>
            ),
        },
        {
            title: 'Hoạt động',
            dataIndex: 'is_active',
            key: 'is_active',
            width: 120,
            render: (v: boolean) =>
                v ? <Tag color="success">Đang bật</Tag> : <Tag>Tạm tắt</Tag>,
        },
        {
            title: 'QR',
            key: 'qr',
            width: 110,
            render: (_, row) =>
                row.qr_content ? <Tag color="processing">Sẵn sàng</Tag> : <Tag>Chưa có</Tag>,
        },
        {
            title: 'Thao tác',
            key: 'actions',
            width: 260,
            render: (_, row) => (
                <Space wrap size={6}>
                    <Tooltip title="Xem QR">
                        <Button
                            icon={<EyeOutlined />}
                            onClick={() => {
                                setSelectedTable(row);
                                setOpenQr(true);
                            }}
                        />
                    </Tooltip>

                    <Tooltip title="Sửa bàn">
                        <Button
                            icon={<EditOutlined />}
                            onClick={() => {
                                setEditingTable(row);
                                setOpenForm(true);
                            }}
                        />
                    </Tooltip>

                    <Tooltip title="Tạo lại mã QR">
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={() => handleRegenerateQr(row._id)}
                            loading={isSubmitting}
                        />
                    </Tooltip>

                    <Popconfirm
                        title="Xoá bàn này?"
                        description="Bàn đang có phiên hoạt động sẽ không xoá được."
                        okText="Xoá"
                        cancelText="Huỷ"
                        onConfirm={() => handleDelete(row._id)}
                    >
                        <Button danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const renderGridView = () => {
        if (!filteredTables.length) {
            return (
                <Empty
                    description="Chưa có bàn nào"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
            );
        }

        return (
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                    gap: 16,
                }}
            >
                {filteredTables.map((row) => {
                    const visualState = getVisualTableState(row);
                    const cfg = visualStateConfig[visualState];

                    return (
                        <div
                            key={row._id}
                            style={{
                                border: `1.5px solid ${cfg.borderColor}`,
                                background: cfg.cardBg,
                                borderRadius: 18,
                                minHeight: 220,
                                padding: 16,
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
                            }}
                        >
                            <div>
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start',
                                        marginBottom: 12,
                                    }}
                                >
                                    <div>
                                        <div
                                            style={{
                                                fontSize: 20,
                                                fontWeight: 800,
                                                color: '#111827',
                                                lineHeight: 1.1,
                                            }}
                                        >
                                            Bàn {row.table_number}
                                        </div>
                                        <div
                                            style={{
                                                color: '#6b7280',
                                                fontSize: 13,
                                                marginTop: 4,
                                                minHeight: 20,
                                            }}
                                        >
                                            {row.name?.trim() || 'Không có tên phụ'}
                                        </div>
                                    </div>

                                    <Badge
                                        status={
                                            visualState === 'available'
                                                ? 'success'
                                                : visualState === 'occupied'
                                                    ? 'processing'
                                                    : visualState === 'reserved'
                                                        ? 'warning'
                                                        : 'default'
                                        }
                                    />
                                </div>

                                <Tag color={cfg.tagColor} style={{ marginBottom: 12 }}>
                                    {cfg.label}
                                </Tag>

                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        color: cfg.textColor,
                                        fontWeight: 600,
                                        marginBottom: 10,
                                    }}
                                >
                                    <UserOutlined />
                                    <span>{row.capacity || 0} khách</span>
                                </div>

                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {row.is_active ? (
                                        <Tag color="success">Đang bật</Tag>
                                    ) : (
                                        <Tag>Tạm tắt</Tag>
                                    )}

                                    {row.current_session_id ? (
                                        <Tag color="blue">Có session</Tag>
                                    ) : (
                                        <Tag>Chưa có session</Tag>
                                    )}
                                </div>
                            </div>

                            <div style={{
                                display: 'flex',
                                marginTop: 16,
                                gap: 8, // Khoảng cách giữa các nút
                                width: '100%'
                            }}>
                                <Button
                                    size="small"
                                    icon={<EyeOutlined />}
                                    style={{ flex: 1, padding: '0 4px', fontSize: 13 }} // Thêm flex: 1 để tự co giãn
                                    onClick={() => {
                                        setSelectedTable(row);
                                        setOpenQr(true);
                                    }}
                                >
                                    QR
                                </Button>

                                <Button
                                    size="small"
                                    icon={<EditOutlined />}
                                    style={{ flex: 1, padding: '0 4px', fontSize: 13 }}
                                    onClick={() => {
                                        setEditingTable(row);
                                        setOpenForm(true);
                                    }}
                                >
                                    Sửa
                                </Button>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false}>
                        <Statistic title="Tổng số bàn" value={stats.total} />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false}>
                        <Statistic
                            title="Đang hoạt động"
                            value={stats.active}
                            valueStyle={{ color: '#1677ff' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false}>
                        <Statistic
                            title="Bàn trống"
                            value={stats.available}
                            valueStyle={{ color: '#52c41a' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false}>
                        <Statistic
                            title="Đang dùng / Đã đặt"
                            value={`${stats.occupied} / ${stats.reserved}`}
                        />
                    </Card>
                </Col>
            </Row>

            <Card
                bordered={false}
                title="Quản lý bàn"
                extra={
                    <Space>
                        <Button icon={<ReloadOutlined />} onClick={() => fetchTables()}>
                            Tải lại
                        </Button>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => {
                                setEditingTable(null);
                                setOpenForm(true);
                            }}
                        >
                            Thêm bàn
                        </Button>
                    </Space>
                }
            >
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '1.4fr 1fr 1fr',
                        gap: 12,
                        marginBottom: 16,
                    }}
                >
                    <Input
                        allowClear
                        placeholder="Tìm theo số bàn hoặc tên bàn"
                        prefix={<SearchOutlined />}
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                    />

                    <Select
                        value={statusFilter}
                        onChange={(v) => setStatusFilter(v)}
                        options={[
                            { label: 'Tất cả tình trạng', value: 'all' },
                            { label: 'Trống', value: 'available' },
                            { label: 'Đang dùng', value: 'occupied' },
                            { label: 'Đã đặt', value: 'reserved' },
                        ]}
                    />

                    <Select
                        value={activeFilter}
                        onChange={(v) => setActiveFilter(v)}
                        options={[
                            { label: 'Tất cả trạng thái hoạt động', value: 'all' },
                            { label: 'Đang bật', value: 'active' },
                            { label: 'Tạm tắt', value: 'inactive' },
                        ]}
                    />
                </div>

                <Tabs
                    defaultActiveKey="grid"
                    items={[
                        {
                            key: 'grid',
                            label: 'Sơ đồ bàn',
                            children: renderGridView(),
                        },
                        {

                            key: 'list',
                            label: 'Danh sách bàn',
                            children: (
                                <Table
                                    rowKey="_id"
                                    loading={isLoading}
                                    columns={columns}
                                    dataSource={filteredTables}
                                    pagination={{
                                        pageSize: 10,
                                        showSizeChanger: false,
                                        hideOnSinglePage: filteredTables.length <= 10,
                                    }}
                                    locale={{
                                        emptyText: (
                                            <Empty
                                                description="Chưa có bàn nào"
                                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                            />
                                        ),
                                    }}
                                    scroll={{ x: 1100 }}
                                />
                            ),
                        },
                    ]}
                />
            </Card>

            <TableFormModal
                open={openForm}
                loading={isSubmitting}
                initialValue={editingTable}
                onCancel={() => {
                    setOpenForm(false);
                    setEditingTable(null);
                }}
                onSubmit={editingTable ? handleUpdate : handleCreate}
            />

            <TableQrModal
                open={openQr}
                table={selectedTable}
                merchantName={merchantName}
                onClose={() => {
                    setOpenQr(false);
                    setSelectedTable(null);
                }}
            />
        </div>
    );
}