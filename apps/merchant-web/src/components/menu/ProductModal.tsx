/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { Form, Input, Modal, Select, Switch, Upload, message } from "antd";
import type { UploadFile, UploadProps } from "antd";
import { InboxOutlined } from "@ant-design/icons";
import type { Category, Product, Topping } from "@/types";

const { Dragger } = Upload;

type Mode = "create" | "edit";

export type ProductFormValues = {
    name: string;
    description?: string;
    price: number;
    salePrice?: number;
    categoryId: string;
    toppings: string[];
    isActive: boolean;

    // nếu bạn đang dùng hidden field này thì thêm luôn cho đúng type
    isAvailable?: boolean;
};

type Props = {
    open: boolean;
    mode: Mode;
    initialData?: Product | null;
    categories: Category[];
    toppings: Topping[];
    onClose: () => void;
    onSubmit: (payload: { values: ProductFormValues; files: File[] }) => Promise<void>;
};

export default function ProductModal({
    open,
    mode,
    initialData,
    categories,
    toppings,
    onClose,
    onSubmit,
}: Props) {
    const isEdit = mode === "edit";
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm<ProductFormValues>();
    const [fileList, setFileList] = useState<UploadFile[]>([]);

    const productId = initialData?.id; // ✅ chỉ lấy id làm dependency

    const initialValues = useMemo<ProductFormValues>(() => {
        if (!initialData) {
            return {
                name: "",
                description: "",
                price: 0,
                salePrice: 0,
                categoryId: "",
                toppings: [],
                isActive: true,
                isAvailable: true,
            };
        }
        return {
            name: initialData.name ?? "",
            description: initialData.description ?? "",
            price: initialData.price ?? 0,
            salePrice: initialData.salePrice ?? 0,
            categoryId: initialData.categoryId ?? "",
            toppings: initialData.toppings ?? [],
            isActive: initialData.isActive ?? true,
            isAvailable: initialData.isAvailable ?? true,
        };
    }, [productId]); // ✅ chỉ đổi khi đổi product id

    useEffect(() => {
        if (!open) return;

        // ✅ set 1 lần khi mở / đổi id
        form.setFieldsValue(initialValues);
        setFileList([]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, productId]); // ✅ không phụ thuộc initialValues object ref

    const uploadProps: UploadProps = {
        multiple: true,
        maxCount: 5,
        listType: "picture",
        beforeUpload: (file) => {
            const okType = ["image/jpeg", "image/png", "image/webp"].includes(file.type);
            if (!okType) {
                message.error("Chỉ cho phép JPG/PNG/WebP");
                return Upload.LIST_IGNORE;
            }
            const isLt5M = file.size / 1024 / 1024 < 5;
            if (!isLt5M) {
                message.error("Ảnh phải < 5MB");
                return Upload.LIST_IGNORE;
            }
            return false;
        },
        onChange: ({ fileList }) => setFileList(fileList),
        fileList,
    };

    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            const files = fileList.map((f) => f.originFileObj as File).filter(Boolean);

            console.log("SUBMIT isActive =", values.isActive, typeof values.isActive);

            if (!isEdit && files.length === 0) {
                message.error("Vui lòng chọn ít nhất 1 ảnh");
                return;
            }

            setSaving(true);
            await onSubmit({
                values: { ...values, salePrice: Number(values.salePrice) || 0 },
                files,
            });
            onClose();
        } catch (err: any) {
            if (err?.errorFields?.length) return;
            message.error(err?.message || "Có lỗi xảy ra");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            title={isEdit ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm"}
            open={open}
            onCancel={onClose}
            onOk={handleOk}
            okText={isEdit ? "Lưu" : "Tạo"}
            cancelText="Huỷ"
            confirmLoading={saving}
            maskClosable={!saving}
            keyboard={!saving}
            width={760}
            destroyOnClose // ✅ cực quan trọng: đóng modal reset form
        >
            {/* ✅ BỎ initialValues ở đây */}
            <Form<ProductFormValues> form={form} layout="vertical">
                <Form.Item
                    label="Tên sản phẩm"
                    name="name"
                    rules={[
                        { required: true, message: "Vui lòng nhập tên sản phẩm" },
                        { max: 160, message: "Tên tối đa 160 ký tự" },
                    ]}
                >
                    <Input placeholder="VD: Cà phê sữa đá" />
                </Form.Item>

                <Form.Item label="Mô tả" name="description" rules={[{ max: 2000, message: "Mô tả tối đa 2000 ký tự" }]}>
                    <Input.TextArea rows={4} placeholder="Mô tả sản phẩm..." />
                </Form.Item>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <Form.Item
                        label="Giá gốc (VNĐ)"
                        name="price"
                        rules={[
                            { required: true, message: "Vui lòng nhập giá" },
                            { type: "number", min: 0, transform: (v) => Number(v), message: "Giá phải >= 0" },
                        ]}
                    >
                        <Input type="number" placeholder="35000" />
                    </Form.Item>

                    <Form.Item
                        label="Giá giảm (VNĐ)"
                        name="salePrice"
                        rules={[
                            { type: "number", min: 0, transform: (v) => Number(v), message: "Giá giảm phải >= 0" },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    const base = Number(getFieldValue("price") ?? 0);
                                    const sale = Number(value ?? 0);
                                    if (!sale) return Promise.resolve();
                                    if (sale > base) return Promise.reject(new Error("Giá giảm phải <= giá gốc"));
                                    return Promise.resolve();
                                },
                            }),
                        ]}
                        extra="Để 0 nếu không giảm"
                    >
                        <Input type="number" placeholder="30000" />
                    </Form.Item>
                </div>

                <Form.Item label="Danh mục" name="categoryId" rules={[{ required: true, message: "Vui lòng chọn danh mục" }]}>
                    <Select
                        placeholder="Chọn danh mục"
                        options={categories.filter((c) => c.isActive).map((c) => ({ value: c.id, label: c.name }))}
                    />
                </Form.Item>

                <Form.Item label="Topping áp dụng" name="toppings">
                    <Select
                        mode="multiple"
                        placeholder="Chọn topping"
                        options={toppings.map((t) => ({
                            value: t.id,
                            label: `${t.name} (+${new Intl.NumberFormat("vi-VN").format(t.price)}đ)`,
                        }))}
                    />
                </Form.Item>

                <Form.Item name="isAvailable" hidden valuePropName="checked">
                    <Switch />
                </Form.Item>

                <Form.Item label="Còn hoạt động" name="isActive" valuePropName="checked">
                    <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
                </Form.Item>

                {!isEdit ? (
                    <>
                        <div style={{ fontWeight: 600, marginBottom: 8 }}>Ảnh sản phẩm</div>
                        <Dragger {...uploadProps}>
                            <p className="ant-upload-drag-icon">
                                <InboxOutlined />
                            </p>
                            <p className="ant-upload-text">Kéo thả hoặc bấm để chọn ảnh</p>
                            <p className="ant-upload-hint">JPG/PNG/WebP • Tối đa 5 ảnh • Mỗi ảnh &lt; 5MB</p>
                        </Dragger>
                    </>
                ) : (
                    <div style={{ fontSize: 12, color: "#666" }}>
                        Ảnh sản phẩm quản lý ở nút <b>Ảnh</b> ngoài bảng.
                    </div>
                )}
            </Form>
        </Modal>
    );
}