import { useMemo, useRef } from 'react';
import { Button, Divider, Input, Modal, QRCode, Space, Typography, message } from 'antd';
import {
    CopyOutlined,
    DownloadOutlined,
    PrinterOutlined,
    QrcodeOutlined,
} from '@ant-design/icons';
import type { MerchantTable } from '@/service/table.service';

const { Text, Title } = Typography;

interface Props {
    open: boolean;
    table?: MerchantTable | null;
    merchantName?: string;
    onClose: () => void;
}

export default function TableQrModal({
    open,
    table,
    merchantName,
    onClose,
}: Props) {
    const qrWrapperRef = useRef<HTMLDivElement | null>(null);

    const displayName = useMemo(() => {
        if (!table) return '';
        return table.name?.trim()
            ? `${table.table_number} • ${table.name}`
            : `Bàn ${table.table_number}`;
    }, [table]);

    const qrValue = table?.qr_content ?? '';

    const handleCopy = async () => {
        if (!qrValue) return;
        await navigator.clipboard.writeText(qrValue);
        message.success('Đã sao chép link QR');
    };

    const getCanvas = () => {
        return qrWrapperRef.current?.querySelector('canvas') as HTMLCanvasElement | null;
    };

    const handleDownload = () => {
        const canvas = getCanvas();
        if (!canvas || !table) {
            message.error('Không tải được QR');
            return;
        }

        const url = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url;
        a.download = `qr-ban-${table.table_number}.png`;
        a.click();
    };

    const handlePrint = () => {
        const canvas = getCanvas();
        if (!canvas || !table) {
            message.error('Không in được QR');
            return;
        }

        const dataUrl = canvas.toDataURL('image/png');
        const win = window.open('', '_blank', 'width=900,height=700');
        if (!win) {
            message.error('Trình duyệt đã chặn cửa sổ in');
            return;
        }

        win.document.write(`
      <html>
        <head>
          <title>QR bàn ${table.table_number}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 24px;
              text-align: center;
              color: #111827;
            }
            .wrap {
              width: 360px;
              margin: 0 auto;
              border: 1px solid #e5e7eb;
              border-radius: 16px;
              padding: 24px;
            }
            .merchant {
              font-size: 14px;
              color: #6b7280;
              margin-bottom: 8px;
            }
            .title {
              font-size: 28px;
              font-weight: 700;
              margin-bottom: 10px;
            }
            .hint {
              font-size: 14px;
              color: #4b5563;
              margin-top: 14px;
              line-height: 1.5;
            }
            img {
              width: 240px;
              height: 240px;
              display: block;
              margin: 0 auto;
            }
            .link {
              margin-top: 12px;
              font-size: 12px;
              color: #9ca3af;
              word-break: break-all;
            }
            @media print {
              body {
                padding: 0;
              }
              .wrap {
                border: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="wrap">
            <div class="merchant">${merchantName || 'Nhà hàng'}</div>
            <div class="title">Bàn ${table.table_number}</div>
            <img src="${dataUrl}" />
            <div class="hint">Quét mã để xem menu và gọi món tại bàn</div>
            <div class="link">${qrValue}</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            }
          </script>
        </body>
      </html>
    `);

        win.document.close();
    };

    return (
        <Modal
            title="Mã QR của bàn"
            open={open}
            onCancel={onClose}
            footer={null}
            width={560}
            destroyOnClose
        >
            {table ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div
                        style={{
                            padding: 20,
                            borderRadius: 16,
                            border: '1px solid #f0f0f0',
                            background: '#fff',
                            textAlign: 'center',
                        }}
                    >
                        <Text type="secondary">{merchantName || 'Nhà hàng'}</Text>
                        <Title level={3} style={{ marginTop: 8, marginBottom: 8 }}>
                            {displayName}
                        </Title>

                        <div
                            ref={qrWrapperRef}
                            style={{
                                display: 'flex',
                                justifyContent: 'center',
                                marginTop: 12,
                                marginBottom: 12,
                            }}
                        >
                            <QRCode
                                value={qrValue || '-'}
                                size={240}
                                type="canvas"
                                icon="/icon_app.png"
                                errorLevel="H"
                                bordered
                            />
                        </div>

                        <Text type="secondary">
                            Khách có thể quét bằng camera điện thoại hoặc quét ngay trong app
                        </Text>
                    </div>

                    <div>
                        <Text strong>Link trung gian</Text>
                        <Input.TextArea
                            style={{ marginTop: 8 }}
                            readOnly
                            value={qrValue}
                            autoSize={{ minRows: 2, maxRows: 4 }}
                        />
                    </div>

                    <Divider style={{ margin: 0 }} />

                    <Space wrap>
                        <Button icon={<CopyOutlined />} onClick={handleCopy}>
                            Sao chép link
                        </Button>
                        <Button icon={<DownloadOutlined />} onClick={handleDownload}>
                            Tải PNG
                        </Button>
                        <Button icon={<PrinterOutlined />} onClick={handlePrint}>
                            In QR
                        </Button>
                        <Button icon={<QrcodeOutlined />} onClick={onClose}>
                            Đóng
                        </Button>
                    </Space>
                </div>
            ) : null}
        </Modal>
    );
}