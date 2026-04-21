/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Input,
  Popconfirm,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  message,
} from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { usePromotionStore } from "@/store/promotionStore";
import { PromotionModal } from "@/components/promotion/PromotionModal";
import { useMenuStore } from "@/store/menuStore";

type TabKey = "all" | "active" | "inactive";

const SCOPE_LABEL: Record<string, string> = {
  food: "Món ăn",
  delivery: "Giao hàng",
  dine_in: "Tại quán",
};

const TYPE_LABEL: Record<string, string> = {
  percentage: "Giảm %",
  fixed_amount: "Giảm tiền",
};

const APPLY_LABEL: Record<string, string> = {
  order: "Tổng đơn",
  product: "Theo SP",
  category: "Theo danh mục",
  shipping: "Phí ship",
};

const ACTIVATION_LABEL: Record<string, string> = {
  auto: "Tự áp",
  voucher: "Voucher",
};

const ORDER_TYPE_LABEL: Record<string, string> = {
  delivery: "Delivery",
  dine_in: "Dine-in",
};

const PAYMENT_LABEL: Record<string, string> = {
  cash: "Cash",
  momo: "MoMo",
  vnpay: "VNPay",
  zalopay: "ZaloPay",
};

export default function PromotionsPage() {
  const {
    promotions,
    loading,
    fetchPromotions,
    createPromotion,
    updatePromotion,
    togglePromotion,
    deletePromotion,
  } = usePromotionStore();

  const { categories, products, fetchCategories, fetchProducts } = useMenuStore() as any;

  const [tab, setTab] = useState<TabKey>("all");
  const [q, setQ] = useState("");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([fetchPromotions(), fetchCategories?.(), fetchProducts?.()]).catch(() => {
      message.error("Tải dữ liệu thất bại");
    });
  }, [fetchPromotions, fetchCategories, fetchProducts]);

  const filtered = useMemo(() => {
    const key = q.trim().toLowerCase();

    let rows = promotions ?? [];
    if (tab === "active") rows = rows.filter((p: any) => !!p.is_active);
    if (tab === "inactive") rows = rows.filter((p: any) => !p.is_active);

    if (!key) return rows;
    return rows.filter((p: any) => {
      return (
        String(p.name ?? "").toLowerCase().includes(key) ||
        String(p.exclusive_group ?? "").toLowerCase().includes(key)
      );
    });
  }, [promotions, tab, q]);

  const submitPromotion = async (payload: any) => {
    setSaving(true);
    try {
      if (!editing) {
        await createPromotion(payload);
        await fetchPromotions();
        message.success("Đã tạo chương trình");
        setOpen(false);
        setEditing(null);
        return;
      }

      await updatePromotion(String(editing._id), payload);
      await fetchPromotions();
      message.success("Đã cập nhật chương trình");
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
      title: "Chương trình",
      dataIndex: "name",
      width: 240,
      render: (text: string, record: any) => (
        <div>
          <div className="font-medium">{text}</div>
          <div style={{ marginTop: 6 }}>
            <Tag color={record.activation_type === "voucher" ? "purple" : "green"}>
              {ACTIVATION_LABEL[record.activation_type] ?? record.activation_type}
            </Tag>
            {record.exclusive_group ? <Tag>{record.exclusive_group}</Tag> : null}
          </div>
        </div>
      ),
    },
    {
      title: "Phạm vi",
      dataIndex: "scope",
      width: 110,
      render: (v: string) => <Tag>{SCOPE_LABEL[v] ?? v}</Tag>,
    },
    {
      title: "Loại giảm",
      dataIndex: "type",
      width: 110,
      render: (v: string) => <Tag color="blue">{TYPE_LABEL[v] ?? v}</Tag>,
    },
    {
      title: "Áp dụng",
      dataIndex: "apply_level",
      width: 120,
      render: (v: string) => <Tag color="geekblue">{APPLY_LABEL[v] ?? v}</Tag>,
    },
    {
      title: "Giảm",
      width: 150,
      render: (_: any, r: any) => {
        const v = Number(r.discount_value ?? 0);
        return r.type === "percentage" ? `${v}%` : `${v.toLocaleString("vi-VN")}đ`;
      },
    },
    {
      title: "Priority",
      width: 90,
      render: (_: any, r: any) => <span>{Number(r.priority ?? 0)}</span>,
    },
    {
      title: "Order types",
      width: 180,
      render: (_: any, r: any) => {
        const arr = Array.isArray(r.allowed_order_types) ? r.allowed_order_types : [];
        if (!arr.length) return <Tag>All</Tag>;
        return (
          <>
            {arr.map((x: string) => (
              <Tag key={x}>{ORDER_TYPE_LABEL[x] ?? x}</Tag>
            ))}
          </>
        );
      },
    },
    {
      title: "Payment",
      width: 180,
      render: (_: any, r: any) => {
        const arr = Array.isArray(r.allowed_payment_methods) ? r.allowed_payment_methods : [];
        if (!arr.length) return <Tag>All</Tag>;
        return (
          <>
            {arr.map((x: string) => (
              <Tag key={x}>{PAYMENT_LABEL[x] ?? x}</Tag>
            ))}
          </>
        );
      },
    },
    {
      title: "Stack voucher",
      width: 140,
      render: (_: any, r: any) => (
        <Tag color={r.can_stack_with_voucher ? "green" : "red"}>
          {r.can_stack_with_voucher ? "Cho phép" : "Không"}
        </Tag>
      ),
    },
    {
      title: "Thời gian",
      width: 220,
      render: (_: any, r: any) => {
        const from = r?.conditions?.valid_from
          ? dayjs(r.conditions.valid_from).format("DD/MM/YYYY HH:mm")
          : "—";
        const to = r?.conditions?.valid_to
          ? dayjs(r.conditions.valid_to).format("DD/MM/YYYY HH:mm")
          : "—";
        return `${from} - ${to}`;
      },
    },
    {
      title: "Trạng thái",
      width: 140,
      render: (_: any, r: any) => (
        <Space>
          <Switch
            checked={!!r.is_active}
            onChange={async (checked) => {
              try {
                await togglePromotion(String(r._id), checked);
                message.success("Đã cập nhật trạng thái");
                await fetchPromotions();
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
      width: 180,
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
              title="Xoá vĩnh viễn chương trình?"
              description="Bạn chắc chắn muốn xoá? Không thể khôi phục."
              okText="Xoá"
              cancelText="Huỷ"
              okButtonProps={{ danger: true }}
              onConfirm={async () => {
                try {
                  await deletePromotion(String(r._id));
                  await fetchPromotions();
                  message.success("Đã xoá chương trình");
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
          <h2 style={{ margin: 0 }}>Chương trình khuyến mãi</h2>
          <div style={{ color: "#777" }}>Tạo và quản lý chương trình của quán</div>
        </div>

        <Space>
          <Input
            placeholder="Tìm theo tên chương trình..."
            allowClear
            style={{ width: 320 }}
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
          >
            Tạo chương trình
          </Button>
        </Space>
      </div>

      <Tabs
        activeKey={tab}
        onChange={(k) => setTab(k as TabKey)}
        items={[
          { key: "all", label: "Tất cả" },
          { key: "active", label: "Đang hoạt động" },
          { key: "inactive", label: "Đã tắt" },
        ]}
      />

      <div style={{ background: "#fff", padding: 12, borderRadius: 12 }}>
        <Table
          rowKey={(r: any) => String(r._id)}
          loading={loading}
          columns={columns as any}
          dataSource={filtered}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1750 }}
        />
      </div>

      <PromotionModal
        open={open}
        editing={editing}
        saving={saving}
        products={products ?? []}
        categories={categories ?? []}
        onCancel={() => {
          setOpen(false);
          setEditing(null);
        }}
        onSubmit={submitPromotion}
      />
    </div>
  );
}