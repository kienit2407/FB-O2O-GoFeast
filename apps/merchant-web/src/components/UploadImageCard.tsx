/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from 'react';
import { Upload, Modal } from 'antd';
import type { UploadFile, UploadProps } from 'antd';
import { PlusOutlined, LoadingOutlined } from '@ant-design/icons';

type Props = {
    label: string;
    imageUrl?: string | null;
    onUpload: (file: File) => Promise<any>;
    // Thêm prop để tùy chỉnh tỉ lệ khung hình
    aspect?: 'square' | 'video'; 
};

export function UploadImageCard({ label, imageUrl, onUpload, aspect = 'square' }: Props) {
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewSrc, setPreviewSrc] = useState<string>('');
    const [uploading, setUploading] = useState(false);

    // Xác định class CSS dựa trên tỉ lệ mong muốn
    const containerClass = aspect === 'video' ? 'aspect-video-upload' : '';

    const fileList: UploadFile[] = useMemo(() => {
        if (!imageUrl) return [];
        return [
            {
                uid: '-1',
                name: 'image',
                status: 'done',
                url: imageUrl,
            },
        ];
    }, [imageUrl]);

    const props: UploadProps = {
        listType: 'picture-card',
        maxCount: 1,
        fileList,
        className: containerClass, // Gán class để tùy chỉnh bằng CSS
        onPreview: async (file) => {
            setPreviewSrc((file.url as string) || (file.preview as string) || '');
            setPreviewOpen(true);
        },
        customRequest: async (options) => {
            const file = options.file as File;
            setUploading(true);
            try {
                await onUpload(file);
                options.onSuccess?.({}, new XMLHttpRequest());
            } catch (e: any) {
                options.onError?.(e);
            } finally {
                setUploading(false);
            }
        },
    };

    return (
        <div className="space-y-2">
            <div className="text-sm font-medium text-gray-600">{label}</div>

            <Upload {...props}>
                {fileList.length === 0 && (
                    <div className="flex flex-col items-center justify-center">
                        {uploading ? <LoadingOutlined /> : <PlusOutlined />}
                        <div className="mt-2 text-xs">{uploading ? 'Đang tải...' : 'Tải lên'}</div>
                    </div>
                )}
            </Upload>

            <Modal open={previewOpen} title="Xem trước" footer={null} onCancel={() => setPreviewOpen(false)}>
                <img alt="preview" className="w-full rounded-md" src={previewSrc} />
            </Modal>
        </div>
    );
}