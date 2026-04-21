/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from 'react';
import { Modal, Upload, message, Spin, Button, Popconfirm } from 'antd';
import type { UploadFile, UploadProps } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { menuService } from '@/service/menu.service';

const { Dragger } = Upload;

export type ProductImage = {
    url: string;
    public_id: string;   // ✅ dùng public_id làm id
    position: number;
};

interface ProductImagesModalProps {
    open: boolean;
    productId: string | null;
    onClose: () => void;
    onChanged?: () => void;
}

export default function ProductImagesModal({
    open,
    productId,
    onClose,
    onChanged,
}: ProductImagesModalProps) {
    const [images, setImages] = useState<ProductImage[]>([]);
    const [loading, setLoading] = useState(false);

    const [uploading, setUploading] = useState(false);
    const [savingOrder, setSavingOrder] = useState(false);

    const [fileList, setFileList] = useState<UploadFile[]>([]);

    const canSaveOrder = useMemo(() => images.length > 1, [images.length]);

    const fetchImages = async () => {
        if (!productId) return;
        setLoading(true);
        try {
            const items = await menuService.listProductImages(productId);
            setImages(items as ProductImage[]);
        } catch (e: any) {
            console.error(e);
            message.error(e?.response?.data?.msg || e?.message || 'Không tải được danh sách ảnh sản phẩm');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open && productId) {
            fetchImages();
            setFileList([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, productId]);

    const uploadProps: UploadProps = {
        multiple: true,
        maxCount: 8,
        listType: 'picture',
        beforeUpload: (file) => {
            const okType = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
            if (!okType) {
                message.error('Chỉ cho phép JPG/PNG/WebP');
                return Upload.LIST_IGNORE;
            }
            const isLt5M = file.size / 1024 / 1024 < 5;
            if (!isLt5M) {
                message.error('Ảnh phải < 5MB');
                return Upload.LIST_IGNORE;
            }
            return false; // ✅ không auto upload
        },
        onChange: ({ fileList }) => setFileList(fileList),
        fileList,
    };

    const handleUpload = async () => {
        if (!productId) return;
        if (!fileList.length) {
            message.warning('Vui lòng chọn ít nhất 1 ảnh');
            return;
        }

        setUploading(true);
        try {
            const files = fileList.map(f => f.originFileObj as File).filter(Boolean);
            await menuService.uploadProductImages(productId, files);

            message.success('Tải ảnh lên thành công');
            setFileList([]);
            await fetchImages();
            onChanged?.();
        } catch (e: any) {
            console.error(e);
            message.error(e?.response?.data?.msg || e?.message || 'Có lỗi khi tải ảnh lên');
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteImage = async (publicId: string) => {
        if (!productId) return;
        try {
            await menuService.deleteProductImage(productId, publicId);
            message.success('Xoá ảnh thành công');
            setImages(prev => prev.filter(img => img.public_id !== publicId));
            onChanged?.();
        } catch (e: any) {
            console.error(e);
            message.error(e?.response?.data?.msg || e?.message || 'Không xoá được ảnh');
        }
    };

    const moveImage = (index: number, delta: number) => {
        setImages((prev) => {
            const newArr = [...prev];
            const newIndex = index + delta;
            if (newIndex < 0 || newIndex >= newArr.length) return prev;
            const [removed] = newArr.splice(index, 1);
            newArr.splice(newIndex, 0, removed);
            return newArr;
        });
    };

    const handleSaveOrder = async () => {
        if (!productId) return;
        setSavingOrder(true);
        try {
            const items = images.map((img, idx) => ({
                public_id: img.public_id,
                position: idx,
            }));

            await menuService.reorderProductImages(productId, items);

            message.success('Cập nhật thứ tự thành công');
            setImages(prev => prev.map((img, idx) => ({ ...img, position: idx })));
            onChanged?.();
        } catch (e: any) {
            console.error(e);
            message.error(e?.response?.data?.msg || e?.message || 'Không lưu được thứ tự ảnh');
        } finally {
            setSavingOrder(false);
        }
    };

    const handleClose = () => {
        setFileList([]);
        onClose();
    };

    return (
        <Modal
            title="Ảnh sản phẩm"
            open={open}
            onCancel={handleClose}
            footer={[
                <Button key="cancel" onClick={handleClose}>Đóng</Button>,
                <Button
                    key="save-order"
                    type="primary"
                    onClick={handleSaveOrder}
                    loading={savingOrder}
                    disabled={!canSaveOrder}
                >
                    Lưu sắp xếp
                </Button>,
            ]}
            width={860}
            maskClosable={false}
        >
            <Spin spinning={loading}>
                {/* LIST + REORDER */}
                <div style={{ marginBottom: 16 }}>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>Ảnh hiện có</div>

                    {images.length === 0 ? (
                        <div style={{ fontSize: 12, color: '#64748b' }}>Chưa có ảnh nào.</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {images.map((img, index) => (
                                <div
                                    key={img.public_id}
                                    style={{
                                        border: '1px solid #e2e8f0',
                                        borderRadius: 10,
                                        padding: 8,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 12,
                                    }}
                                >
                                    <div style={{ width: 56, textAlign: 'center', fontSize: 12, color: '#64748b' }}>
                                        #{index + 1}
                                    </div>

                                    <img
                                        src={img.url}
                                        alt=""
                                        style={{ width: 92, height: 70, objectFit: 'cover', borderRadius: 8 }}
                                    />

                                    <div style={{ flex: 1, fontSize: 12, color: '#64748b' }}>
                                        position: {img.position}
                                    </div>

                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <Button size="small" onClick={() => moveImage(index, -1)} disabled={index === 0}>
                                            Lên
                                        </Button>
                                        <Button size="small" onClick={() => moveImage(index, 1)} disabled={index === images.length - 1}>
                                            Xuống
                                        </Button>

                                        <Popconfirm
                                            title="Xoá ảnh"
                                            description="Bạn có chắc muốn xoá ảnh này?"
                                            okText="Xoá"
                                            cancelText="Huỷ"
                                            okButtonProps={{ danger: true }}
                                            onConfirm={() => handleDeleteImage(img.public_id)}
                                        >
                                            <Button size="small" danger>
                                                Xoá
                                            </Button>
                                        </Popconfirm>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* UPLOAD */}
                <div style={{ marginTop: 12 }}>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>Thêm ảnh mới</div>

                    <Dragger {...uploadProps}>
                        <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                        <p className="ant-upload-text">Kéo thả hoặc bấm để chọn ảnh</p>
                        <p className="ant-upload-hint">JPG/PNG/WebP • Mỗi ảnh &lt; 5MB • Tối đa 8 ảnh</p>
                    </Dragger>

                    <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button type="primary" onClick={handleUpload} loading={uploading} disabled={!fileList.length}>
                            Tải ảnh lên
                        </Button>
                    </div>
                </div>
            </Spin>
        </Modal>
    );
}