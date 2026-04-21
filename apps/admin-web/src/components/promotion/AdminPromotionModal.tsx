/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
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
    Upload,
    message,
} from "antd";
import type { UploadFile, UploadProps } from "antd/es/upload/interface";
import { UploadOutlined } from "@ant-design/icons";
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

const ACTIVATION_OPTIONS = [
    { value: "auto", label: "Tự áp dụng" },
    { value: "voucher", label: "Kích hoạt bằng voucher" },
];

const PAYMENT_OPTIONS = [
    { value: "cash", label: "Tiền mặt" },
    { value: "momo", label: "MoMo" },
    { value: "vnpay", label: "VNPay" },
    { value: "zalopay", label: "ZaloPay" },
];

const APPLY_LEVEL_OPTIONS_MAP: Record<
    string,
    { value: string; label: string }[]
> = {
    food: [{ value: "order", label: "Tổng đơn" }],
    delivery: [{ value: "shipping", label: "Phí ship" }],
    dine_in: [{ value: "order", label: "Tổng đơn" }],
};

type Props = {
    open: boolean;
    editing?: any | null;
    saving?: boolean;
    onCancel: () => void;
    onSubmit: (args: {
        payload: any;
        bannerFile: File | null;
        bannerRemoved: boolean;
    }) => Promise<void>;
};

