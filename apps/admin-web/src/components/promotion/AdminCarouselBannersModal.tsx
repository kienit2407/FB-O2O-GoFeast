/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import {
    Modal,
    Upload,
    message,
    Spin,
    Button,
    Popconfirm,
    Tooltip,
    Space,
    Switch,
} from "antd";
import type { UploadFile, UploadProps } from "antd";
import { InboxOutlined, ArrowUpOutlined, ArrowDownOutlined, DeleteOutlined } from "@ant-design/icons";


import { useAdminCarouselBannersStore } from "@/store/adminCarouselBanners.store";
import { useIsMobile } from "@/hooks/use-mobile";

const { Dragger } = Upload;

type Props = {
    open: boolean;
    onClose: () => void;
};

export default function AdminCarouselBannersModal({ open, onClose }: Props) {
    const isMobile = useIsMobile();

    const {
        items,
        loading,
        uploading,
        savingOrder,
        fetch,
        uploadMany,
        toggle,
        remove,
        reorderRemote,
        setLocalItems,
    } = useAdminCarouselBannersStore();

    const [fileList, setFileList] = useState<UploadFile[]>([]);
    const [dirtyOrder, setDirtyOrder] = useState(false);

    useEffect(() => {
        if (open) {
            fetch().catch(() => message.error("Tải banner thất bại"));
            setFileList([]);
            setDirtyOrder(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const uploadProps: UploadProps = {
        multiple: true,
        maxCount: 10,
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
            return false; // ✅ không auto upload
        },
        onChange: ({ fileList }) => setFileList(fileList),
        fileList,
    };

    const handleUpload = async () => {
        if (!fileList.length) return message.warning("Vui lòng chọn ít nhất 1 ảnh");
        try {
            const files = fileList.map((f) => f.originFileObj).filter(Boolean) as File[];
            await uploadMany(files);
            message.success("Đã tải banner lên");
            setFileList([]);
        } catch (e: any) {
            message.error(e?.response?.data?.message || e?.message || "Upload thất bại");
        }
    };

    const moveItem = (index: number, delta: number) => {
        const arr = [...items];
        const to = index + delta;
        if (to < 0 || to >= arr.length) return;

        const [pick] = arr.splice(index, 1);
        arr.splice(to, 0, pick);

        setLocalItems(arr);
        setDirtyOrder(true);
    };

    const saveOrder = async () => {
        if (items.length <= 1 || !dirtyOrder) return;
        try {
            const payload = items.map((b, idx) => ({ id: String(b._id), position: idx }));
            await reorderRemote(payload);
            message.success("Đã lưu sắp xếp");
            setDirtyOrder(false);
        } catch (e: any) {
            message.error(e?.response?.data?.message || e?.message || "Không lưu được thứ tự");
        }
    };

    const close = () => {
        if (dirtyOrder) {
            Modal.confirm({
                title: "Bạn chưa lưu sắp xếp",
                content: "Đóng modal sẽ mất thứ tự vừa thay đổi. Bạn muốn đóng?",
                okText: "Đóng",
                cancelText: "Ở lại",
                onOk: () => {
                    setFileList([]);
                    setDirtyOrder(false);
                    onClose();
                },
            });
            return;
        }
        setFileList([]);
        onClose();
    };

    return (
        <Modal
            title="Quản lý Carousel Banner"
            open={open}
            onCancel={close}
            maskClosable={false}
            width={isMobile ? "95vw" : 860}
            style={isMobile ? { top: 12 } : undefined}
            footer={[
                <Button key="close" onClick={close}>
                    Đóng
                </Button>,
                <Button
                    key="save"
                    type="primary"
                    onClick={saveOrder}
                    loading={savingOrder}
                    disabled={!dirtyOrder || items.length <= 1}
                >
                    Lưu sắp xếp
                </Button>,
            ]}
            bodyStyle={isMobile ? { maxHeight: "75vh", overflowY: "auto" } : undefined}
        >
            <Spin spinning={loading}>
                {/* LIST */}
                <div className="mb-4">
                    <div className="mb-2 font-medium">Banner hiện có</div>

                    {items.length === 0 ? (
                        <div className="text-xs text-slate-500">Chưa có banner nào.</div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {items.map((b, index) => (
                                <div key={b._id} className="border rounded-md p-2 flex items-center gap-12 min-w-0">
                                    <div className="w-10 text-center text-xs text-slate-500 shrink-0">#{index + 1}</div>

                                    <img
                                        src={b.carousel_url}
                                        alt=""
                                        className={`${isMobile ? "w-24 h-14" : "w-32 h-20"} object-cover rounded shrink-0`}
                                    />

                                    <div className="flex-1 text-xs text-slate-500 min-w-0">
                                        position: {b.position}
                                    </div>

                                    <Space className="shrink-0" wrap>
                                        {/* switch active */}
                                        <Space>
                                            <Switch
                                                checked={!!b.is_active}
                                                onChange={async (checked) => {
                                                    try {
                                                        await toggle(String(b._id), checked);
                                                        message.success("Đã cập nhật trạng thái");
                                                    } catch (e: any) {
                                                        message.error(e?.response?.data?.message || e?.message || "Không cập nhật được");
                                                    }
                                                }}
                                            />
                                            <span className="text-xs">{b.is_active ? "Bật" : "Tắt"}</span>
                                        </Space>

                                        {/* reorder */}
                                        <Tooltip title="Lên">
                                            <Button
                                                size="small"
                                                icon={<ArrowUpOutlined />}
                                                onClick={() => moveItem(index, -1)}
                                                disabled={index === 0}
                                            />
                                        </Tooltip>
                                        <Tooltip title="Xuống">
                                            <Button
                                                size="small"
                                                icon={<ArrowDownOutlined />}
                                                onClick={() => moveItem(index, 1)}
                                                disabled={index === items.length - 1}
                                            />
                                        </Tooltip>

                                        {/* delete */}
                                        <Popconfirm
                                            title="Xoá banner?"
                                            description="Ảnh sẽ bị xoá trên Cloudinary và soft-delete trong DB."
                                            okText="Xoá"
                                            cancelText="Huỷ"
                                            okButtonProps={{ danger: true }}
                                            onConfirm={async () => {
                                                try {
                                                    await remove(String(b._id));
                                                    message.success("Đã xoá banner");
                                                } catch (e: any) {
                                                    message.error(e?.response?.data?.message || e?.message || "Không xoá được");
                                                }
                                            }}
                                        >
                                            <Button size="small" danger icon={<DeleteOutlined />} />
                                        </Popconfirm>
                                    </Space>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* UPLOAD */}
                <div className="mt-4">
                    <div className="mb-2 font-medium">Thêm banner mới</div>
                    <Dragger {...uploadProps}>
                        <p className="ant-upload-drag-icon">
                            <InboxOutlined />
                        </p>
                        <p className="ant-upload-text">Kéo thả hoặc bấm để chọn ảnh (tối đa 10 file)</p>
                        <p className="ant-upload-hint">JPG/PNG/WebP • Mỗi ảnh &lt; 5MB</p>
                    </Dragger>

                    <div className="mt-3 flex justify-end">
                        <Button
                            type="primary"
                            onClick={handleUpload}
                            loading={uploading}
                            disabled={!fileList.length}
                        >
                            Tải banner lên
                        </Button>
                    </div>
                </div>
            </Spin>
        </Modal>
    );
}