import { useEffect } from 'react';
import { Form, Input, InputNumber, Modal, Select, Switch } from 'antd';
import type {
    MerchantTable,
    MerchantTableStatus,
    UpsertTablePayload,
} from '@/service/table.service';

type TableFormValues = {
    table_number: string;
    name?: string;
    capacity?: number;
    is_active?: boolean;
    status?: MerchantTableStatus;
};

interface Props {
    open: boolean;
    loading?: boolean;
    initialValue?: MerchantTable | null;
    onCancel: () => void;
    onSubmit: (values: UpsertTablePayload) => Promise<void> | void;
}

const statusOptions = [
    { label: 'Trống', value: 'available' },
    { label: 'Đang dùng', value: 'occupied' },
    { label: 'Đã đặt', value: 'reserved' },
];

export default function TableFormModal({
    open,
    loading,
    initialValue,
    onCancel,
    onSubmit,
}: Props) {
    const [form] = Form.useForm<TableFormValues>();
    const isEdit = !!initialValue;

    useEffect(() => {
        if (!open) return;

        form.setFieldsValue({
            table_number: initialValue?.table_number ?? '',
            name: initialValue?.name ?? '',
            capacity: initialValue?.capacity ?? 4,
            is_active: initialValue?.is_active ?? true,
            status: initialValue?.status ?? 'available',
        });
    }, [form, initialValue, open]);

    const handleOk = async () => {
        const values = await form.validateFields();

        await onSubmit({
            table_number: values.table_number?.trim(),
            name: values.name?.trim() || undefined,
            capacity: Number(values.capacity ?? 0),
            is_active: !!values.is_active,
            status: values.status,
        });
    };

    return (
        <Modal
            title={isEdit ? `Chỉnh sửa bàn ${initialValue?.table_number}` : 'Thêm bàn mới'}
            open={open}
            onCancel={onCancel}
            onOk={handleOk}
            okText={isEdit ? 'Lưu thay đổi' : 'Tạo bàn'}
            cancelText="Đóng"
            confirmLoading={loading}
            destroyOnClose
            width={560}
        >
            <Form form={form} layout="vertical" requiredMark={false}>
                <Form.Item
                    label="Số bàn"
                    name="table_number"
                    rules={[
                        { required: true, message: 'Vui lòng nhập số bàn' },
                        { max: 30, message: 'Số bàn quá dài' },
                    ]}
                >
                    <Input placeholder="Ví dụ: A01, B12, VIP-01" />
                </Form.Item>

                <Form.Item label="Tên hiển thị" name="name">
                    <Input placeholder="Ví dụ: Bàn cửa sổ, Bàn sân vườn..." />
                </Form.Item>

                <Form.Item
                    label="Sức chứa"
                    name="capacity"
                    rules={[{ required: true, message: 'Vui lòng nhập sức chứa' }]}
                >
                    <InputNumber
                        min={1}
                        max={50}
                        style={{ width: '100%' }}
                        placeholder="Ví dụ: 4"
                    />
                </Form.Item>

                <Form.Item label="Đang hoạt động" name="is_active" valuePropName="checked">
                    <Switch />
                </Form.Item>

                {isEdit && (
                    <Form.Item label="Tình trạng bàn" name="status">
                        <Select options={statusOptions} />
                    </Form.Item>
                )}
            </Form>
        </Modal>
    );
}