/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Alert,
    Avatar,
    Badge,
    Button,
    Card,
    Checkbox,
    Col,
    Collapse,
    Descriptions,
    Divider,
    Form,
    Grid,
    Image,
    Input,
    Modal,
    Row,
    Skeleton,
    Space,
    Statistic,
    Tabs,
    Tag,
    Tooltip,
    Typography,
    message,
    theme,
} from 'antd';
import {
    ArrowLeftOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    CopyOutlined,
    EyeOutlined,
    PhoneOutlined,
    MailOutlined,
    IdcardOutlined,
    CarOutlined,
    StarFilled,
    WalletOutlined,
    FileDoneOutlined,
} from '@ant-design/icons';

import { useDriverApprovalStore } from '@/store/driverApprovalStore';
import type { AdminDriverRow } from '@/service/driverApproval.service';

const { Title, Text } = Typography;
const { TextArea } = Input;

const rejectionReasons = [
    'CMND/CCCD không hợp lệ',
    'Bằng lái không hợp lệ',
    'Ảnh xe không rõ ràng',
    'Biển số không khớp',
    'Phương tiện không đủ điều kiện',
    'Khác',
];

const fmt = (d?: string | null) => {
    if (!d) return '—';
    const t = new Date(d);
    if (Number.isNaN(t.getTime())) return '—';
    return t.toLocaleString('vi-VN');
};

const maskId = (s?: string | null) => {
    if (!s) return '—';
    if (s.length <= 6) return s;
    return `${s.slice(0, 3)}••••${s.slice(-3)}`;
};

const getStatusMeta = (status?: string) => {
    const s = String(status ?? '').toLowerCase();
    if (s === 'approved') return { color: 'green', text: 'Đã duyệt', badge: 'success' as const };
    if (s === 'pending') return { color: 'gold', text: 'Chờ duyệt', badge: 'processing' as const };
    if (s === 'rejected') return { color: 'red', text: 'Từ chối', badge: 'error' as const };
    if (s === 'draft') return { color: 'default', text: 'Nháp', badge: 'default' as const };
    return { color: 'default', text: '—', badge: 'default' as const };
};

const copyText = async (label: string, value?: string | null) => {
    if (!value) return;
    try {
        await navigator.clipboard.writeText(value);
        message.success(`Đã copy ${label}`);
    } catch {
        message.error('Copy thất bại');
    }
};

function EllipsisCopy(props: { value?: string | null; label?: string; code?: boolean; maxWidth?: number }) {
    const { value, code, maxWidth = 260, label = 'nội dung' } = props;
    if (!value) return <Text type="secondary">—</Text>;

    return (
        <Space size={6} wrap>
            <Tooltip title={value}>
                <Text
                    code={code}
                    style={{ maxWidth, display: 'inline-block', verticalAlign: 'bottom' }}
                    ellipsis
                >
                    {value}
                </Text>
            </Tooltip>
            <Button
                size="small"
                type="text"
                icon={<CopyOutlined />}
                onClick={() => copyText(label, value)}
            />
        </Space>
    );
}

function StatCard(props: {
    icon: ReactNode;
    title: string;
    value: any;
    suffix?: string;
    precision?: number;
    compact?: boolean;
}) {
    const { token } = theme.useToken();
    const compact = !!props.compact;

    return (
        <Card
            size="small"
            style={{
                borderRadius: 14,
                border: `1px solid ${token.colorBorderSecondary}`,
                background: token.colorBgContainer,
            }}
            bodyStyle={{ padding: compact ? 10 : 12 }}
        >
            <Space align="center" size={10}>
                <div
                    style={{
                        width: compact ? 32 : 36,
                        height: compact ? 32 : 36,
                        borderRadius: 12,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: token.colorFillTertiary,
                    }}
                >
                    {props.icon}
                </div>

                <Statistic
                    title={<span style={{ color: token.colorTextSecondary }}>{props.title}</span>}
                    value={props.value}
                    suffix={props.suffix}
                    precision={props.precision}
                    valueStyle={{ fontSize: compact ? 16 : 18, fontWeight: 700 }}
                />
            </Space>
        </Card>
    );
}

