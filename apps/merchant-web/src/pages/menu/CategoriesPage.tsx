/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";

import { useMenuStore } from "@/store/menuStore";
import type { Category } from "@/types";

type Mode = "create" | "edit";
type ActiveTab = "all" | "active" | "inactive";

type FormValues = {
  name: string;
  description?: string;
};

export default function CategoriesPage() {
  // ===== store =====
  const categories = useMenuStore((s) => s.categories);
  const fetchCategories = useMenuStore((s) => s.fetchCategories);
  const createCategory = useMenuStore((s) => s.createCategory);
  const updateCategory = useMenuStore((s) => s.updateCategory);
  const toggleCategoryActive = useMenuStore((s) => s.toggleCategoryActive);
  const reorderCategories = useMenuStore((s) => s.reorderCategories);
  const deleteCategory = useMenuStore((s) => s.deleteCategory);

  // ===== UI state =====
  const [q, setQ] = useState("");
  const [activeTab, setActiveTab] = useState<ActiveTab>("all");

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("create");
  const [editing, setEditing] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);

  const [form] = Form.useForm<FormValues>();

  useEffect(() => {
    fetchCategories({ includeInactive: true }).catch(() => { });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sorted = useMemo(() => {
    return [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [categories]);

  const tabCounts = useMemo(() => {
    const all = sorted.length;
    const active = sorted.filter((c) => !!c.isActive).length;
    const inactive = all - active;
    return { all, active, inactive };
  }, [sorted]);

  const filtered = useMemo(() => {
    let arr = [...sorted];

    // ✅ filter theo tab trước
    if (activeTab === "active") arr = arr.filter((c) => !!c.isActive);
    if (activeTab === "inactive") arr = arr.filter((c) => !c.isActive);

    // ✅ rồi mới search
    const key = q.trim().toLowerCase();
    if (!key) return arr;
    return arr.filter((c) => c.name.toLowerCase().includes(key));
  }, [sorted, q, activeTab]);

  const canDelete = activeTab === "inactive"; // ✅ chỉ tab ngừng hoạt động
  const tabLabel = (text: string, count: number) => (
    <Badge count={count} showZero size="default" offset={[8, -4]}>
      <span style={{ paddingRight: 5, display: "inline-block" }}>{text}</span>
    </Badge>
  );
  const openCreate = () => {
    setMode("create");
    setEditing(null);
    form.setFieldsValue({ name: "", description: "" });
    setOpen(true);
  };

  const openEdit = (cat: Category) => {
    setMode("edit");
    setEditing(cat);
    form.setFieldsValue({
      name: cat.name || "",
      description: cat.description || "",
    });
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setSaving(false);
    setEditing(null);
    form.resetFields();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const payload = {
        name: values.name.trim(),
        description: (values.description || "").trim(),
      };

      if (mode === "create") {
        await createCategory(payload);
        message.success("Tạo danh mục thành công");
      } else {
        if (!editing) return;
        await updateCategory(editing.id, payload);
        message.success("Cập nhật danh mục thành công");
      }

      closeModal();
      fetchCategories({ includeInactive: true }).catch(() => { });
    } catch (e: any) {
      if (e?.errorFields?.length) return;
      console.error(e);
      message.error(e?.message || "Có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  };

  const handleMoveUp = async (indexInFiltered: number) => {
    if (indexInFiltered === 0) return;

    const ids = sorted.map((c) => c.id);
    const currentId = filtered[indexInFiltered]?.id;
    const aboveId = filtered[indexInFiltered - 1]?.id;
    if (!currentId || !aboveId) return;

    const i1 = ids.indexOf(currentId);
    const i2 = ids.indexOf(aboveId);
    if (i1 < 0 || i2 < 0) return;

    [ids[i1], ids[i2]] = [ids[i2], ids[i1]];

    try {
      await reorderCategories(ids);
      message.success("Đã cập nhật thứ tự");
    } catch (e: any) {
      console.error(e);
      message.error(e?.message || "Không cập nhật được thứ tự");
    }
  };

  const handleMoveDown = async (indexInFiltered: number) => {
    if (indexInFiltered === filtered.length - 1) return;

    const ids = sorted.map((c) => c.id);
    const currentId = filtered[indexInFiltered]?.id;
    const belowId = filtered[indexInFiltered + 1]?.id;
    if (!currentId || !belowId) return;

    const i1 = ids.indexOf(currentId);
    const i2 = ids.indexOf(belowId);
    if (i1 < 0 || i2 < 0) return;

    [ids[i1], ids[i2]] = [ids[i2], ids[i1]];

    try {
      await reorderCategories(ids);
      message.success("Đã cập nhật thứ tự");
    } catch (e: any) {
      console.error(e);
      message.error(e?.message || "Không cập nhật được thứ tự");
    }
  };

  const columns: ColumnsType<Category> = [
    {
      title: "Thứ tự",
      key: "order",
      width: 110,
      render: (_: any, record: Category) => {
        const idx = filtered.findIndex((c) => c.id === record.id);
        return (
          <Space>
            <Button size="small" icon={<ArrowUpOutlined />} onClick={() => handleMoveUp(idx)} disabled={idx <= 0} />
            <Button
              size="small"
              icon={<ArrowDownOutlined />}
              onClick={() => handleMoveDown(idx)}
              disabled={idx < 0 || idx >= filtered.length - 1}
            />
          </Space>
        );
      },
    },
    {
      title: "Tên danh mục",
      dataIndex: "name",
      key: "name",
      render: (text: string, record) => (
        <div>
          <div style={{ fontWeight: 600 }}>{text}</div>
          {record.description ? <div style={{ fontSize: 12, color: "#777" }}>{record.description}</div> : null}
        </div>
      ),
    },
    {
      title: "Trạng thái",
      key: "isActive",
      width: 220,
      render: (_: any, record) => (
        <Space>
          <Switch
            checked={!!record.isActive}
            onChange={async () => {
              try {
                await toggleCategoryActive(record.id);
                message.success("Đã cập nhật trạng thái");
              } catch (e: any) {
                console.error(e);
                message.error(e?.message || "Không cập nhật được");
              }
            }}
          />
          {record.isActive ? <Tag color="green">Hiển thị</Tag> : <Tag>Ẩn</Tag>}
        </Space>
      ),
    },
    {
      title: "Hành động",
      key: "actions",
      width: 240,
      render: (_: any, record) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => openEdit(record)}>
            Sửa
          </Button>

          {/* ✅ chỉ hiện Xoá khi ở tab inactive */}
          {canDelete ? (
            <Popconfirm
              title="Xoá danh mục"
              description="Bạn có chắc muốn xoá danh mục này?"
              okText="Xoá"
              cancelText="Huỷ"
              okButtonProps={{ danger: true }}
              onConfirm={async () => {
                try {
                  await deleteCategory(record.id);
                  message.success("Đã xoá danh mục");
                } catch (e: any) {
                  console.error(e);
                  message.error(e?.message || "Không xoá được");
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
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            Danh mục
          </Typography.Title>
          <div style={{ color: "#777" }}>Quản lý danh mục sản phẩm của quán</div>
        </div>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              fetchCategories({ includeInactive: true }).catch(() => { });
              message.success("Đã tải lại danh sách");
            }}
          >
            Tải lại
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Thêm danh mục
          </Button>
        </Space>
      </div>

      {/* Filters */}
      <div style={{ background: "#fff", padding: 12, borderRadius: 12, marginBottom: 12 }}>
        <Input
          style={{ width: 320 }}
          placeholder="Tìm kiếm danh mục..."
          prefix={<SearchOutlined />}
          allowClear
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {/* ✅ Tabs giống Products */}
      <Tabs
        activeKey={activeTab}
        onChange={(k) => setActiveTab(k as ActiveTab)}
        items={[
          { key: "all", label: tabLabel("Tất cả", tabCounts.all) },
          { key: "active", label: tabLabel("Còn hoạt động", tabCounts.active) },
          { key: "inactive", label: tabLabel("Ngừng hoạt động", tabCounts.inactive) },
        ]}
      />

      {/* Table */}
      <div style={{ background: "#fff", padding: 12, borderRadius: 12 }}>
        <Table<Category> rowKey={(r) => r.id} columns={columns} dataSource={filtered} pagination={{ pageSize: 10 }} />
      </div>

      {/* Modal */}
      <Modal
        title={mode === "create" ? "Thêm danh mục" : "Chỉnh sửa danh mục"}
        open={open}
        onCancel={closeModal}
        onOk={() => form.submit()}
        okText={mode === "create" ? "Tạo" : "Lưu"}
        cancelText="Huỷ"
        confirmLoading={saving}
        maskClosable={false}
        destroyOnClose
      >
        <Form<FormValues> form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ name: "", description: "" }}>
          <Form.Item
            label="Tên danh mục"
            name="name"
            rules={[
              { required: true, message: "Vui lòng nhập tên danh mục" },
              { max: 160, message: "Tên tối đa 160 ký tự" },
            ]}
          >
            <Input placeholder="VD: Cà phê, Trà, Bánh ngọt..." />
          </Form.Item>

          <Form.Item label="Mô tả (tuỳ chọn)" name="description" rules={[{ max: 2000, message: "Mô tả tối đa 2000 ký tự" }]}>
            <Input.TextArea rows={4} placeholder="Mô tả ngắn về danh mục..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}