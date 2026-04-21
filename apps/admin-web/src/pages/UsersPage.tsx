/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo } from "react";
import {
    Avatar,
    Button,
    Card,
    Descriptions,
    Divider,
    Drawer,
    Input,
    Select,
    Space,
    Switch,
    Table,
    Tabs,
    Tag,
    Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { EyeOutlined, ReloadOutlined } from "@ant-design/icons";

import { useAdminUsersStore } from "@/store/adminUsersStore";
import type { AdminUserRow } from "@/service/adminUsers.service";
import { formatDateTime, formatDeviceLine } from "@/utils/loginFormat";
import { formatIp } from "@/utils/ipFormat";

const { Text, Title } = Typography;

type RoleKey = "customer" | "driver" | "merchant" | "admin";

const ROLE_META: Record<RoleKey, { color: string; label: string }> = {
    customer: { color: "geekblue", label: "Customer" },
    driver: { color: "cyan", label: "Driver" },
    merchant: { color: "purple", label: "Merchant" },
    admin: { color: "gold", label: "Admin" },
};

function renderRoleTag(role?: string | null) {
    const r = (role ?? "").toLowerCase() as RoleKey;
    const meta = (ROLE_META as any)[r];
    if (!meta) return <Tag>{role || "-"}</Tag>;
    return <Tag color={meta.color}>{meta.label}</Tag>;
}

function isActiveStatus(status?: string | null) {
    const s = String(status ?? "active").toLowerCase();
    return s === "active";
}

export default function UsersPage() {
    const {
        loading,
        detailLoading,
        error,
        tab,
        q,
        role,
        page,
        limit,
        total,
        users,
        drawerOpen,
        selectedUser,
        loginHistory,

        setTab,
        setQuery,
        setRole,
        setPage,

        fetchUsers,
        openDetail,
        closeDetail,
        fetchHistoryPage,
        toggleActive,
    } = useAdminUsersStore();

    useEffect(() => {
        fetchUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab, page, limit, role]);

    const columns: ColumnsType<AdminUserRow> = useMemo(
        () => [
            {
                title: "Người dùng",
                key: "user",
                render: (_: any, row: AdminUserRow) => {
                    const u = row.user;
                    const initial = (u.full_name || u.email || "U").slice(0, 1).toUpperCase();
                    const active = isActiveStatus(u.status);

                    return (
                        <Space size={12}>
                            <Avatar
                                src={u.avatar_url || undefined}
                                style={{
                                    background: "#1677ff",
                                    opacity: active ? 1 : 0.55,
                                }}
                            >
                                {initial}
                            </Avatar>

                            <div style={{ lineHeight: 1.15 }}>
                                <div style={{ fontWeight: 800, opacity: active ? 1 : 0.65 }}>
                                    {u.full_name || "-"}
                                </div>
                                <div style={{ color: "rgba(0,0,0,.55)" }}>
                                    <Text copyable={{ text: u.email || u.phone || "" }}>
                                        {u.email || u.phone || "-"}
                                    </Text>
                                </div>
                            </div>
                        </Space>
                    );
                },
            },
            {
                title: "Vai trò",
                dataIndex: ["user", "role"],
                key: "role",
                width: 140,
                render: (v: string) => renderRoleTag(v),
            },
            {
                title: "Trạng thái",
                key: "status",
                width: 170,
                render: (_: any, row: AdminUserRow) => {
                    const active = isActiveStatus(row.user.status);
                    return (
                        <Tag color={active ? "green" : "red"}>
                            {active ? "Đang hoạt động" : "Ngừng hoạt động"}
                        </Tag>
                    );
                },
            },
            {
                title: "Lần đăng nhập cuối",
                key: "last_login",
                render: (_: any, row: AdminUserRow) => (
                    <div style={{ lineHeight: 1.15 }}>
                        <div style={{ fontWeight: 700 }}>
                            {formatDateTime(row.last_login?.created_at)}
                        </div>
                        <div style={{ color: "rgba(0,0,0,.55)" }}>
                            {formatDeviceLine(row.last_login)}
                        </div>
                    </div>
                ),
            },
            {
                title: "IP",
                key: "ip",
                width: 170,
                align: "center",
                render: (_: any, row: AdminUserRow) => {
                    const ip = row.last_login?.ip;
                    return (
                        <span className="text-md font-medium text-red-600">{formatIp(ip) ?? "—"}</span>
                    );
                },
            },
            {
                title: "Ngày tạo",
                dataIndex: ["user", "created_at"],
                key: "created_at",
                width: 180,
                render: (v: string) => formatDateTime(v),
            },
            {
                title: "Thao tác",
                key: "action",
                width: 250,
                fixed: "right",
                render: (_: any, row: AdminUserRow) => {
                    const u = row.user;
                    const active = isActiveStatus(u.status);

                    return (
                        <Space>
                            <Button
                                type="primary"
                                ghost
                                icon={<EyeOutlined />}
                                onClick={() => openDetail(u.id)}
                            >
                                Chi tiết
                            </Button>

                            <Switch
                                checked={active}
                                checkedChildren="On"
                                unCheckedChildren="Off"
                                onChange={async (checked) => {
                                    await toggleActive(u.id, checked);
                                }}
                            />
                        </Space>
                    );
                },
            },
        ],
        [openDetail, toggleActive]
    );

    const historyColumns: ColumnsType<any> = useMemo(
        () => [
            {
                title: "Thời gian",
                dataIndex: "created_at",
                key: "created_at",
                width: 190,
                render: formatDateTime,
            },
            {
                title: "Platform",
                dataIndex: "platform",
                key: "platform",
                width: 130,
                render: (v) => <Tag color="blue">{v || "-"}</Tag>,
            },
            {
                title: "Thiết bị",
                key: "device",
                render: (_: any, r: any) => (
                    <Text type="secondary">{formatDeviceLine(r)}</Text>
                ),
            },
            {
                title: "IP",
                dataIndex: "ip",
                key: "ip",
                width: 170,
                align: "center",
                render: (v) => (
                    <span className="text-md font-medium text-red-600">{formatIp(v) ?? "—"}</span>
                ),
            },
        ],
        []
    );

    const selectedActive = isActiveStatus(selectedUser?.status);

    return (
        <div style={{ padding: 16 }}>
            <Card
                bordered={false}
                style={{ borderRadius: 14 }}
                bodyStyle={{ padding: 16 }}
                title={
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <Title level={4} style={{ margin: 0 }}>
                            Users
                        </Title>
                        <Text type="secondary">Quản lý người dùng & lịch sử đăng nhập</Text>
                    </div>
                }
                extra={
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={() => {
                            setPage(1);
                            fetchUsers();
                        }}
                    >
                        Refresh
                    </Button>
                }
            >
                {/* Toolbar */}
                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                    <Input.Search
                        allowClear
                        value={q}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Tìm theo tên / email / sđt..."
                        style={{ maxWidth: 420 }}
                        onSearch={(v) => {
                            // setRole(v === "all" ? undefined : v);
                            setPage(1);
                            fetchUsers();
                        }}
                    />

                    <Select
                        placeholder="Tất cả vai trò"
                        value={role ?? "all"}
                        style={{ width: 220 }}
                        onChange={(v) => {
                            setRole(v === "all" ? undefined : (v as any));
                            setPage(1);
                            // không cần gọi fetchUsers ở đây vì useEffect đang theo dõi role/page/tab
                            // nếu muốn gọi ngay vẫn ok:
                            // fetchUsers();
                        }}
                        options={[
                            { value: "all", label: "Tất cả vai trò" },
                            { value: "customer", label: "Khách hàng" },
                            { value: "driver", label: "Tài xế" },
                            { value: "merchant", label: "Merchant" },
                            { value: "admin", label: "Admin" },
                        ]}
                    />
                </div>

                <div style={{ marginTop: 12 }}>
                    <Tabs
                        activeKey={tab}
                        onChange={(k) => {
                            setTab(k as any);
                            setPage(1);
                        }}
                        items={[
                            { key: "all", label: "Tất cả" },
                            { key: "active", label: "Đang hoạt động" },
                            { key: "inactive", label: "Ngừng hoạt động" },
                        ]}
                    />
                </div>

                {error ? (
                    <div style={{ color: "#cf1322", marginBottom: 8 }}>{error}</div>
                ) : null}

                <Table
                    rowKey={(r) => r.user.id}
                    loading={loading}
                    columns={columns}
                    dataSource={users}
                    bordered
                    sticky
                    size="middle"
                    scroll={{ x: 1100 }}
                    rowClassName={(r) =>
                        isActiveStatus(r.user.status) ? "" : "opacity-80"
                    }
                    pagination={{
                        current: page,
                        pageSize: limit,
                        total,
                        showSizeChanger: true,
                        showTotal: (t) => `Tổng ${t} users`,
                        onChange: (p, ps) => setPage(p, ps),
                    }}
                />

                <Drawer
                    title="Chi tiết người dùng"
                    width={620}
                    open={drawerOpen}
                    onClose={closeDetail}
                    destroyOnClose
                >
                    {detailLoading ? (
                        <div>Loading...</div>
                    ) : (
                        <>
                            {/* lấy last login từ history item đầu tiên (mới nhất) */}
                            {(() => {
                                const last = loginHistory.items?.[0] ?? null;

                                return (
                                    <Descriptions
                                        bordered
                                        size="small"
                                        column={1}
                                        labelStyle={{ width: 160, color: "rgba(0,0,0,.55)" }}
                                        contentStyle={{ fontWeight: 600 }}
                                    >
                                        <Descriptions.Item label="Tên hiển thị">
                                            {selectedUser?.full_name || "-"}
                                        </Descriptions.Item>

                                        <Descriptions.Item label="Email">
                                            <Text copyable={{ text: selectedUser?.email || "" }}>
                                                {selectedUser?.email || "-"}
                                            </Text>
                                        </Descriptions.Item>

                                        <Descriptions.Item label="SĐT">
                                            <Text copyable={{ text: selectedUser?.phone || "" }}>
                                                {selectedUser?.phone || "-"}
                                            </Text>
                                        </Descriptions.Item>

                                        <Descriptions.Item label="Vai trò">
                                            {renderRoleTag(selectedUser?.role)}
                                        </Descriptions.Item>

                                        <Descriptions.Item label="Trạng thái">
                                            <Space>
                                                <Tag color={selectedActive ? "green" : "red"}>
                                                    {selectedActive ? "Đang hoạt động" : "Ngừng hoạt động"}
                                                </Tag>

                                                <Switch
                                                    checked={selectedActive}
                                                    onChange={async (checked) => {
                                                        if (!selectedUser?.id) return;
                                                        await toggleActive(selectedUser.id, checked);
                                                    }}
                                                />
                                            </Space>
                                        </Descriptions.Item>

                                        <Descriptions.Item label="Lần đăng nhập cuối">
                                            {last ? (
                                                <div style={{ lineHeight: 1.15 }}>
                                                    <div>{formatDateTime(last.created_at)}</div>
                                                    <div style={{ color: "rgba(0,0,0,.55)", fontWeight: 500 }}>
                                                        Thiết bị: {formatDeviceLine(last)}
                                                    </div>
                                                </div>
                                            ) : (
                                                <Text type="secondary">Chưa có dữ liệu</Text>
                                            )}
                                        </Descriptions.Item>

                                        <Descriptions.Item label="Ngày tạo">
                                            {formatDateTime(selectedUser?.created_at)}
                                        </Descriptions.Item>
                                    </Descriptions>
                                );
                            })()}

                            <div style={{ fontWeight: 800, margin: "14px 0 8px" }}>
                                Lịch sử đăng nhập
                            </div>

                            <Table
                                size="small"
                                rowKey={(r) => r._id ?? r.id ?? `${r.created_at}-${r.ip ?? ""}`}
                                loading={detailLoading}
                                columns={historyColumns}
                                dataSource={loginHistory.items}
                                bordered
                                pagination={{
                                    current: loginHistory.page,
                                    pageSize: loginHistory.limit,
                                    total: loginHistory.total,
                                    onChange: (p, ps) => fetchHistoryPage(p, ps),
                                }}
                            />
                        </>
                    )}
                </Drawer>
            </Card>
        </div>
    );
}