function DocTile(props: { title: string; url?: string | null; extraUrls?: string[]; badge?: string; compact?: boolean }) {
    const { token } = theme.useToken();
    const items = [props.url, ...(props.extraUrls ?? [])].filter(Boolean) as string[];
    const h = props.compact ? 140 : 180;

    return (
        <Card
            hoverable={!!props.url}
            style={{ borderRadius: 14, overflow: 'hidden', border: `1px solid ${token.colorBorderSecondary}` }}
            bodyStyle={{ padding: props.compact ? 10 : 12 }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                <Text strong>{props.title}</Text>
                {props.badge ? <Tag color="blue" style={{ margin: 0 }}>{props.badge}</Tag> : null}
            </div>

            <div style={{ marginTop: 10 }}>
                {props.url ? (
                    <Image.PreviewGroup items={items}>
                        <Image
                            src={props.url}
                            alt={props.title}
                            width="100%"
                            wrapperStyle={{ width: '100%', borderRadius: 12, overflow: 'hidden' }}
                            style={{ width: '100%', height: h, objectFit: 'cover', borderRadius: 12 }}
                            preview={{ mask: <span><EyeOutlined /> Xem</span> }}
                            fallback=""
                        />
                    </Image.PreviewGroup>
                ) : (
                    <div
                        style={{
                            height: h,
                            borderRadius: 12,
                            background: token.colorFillQuaternary,
                            border: `1px dashed ${token.colorBorder}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: token.colorTextSecondary,
                        }}
                    >
                        Chưa có ảnh
                    </div>
                )}
            </div>
        </Card>
    );
}

export default function DriverDetail() {
    const { token } = theme.useToken();
    const nav = useNavigate();
    const { userId } = useParams();
    const screens = Grid.useBreakpoint();
    const isMobile = !screens.md;

    const pagePad = isMobile ? 12 : 16;
    const cardPad = isMobile ? 12 : 16;

    const { drivers, fetchDrivers, approveDriver, rejectDriver, loading } = useDriverApprovalStore();

    const fromStore = useMemo(() => {
        if (!userId) return null;
        return drivers.find((d) => d.user.id === userId) ?? null;
    }, [drivers, userId]);

    const [row, setRow] = useState<AdminDriverRow | null>(fromStore);
    const [pageLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const [rejectOpen, setRejectOpen] = useState(false);
    const [rejectForm] = Form.useForm();

    useEffect(() => {
        if (fromStore) setRow(fromStore);
    }, [fromStore]);

    useEffect(() => {
        if (!drivers.length) fetchDrivers('list');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const u = row?.user;
    const p = row?.driver_profile;

    const canApproveReject = row?.verification_status === 'pending';
    const status = getStatusMeta(row?.verification_status);

    const onApprove = async () => {
        if (!u?.id) return;
        await approveDriver(u.id);
        message.success('Đã duyệt tài xế');
    };

    const onReject = async () => {
        if (!u?.id) return;
        const values = await rejectForm.validateFields();
        await rejectDriver(u.id, {
            reasons: values.reasons,
            note: values.note?.trim() || undefined,
        });
        message.success('Đã từ chối tài xế');
        setRejectOpen(false);
        rejectForm.resetFields();
    };

    if (pageLoading && !row) {
        return (
            <div style={{ padding: 16 }}>
                <Skeleton active paragraph={{ rows: 10 }} />
            </div>
        );
    }

    if (!row) {
        return (
            <div style={{ padding: 16 }}>
                <Alert
                    type="error"
                    showIcon
                    message="Không tìm thấy tài xế"
                    description={err ?? 'Tài xế không tồn tại hoặc bạn không có quyền truy cập.'}
                    action={
                        <Button onClick={() => nav('/drivers')} type="primary">
                            Về danh sách
                        </Button>
                    }
                />
            </div>
        );
    }

    const RightQuickInfo = (
        <>
            <Title level={5} style={{ marginTop: 0 }}>Quick info</Title>
            <Space direction="vertical" style={{ width: '100%' }} size={10}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <Text type="secondary">Biển số</Text>
                    <Text code style={{ textAlign: 'right' }}>{p?.vehicle_plate ?? '—'}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <Text type="secondary">Hãng xe</Text>
                    <Text style={{ textAlign: 'right' }}>{p?.vehicle_brand ?? '—'}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <Text type="secondary">Bằng lái</Text>
                    <Text style={{ textAlign: 'right' }}>{p?.license_type ?? '—'}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <Text type="secondary">Cập nhật</Text>
                    <Text style={{ textAlign: 'right' }}>{fmt(p?.updated_at ?? null)}</Text>
                </div>
            </Space>
        </>
    );

    const RightTimeInfo = (
        <>
            <Title level={5} style={{ marginTop: 0 }}>Thời gian</Title>
            <Space direction="vertical" style={{ width: '100%' }} size={10}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <Text type="secondary">Nộp hồ sơ</Text>
                    <Text style={{ textAlign: 'right' }}>{fmt(p?.submitted_at ?? null)}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <Text type="secondary">Tạo user</Text>
                    <Text style={{ textAlign: 'right' }}>{fmt(u?.created_at ?? null)}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <Text type="secondary">Update user</Text>
                    <Text style={{ textAlign: 'right' }}>{fmt(u?.updated_at ?? null)}</Text>
                </div>
            </Space>
        </>
    );

    return (
        <div style={{ background: token.colorBgLayout, minHeight: '100vh', padding: pagePad, width: '100%' }}>
            <div style={{ width: '100%' }}>
                {/* TOP BAR: mobile xuống hàng + nút full width */}
                <Card
                    style={{
                        borderRadius: 16,
                        border: `1px solid ${token.colorBorderSecondary}`,
                        marginBottom: 14,
                    }}
                    bodyStyle={{ padding: isMobile ? 10 : 12 }}
                >
                    <Row gutter={[10, 10]} align="middle">
                        <Col flex="auto">
                            <Space align="start">
                                <Button icon={<ArrowLeftOutlined />} onClick={() => nav(-1)}>
                                    Quay lại
                                </Button>

                                <Space direction="vertical" size={0}>
                                    <Space size={10} wrap>
                                        <Text strong style={{ fontSize: 16 }}>Chi tiết tài xế</Text>
                                        <Space size={6}>
                                            <Badge status={status.badge} />
                                            <Tag color={status.color} style={{ margin: 0 }}>{status.text}</Tag>
                                        </Space>
                                    </Space>

                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        ID: <Text code>{u?.id}</Text>
                                        <Button
                                            size="small"
                                            type="text"
                                            icon={<CopyOutlined />}
                                            onClick={() => copyText('User ID', u?.id)}
                                        />
                                    </Text>
                                </Space>
                            </Space>
                        </Col>

                        <Col xs={24} md="auto">
                            <Space
                                wrap
                                style={{ width: isMobile ? '100%' : 'auto' }}
                            >
                                {canApproveReject ? (
                                    <>
                                        <Button
                                            type="primary"
                                            icon={<CheckCircleOutlined />}
                                            loading={loading}
                                            onClick={onApprove}
                                            block={isMobile}
                                        >
                                            Duyệt
                                        </Button>
                                        <Button
                                            danger
                                            icon={<CloseCircleOutlined />}
                                            loading={loading}
                                            onClick={() => setRejectOpen(true)}
                                            block={isMobile}
                                        >
                                            Từ chối
                                        </Button>
                                    </>
                                ) : null}

                                <Button onClick={() => nav('/drivers')} block={isMobile}>
                                    Danh sách
                                </Button>
                            </Space>
                        </Col>
                    </Row>
                </Card>

                {err ? (
                    <Alert style={{ marginBottom: 12 }} type="warning" showIcon message="Có lỗi khi tải dữ liệu mới" description={err} />
                ) : null}

                <Row gutter={[14, 14]} style={{ width: '100%' }}>
                    {/* LEFT */}
                    <Col xs={24} xl={17} xxl={18}>
                        {/* HERO: mobile xếp dọc + copy buttons 2 cột */}
                        <Card
                            style={{
                                borderRadius: 18,
                                border: `1px solid ${token.colorBorderSecondary}`,
                                background: `linear-gradient(135deg, ${token.colorPrimaryBg} 0%, ${token.colorInfoBg} 45%, ${token.colorWarningBg} 100%)`,
                            }}
                            bodyStyle={{ padding: cardPad }}
                        >
                            <Row gutter={[12, 12]} align="middle">
                                <Col xs={24} md={16}>
                                    <Space align="start" size={12} style={{ width: '100%' }}>
                                        <Avatar size={isMobile ? 64 : 72} src={u?.avatar_url ?? undefined}>
                                            {(u?.full_name ?? u?.email ?? '?').trim().charAt(0).toUpperCase()}
                                        </Avatar>

                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>
                                                {u?.full_name ?? u?.email ?? 'Driver'}
                                            </Title>

                                            <Space wrap size={8} style={{ marginTop: 6 }}>
                                                <Tag icon={<IdcardOutlined />} style={{ margin: 0 }}>
                                                    {u?.role ?? 'driver'}
                                                </Tag>

                                                {p?.accept_food_orders ? (
                                                    <Tag color="green" style={{ margin: 0 }}>Nhận đơn</Tag>
                                                ) : (
                                                    <Tag style={{ margin: 0 }}>Không nhận đơn</Tag>
                                                )}
                                            </Space>

                                            <div style={{ marginTop: 10 }}>
                                                <Space direction="vertical" size={6} style={{ width: '100%' }}>
                                                    <Text type="secondary" style={{ display: 'block' }}>
                                                        <PhoneOutlined /> {u?.phone ?? '—'}
                                                    </Text>
                                                    <Text type="secondary" style={{ display: 'block' }}>
                                                        <MailOutlined /> {u?.email ?? '—'}
                                                    </Text>
                                                </Space>
                                            </div>
                                        </div>
                                    </Space>
                                </Col>

                                <Col xs={24} md={8}>
                                    <Row gutter={[8, 8]}>
                                        <Col xs={12} md={24}>
                                            <Button
                                                icon={<CopyOutlined />}
                                                onClick={() => copyText('Email', u?.email)}
                                                disabled={!u?.email}
                                                block
                                            >
                                                Copy email
                                            </Button>
                                        </Col>
                                        <Col xs={12} md={24}>
                                            <Button
                                                icon={<CopyOutlined />}
                                                onClick={() => copyText('SĐT', u?.phone)}
                                                disabled={!u?.phone}
                                                block
                                            >
                                                Copy SĐT
                                            </Button>
                                        </Col>
                                    </Row>
                                </Col>
                            </Row>

                            <Divider style={{ margin: '12px 0' }} />

                            <Row gutter={[10, 10]}>
                                <Col xs={12} md={6}>
                                    <StatCard compact={isMobile} icon={<CarOutlined />} title="Chuyến đi" value={p?.total_deliveries ?? 0} />
                                </Col>
                                <Col xs={12} md={6}>
                                    <StatCard
                                        compact={isMobile}
                                        icon={<StarFilled style={{ color: token.colorWarning }} />}
                                        title="Rating"
                                        value={Number(p?.average_rating ?? 0)}
                                        precision={1}
                                    />
                                </Col>
                                <Col xs={12} md={6}>
                                    <StatCard compact={isMobile} icon={<WalletOutlined />} title="Thu nhập" value={p?.total_earnings ?? 0} suffix="₫" />
                                </Col>
                                <Col xs={12} md={6}>
                                    <StatCard compact={isMobile} icon={<FileDoneOutlined />} title="Hồ sơ nộp" value={p?.submitted_at ? 'Có' : 'Chưa'} />
                                </Col>
                            </Row>
                        </Card>

                        {/* MOBILE: Quick info + Time đưa lên ngay dưới HERO dạng Collapse */}
                        {isMobile ? (
                            <Card
                                style={{ borderRadius: 18, marginTop: 14, border: `1px solid ${token.colorBorderSecondary}` }}
                                bodyStyle={{ padding: 0 }}
                            >
                                <Collapse
                                    defaultActiveKey={['quick']}
                                    bordered={false}
                                    items={[
                                        {
                                            key: 'quick',
                                            label: <Text strong>Quick info</Text>,
                                            children: (
                                                <div style={{ padding: 12 }}>
                                                    {RightQuickInfo}
                                                    <Divider style={{ margin: '12px 0' }} />
                                                    <Button block onClick={() => nav('/drivers/pending')}>
                                                        Tới danh sách chờ duyệt
                                                    </Button>
                                                </div>
                                            ),
                                        },
                                        {
                                            key: 'time',
                                            label: <Text strong>Thời gian</Text>,
                                            children: <div style={{ padding: 12 }}>{RightTimeInfo}</div>,
                                        },
                                    ]}
                                />
                            </Card>
                        ) : null}

                        {/* TABS */}
                        <Card
                            style={{ borderRadius: 18, marginTop: 14, border: `1px solid ${token.colorBorderSecondary}` }}
                            bodyStyle={{ padding: 0 }}
                        >
                            <Tabs
                                defaultActiveKey="overview"
                                size={isMobile ? 'small' : 'middle'}
                                tabBarStyle={{ padding: isMobile ? '0 10px' : '0 12px', marginBottom: 0 }}
                                items={[
                                    {
                                        key: 'overview',
                                        label: 'Tổng quan',
                                        children: (
                                            <div style={{ padding: cardPad }}>
                                                <Title level={5} style={{ marginTop: 0 }}>Thông tin tài khoản</Title>

                                                <Descriptions
                                                    bordered
                                                    size="small"
                                                    colon={false}
                                                    column={{ xs: 1, md: 2 }}
                                                    labelStyle={{
                                                        width: isMobile ? 120 : 160,
                                                        color: token.colorTextSecondary,
                                                        fontWeight: 600,
                                                    }}
                                                    contentStyle={{
                                                        color: token.colorText,
                                                        wordBreak: 'break-word',
                                                    }}
                                                    style={{ borderRadius: 14, overflow: 'hidden' }}
                                                >
                                                    <Descriptions.Item label="User ID">
                                                        <EllipsisCopy value={u?.id} label="User ID" code maxWidth={isMobile ? 220 : 320} />
                                                    </Descriptions.Item>

                                                    <Descriptions.Item label="Profile ID">
                                                        <EllipsisCopy value={p?._id ?? null} label="Profile ID" code maxWidth={isMobile ? 220 : 320} />
                                                    </Descriptions.Item>

                                                    <Descriptions.Item label="SĐT">
                                                        <EllipsisCopy value={u?.phone ?? null} label="SĐT" maxWidth={isMobile ? 220 : 280} />
                                                    </Descriptions.Item>

                                                    <Descriptions.Item label="Email">
                                                        <EllipsisCopy value={u?.email ?? null} label="Email" maxWidth={isMobile ? 220 : 320} />
                                                    </Descriptions.Item>

                                                    <Descriptions.Item label="CMND/CCCD">
                                                        <Space size={8}>
                                                            <Text>{maskId(p?.id_card_number ?? null)}</Text>
                                                            {p?.id_card_number ? (
                                                                <Button
                                                                    size="small"
                                                                    type="text"
                                                                    icon={<CopyOutlined />}
                                                                    onClick={() => copyText('CMND/CCCD', p.id_card_number!)}
                                                                />
                                                            ) : null}
                                                        </Space>
                                                    </Descriptions.Item>

                                                    <Descriptions.Item label="Trạng thái">
                                                        <Space size={8}>
                                                            <Badge status={status.badge} />
                                                            <Tag color={status.color} style={{ margin: 0 }}>{status.text}</Tag>
                                                        </Space>
                                                    </Descriptions.Item>

                                                    <Descriptions.Item label="Tạo lúc">{fmt(u?.created_at ?? null)}</Descriptions.Item>
                                                    <Descriptions.Item label="Cập nhật">{fmt(p?.updated_at ?? u?.updated_at ?? null)}</Descriptions.Item>
                                                </Descriptions>

                                                <Divider />

                                                <Title level={5} style={{ marginTop: 0 }}>Thông tin phương tiện</Title>
                                                <Descriptions
                                                    bordered
                                                    size="small"
                                                    colon={false}
                                                    column={{ xs: 1, md: 2 }}
                                                    labelStyle={{
                                                        width: isMobile ? 120 : 160,
                                                        color: token.colorTextSecondary,
                                                        fontWeight: 600,
                                                    }}
                                                    contentStyle={{ wordBreak: 'break-word' }}
                                                    style={{ borderRadius: 14, overflow: 'hidden' }}
                                                >
                                                    <Descriptions.Item label="Hãng xe">{p?.vehicle_brand ?? '—'}</Descriptions.Item>
                                                    <Descriptions.Item label="Dòng xe">{p?.vehicle_model ?? '—'}</Descriptions.Item>

                                                    <Descriptions.Item label="Biển số">
                                                        <EllipsisCopy value={p?.vehicle_plate ?? null} label="Biển số" code maxWidth={isMobile ? 200 : 220} />
                                                    </Descriptions.Item>

                                                    <Descriptions.Item label="Loại bằng lái">{p?.license_type ?? '—'}</Descriptions.Item>
                                                    <Descriptions.Item label="Số bằng lái">{p?.license_number ?? '—'}</Descriptions.Item>
                                                    <Descriptions.Item label="Hạn bằng lái">
                                                        {p?.license_expiry ? new Date(p.license_expiry).toLocaleDateString('vi-VN') : '—'}
                                                    </Descriptions.Item>
                                                </Descriptions>
                                            </div>
                                        ),
                                    },
                                    {
                                        key: 'docs',
                                        label: 'Hồ sơ & Ảnh',
                                        children: (
                                            <div style={{ padding: cardPad }}>
                                                <Row gutter={[12, 12]}>
                                                    <Col xs={24} md={8}>
                                                        <DocTile
                                                            compact={isMobile}
                                                            title="CMND/CCCD"
                                                            url={p?.id_card_front_url ?? null}
                                                            extraUrls={p?.id_card_back_url ? [p.id_card_back_url] : []}
                                                            badge={p?.id_card_back_url ? '2 ảnh' : undefined}
                                                        />
                                                    </Col>
                                                    <Col xs={24} md={8}>
                                                        <DocTile compact={isMobile} title="Bằng lái" url={p?.license_image_url ?? null} />
                                                    </Col>
                                                    <Col xs={24} md={8}>
                                                        <DocTile compact={isMobile} title="Ảnh xe" url={p?.vehicle_image_url ?? null} />
                                                    </Col>
                                                </Row>

                                                <Divider />

                                                <Descriptions
                                                    bordered
                                                    size="small"
                                                    colon={false}
                                                    column={{ xs: 1, md: 2 }}
                                                    labelStyle={{
                                                        width: isMobile ? 120 : 160,
                                                        color: token.colorTextSecondary,
                                                        fontWeight: 600,
                                                    }}
                                                    style={{ borderRadius: 14, overflow: 'hidden' }}
                                                >
                                                    <Descriptions.Item label="Nộp hồ sơ">{fmt(p?.submitted_at ?? null)}</Descriptions.Item>
                                                    <Descriptions.Item label="Duyệt lúc">{fmt(p?.verified_at ?? null)}</Descriptions.Item>
                                                    <Descriptions.Item label="Người duyệt">{p?.verified_by ?? '—'}</Descriptions.Item>
                                                    <Descriptions.Item label="Ghi chú">{p?.verification_note ?? '—'}</Descriptions.Item>
                                                </Descriptions>

                                                {Array.isArray(p?.verification_reasons) && p!.verification_reasons.length ? (
                                                    <div style={{ marginTop: 12 }}>
                                                        <Text strong>Lý do:</Text>
                                                        <div style={{ marginTop: 6 }}>
                                                            <Space wrap>
                                                                {p!.verification_reasons.map((r) => (
                                                                    <Tag key={r} color="red" style={{ borderRadius: 999, margin: 0 }}>
                                                                        {r}
                                                                    </Tag>
                                                                ))}
                                                            </Space>
                                                        </div>
                                                    </div>
                                                ) : null}
                                            </div>
                                        ),
                                    },
                                    {
                                        key: 'bank',
                                        label: 'Ngân hàng',
                                        children: (
                                            <div style={{ padding: cardPad }}>
                                                <Descriptions
                                                    bordered
                                                    size="small"
                                                    colon={false}
                                                    column={{ xs: 1, md: 2 }}
                                                    labelStyle={{
                                                        width: isMobile ? 120 : 160,
                                                        color: token.colorTextSecondary,
                                                        fontWeight: 600,
                                                    }}
                                                    style={{ borderRadius: 14, overflow: 'hidden' }}
                                                >
                                                    <Descriptions.Item label="Ngân hàng">{p?.bank_name ?? '—'}</Descriptions.Item>
                                                    <Descriptions.Item label="Chủ tài khoản">{p?.bank_account_name ?? '—'}</Descriptions.Item>

                                                    <Descriptions.Item label="Số tài khoản">
                                                        <EllipsisCopy value={p?.bank_account_number ?? null} label="Số tài khoản" code maxWidth={isMobile ? 220 : 260} />
                                                    </Descriptions.Item>

                                                    <Descriptions.Item label="Thu nhập">
                                                        {(p?.total_earnings ?? 0).toLocaleString('vi-VN')} ₫
                                                    </Descriptions.Item>
                                                </Descriptions>
                                            </div>
                                        ),
                                    },
                                ]}
                            />
                        </Card>
                    </Col>

                    {/* RIGHT DESKTOP ONLY */}
                    {!isMobile ? (
                        <Col xs={24} xl={7} xxl={6}>
                            <div style={{ position: 'sticky', top: 16 }}>
                                <Space direction="vertical" size={14} style={{ width: '100%' }}>
                                    <Card style={{ borderRadius: 18, border: `1px solid ${token.colorBorderSecondary}` }} bodyStyle={{ padding: 16 }}>
                                        {RightQuickInfo}
                                        <Divider />
                                        <Button block onClick={() => nav('/drivers/pending')}>
                                            Tới danh sách chờ duyệt
                                        </Button>
                                    </Card>

                                    <Card style={{ borderRadius: 18, border: `1px solid ${token.colorBorderSecondary}` }} bodyStyle={{ padding: 16 }}>
                                        {RightTimeInfo}
                                    </Card>
                                </Space>
                            </div>
                        </Col>
                    ) : null}
                </Row>

                {/* Reject Modal */}
                <Modal
                    title="Từ chối tài xế"
                    open={rejectOpen}
                    onCancel={() => {
                        setRejectOpen(false);
                        rejectForm.resetFields();
                    }}
                    okText="Xác nhận từ chối"
                    okButtonProps={{ danger: true, loading }}
                    onOk={onReject}
                >
                    <Form form={rejectForm} layout="vertical" initialValues={{ reasons: [], note: '' }}>
                        <Form.Item
                            label="Lý do từ chối"
                            name="reasons"
                            rules={[{ required: true, message: 'Chọn ít nhất 1 lý do' }]}
                        >
                            <Checkbox.Group
                                options={rejectionReasons}
                                style={{ display: 'grid', gridTemplateColumns: '1fr', rowGap: 8 }}
                            />
                        </Form.Item>

                        <Form.Item label="Ghi chú thêm" name="note">
                            <TextArea rows={3} placeholder="Nhập ghi chú (không bắt buộc)..." />
                        </Form.Item>
                    </Form>
                </Modal>
            </div>
        </div>
    );
}