export function AdminPromotionModal({
    open,
    editing,
    saving,
    onCancel,
    onSubmit,
}: Props) {
    const [form] = Form.useForm();
    const scope = Form.useWatch("scope", form);
    const activationType = Form.useWatch("activation_type", form);
    const showPushNoti = Form.useWatch("show_push_noti", form);

    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [bannerFileList, setBannerFileList] = useState<UploadFile[]>([]);
    const [bannerRemoved, setBannerRemoved] = useState(false);

    const applyLevelOptions = useMemo(() => {
        return APPLY_LEVEL_OPTIONS_MAP[scope || "food"] ?? APPLY_LEVEL_OPTIONS_MAP.food;
    }, [scope]);

    useEffect(() => {
        if (!open) return;

        setBannerFile(null);
        setBannerRemoved(false);

        if (!editing) {
            setBannerFileList([]);
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
                allowed_order_types: [],
                allowed_payment_methods: [],
                exclusive_group: "",
                date_range: null,
                show_as_popup: false,
                is_active: true,
                show_push_noti: false,
                push_noti_title: "",
                push_noti_body: "",
            });
            return;
        }

        const hasBanner = !!editing?.banner_admin_url;
        setBannerFileList(
            hasBanner
                ? [
                    {
                        uid: "existing-banner",
                        name: "banner",
                        status: "done",
                        url: editing.banner_admin_url,
                    },
                ]
                : [],
        );

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
            allowed_order_types: editing.allowed_order_types ?? [],
            allowed_payment_methods: editing.allowed_payment_methods ?? [],
            exclusive_group: editing.exclusive_group ?? "",
            date_range:
                editing?.conditions?.valid_from || editing?.conditions?.valid_to
                    ? [
                        editing?.conditions?.valid_from
                            ? dayjs(editing.conditions.valid_from)
                            : null,
                        editing?.conditions?.valid_to
                            ? dayjs(editing.conditions.valid_to)
                            : null,
                    ]
                    : null,
            show_as_popup: !!editing.show_as_popup,
            is_active: !!editing.is_active,
            show_push_noti: !!editing.show_push_noti,
            push_noti_title: editing?.push_noti_title ?? "",
            push_noti_body: editing?.push_noti_body ?? "",
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
        }
    }, [scope, form]);

    useEffect(() => {
        if (activationType === "voucher") {
            form.setFieldValue("can_stack_with_voucher", true);
        }
    }, [activationType, form]);

    const bannerUploadProps: UploadProps = {
        listType: "picture-card",
        accept: "image/*",
        maxCount: 1,
        fileList: bannerFileList,

        beforeUpload: (file) => {
            if (!file.type.startsWith("image/")) {
                message.error("Chỉ được upload file ảnh");
                return Upload.LIST_IGNORE;
            }
            if (file.size / 1024 / 1024 > 5) {
                message.error("Ảnh phải <= 5MB");
                return Upload.LIST_IGNORE;
            }
            return false;
        },

        onChange: ({ fileList }) => {
            const last = fileList
                .slice(-1)
                .map((f) => ({ ...f, status: "done" as const }));
            setBannerFileList(last);
            setBannerFile((last?.[0]?.originFileObj as File) ?? null);
            setBannerRemoved(false);
        },

        onRemove: () => {
            setBannerFileList([]);
            setBannerFile(null);
            setBannerRemoved(true);
            return true;
        },
    };

    const handleOk = async () => {
        try {
            const values = await form.validateFields();

            if (!editing && !bannerFile) {
                message.error("Vui lòng tải 1 ảnh banner trước khi tạo");
                return;
            }

            if (editing && bannerRemoved && !bannerFile) {
                message.error("Bạn đã xoá banner. Vui lòng tải banner mới trước khi lưu.");
                return;
            }

            const [from, to] = values.date_range ?? [];

            if (values.show_push_noti && !from) {
                message.error("Bật push noti thì phải chọn thời điểm bắt đầu");
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
                            : values.allowed_order_types ?? [],

                allowed_payment_methods: values.allowed_payment_methods ?? [],
                exclusive_group:
                    String(values.exclusive_group ?? "").trim() || undefined,

                conditions: {
                    valid_from: from ? dayjs(from).toISOString() : undefined,
                    valid_to: to ? dayjs(to).toISOString() : undefined,
                },

                show_as_popup: !!values.show_as_popup,
                is_active: !!values.is_active,
                show_push_noti: !!values.show_push_noti,
                push_noti_title:
                    String(values.push_noti_title ?? "").trim() || undefined,
                push_noti_body:
                    String(values.push_noti_body ?? "").trim() || undefined,
            };

            await onSubmit({ payload, bannerFile, bannerRemoved });
        } catch (e: any) {
            if (e?.errorFields?.length) return;
            message.error(e?.response?.data?.message || e?.message || "Có lỗi xảy ra");
        }
    };

    return (
        <Modal
            title={editing ? "Chỉnh sửa Platform Promotion" : "Tạo Platform Promotion"}
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
                    rules={[{ required: true, message: "Vui lòng nhập tên" }]}
                >
                    <Input placeholder="VD: Giảm 20% toàn sàn" />
                </Form.Item>

                <Form.Item label="Mô tả" name="description">
                    <Input.TextArea rows={3} placeholder="Mô tả ngắn..." />
                </Form.Item>

                <Form.Item
                    label="Banner (Admin)"
                    required
                    style={{ textAlign: "center" }}
                    extra={
                        editing
                            ? "Giữ banner cũ hoặc tải banner mới."
                            : "Bắt buộc tải 1 ảnh banner."
                    }
                >
                    <div style={{ display: "flex", justifyContent: "center" }}>
                        <Upload {...bannerUploadProps}>
                            {bannerFileList.length >= 1 ? null : (
                                <div style={{ padding: 10 }}>
                                    <UploadOutlined />
                                    <div style={{ marginTop: 6, fontSize: 12 }}>Tải ảnh</div>
                                </div>
                            )}
                        </Upload>
                    </div>
                </Form.Item>

                <Row gutter={12}>
                    <Col span={12}>
                        <Form.Item
                            label="Phạm vi"
                            name="scope"
                            rules={[{ required: true }]}
                        >
                            <Select options={SCOPE_OPTIONS} />
                        </Form.Item>
                    </Col>

                    <Col span={12}>
                        <Form.Item
                            label="Loại giảm"
                            name="type"
                            rules={[{ required: true }]}
                        >
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

                <Row gutter={12}>
                    <Col span={12}>
                        <Form.Item
                            label="Giá trị giảm"
                            name="discount_value"
                            rules={[{ required: true, message: "Nhập giá trị giảm" }]}
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

                <Form.Item
                    label="Giới hạn loại thanh toán"
                    name="allowed_payment_methods"
                >
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

                {showPushNoti && (
                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item label="Tiêu đề push" name="push_noti_title">
                                <Input placeholder="VD: Ưu đãi mới dành cho bạn" />
                            </Form.Item>
                        </Col>

                        <Col span={12}>
                            <Form.Item label="Nội dung push" name="push_noti_body">
                                <Input.TextArea
                                    autoSize={{ minRows: 3, maxRows: 6 }}
                                    placeholder={`VD: Voucher giảm 20% vừa bắt đầu
Áp dụng từ 10:00 hôm nay
Số lượng có hạn`}
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                )}

                <Row gutter={12}>
                    <Col span={6}>
                        <Form.Item
                            label="Stack với voucher"
                            name="can_stack_with_voucher"
                            valuePropName="checked"
                        >
                            <Switch disabled={activationType === "voucher"} />
                        </Form.Item>
                    </Col>

                    <Col span={6}>
                        <Form.Item
                            label="Hiện popup"
                            name="show_as_popup"
                            valuePropName="checked"
                        >
                            <Switch />
                        </Form.Item>
                    </Col>

                    <Col span={6}>
                        <Form.Item
                            label="Push noti"
                            name="show_push_noti"
                            valuePropName="checked"
                        >
                            <Switch />
                        </Form.Item>
                    </Col>

                    <Col span={6}>
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