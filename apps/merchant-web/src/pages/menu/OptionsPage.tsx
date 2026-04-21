/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";
import {
  Button,
  Collapse,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";

import { mockOptionGroups } from "@/data/mockData";
import type { Option, OptionGroup } from "@/types";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

type GroupFormValues = {
  name: string;
  type: "single" | "multiple";
  required: boolean;
};

type OptionFormValues = {
  name: string;
  priceAdjustment: number;
};

type GroupModalMode = "create" | "edit";
type OptionModalMode = "create" | "edit";

export default function OptionsPage() {
  const [q, setQ] = useState("");
  const [groups, setGroups] = useState<OptionGroup[]>(mockOptionGroups);

  // ===== Group modal =====
  const [groupOpen, setGroupOpen] = useState(false);
  const [groupMode, setGroupMode] = useState<GroupModalMode>("create");
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupSaving, setGroupSaving] = useState(false);
  const [groupForm] = Form.useForm<GroupFormValues>();

  // ===== Option modal =====
  const [optionOpen, setOptionOpen] = useState(false);
  const [optionMode, setOptionMode] = useState<OptionModalMode>("create");
  const [optionSaving, setOptionSaving] = useState(false);
  const [optionForm] = Form.useForm<OptionFormValues>();
  const [optionTarget, setOptionTarget] = useState<{ groupId: string; optionId?: string } | null>(null);

  const filteredGroups = useMemo(() => {
    const key = q.trim().toLowerCase();
    if (!key) return groups;
    return groups.filter((g) => g.name.toLowerCase().includes(key));
  }, [groups, q]);

  const openCreateGroup = () => {
    setGroupMode("create");
    setEditingGroupId(null);
    groupForm.setFieldsValue({ name: "", type: "single", required: false });
    setGroupOpen(true);
  };

  const openEditGroup = (g: OptionGroup) => {
    setGroupMode("edit");
    setEditingGroupId(g.id);
    groupForm.setFieldsValue({ name: g.name, type: g.type, required: !!g.required });
    setGroupOpen(true);
  };

  const closeGroup = () => {
    setGroupOpen(false);
    setGroupSaving(false);
    setEditingGroupId(null);
    groupForm.resetFields();
  };

  const submitGroup = async () => {
    try {
      const values = await groupForm.validateFields();
      setGroupSaving(true);

      if (groupMode === "create") {
        const newGroup: OptionGroup = {
          id: `opt-${Date.now()}`,
          name: values.name.trim(),
          type: values.type,
          required: !!values.required,
          options: [],
        } as any;

        setGroups((prev) => [...prev, newGroup]);
        message.success("Đã tạo nhóm tuỳ chọn");
      } else {
        if (!editingGroupId) return;

        setGroups((prev) =>
          prev.map((g) =>
            g.id === editingGroupId
              ? { ...g, name: values.name.trim(), type: values.type, required: !!values.required }
              : g
          )
        );
        message.success("Đã cập nhật nhóm tuỳ chọn");
      }

      closeGroup();
    } catch (e: any) {
      if (e?.errorFields?.length) return;
      console.error(e);
      message.error(e?.message || "Có lỗi xảy ra");
    } finally {
      setGroupSaving(false);
    }
  };

  const deleteGroup = (id: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== id));
    message.success("Đã xoá nhóm tuỳ chọn");
  };

  const openCreateOption = (groupId: string) => {
    setOptionMode("create");
    setOptionTarget({ groupId });
    optionForm.setFieldsValue({ name: "", priceAdjustment: 0 });
    setOptionOpen(true);
  };

  const openEditOption = (groupId: string, option: Option) => {
    setOptionMode("edit");
    setOptionTarget({ groupId, optionId: option.id });
    optionForm.setFieldsValue({
      name: option.name,
      priceAdjustment: Number(option.priceAdjustment || 0),
    });
    setOptionOpen(true);
  };

  const closeOption = () => {
    setOptionOpen(false);
    setOptionSaving(false);
    setOptionTarget(null);
    optionForm.resetFields();
  };

  const submitOption = async () => {
    try {
      const values = await optionForm.validateFields();
      if (!optionTarget) return;

      setOptionSaving(true);

      const name = values.name.trim();
      const price = Number(values.priceAdjustment || 0);

      if (optionMode === "create") {
        const newOption: Option = {
          id: `opt-item-${Date.now()}`,
          name,
          priceAdjustment: price,
        } as any;

        setGroups((prev) =>
          prev.map((g) =>
            g.id === optionTarget.groupId
              ? { ...g, options: [...(g.options || []), newOption] }
              : g
          )
        );
        message.success("Đã thêm tuỳ chọn");
      } else {
        if (!optionTarget.optionId) return;

        setGroups((prev) =>
          prev.map((g) => {
            if (g.id !== optionTarget.groupId) return g;
            return {
              ...g,
              options: (g.options || []).map((o) =>
                o.id === optionTarget.optionId ? { ...o, name, priceAdjustment: price } : o
              ),
            };
          })
        );
        message.success("Đã cập nhật tuỳ chọn");
      }

      closeOption();
    } catch (e: any) {
      if (e?.errorFields?.length) return;
      console.error(e);
      message.error(e?.message || "Có lỗi xảy ra");
    } finally {
      setOptionSaving(false);
    }
  };

  const deleteOption = (groupId: string, optionId: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId ? { ...g, options: (g.options || []).filter((o) => o.id !== optionId) } : g
      )
    );
    message.success("Đã xoá tuỳ chọn");
  };

  const optionColumns = (groupId: string): ColumnsType<Option> => [
    { title: "Tên tuỳ chọn", dataIndex: "name", key: "name" },
    {
      title: "Giá cộng thêm",
      dataIndex: "priceAdjustment",
      key: "priceAdjustment",
      width: 180,
      render: (v: number) => {
        const n = Number(v || 0);
        return <b>{n > 0 ? `+${formatCurrency(n)}` : formatCurrency(n)}</b>;
      },
    },
    {
      title: "Hành động",
      key: "actions",
      width: 220,
      render: (_: any, record: Option) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => openEditOption(groupId, record)}>
            Sửa
          </Button>
          <Popconfirm
            title="Xoá tuỳ chọn"
            description="Bạn có chắc muốn xoá tuỳ chọn này?"
            okText="Xoá"
            cancelText="Huỷ"
            okButtonProps={{ danger: true }}
            onConfirm={() => deleteOption(groupId, record.id)}
          >
            <Button danger icon={<DeleteOutlined />}>
              Xoá
            </Button>
          </Popconfirm>
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
            Tuỳ chọn
          </Typography.Title>
          <div style={{ color: "#777" }}>Quản lý các tuỳ chọn như size, đường, đá...</div>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateGroup}>
          Thêm nhóm tuỳ chọn
        </Button>
      </div>

      {/* Search */}
      <div style={{ background: "#fff", padding: 12, borderRadius: 12, marginBottom: 12 }}>
        <Input
          style={{ width: 360 }}
          placeholder="Tìm kiếm nhóm tuỳ chọn..."
          prefix={<SearchOutlined />}
          allowClear
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {/* Groups */}
      <div style={{ background: "#fff", padding: 12, borderRadius: 12 }}>
        <Collapse
          items={filteredGroups.map((g) => ({
            key: g.id,
            label: (
              <Space size={8} wrap>
                <b>{g.name}</b>
                <Tag>{g.type === "single" ? "Chọn 1" : "Chọn nhiều"}</Tag>
                {g.required ? <Tag color="blue">Bắt buộc</Tag> : null}
                <Tag color="default">{(g.options || []).length} tuỳ chọn</Tag>
              </Space>
            ),
            extra: (
              <Space onClick={(e) => e.stopPropagation()}>
                <Button size="small" icon={<PlusOutlined />} onClick={() => openCreateOption(g.id)}>
                  Thêm tuỳ chọn
                </Button>
                <Button size="small" icon={<EditOutlined />} onClick={() => openEditGroup(g)}>
                  Sửa nhóm
                </Button>
                <Popconfirm
                  title="Xoá nhóm"
                  description="Bạn có chắc muốn xoá nhóm này?"
                  okText="Xoá"
                  cancelText="Huỷ"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => deleteGroup(g.id)}
                >
                  <Button size="small" danger icon={<DeleteOutlined />}>
                    Xoá
                  </Button>
                </Popconfirm>
              </Space>
            ),
            children: (
              <div style={{ paddingTop: 8 }}>
                <Table<Option>
                  rowKey={(r) => r.id}
                  columns={optionColumns(g.id)}
                  dataSource={g.options || []}
                  pagination={false}
                  locale={{ emptyText: "Chưa có tuỳ chọn nào" }}
                />
              </div>
            ),
          }))}
        />
      </div>

      {/* Group Modal */}
      <Modal
        title={groupMode === "create" ? "Thêm nhóm tuỳ chọn" : "Chỉnh sửa nhóm tuỳ chọn"}
        open={groupOpen}
        onCancel={closeGroup}
        onOk={() => groupForm.submit()}
        okText={groupMode === "create" ? "Tạo" : "Lưu"}
        cancelText="Huỷ"
        confirmLoading={groupSaving}
        maskClosable={false}
        destroyOnClose
      >
        <Form<GroupFormValues>
          form={groupForm}
          layout="vertical"
          onFinish={submitGroup}
          initialValues={{ name: "", type: "single", required: false }}
        >
          <Form.Item
            label="Tên nhóm"
            name="name"
            rules={[
              { required: true, message: "Vui lòng nhập tên nhóm" },
              { max: 160, message: "Tên tối đa 160 ký tự" },
            ]}
          >
            <Input placeholder="VD: Size, Đường, Đá..." />
          </Form.Item>

          <Form.Item label="Loại chọn" name="type" rules={[{ required: true, message: "Vui lòng chọn loại" }]}>
            <Select
              options={[
                { value: "single", label: "Chọn một" },
                { value: "multiple", label: "Chọn nhiều" },
              ]}
            />
          </Form.Item>

          <Form.Item label="Bắt buộc chọn" name="required" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* Option Modal */}
      <Modal
        title={optionMode === "create" ? "Thêm tuỳ chọn" : "Chỉnh sửa tuỳ chọn"}
        open={optionOpen}
        onCancel={closeOption}
        onOk={() => optionForm.submit()}
        okText={optionMode === "create" ? "Thêm" : "Lưu"}
        cancelText="Huỷ"
        confirmLoading={optionSaving}
        maskClosable={false}
        destroyOnClose
      >
        <Form<OptionFormValues>
          form={optionForm}
          layout="vertical"
          onFinish={submitOption}
          initialValues={{ name: "", priceAdjustment: 0 }}
        >
          <Form.Item
            label="Tên tuỳ chọn"
            name="name"
            rules={[
              { required: true, message: "Vui lòng nhập tên tuỳ chọn" },
              { max: 160, message: "Tên tối đa 160 ký tự" },
            ]}
          >
            <Input placeholder="VD: Size M, 50% đường..." />
          </Form.Item>

          <Form.Item
            label="Giá cộng thêm (VNĐ)"
            name="priceAdjustment"
            rules={[
              { required: true, message: "Vui lòng nhập giá" },
              {
                validator: async (_, v) => {
                  const n = Number(v);
                  if (!Number.isFinite(n)) throw new Error("Giá không hợp lệ");
                },
              },
            ]}
          >
            <Input type="number" placeholder="0" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}