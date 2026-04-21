/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { Button, Input, Popconfirm, Space, Switch, Table, Tag, Typography, message, Image } from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined, ArrowUpOutlined, ArrowDownOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

import { useMenuStore } from "@/store/menuStore";
import type { Topping } from "@/types";
import ToppingModalAntd from "@/components/menu/ToppingModal";

type Mode = "create" | "edit";

export default function ToppingsPage() {
  const toppings = useMenuStore((s) => s.toppings);
  const fetchToppings = useMenuStore((s) => s.fetchToppings);
  const createTopping = useMenuStore((s) => s.createTopping);
  const updateTopping = useMenuStore((s) => s.updateTopping);
  const toggleToppingAvailable = useMenuStore((s) => s.toggleToppingAvailable);
  const deleteTopping = useMenuStore((s) => s.deleteTopping);
  const reorderToppings = useMenuStore((s) => s.reorderToppings);

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("create");
  const [editing, setEditing] = useState<Topping | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchToppings({ includeInactive: true }).catch(() => { });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sorted = useMemo(() => [...toppings].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [toppings]);

  const filtered = useMemo(() => {
    const key = q.trim().toLowerCase();
    if (!key) return sorted;
    return sorted.filter((t) => t.name.toLowerCase().includes(key));
  }, [sorted, q]);

  const openCreate = () => {
    setMode("create");
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (t: Topping) => {
    setMode("edit");
    setEditing(t);
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setSaving(false);
    setEditing(null);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);

  const columns: ColumnsType<Topping> = [
    {
      title: "Thứ tự",
      key: "order",
      width: 110,
      render: (_: any, record: Topping) => {
        const idx = filtered.findIndex((t) => t.id === record.id);

        const moveUp = async () => {
          if (idx <= 0) return;
          const ids = sorted.map((t) => t.id);
          const currentId = filtered[idx]?.id;
          const aboveId = filtered[idx - 1]?.id;
          const i1 = ids.indexOf(currentId);
          const i2 = ids.indexOf(aboveId);
          [ids[i1], ids[i2]] = [ids[i2], ids[i1]];
          await reorderToppings(ids);
          message.success("Đã cập nhật thứ tự");
        };

        const moveDown = async () => {
          if (idx < 0 || idx >= filtered.length - 1) return;
          const ids = sorted.map((t) => t.id);
          const currentId = filtered[idx]?.id;
          const belowId = filtered[idx + 1]?.id;
          const i1 = ids.indexOf(currentId);
          const i2 = ids.indexOf(belowId);
          [ids[i1], ids[i2]] = [ids[i2], ids[i1]];
          await reorderToppings(ids);
          message.success("Đã cập nhật thứ tự");
        };

        return (
          <Space>
            <Button size="small" icon={<ArrowUpOutlined />} onClick={() => moveUp().catch(() => message.error("Không cập nhật được"))} disabled={idx <= 0} />
            <Button size="small" icon={<ArrowDownOutlined />} onClick={() => moveDown().catch(() => message.error("Không cập nhật được"))} disabled={idx < 0 || idx >= filtered.length - 1} />
          </Space>
        );
      },
    },
    {
      title: "Ảnh",
      key: "image",
      width: 90,
      render: (_: any, record: Topping) => {
        if (!record.imageUrl) return <span style={{ color: "#999" }}>—</span>;
        return (
          <Image.PreviewGroup>
            <Image
              src={record.imageUrl}
              height={80}
              width={80}
              alt="banner"
              style={{ objectFit: "cover", borderRadius: 8, border: "1px solid #eee" }}
            />
          </Image.PreviewGroup>
        );
      },
    },
    { title: "Tên topping", dataIndex: "name", key: "name", render: (text: string) => <b>{text}</b> },
    { title: "Giá", dataIndex: "price", key: "price", width: 160, render: (v: number) => formatCurrency(v || 0) },
    {
      title: "Trạng thái",
      key: "isAvailable",
      width: 220,
      render: (_: any, record) => (
        <Space>
          <Switch
            checked={!!record.isAvailable}
            onChange={async () => {
              try {
                await toggleToppingAvailable(record.id);
                message.success("Đã cập nhật trạng thái");
              } catch (e: any) {
                message.error(e?.message || "Không cập nhật được");
              }
            }}
          />
          {record.isAvailable ? <Tag color="green">Còn hàng</Tag> : <Tag color="red">Hết hàng</Tag>}
        </Space>
      ),
    },
    {
      title: "Hành động",
      key: "actions",
      width: 240,
      render: (_: any, record) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => openEdit(record)}>Sửa</Button>
          <Popconfirm
            title="Xoá topping"
            description="Bạn có chắc muốn xoá topping này?"
            okText="Xoá"
            cancelText="Huỷ"
            okButtonProps={{ danger: true }}
            onConfirm={async () => {
              await deleteTopping(record.id);
              message.success("Đã xoá topping");
            }}
          >
            <Button danger icon={<DeleteOutlined />}>Xoá</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>Topping</Typography.Title>
          <div style={{ color: "#777" }}>Quản lý các topping thêm vào đồ uống</div>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => fetchToppings({ includeInactive: true }).catch(() => { })}>Tải lại</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Thêm topping</Button>
        </Space>
      </div>

      <div style={{ background: "#fff", padding: 12, borderRadius: 12, marginBottom: 12 }}>
        <Input style={{ width: 320 }} placeholder="Tìm kiếm topping..." allowClear value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div style={{ background: "#fff", padding: 12, borderRadius: 12 }}>
        <Table<Topping> rowKey={(r) => r.id} columns={columns} dataSource={filtered} pagination={{ pageSize: 10 }} />
      </div>

      <ToppingModalAntd
        open={open}
        mode={mode}
        saving={saving}
        initialData={editing}
        // requireImage={true} // <- bật nếu muốn bắt buộc có ảnh
        onCancel={closeModal}
        onSubmit={async ({ values, imageFile, removeImage }) => {
          setSaving(true);
          try {
            if (mode === "create") {
              await createTopping({ ...values, imageFile }); // store/service phải nhận imageFile
              message.success("Tạo topping thành công");
            } else {
              if (!editing) return;
              await updateTopping(editing.id, { ...values, imageFile, removeImage });
              message.success("Cập nhật topping thành công");
            }
            closeModal();
            await fetchToppings({ includeInactive: true });
          } finally {
            setSaving(false);
          }
        }}
      />
    </div>
  );
}