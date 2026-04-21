// src/pages/CommissionConfig.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from 'react';
import { Alert, Button as AntButton, Card as AntCard, Divider, InputNumber, Space, Typography, message } from 'antd';

import { useAdminAuth, isSuperAdmin as checkIsSuperAdmin } from '@/store/authStore';
import { useAdminSystemConfigStore } from '@/store/adminSystemConfigStore';

const { Title, Text } = Typography;

const DEFAULT_CFG = {
    merchant_commission_rate: 0.2,
    driver_commission_rate: 0.1,
    platform_fee_fixed: 0,
};

const toPct = (rate?: number | null) => Number((((rate ?? 0) * 100)).toFixed(2));
const fromPct = (pct?: number | null) => (Number(pct ?? 0) / 100);

export default function CommissionConfig() {
    const { user } = useAdminAuth();
    const canManage = checkIsSuperAdmin(user);

    const { commission, loading, fetchCommissionRules, updateCommissionRules } = useAdminSystemConfigStore();

    // draft values (UI)
    const [platformFeeDraft, setPlatformFeeDraft] = useState<number>(0);
    const [merchantPctDraft, setMerchantPctDraft] = useState<number>(0);
    const [driverPctDraft, setDriverPctDraft] = useState<number>(0);

    // base config để merge khi update 1 field
    const base = useMemo(() => {
        return {
            merchant_commission_rate: commission?.merchant_commission_rate ?? DEFAULT_CFG.merchant_commission_rate,
            driver_commission_rate: commission?.driver_commission_rate ?? DEFAULT_CFG.driver_commission_rate,
            platform_fee_fixed: commission?.platform_fee_fixed ?? DEFAULT_CFG.platform_fee_fixed,
        };
    }, [commission]);

    // fetch config when open page
    useEffect(() => {
        fetchCommissionRules().catch(() => null);
    }, [fetchCommissionRules]);

    // sync drafts when commission changes (không return sớm)
    useEffect(() => {
        setPlatformFeeDraft(Number(base.platform_fee_fixed ?? 0));
        setMerchantPctDraft(toPct(base.merchant_commission_rate));
        setDriverPctDraft(toPct(base.driver_commission_rate));
    }, [base.platform_fee_fixed, base.merchant_commission_rate, base.driver_commission_rate]);

    const onReload = async () => {
        try {
            await fetchCommissionRules();
            message.success('Đã tải lại cấu hình commission');
        } catch {
            message.error('Tải cấu hình thất bại');
        }
    };

    const updateAll = async () => {
        if (!canManage) return;

        const pf = Number(platformFeeDraft ?? 0);
        const mp = Number(merchantPctDraft ?? 0);
        const dp = Number(driverPctDraft ?? 0);

        if (!Number.isFinite(pf) || pf < 0) return message.error('Platform fee không hợp lệ');
        if (!Number.isFinite(mp) || mp < 0 || mp > 100) return message.error('Merchant commission phải 0–100%');
        if (!Number.isFinite(dp) || dp < 0 || dp > 100) return message.error('Driver commission phải 0–100%');

        try {
            await updateCommissionRules({
                platform_fee_fixed: pf,
                merchant_commission_rate: fromPct(mp),
                driver_commission_rate: fromPct(dp),
            });
            message.success('Đã cập nhật commission rules');
        } catch {
            message.error('Cập nhật thất bại');
        }
    };

    const updatePlatformFeeOnly = async () => {
        if (!canManage) return;

        const pf = Number(platformFeeDraft ?? 0);
        if (!Number.isFinite(pf) || pf < 0) return message.error('Platform fee không hợp lệ');

        try {
            await updateCommissionRules({
                ...base,
                platform_fee_fixed: pf,
            });
            message.success('Đã cập nhật Platform fee');
        } catch {
            message.error('Cập nhật Platform fee thất bại');
        }
    };

    const updateMerchantOnly = async () => {
        if (!canManage) return;

        const mp = Number(merchantPctDraft ?? 0);
        if (!Number.isFinite(mp) || mp < 0 || mp > 100) return message.error('Merchant commission phải 0–100%');

        try {
            await updateCommissionRules({
                ...base,
                merchant_commission_rate: fromPct(mp),
            });
            message.success('Đã cập nhật Merchant commission');
        } catch {
            message.error('Cập nhật Merchant commission thất bại');
        }
    };

    const updateDriverOnly = async () => {
        if (!canManage) return;

        const dp = Number(driverPctDraft ?? 0);
        if (!Number.isFinite(dp) || dp < 0 || dp > 100) return message.error('Driver commission phải 0–100%');

        try {
            await updateCommissionRules({
                ...base,
                driver_commission_rate: fromPct(dp),
            });
            message.success('Đã cập nhật Driver commission');
        } catch {
            message.error('Cập nhật Driver commission thất bại');
        }
    };

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                    <Title level={3} style={{ margin: 0 }}>Commission</Title>
                    <Text type="secondary">
                        Cấu hình 3 trường: Platform fee (₫), Merchant commission (%), Driver commission (%)
                    </Text>
                </div>

                <Space wrap>
                    <AntButton onClick={onReload} loading={loading}>Tải lại</AntButton>
                    <AntButton type="primary" onClick={updateAll} loading={loading} disabled={!canManage}>
                        Lưu tất cả
                    </AntButton>
                </Space>
            </div>

            {!canManage ? (
                <Alert
                    type="warning"
                    showIcon
                    message="Bạn không có quyền cập nhật commission."
                    description="Chỉ Super Admin mới được thay đổi các cấu hình hệ thống."
                />
            ) : null}

            <AntCard title="Platform fee (Phí nền tảng cố định)" loading={loading}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                        <Text>Nhập theo VND</Text>
                        <div className="text-xs text-muted-foreground">Ví dụ: 2,000₫</div>
                    </div>

                    <Space wrap>
                        <InputNumber
                            value={platformFeeDraft}
                            min={0}
                            step={1000}
                            disabled={!canManage}
                            onChange={(v) => setPlatformFeeDraft(Number(v ?? 0))}
                            formatter={(v) => `${Number(v ?? 0).toLocaleString('vi-VN')}₫`}
                            parser={(s) => Number(String(s ?? '').replace(/\D/g, ''))}
                        />
                        <AntButton type="primary" onClick={updatePlatformFeeOnly} loading={loading} disabled={!canManage}>
                            Cập nhật
                        </AntButton>
                    </Space>
                </div>
            </AntCard>

            <AntCard title="Merchant commission (%)" loading={loading}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                        <Text>Nhập theo % (0–100)</Text>
                        <div className="text-xs text-muted-foreground">
                            Hiện tại: {Math.round((base.merchant_commission_rate ?? 0) * 100)}%
                        </div>
                    </div>

                    <Space wrap>
                        <InputNumber
                            value={merchantPctDraft}
                            min={0}
                            max={100}
                            step={0.1}
                            disabled={!canManage}
                            onChange={(v) => setMerchantPctDraft(Number(v ?? 0))}
                            formatter={(v) => `${v ?? 0}%`}
                            parser={(s) => Number(String(s ?? '').replace('%', ''))}
                        />
                        <AntButton type="primary" onClick={updateMerchantOnly} loading={loading} disabled={!canManage}>
                            Cập nhật
                        </AntButton>
                    </Space>
                </div>
            </AntCard>

            <AntCard title="Driver commission (%)" loading={loading}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                        <Text>Nhập theo % (0–100)</Text>
                        <div className="text-xs text-muted-foreground">
                            Hiện tại: {Math.round((base.driver_commission_rate ?? 0) * 100)}%
                        </div>
                    </div>

                    <Space wrap>
                        <InputNumber
                            value={driverPctDraft}
                            min={0}
                            max={100}
                            step={0.1}
                            disabled={!canManage}
                            onChange={(v) => setDriverPctDraft(Number(v ?? 0))}
                            formatter={(v) => `${v ?? 0}%`}
                            parser={(s) => Number(String(s ?? '').replace('%', ''))}
                        />
                        <AntButton type="primary" onClick={updateDriverOnly} loading={loading} disabled={!canManage}>
                            Cập nhật
                        </AntButton>
                    </Space>
                </div>
            </AntCard>

            <Divider />

            <AntCard>
                <Text type="secondary">
                    Tip: API PUT cần đủ 3 field nên khi bạn bấm “Cập nhật” từng dòng, mình đã merge theo config hiện tại để không ghi đè field còn lại.
                </Text>
            </AntCard>
        </div>
    );
}