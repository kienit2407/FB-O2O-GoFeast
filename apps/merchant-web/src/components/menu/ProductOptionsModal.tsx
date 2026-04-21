/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import {
    Button,
    Collapse,
    Form,
    Input,
    InputNumber,
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
    ArrowDownOutlined,
    ArrowUpOutlined,
    DeleteOutlined,
    EditOutlined,
    PlusOutlined,
    StarFilled,
} from "@ant-design/icons";

import type { Option, OptionGroup, Product } from "@/types";
import { menuService } from "@/service/menu.service";

const formatCurrency = (value: number) =>
    new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
    }).format(value);

type Props = {
    open: boolean;
    product: Product | null;
    onClose: () => void;
};

type GroupMode = "create" | "edit";
type ChoiceMode = "create" | "edit";

type GroupFormValues = {
    name: string;
    type: "single" | "multiple";
    required: boolean;
    minSelect: number;
    maxSelect: number;
};

type ChoiceFormValues = {
    name: string;
    priceAdjustment: number;
    isDefault: boolean;
    isAvailable: boolean;
};

export default function ProductOptionsModal({ open, product, onClose }: Props) {
    const productId = product?.id;

    const [loading, setLoading] = useState(false);
    const [groups, setGroups] = useState<OptionGroup[]>([]);

    // ===== group modal =====
    const [groupOpen, setGroupOpen] = useState(false);
    const [groupMode, setGroupMode] = useState<GroupMode>("create");
    const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
    const [groupSaving, setGroupSaving] = useState(false);
    const [groupForm] = Form.useForm<GroupFormValues>();

    // ===== choice modal =====
    const [choiceOpen, setChoiceOpen] = useState(false);
    const [choiceMode, setChoiceMode] = useState<ChoiceMode>("create");
    const [choiceSaving, setChoiceSaving] = useState(false);
    const [choiceForm] = Form.useForm<ChoiceFormValues>();
    const [choiceTarget, setChoiceTarget] = useState<{ groupId: string; choiceId?: string } | null>(null);

    const refresh = async () => {
        if (!productId) return;
        setLoading(true);
        try {
            const data = await menuService.listOptionGroupsByProduct(productId);
            setGroups(data);
        } catch (e: any) {
            console.error(e);
            message.error(e?.message || "Không tải được tuỳ chọn");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open && productId) refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, productId]);

    const sortedGroups = useMemo(() => {
        return [...groups].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }, [groups]);

    const upsertGroupState = (updated: OptionGroup) => {
        setGroups((prev) => {
            const idx = prev.findIndex((g) => g.id === updated.id);
            if (idx < 0) return [...prev, updated];
            const next = [...prev];
            next[idx] = updated;
            return next;
        });
    };

    // ===== reorder groups =====
    const moveGroup = async (groupIdMove: string, dir: "up" | "down") => {
        if (!productId) return;

        const list = sortedGroups;
        const idx = list.findIndex((g) => g.id === groupIdMove);
        if (idx < 0) return;

        const to = dir === "up" ? idx - 1 : idx + 1;
        if (to < 0 || to >= list.length) return;

        const orderedIds = list.map((g) => g.id);
        [orderedIds[idx], orderedIds[to]] = [orderedIds[to], orderedIds[idx]];

        try {
            const data = await menuService.reorderOptionGroups(productId, orderedIds);
            setGroups(data);
            message.success("Đã cập nhật thứ tự nhóm");
        } catch (e: any) {
            console.error(e);
            message.error(e?.message || "Không cập nhật được thứ tự nhóm");
        }
    };

    // ===== group modal handlers =====
    const openCreateGroup = () => {
        setGroupMode("create");
        setEditingGroupId(null);
        groupForm.setFieldsValue({
            name: "",
            type: "single",
            required: false,
            minSelect: 1,
            maxSelect: 1,
        });
        setGroupOpen(true);
    };

    const openEditGroup = (g: OptionGroup) => {
        setGroupMode("edit");
        setEditingGroupId(g.id);
        groupForm.setFieldsValue({
            name: g.name,
            type: g.type,
            required: !!g.required,
            minSelect: Number(g.minSelect ?? 1),
            maxSelect: Number(g.maxSelect ?? 1),
        });
        setGroupOpen(true);
    };

    const closeGroup = () => {
        setGroupOpen(false);
        setGroupSaving(false);
        setEditingGroupId(null);
        groupForm.resetFields();
    };

    const submitGroup = async () => {
        if (!productId) return;
        try {
            const v = await groupForm.validateFields();
            setGroupSaving(true);

            // normalize theo type
            const minSelect = Number(v.minSelect ?? 1);
            const maxSelect = v.type === "single" ? 1 : Number(v.maxSelect ?? 1);

            if (minSelect < 0) throw new Error("min_select không hợp lệ");
            if (maxSelect < 1) throw new Error("max_select không hợp lệ");
            if (maxSelect < minSelect) throw new Error("max_select phải >= min_select");

            if (groupMode === "create") {
                const created = await menuService.createOptionGroup(productId, {
                    name: v.name.trim(),
                    type: v.type,
                    is_required: !!v.required,
                    min_select: minSelect,
                    max_select: maxSelect,
                });
                upsertGroupState(created);
                message.success("Đã tạo nhóm tuỳ chọn");
            } else {
                if (!editingGroupId) return;
                const updated = await menuService.updateOptionGroup(editingGroupId, {
                    name: v.name.trim(),
                    type: v.type,
                    is_required: !!v.required,
                    min_select: minSelect,
                    max_select: maxSelect,
                });
                upsertGroupState(updated);
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

    const deleteGroup = async (id: string) => {
        try {
            await menuService.deleteOptionGroup(id);
            setGroups((prev) => prev.filter((g) => g.id !== id));
            message.success("Đã xoá nhóm (soft delete)");
        } catch (e: any) {
            console.error(e);
            message.error(e?.message || "Không xoá được nhóm");
        }
    };

    // ===== choice modal handlers =====
    const openCreateChoice = (groupId: string) => {
        setChoiceMode("create");
        setChoiceTarget({ groupId });
        choiceForm.setFieldsValue({
            name: "",
            priceAdjustment: 0,
            isDefault: false,
            isAvailable: true,
        });
        setChoiceOpen(true);
    };

    const openEditChoice = (groupId: string, o: Option) => {
        setChoiceMode("edit");
        setChoiceTarget({ groupId, choiceId: o.id });
        choiceForm.setFieldsValue({
            name: o.name,
            priceAdjustment: Number(o.priceAdjustment ?? 0),
            isDefault: !!o.isDefault,
            isAvailable: o.isAvailable ?? true,
        });
        setChoiceOpen(true);
    };

    const closeChoice = () => {
        setChoiceOpen(false);
        setChoiceSaving(false);
        setChoiceTarget(null);
        choiceForm.resetFields();
    };

    const submitChoice = async () => {
        try {
            const v = await choiceForm.validateFields();
            if (!choiceTarget) return;

            setChoiceSaving(true);

            const name = v.name.trim();
            const price = Number(v.priceAdjustment ?? 0);

            let updatedGroup: OptionGroup;

            if (choiceMode === "create") {
                updatedGroup = await menuService.addChoice(choiceTarget.groupId, {
                    name,
                    price_modifier: price,
                    is_default: !!v.isDefault,
                    is_available: v.isAvailable ?? true,
                });
                message.success("Đã thêm tuỳ chọn");
            } else {
                if (!choiceTarget.choiceId) return;
                updatedGroup = await menuService.updateChoice(choiceTarget.groupId, choiceTarget.choiceId, {
                    name,
                    price_modifier: price,
                    is_default: !!v.isDefault,
                    is_available: v.isAvailable ?? true,
                });
                message.success("Đã cập nhật tuỳ chọn");
            }

            upsertGroupState(updatedGroup);
            closeChoice();
        } catch (e: any) {
            if (e?.errorFields?.length) return;
            console.error(e);
            message.error(e?.message || "Có lỗi xảy ra");
        } finally {
            setChoiceSaving(false);
        }
    };

    const toggleChoice = async (groupId: string, choiceId: string) => {
        try {
            const updated = await menuService.toggleChoiceAvailable(groupId, choiceId);
            upsertGroupState(updated);
            message.success("Đã cập nhật trạng thái tuỳ chọn");
        } catch (e: any) {
            console.error(e);
            message.error(e?.message || "Không cập nhật được");
        }
    };

    const setDefault = async (groupId: string, choiceId: string) => {
        try {
            const updated = await menuService.setChoiceDefault(groupId, choiceId);
            upsertGroupState(updated);
            message.success("Đã đặt mặc định");
        } catch (e: any) {
            console.error(e);
            message.error(e?.message || "Không đặt mặc định được");
        }
    };

    const deleteChoice = async (groupId: string, choiceId: string) => {
        try {
            const updated = await menuService.deleteChoice(groupId, choiceId);
            upsertGroupState(updated);
            message.success("Đã xoá tuỳ chọn");
        } catch (e: any) {
            console.error(e);
            message.error(e?.message || "Không xoá được tuỳ chọn");
        }
    };

    const choiceColumns = (groupId: string): ColumnsType<Option> => [
        { title: "Tên tuỳ chọn", dataIndex: "name", key: "name" },
        {
            title: "Giá cộng thêm",
            dataIndex: "priceAdjustment",
            key: "priceAdjustment",
            width: 160,
            render: (v: number) => {
                const n = Number(v || 0);
                return <b>{n > 0 ? `+${formatCurrency(n)}` : formatCurrency(n)}</b>;
            },
        },
        {
            title: "Mặc định",
            key: "isDefault",
            width: 120,
            render: (_: any, r: Option) => (r.isDefault ? <Tag color="gold" icon={<StarFilled />}>Default</Tag> : <Tag>-</Tag>),
        },
        {
            title: "Trạng thái",
            key: "isAvailable",
            width: 180,
            render: (_: any, r: Option) => (
                <Space>
                    <Switch checked={r.isAvailable ?? true} onChange={() => toggleChoice(groupId, r.id)} />
                    {(r.isAvailable ?? true) ? <Tag color="green">Có sẵn</Tag> : <Tag color="red">Tạm ẩn</Tag>}
                </Space>
            ),
        },
        {
            title: "Hành động",
            key: "actions",
            width: 320,
            render: (_: any, r: Option) => (
                <Space>
                    <Button icon={<EditOutlined />} onClick={() => openEditChoice(groupId, r)}>
                        Sửa
                    </Button>

                    {!r.isDefault ? (
                        <Button onClick={() => setDefault(groupId, r.id)} icon={<StarFilled />}>
                            Đặt default
                        </Button>
                    ) : null}

                    <Popconfirm
                        title="Xoá tuỳ chọn"
                        description="Bạn có chắc muốn xoá tuỳ chọn này?"
                        okText="Xoá"
                        cancelText="Huỷ"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => deleteChoice(groupId, r.id)}
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
        <Modal
            title={
                <div>
                    <div style={{ fontWeight: 700 }}>Tuỳ chọn sản phẩm</div>
                    <div style={{ fontSize: 12, color: "#777" }}>
                        {product ? `${product.name}` : "—"}
                    </div>
                </div>
            }
            open={open}
            onCancel={onClose}
            footer={null}
            width={1000}
            destroyOnClose
            maskClosable={false}
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <Space>
                    <Button icon={<PlusOutlined />} type="primary" onClick={openCreateGroup}>
                        Thêm nhóm tuỳ chọn
                    </Button>
                    <Button onClick={refresh} loading={loading}>
                        Tải lại
                    </Button>
                </Space>

                <Typography.Text type="secondary">
                    {sortedGroups.length} nhóm
                </Typography.Text>
            </div>

            <div style={{ background: "#fff", borderRadius: 12 }}>
                <Collapse
                    accordion={false}
                    items={sortedGroups.map((g, index) => ({
                        key: g.id,
                        label: (
                            <Space wrap size={8}>
                                <b>{g.name}</b>
                                <Tag>{g.type === "single" ? "Chọn 1" : "Chọn nhiều"}</Tag>
                                {g.required ? <Tag color="blue">Bắt buộc</Tag> : null}
                                <Tag color="default">
                                    {(g.minSelect ?? 1)}-{(g.maxSelect ?? 1)}
                                </Tag>
                                <Tag color="default">{(g.options || []).length} lựa chọn</Tag>
                            </Space>
                        ),
                        extra: (
                            <Space onClick={(e) => e.stopPropagation()}>
                                <Button size="small" icon={<ArrowUpOutlined />} disabled={index === 0} onClick={() => moveGroup(g.id, "up")} />
                                <Button
                                    size="small"
                                    icon={<ArrowDownOutlined />}
                                    disabled={index === sortedGroups.length - 1}
                                    onClick={() => moveGroup(g.id, "down")}
                                />
                                <Button size="small" icon={<PlusOutlined />} onClick={() => openCreateChoice(g.id)}>
                                    Thêm lựa chọn
                                </Button>
                                <Button size="small" icon={<EditOutlined />} onClick={() => openEditGroup(g)}>
                                    Sửa nhóm
                                </Button>
                                <Popconfirm
                                    title="Xoá nhóm"
                                    description="Bạn có chắc muốn xoá nhóm này? (soft delete)"
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
                                    columns={choiceColumns(g.id)}
                                    dataSource={g.options || []}
                                    pagination={false}
                                    locale={{ emptyText: "Chưa có lựa chọn nào" }}
                                />
                            </div>
                        ),
                    }))}
                />
            </div>

            {/* ===== Group Modal ===== */}
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
                    initialValues={{ name: "", type: "single", required: false, minSelect: 1, maxSelect: 1 }}
                >
                    <Form.Item
                        label="Tên nhóm"
                        name="name"
                        rules={[
                            { required: true, message: "Vui lòng nhập tên nhóm" },
                            { max: 120, message: "Tên tối đa 120 ký tự" },
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

                    <Space style={{ width: "100%" }} size={12}>
                        <Form.Item
                            style={{ flex: 1 }}
                            label="Min chọn"
                            name="minSelect"
                            rules={[{ required: true, message: "Nhập min" }]}
                        >
                            <InputNumber min={0} style={{ width: "100%" }} />
                        </Form.Item>

                        <Form.Item
                            style={{ flex: 1 }}
                            label="Max chọn"
                            name="maxSelect"
                            rules={[{ required: true, message: "Nhập max" }]}
                        >
                            <InputNumber min={1} style={{ width: "100%" }} />
                        </Form.Item>
                    </Space>

                    <Typography.Text type="secondary">
                        * Nếu loại “Chọn một” thì hệ thống sẽ set max = 1.
                    </Typography.Text>
                </Form>
            </Modal>

            {/* ===== Choice Modal ===== */}
            <Modal
                title={choiceMode === "create" ? "Thêm lựa chọn" : "Chỉnh sửa lựa chọn"}
                open={choiceOpen}
                onCancel={closeChoice}
                onOk={() => choiceForm.submit()}
                okText={choiceMode === "create" ? "Thêm" : "Lưu"}
                cancelText="Huỷ"
                confirmLoading={choiceSaving}
                maskClosable={false}
                destroyOnClose
            >
                <Form<ChoiceFormValues>
                    form={choiceForm}
                    layout="vertical"
                    onFinish={submitChoice}
                    initialValues={{ name: "", priceAdjustment: 0, isDefault: false, isAvailable: true }}
                >
                    <Form.Item
                        label="Tên lựa chọn"
                        name="name"
                        rules={[
                            { required: true, message: "Vui lòng nhập tên" },
                            { max: 120, message: "Tên tối đa 120 ký tự" },
                        ]}
                    >
                        <Input placeholder="VD: Size M, 50% đường..." />
                    </Form.Item>

                    <Form.Item
                        label="Giá cộng thêm (VNĐ)"
                        name="priceAdjustment"
                        rules={[{ required: true, message: "Vui lòng nhập giá" }]}
                    >
                        <InputNumber style={{ width: "100%" }} />
                    </Form.Item>

                    <Form.Item label="Là mặc định" name="isDefault" valuePropName="checked">
                        <Switch />
                    </Form.Item>

                    <Form.Item label="Có sẵn" name="isAvailable" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                </Form>
            </Modal>
        </Modal>
    );
}