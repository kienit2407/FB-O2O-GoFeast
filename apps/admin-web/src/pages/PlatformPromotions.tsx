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
  Image,
  Typography,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  PictureOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import { useAdminPromotionsStore } from "@/store/adminPromotionsStore";
import { AdminPromotionModal } from "@/components/promotion/AdminPromotionModal";
import AdminCarouselBannersModal from "@/components/promotion/AdminCarouselBannersModal";

const { Text } = Typography;

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
  shipping: "Phí ship",
};

const ACTIVATION_LABEL: Record<string, string> = {
  auto: "Tự áp",
  voucher: "Voucher",
};

const PAYMENT_LABEL: Record<string, string> = {
  cash: "Tiền mặt",
  momo: "MoMo",
  vnpay: "VNPay",
  zalopay: "ZaloPay",
};

const EXCLUSIVE_GROUP_LABEL: Record<string, string> = {
  food_order: "Ưu đãi món / đơn ăn",
  shipping: "Ưu đãi phí giao hàng",
  dinein_order: "Ưu đãi tại quán",
};

function formatDiscount(r: any) {
  const v = Number(r.discount_value ?? 0);
  return r.type === "percentage" ? `${v}%` : `${v.toLocaleString("vi-VN")}đ`;
}

function formatDateTime(v?: string | null) {
  if (!v) return "—";
  return dayjs(v).format("DD/MM/YYYY HH:mm");
}

function formatDateTimeSec(v?: string | null) {
  if (!v) return "—";
  return dayjs(v).format("DD/MM/YYYY HH:mm:ss");
}

