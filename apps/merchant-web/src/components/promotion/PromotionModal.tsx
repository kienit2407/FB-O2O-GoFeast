/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo } from "react";
import {
    Checkbox,
    Col,
    DatePicker,
    Form,
    Input,
    InputNumber,
    Modal,
    Row,
    Select,
    Switch,
    message,
} from "antd";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;

const SCOPE_OPTIONS = [
    { value: "food", label: "Món ăn" },
    { value: "delivery", label: "Giao hàng" },
    { value: "dine_in", label: "Tại quán" },
];

const TYPE_OPTIONS = [
    { value: "percentage", label: "Giảm theo %" },
    { value: "fixed_amount", label: "Giảm số tiền" },
];

const APPLY_LEVEL_OPTIONS_MAP: Record<string, { value: string; label: string }[]> = {
    food: [
        { value: "order", label: "Tổng đơn" },
        { value: "product", label: "Theo sản phẩm" },
        { value: "category", label: "Theo danh mục" },
    ],
    delivery: [{ value: "shipping", label: "Phí ship" }],
    dine_in: [{ value: "order", label: "Tổng đơn" }],
};

const ACTIVATION_OPTIONS = [
    { value: "auto", label: "Tự áp dụng" },
    { value: "voucher", label: "Kích hoạt bằng voucher" },
];

const ORDER_TYPE_OPTIONS = [
    { value: "delivery", label: "Giao hàng" },
    { value: "dine_in", label: "Tại quán" },
];

const PAYMENT_OPTIONS = [
    { value: "cash", label: "Tiền mặt" },
    { value: "momo", label: "MoMo" },
    { value: "vnpay", label: "VNPay" },
    { value: "zalopay", label: "ZaloPay" },
];

type Props = {
    open: boolean;
    editing?: any | null;
    saving?: boolean;
    onCancel: () => void;
    products: any[];
    categories: any[];
    onSubmit: (payload: any) => Promise<void>;
};

