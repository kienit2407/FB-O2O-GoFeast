/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { Form, Input, Modal, Upload, message } from "antd";
import type { UploadFile, UploadProps } from "antd/es/upload/interface";
import type { Topping } from "@/types";

type Mode = "create" | "edit";

type FormValues = {
    name: string;
    price: number;
};

type Props = {
    open: boolean;
    mode: Mode;
    saving?: boolean;
    initialData?: Topping | null;

    // nếu bạn muốn: tạo/sửa bắt buộc có ảnh?
    requireImage?: boolean;

    onCancel: () => void;
    onSubmit: (args: {
        values: { name: string; price: number };
        imageFile: File | null;
        removeImage: boolean;
    }) => Promise<void>;
};

export default function ToppingModalAntd({
    open,
    mode,
    saving,
    initialData,
    requireImage = false,
    onCancel,
    onSubmit,
}: Props) {
    const isEdit = mode === "edit";
    const [form] = Form.useForm<FormValues>();

    // ===== image state =====
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageFileList, setImageFileList] = useState<UploadFile[]>([]);
    const [imageRemoved, setImageRemoved] = useState(false);

    // init form + init preview image
    useEffect(() => {
        if (!open) return;

        form.setFieldsValue({
            name: initialData?.name ?? "",
            price: Number(initialData?.price ?? 0),
        });

        setImageFile(null);
        setImageRemoved(false);

        // show ảnh cũ nếu edit
        setImageFileList(
            initialData?.imageUrl
                ? [{ uid: "existing-image", name: "image", status: "done", url: initialData.imageUrl }]
                : []
        );
    }, [open, initialData, form]);

    const uploadProps: UploadProps = useMemo(
        () => ({
            listType: "picture-card",
            accept: "image/*",
            maxCount: 1,
            fileList: imageFileList,

            beforeUpload: (file) => {
                if (!file.type.startsWith("image/")) {
                    message.error("Chỉ được chọn file ảnh");
                    return Upload.LIST_IGNORE;
                }
                if (file.size / 1024 / 1024 > 5) {
                    message.error("Ảnh phải <= 5MB");
                    return Upload.LIST_IGNORE;
                }
                return false; // manual upload
            },

            onChange: ({ fileList }) => {
                const last = fileList.slice(-1).map((f) => ({ ...f, status: "done" as const }));
                setImageFileList(last);
                setImageFile((last?.[0]?.originFileObj as File) ?? null);
                setImageRemoved(false);
            },

            onRemove: () => {
                setImageFileList([]);
                setImageFile(null);

                // nếu edit và xoá ảnh cũ => đánh dấu remove
                setImageRemoved(isEdit && !!initialData?.imageUrl);
                return true;
            },
        }),
        [imageFileList, isEdit, initialData?.imageUrl]
    );

    const handleOk = async () => {
        try {
            const values = await form.validateFields();

            // ===== CHECK ẢNH (tuỳ bạn bật/tắt) =====
            if (requireImage) {
                const hasOld = !!initialData?.imageUrl;
                const hasNew = !!imageFile;

                // create: bắt buộc có ảnh mới
                if (!isEdit && !hasNew) {
                    message.error("Vui lòng chọn ảnh topping trước khi tạo");
                    return;
                }

                // edit:
                // - nếu xoá ảnh cũ (imageRemoved=true) thì phải chọn ảnh mới
                if (isEdit && hasOld && imageRemoved && !hasNew) {
                    message.error("Bạn đã xoá ảnh. Vui lòng chọn ảnh mới trước khi lưu");
                    return;
                }
            }

            await onSubmit({
                values: {
                    name: String(values.name).trim(),
                    price: Number(values.price) || 0,
                },
                imageFile,
                removeImage: isEdit ? imageRemoved : false,
            });
        } catch (e: any) {
            if (e?.errorFields?.length) return;
            message.error(e?.message || "Có lỗi xảy ra");
        }
    };

    return (
        <Modal
            title={isEdit ? "Chỉnh sửa topping" : "Thêm topping"}
            open={open}
            onCancel={onCancel}
            onOk={handleOk}
            okText={isEdit ? "Lưu" : "Tạo"}
            cancelText="Huỷ"
            confirmLoading={!!saving}
            maskClosable={false}
            destroyOnClose
        >
            <Form<FormValues> form={form} layout="vertical" initialValues={{ name: "", price: 0 }}>
                <Form.Item
                    label="Tên topping"
                    name="name"
                    rules={[
                        { required: true, message: "Vui lòng nhập tên topping" },
                        { max: 160, message: "Tên tối đa 160 ký tự" },
                    ]}
                >
                    <Input placeholder="VD: Trân châu đen" />
                </Form.Item>

                <Form.Item
                    label="Giá (VNĐ)"
                    name="price"
                    rules={[
                        { required: true, message: "Vui lòng nhập giá" },
                        { type: "number", min: 0, transform: (v) => Number(v), message: "Giá phải >= 0" },
                    ]}
                >
                    <Input type="number" placeholder="10000" />
                </Form.Item>

                <Form.Item label="Ảnh topping (tuỳ chọn)">
                    <Upload {...uploadProps}>
                        {imageFileList.length >= 1 ? null : <div style={{ padding: 8 }}>Chọn ảnh</div>}
                    </Upload>

                    {isEdit && initialData?.imageUrl && imageRemoved && !imageFile ? (
                        <div style={{ marginTop: 6, color: "#d46b08" }}>
                            Bạn đã xoá ảnh. Lưu sẽ xoá ảnh cũ trên server.
                        </div>
                    ) : null}
                </Form.Item>
            </Form>
        </Modal>
    );
}