export default function PlatformPromotions() {
  const {
    promotions,
    loading,
    fetchPromotions,
    createPromotion,
    updatePromotion,
    togglePromotion,
    deletePromotion,
    uploadPromotionBanner,
  } = useAdminPromotionsStore();

  const [tab, setTab] = useState<TabKey>("all");
  const [q, setQ] = useState("");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [openBanners, setOpenBanners] = useState(false);

  useEffect(() => {
    fetchPromotions().catch(() => message.error("Tải dữ liệu thất bại"));
  }, [fetchPromotions]);

  const filtered = useMemo(() => {
    const key = q.trim().toLowerCase();
    let rows = promotions ?? [];

    if (tab === "active") rows = rows.filter((p: any) => !!p.is_active);
    if (tab === "inactive") rows = rows.filter((p: any) => !p.is_active);

    if (!key) return rows;

    return rows.filter((p: any) => {
      return (
        String(p.name ?? "").toLowerCase().includes(key) ||
        String(p.description ?? "").toLowerCase().includes(key) ||
        String(p.exclusive_group ?? "").toLowerCase().includes(key) ||
        String(p.push_noti_title ?? "").toLowerCase().includes(key)
      );
    });
  }, [promotions, tab, q]);

  const submitPromotion = async ({
    payload,
    bannerFile,
  }: {
    payload: any;
    bannerFile: File | null;
    bannerRemoved: boolean;
  }) => {
    if (saving) return;
    setSaving(true);

    try {
      if (!editing) {
        if (!bannerFile) {
          message.error("Vui lòng tải banner trước khi tạo");
          return;
        }

        await createPromotion(payload, bannerFile);
        await fetchPromotions();
        message.success("Đã tạo platform promotion");
        setOpen(false);
        setEditing(null);
        return;
      }

      await updatePromotion(String(editing._id), payload);

      if (bannerFile) {
        await uploadPromotionBanner(String(editing._id), bannerFile);
      }

      await fetchPromotions();
      message.success("Đã cập nhật platform promotion");
      setOpen(false);
      setEditing(null);
    } catch (e: any) {
      message.error(
        e?.response?.data?.message || e?.message || "Có lỗi xảy ra"
      );
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      title: "Banner",
      width: 110,
      render: (_: any, r: any) => {
        const url = r?.banner_admin_url;
        if (!url) return <span style={{ color: "#999" }}>—</span>;

        return (
          <Image.PreviewGroup>
            <Image
              src={url}
              alt="banner"
              width={84}
              height={84}
              style={{
                objectFit: "cover",
                borderRadius: 10,
                border: "1px solid #eee",
              }}
            />
          </Image.PreviewGroup>
        );
      },
    },
    {
      title: "Chương trình",
      render: (_: any, r: any) => (
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>{r.name}</div>

          {!!r.description && (
            <div style={{ marginBottom: 8, color: "#666", lineHeight: 1.5 }}>
              <Text
                style={{
                  color: "#666",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {r.description}
              </Text>
            </div>
          )}

          <Space size={[6, 6]} wrap>
            <Tag color={r.activation_type === "voucher" ? "purple" : "green"}>
              {ACTIVATION_LABEL[r.activation_type] ?? r.activation_type}
            </Tag>

            <Tag>{SCOPE_LABEL[r.scope] ?? r.scope}</Tag>

            {r.exclusive_group ? (
              <Tag color="default">
                {EXCLUSIVE_GROUP_LABEL[r.exclusive_group] ?? r.exclusive_group}
              </Tag>
            ) : null}
          </Space>
        </div>
      ),
    },
    {
      title: "Cấu hình ưu đãi",
      render: (_: any, r: any) => {
        const payments = Array.isArray(r.allowed_payment_methods)
          ? r.allowed_payment_methods
          : [];

        return (
          <div style={{ minWidth: 0 }}>
            <div style={{ marginBottom: 6 }}>
              <Text strong>{formatDiscount(r)}</Text>
              <Text style={{ color: "#666" }}>
                {" "}
                • {TYPE_LABEL[r.type] ?? r.type}
              </Text>
            </div>

            <div style={{ marginBottom: 6, color: "#666" }}>
              Áp dụng: <b>{APPLY_LABEL[r.apply_level] ?? r.apply_level}</b>
              {" • "}
              Priority: <b>{Number(r.priority ?? 0)}</b>
            </div>

            <div style={{ marginBottom: 6 }}>
              <Tag color={r.can_stack_with_voucher ? "green" : "red"}>
                {r.can_stack_with_voucher
                  ? "Cho phép stack voucher"
                  : "Không stack voucher"}
              </Tag>
            </div>

            <div>
              {payments.length ? (
                <Space size={[6, 6]} wrap>
                  {payments.map((x: string) => (
                    <Tag key={x}>{PAYMENT_LABEL[x] ?? x}</Tag>
                  ))}
                </Space>
              ) : (
                <Text style={{ color: "#666" }}>Thanh toán: Tất cả</Text>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: "Thời gian & Push",
      render: (_: any, r: any) => (
        <div style={{ minWidth: 0 }}>
          <div style={{ marginBottom: 6 }}>
            <Text style={{ color: "#666" }}>Từ:</Text>{" "}
            <Text strong>{formatDateTime(r?.conditions?.valid_from)}</Text>
          </div>

          <div style={{ marginBottom: 8 }}>
            <Text style={{ color: "#666" }}>Đến:</Text>{" "}
            <Text strong>{formatDateTime(r?.conditions?.valid_to)}</Text>
          </div>

          <div style={{ marginBottom: 8 }}>
            <Space>
              <Switch
                checked={!!r.show_push_noti}
                onChange={async (checked) => {
                  try {
                    await updatePromotion(String(r._id), {
                      show_push_noti: checked,
                    });
                    message.success("Đã cập nhật push noti");
                    await fetchPromotions();
                  } catch (e: any) {
                    message.error(
                      e?.response?.data?.message ||
                      e?.message ||
                      "Có lỗi xảy ra"
                    );
                  }
                }}
              />
              <Text>{r.show_push_noti ? "Bật push" : "Tắt push"}</Text>
            </Space>
          </div>

          <div style={{ marginBottom: 6 }}>
            <Text style={{ color: "#666" }}>Tiêu đề push:</Text>{" "}
            <Text>
              {r?.push_noti_title?.trim()
                ? r.push_noti_title
                : "—"}
            </Text>
          </div>

          <div>
            <Text style={{ color: "#666" }}>Đã gửi lúc:</Text>{" "}
            <Text>{formatDateTimeSec(r?.push_sent_at)}</Text>
          </div>
        </div>
      ),
    },
    {
      title: "Trạng thái",
      width: 160,
      render: (_: any, r: any) => (
        <Space direction="vertical" size={8}>
          <Space>
            <Switch
              checked={!!r.is_active}
              onChange={async (checked) => {
                try {
                  await togglePromotion(String(r._id), checked);
                  message.success("Đã cập nhật trạng thái");
                  await fetchPromotions();
                } catch (e: any) {
                  message.error(
                    e?.response?.data?.message ||
                    e?.message ||
                    "Có lỗi xảy ra"
                  );
                }
              }}
            />
            <span>{r.is_active ? "Đang bật" : "Đang tắt"}</span>
          </Space>

          {r.show_as_popup ? (
            <Tag color="gold">Hiện popup</Tag>
          ) : (
            <Tag>Không popup</Tag>
          )}
        </Space>
      ),
    },
    {
      title: "Hành động",
      width: 170,
      render: (_: any, r: any) => (
        <Space direction="vertical" size={8}>
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
              title="Xoá vĩnh viễn promotion?"
              description="Bạn chắc chắn muốn xoá? Không thể khôi phục."
              okText="Xoá"
              cancelText="Huỷ"
              okButtonProps={{ danger: true }}
              onConfirm={async () => {
                try {
                  await deletePromotion(String(r._id));
                  await fetchPromotions();
                  message.success("Đã xoá promotion");
                } catch (e: any) {
                  message.error(
                    e?.response?.data?.message ||
                    e?.message ||
                    "Không xoá được"
                  );
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
      <div style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Platform Promotions</h2>
        <div style={{ color: "#777" }}>
          Super Admin quản lý chương trình platform
        </div>

        <div
          style={{
            marginTop: 10,
            display: "flex",
            justifyContent: "flex-start",
          }}
        >
          <Space wrap>
            <Button
              type="primary"
              icon={<PictureOutlined />}
              onClick={() => setOpenBanners(true)}
            >
              Quản lý banner
            </Button>

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
              Tạo promotion
            </Button>
          </Space>
        </div>
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

      <div
        style={{
          background: "#fff",
          padding: 12,
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <Table
          rowKey={(r: any) => String(r._id)}
          loading={loading}
          columns={columns as any}
          dataSource={filtered}
          pagination={{ pageSize: 10 }}
          tableLayout="fixed"
        />
      </div>

      <AdminPromotionModal
        open={open}
        editing={editing}
        saving={saving}
        onCancel={() => {
          setOpen(false);
          setEditing(null);
        }}
        onSubmit={submitPromotion}
      />

      <AdminCarouselBannersModal
        open={openBanners}
        onClose={() => setOpenBanners(false)}
      />
    </div>
  );
}