export function PromotionModal({
    open,
    editing,
    saving,
    onCancel,
    onSubmit,
    products,
    categories,
}: Props) {
    const [form] = Form.useForm();

    const scope = Form.useWatch("scope", form);
    const activationType = Form.useWatch("activation_type", form);

    const productOptions = useMemo(() => {
        return (products ?? [])
            .map((p: any) => {
                const id = String(p?._id ?? p?.id ?? "");
                if (!id) return null;
                return {
                    value: id,
                    label: String(p?.name ?? p?.product_name ?? "—"),
                };
            })
            .filter(Boolean) as { value: string; label: string }[];
    }, [products]);

    const categoryOptions = useMemo(() => {
        return (categories ?? [])
            .map((c: any) => {
                const id = String(c?._id ?? c?.id ?? "");
                if (!id) return null;
                return {
                    value: id,
                    label: String(c?.name ?? c?.category_name ?? "—"),
                };
            })
            .filter(Boolean) as { value: string; label: string }[];
    }, [categories]);

    const applyLevelOptions = useMemo(() => {
        return APPLY_LEVEL_OPTIONS_MAP[scope || "food"] ?? APPLY_LEVEL_OPTIONS_MAP.food;
    }, [scope]);

    useEffect(() => {
        if (!open) return;

        if (!editing) {
            form.resetFields();
            form.setFieldsValue({
                name: "",
                description: "",
                scope: "food",
                type: "percentage",
                apply_level: "order",
                discount_value: 0,
                max_discount: 0,
                min_order_amount: 0,
                activation_type: "auto",
                priority: 0,
                can_stack_with_voucher: true,
                allowed_order_types: ["delivery", "dine_in"],
                allowed_payment_methods: [],
                date_range: null,
                product_ids: [],
                category_ids: [],
                is_active: true,
            });
            return;
        }

        form.setFieldsValue({
            name: editing.name ?? "",
            description: editing.description ?? "",
            scope: editing.scope ?? "food",
            type: editing.type ?? "percentage",
            apply_level: editing.apply_level ?? "order",
            discount_value: Number(editing.discount_value ?? 0),
            max_discount: Number(editing.max_discount ?? 0),
            min_order_amount: Number(editing.min_order_amount ?? 0),
            activation_type: editing.activation_type ?? "auto",
            priority: Number(editing.priority ?? 0),
            can_stack_with_voucher: editing.can_stack_with_voucher ?? true,
            allowed_order_types: editing.allowed_order_types ?? ["delivery", "dine_in"],
            allowed_payment_methods: editing.allowed_payment_methods ?? [],
            date_range:
                editing?.conditions?.valid_from || editing?.conditions?.valid_to
                    ? [
                        editing?.conditions?.valid_from ? dayjs(editing.conditions.valid_from) : null,
                        editing?.conditions?.valid_to ? dayjs(editing.conditions.valid_to) : null,
                    ]
                    : null,
            product_ids: (editing.product_ids ?? []).map(String).filter(Boolean),
            category_ids: (editing.category_ids ?? []).map(String).filter(Boolean),
            is_active: !!editing.is_active,
        });
    }, [open, editing, form]);

    useEffect(() => {
        if (!scope) return;

        if (scope === "delivery") {
            form.setFieldsValue({
                apply_level: "shipping",
                allowed_order_types: ["delivery"],
            });
        } else if (scope === "dine_in") {
            form.setFieldsValue({
                apply_level: "order",
                allowed_order_types: ["dine_in"],
            });
        } else {
            const current = form.getFieldValue("allowed_order_types");
            if (!current?.length) {
                form.setFieldsValue({
                    allowed_order_types: ["delivery", "dine_in"],
                });
            }
        }
    }, [scope, form]);

    useEffect(() => {
        if (activationType === "voucher") {
            form.setFieldValue("can_stack_with_voucher", true);
        }
    }, [activationType, form]);

    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            const [from, to] = values.date_range ?? [];

            if (from && to && dayjs(to).isBefore(dayjs(from))) {
                message.error("Thời gian kết thúc phải lớn hơn hoặc bằng thời gian bắt đầu");
                return;
            }

            const payload: any = {
                name: String(values.name).trim(),
                description: String(values.description ?? "").trim(),
                scope: values.scope,
                type: values.type,
                apply_level: values.apply_level,

                discount_value: Number(values.discount_value ?? 0),
                max_discount: Number(values.max_discount ?? 0),
                min_order_amount: Number(values.min_order_amount ?? 0),

                activation_type: values.activation_type,
                priority: Number(values.priority ?? 0),
                can_stack_with_voucher:
                    values.activation_type === "voucher"
                        ? true
                        : !!values.can_stack_with_voucher,

                allowed_order_types:
                    values.scope === "delivery"
                        ? ["delivery"]
                        : values.scope === "dine_in"
                            ? ["dine_in"]
                            : values.allowed_order_types ?? ["delivery", "dine_in"],

                allowed_payment_methods: values.allowed_payment_methods ?? [],

                product_ids:
                    values.apply_level === "product" ? values.product_ids ?? [] : [],
                category_ids:
                    values.apply_level === "category" ? values.category_ids ?? [] : [],

                conditions: {
                    valid_from: from ? dayjs(from).toISOString() : undefined,
                    valid_to: to ? dayjs(to).toISOString() : undefined,
                },

                is_active: !!values.is_active,
            };

            await onSubmit(payload);
        } catch (e: any) {
            if (e?.errorFields?.length) return;
            message.error(e?.response?.data?.message || e?.message || "Có lỗi xảy ra");
        }
    };

    return (
        <Modal
            title={editing ? "Chỉnh sửa chương trình" : "Tạo chương trình"}
            open={open}
            onCancel={onCancel}
            onOk={handleOk}
            okText={editing ? "Lưu" : "Tạo"}
            cancelText="Huỷ"
            confirmLoading={!!saving}
            width={860}
        >
            <Form form={form} layout="vertical">
                <Form.Item
                    label="Tên chương trình"
                    name="name"
                    rules={[{ required: true, message: "Vui lòng nhập tên chương trình" }]}
                >
                    <Input placeholder="VD: Giảm 20% menu trưa" />
                </Form.Item>

                <Form.Item label="Mô tả" name="description">
                    <Input.TextArea rows={3} placeholder="Mô tả ngắn..." />
                </Form.Item>

                <Row gutter={12}>
                    <Col span={12}>
                        <Form.Item label="Phạm vi" name="scope" rules={[{ required: true }]}>
                            <Select options={SCOPE_OPTIONS} />
                        </Form.Item>
                    </Col>

                    <Col span={12}>
                        <Form.Item label="Loại giảm" name="type" rules={[{ required: true }]}>
                            <Select options={TYPE_OPTIONS} />
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={12}>
                    <Col span={12}>
                        <Form.Item
                            label="Kiểu kích hoạt"
                            name="activation_type"
                            rules={[{ required: true }]}
                        >
                            <Select options={ACTIVATION_OPTIONS} />
                        </Form.Item>
                    </Col>

                    <Col span={12}>
                        <Form.Item
                            label="Áp dụng cho"
                            name="apply_level"
                            rules={[{ required: true }]}
                        >
                            <Select options={applyLevelOptions} />
                        </Form.Item>
                    </Col>
                </Row>

                <Form.Item noStyle shouldUpdate={(prev, cur) => prev.apply_level !== cur.apply_level}>
                    {() => {
                        const al = form.getFieldValue("apply_level");

                        if (al === "product") {
                            return (
                                <Form.Item
                                    label="Chọn sản phẩm"
                                    name="product_ids"
                                    rules={[{ required: true, message: "Vui lòng chọn ít nhất 1 sản phẩm" }]}
                                >
                                    <Select
                                        mode="multiple"
                                        showSearch
                                        optionFilterProp="label"
                                        placeholder="Chọn sản phẩm..."
                                        options={productOptions}
                                    />
                                </Form.Item>
                            );
                        }

                        if (al === "category") {
                            return (
                                <Form.Item
                                    label="Chọn danh mục"
                                    name="category_ids"
                                    rules={[{ required: true, message: "Vui lòng chọn ít nhất 1 danh mục" }]}
                                >
                                    <Select
                                        mode="multiple"
                                        showSearch
                                        optionFilterProp="label"
                                        placeholder="Chọn danh mục..."
                                        options={categoryOptions}
                                    />
                                </Form.Item>
                            );
                        }

                        return null;
                    }}
                </Form.Item>

                <Row gutter={12}>
                    <Col span={12}>
                        <Form.Item
                            label="Giá trị giảm"
                            name="discount_value"
                            rules={[{ required: true, message: "Vui lòng nhập giá trị giảm" }]}
                        >
                            <InputNumber min={0} style={{ width: "100%" }} />
                        </Form.Item>
                    </Col>

                    <Col span={12}>
                        <Form.Item label="Giảm tối đa" name="max_discount">
                            <InputNumber min={0} style={{ width: "100%" }} />
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={12}>
                    <Col span={12}>
                        <Form.Item label="Đơn tối thiểu" name="min_order_amount">
                            <InputNumber min={0} style={{ width: "100%" }} />
                        </Form.Item>
                    </Col>

                    <Col span={12}>
                        <Form.Item label="Độ ưu tiên" name="priority">
                            <InputNumber style={{ width: "100%" }} />
                        </Form.Item>
                    </Col>
                </Row>

                <Form.Item label="Giới hạn loại đơn" name="allowed_order_types">
                    <Checkbox.Group
                        options={ORDER_TYPE_OPTIONS}
                        disabled={scope === "delivery" || scope === "dine_in"}
                    />
                </Form.Item>

                <Form.Item label="Giới hạn phương thức thanh toán" name="allowed_payment_methods">
                    <Checkbox.Group options={PAYMENT_OPTIONS} />
                </Form.Item>

                <Form.Item label="Thời gian áp dụng" name="date_range">
                    <RangePicker
                        style={{ width: "100%" }}
                        showTime={{ format: "HH:mm" }}
                        format="YYYY-MM-DD HH:mm"
                        placeholder={["Từ", "Đến"]}
                    />
                </Form.Item>

                <Row gutter={12}>
                    <Col span={12}>
                        <Form.Item
                            label="Cho phép áp thêm mã voucher"
                            name="can_stack_with_voucher"
                            valuePropName="checked"
                        >
                            <Switch disabled={activationType === "voucher"} />
                        </Form.Item>
                    </Col>

                    <Col span={12}>
                        <Form.Item
                            label="Đang hoạt động"
                            name="is_active"
                            valuePropName="checked"
                        >
                            <Switch />
                        </Form.Item>
                    </Col>
                </Row>
            </Form>
        </Modal>
    );
}