/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { Button, Input, Popconfirm, Space, Switch, Table, Tabs, Tag, message } from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import { usePromotionStore } from "@/store/promotionStore";
import VoucherModal from "@/components/promotion/VoucherModal";

type TabKey = "all" | "active" | "inactive";

export default function VouchersPage() {
    const {
        promotions,
        vouchers,
        loading,
        fetchPromotions,
        fetchVouchers,
        createVoucher,
        updateVoucher,
        toggleVoucher,
        deleteVoucher,
    } = usePromotionStore();

    const [tab, setTab] = useState<TabKey>("all");
    const [q, setQ] = useState("");

    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<any | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        Promise.all([fetchPromotions(), fetchVouchers()]).catch(() => {
            message.error("Tải dữ liệu thất bại");
        });
    }, [fetchPromotions, fetchVouchers]);

    const promoMap = useMemo(() => {
        const m = new Map<string, any>();
        promotions.forEach((p) => m.set(String(p._id), p));
        return m;
    }, [promotions]);

    const voucherPromotions = useMemo(() => {
        return (promotions ?? []).filter((p: any) => p?.activation_type === "voucher");
    }, [promotions]);

    const filtered = useMemo(() => {
        const key = q.trim().toLowerCase();

        let rows = vouchers;
        if (tab === "active") rows = vouchers.filter((v) => !!v.is_active);
        if (tab === "inactive") rows = vouchers.filter((v) => !v.is_active);

        if (!key) return rows;
        return rows.filter((v) => String(v.code ?? "").toLowerCase().includes(key));
    }, [vouchers, tab, q]);

    const handleSubmit = async (payload: any) => {
        if (saving) return;

        setSaving(true);
        try {
            if (editing) {
                await updateVoucher(String(editing._id), payload);
                message.success("Đã cập nhật voucher");
            } else {
                await createVoucher(payload);
                message.success("Đã tạo voucher");
            }

            await fetchVouchers();
            setOpen(false);
            setEditing(null);
        } catch (e: any) {
            message.error(e?.response?.data?.message || e?.message || "Có lỗi xảy ra");
        } finally {
            setSaving(false);
        }
    };

    const columns = [
        {
            title: "Mã",
            dataIndex: "code",
            width: 180,
            render: (v: string) => (
                <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{v}</span>
            ),
        },
        {
            title: "Promotion",
            dataIndex: "promotion_id",
            render: (pid: any) => {
                const id = typeof pid === "string" ? pid : String(pid?._id ?? "");
                const p = promoMap.get(id);
                return p ? (
                    <div>
                        <div>{p.name}</div>
                        <div style={{ marginTop: 4 }}>
                            <Tag>{p.scope}</Tag>
                            <Tag color="purple">{p.apply_level}</Tag>
                        </div>
                    </div>
                ) : (
                    <Tag>Unknown</Tag>
                );
            },
        },
        {
            title: "Giới hạn",
            width: 200,
            render: (_: any, r: any) => {
                const total = Number(r.total_usage_limit ?? 0);
                const perUser = Number(r.per_user_limit ?? 0);
                return (
                    <div style={{ fontSize: 12 }}>
                        <div>Tổng: {total > 0 ? total : "∞"}</div>
                        <div>Mỗi khách: {perUser > 0 ? perUser : "∞"}</div>
                    </div>
                );
            },
        },
        {
            title: "Đã dùng",
            width: 120,
            render: (_: any, r: any) => <span>{Number(r.current_usage ?? 0)}</span>,
        },
        {
            title: "Thời gian",
            width: 220,
            render: (_: any, r: any) => {
                const from = r?.start_date ? dayjs(r.start_date).format("DD/MM/YYYY") : "—";
                const to = r?.end_date ? dayjs(r.end_date).format("DD/MM/YYYY") : "—";
                return `${from} - ${to}`;
            },
        },
        {
            title: "Hoạt động",
            width: 160,
            render: (_: any, r: any) => (
                <Space>
                    <Switch
                        checked={!!r.is_active}
                        onChange={async (checked) => {
                            try {
                                await toggleVoucher(String(r._id), checked);
                                message.success("Đã cập nhật trạng thái");
                                await fetchVouchers();
                            } catch (e: any) {
                                message.error(e?.response?.data?.message || e?.message || "Có lỗi xảy ra");
                            }
                        }}
                    />
                    <span>{r.is_active ? "Bật" : "Tắt"}</span>
                </Space>
            ),
        },
        {
            title: "Hành động",
            width: 220,
            render: (_: any, r: any) => (
                <Space>
                    <Button
                        icon={<EditOutlined />}
                        onClick={() => {
                            setEditing(r);
                            setOpen(true);
                        }}
                    >
                        Sửa
                    </Button>

                    {!r.is_active ? (
                        <Popconfirm
                            title="Xoá vĩnh viễn voucher?"
                            description="Bạn chắc chắn muốn xoá? Không thể khôi phục."
                            okText="Xoá"
                            cancelText="Huỷ"
                            okButtonProps={{ danger: true }}
                            onConfirm={async () => {
                                try {
                                    await deleteVoucher(String(r._id));
                                    message.success("Đã xoá voucher");
                                    await fetchVouchers();
                                } catch (e: any) {
                                    message.error(e?.response?.data?.message || e?.message || "Không xoá được");
                                }
                            }}
                        >
                            <Button danger icon={<DeleteOutlined />}>
                                Xoá
                            </Button>
                        </Popconfirm>
                    ) : null}
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: 12 }}>
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 12,
                }}
            >
                <div>
                    <h2 style={{ margin: 0 }}>Voucher</h2>
                    <div style={{ color: "#777" }}>
                        Tạo và quản lý voucher. Chỉ chọn promotion có activation_type = voucher
                    </div>
                </div>

                <Space>
                    <Input
                        placeholder="Tìm voucher..."
                        allowClear
                        style={{ width: 280 }}
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                    />
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => {
                            setEditing(null);
                            setOpen(true);
                        }}
                        disabled={!voucherPromotions.length}
                    >
                        Tạo voucher
                    </Button>
                </Space>
            </div>

            <Tabs
                activeKey={tab}
                onChange={(k) => setTab(k as TabKey)}
                items={[
                    { key: "all", label: "Tất cả" },
                    { key: "active", label: "Hoạt động" },
                    { key: "inactive", label: "Không hoạt động" },
                ]}
            />

            <div style={{ background: "#fff", padding: 12, borderRadius: 12 }}>
                <Table
                    rowKey={(r: any) => String(r._id)}
                    loading={loading}
                    columns={columns as any}
                    dataSource={filtered}
                    pagination={{ pageSize: 10 }}
                />
            </div>

            <VoucherModal
                open={open}
                editing={editing}
                promotions={promotions}
                saving={saving}
                onCancel={() => {
                    setOpen(false);
                    setEditing(null);
                }}
                onSubmit={handleSubmit}
            />
        </div>
    );
}