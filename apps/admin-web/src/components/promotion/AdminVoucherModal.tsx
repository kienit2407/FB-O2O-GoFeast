/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo } from "react";
import { DatePicker, Form, Input, InputNumber, Modal, Select, Space, Switch, message } from "antd";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;

type Props = {
    open: boolean;
    editing?: any | null;
    promotions: any[];
    saving?: boolean;
    onCancel: () => void;
    onSubmit: (args: { payload: any }) => Promise<void>;
};

export default function AdminVoucherModal({
    open,
    editing,
    promotions,
    saving,
    onCancel,
    onSubmit,
}: Props) {
    const [form] = Form.useForm();

    const voucherPromotions = useMemo(() => {
        return (promotions ?? []).filter(
            (p: any) => String(p?.activation_type ?? "auto") === "voucher",
        );
    }, [promotions]);

    useEffect(() => {
        if (!open) return;

        if (!editing) {
            form.resetFields();
            form.setFieldsValue({
                promotion_id: undefined,
                code: "",
                total_usage_limit: 0,
                per_user_limit: 0,
                date_range: null,
                is_active: true,
            });
            return;
        }

        const pid =
            typeof editing.promotion_id === "string"
                ? editing.promotion_id
                : String(editing?.promotion_id?._id ?? editing?.promotion_id ?? "");

        form.setFieldsValue({
            promotion_id: pid,
            code: String(editing.code ?? ""),
            total_usage_limit: Number(editing.total_usage_limit ?? 0),
            per_user_limit: Number(editing.per_user_limit ?? 0),
            date_range:
                editing?.start_date || editing?.end_date
                    ? [
                        editing?.start_date ? dayjs(editing.start_date) : null,
                        editing?.end_date ? dayjs(editing.end_date) : null,
                    ]
                    : null,
            is_active: !!editing.is_active,
        });
    }, [open, editing, form]);

    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            const [from, to] = values.date_range ?? [];

            if (!from || !to) {
                message.error("Vui lòng chọn đầy đủ thời gian áp dụng");
                return;
            }

            if (dayjs(to).isBefore(dayjs(from), "day")) {
                message.error("Ngày kết thúc phải >= ngày bắt đầu");
                return;
            }

            const payload: any = {
                promotion_id: values.promotion_id,
                code: String(values.code ?? "").trim().toUpperCase(),
                total_usage_limit: Number(values.total_usage_limit ?? 0),
                per_user_limit: Number(values.per_user_limit ?? 0),
                start_date: dayjs(from).format("YYYY-MM-DD"),
                end_date: dayjs(to).format("YYYY-MM-DD"),
                is_active: !!values.is_active,
            };

            await onSubmit({ payload });
        } catch (e: any) {
            if (e?.errorFields?.length) return;
            message.error(e?.response?.data?.message || e?.message || "Có lỗi xảy ra");
        }
    };

    return (
        <Modal
            title={editing ? "Chỉnh sửa Platform Voucher" : "Tạo Platform Voucher"}
            open={open}
            onCancel={onCancel}
            onOk={handleOk}
            okText={editing ? "Lưu" : "Tạo"}
            cancelText="Huỷ"
            confirmLoading={!!saving}
        >
            <Form form={form} layout="vertical">
                <Form.Item
                    label="Chương trình (promotion)"
                    name="promotion_id"
                    rules={[{ required: true, message: "Vui lòng chọn chương trình" }]}
                >
                    <Select
                        showSearch
                        optionFilterProp="label"
                        options={voucherPromotions.map((p: any) => ({
                            value: String(p._id),
                            label: `${p.name}`,
                        }))}
                        placeholder="Chọn promotion kiểu voucher..."
                    />
                </Form.Item>

                <Form.Item
                    label="Mã voucher"
                    name="code"
                    rules={[
                        { required: true, message: "Vui lòng nhập mã" },
                        { max: 64, message: "Mã tối đa 64 ký tự" },
                    ]}
                >
                    <Input
                        placeholder="VD: WELCOME20K"
                        onChange={(e) =>
                            form.setFieldValue("code", e.target.value.toUpperCase())
                        }
                    />
                </Form.Item>

                <Space style={{ display: "flex" }} size={12}>
                    <Form.Item label="Tổng lượt dùng" name="total_usage_limit" style={{ flex: 1 }}>
                        <InputNumber min={0} style={{ width: "100%" }} placeholder="0 = không giới hạn" />
                    </Form.Item>
                    <Form.Item label="Mỗi khách" name="per_user_limit" style={{ flex: 1 }}>
                        <InputNumber min={0} style={{ width: "100%" }} placeholder="0 = không giới hạn" />
                    </Form.Item>
                </Space>

                <Form.Item
                    label="Thời gian áp dụng"
                    name="date_range"
                    rules={[{ required: true, message: "Vui lòng chọn thời gian áp dụng" }]}
                >
                    <RangePicker style={{ width: "100%" }} />
                </Form.Item>

                <Form.Item label="Hoạt động" name="is_active" valuePropName="checked" initialValue={true}>
                    <Switch />
                </Form.Item>
            </Form>
        </Modal>
    );
}