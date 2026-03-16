import { Injectable, BadRequestException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { ConfigService } from 'src/config/config.service';

@Injectable()
export class VnpayService {
    constructor(private readonly config: ConfigService) { }

    private get tmnCode() {
        const v = this.config.get<string>('VNP_TMN_CODE');
        if (!v) throw new BadRequestException('VNP_TMN_CODE is missing');
        return v.trim();
    }

    private get hashSecret() {
        const v = this.config.get<string>('VNP_HASH_SECRET');
        if (!v) throw new BadRequestException('VNP_HASH_SECRET is missing');
        return v.trim();
    }

    private get vnpUrl() {
        return (
            this.config.get<string>('VNP_URL') ||
            'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'
        );
    }

    private get returnUrl() {
        const v = this.config.get<string>('VNP_RETURN_URL');
        if (!v) throw new BadRequestException('VNP_RETURN_URL is missing');
        return v.trim();
    }

    private get locale() {
        return this.config.get<string>('VNP_LOCALE') || 'vn';
    }

    private get currCode() {
        return this.config.get<string>('VNP_CURR_CODE') || 'VND';
    }

    private formatDate(date = new Date()) {
        const vn = new Date(date.getTime() + 7 * 60 * 60 * 1000);
        const yyyy = vn.getUTCFullYear();
        const mm = String(vn.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(vn.getUTCDate()).padStart(2, '0');
        const hh = String(vn.getUTCHours()).padStart(2, '0');
        const mi = String(vn.getUTCMinutes()).padStart(2, '0');
        const ss = String(vn.getUTCSeconds()).padStart(2, '0');
        return `${yyyy}${mm}${dd}${hh}${mi}${ss}`;
    }

    private sortParams(params: Record<string, any>) {
        const keys = Object.keys(params).sort();
        const out: Record<string, string> = {};

        for (const key of keys) {
            const raw = params[key];
            if (raw === undefined || raw === null || raw === '') continue;
            out[key] = encodeURIComponent(String(raw))
                .replace(/%20/g, '+')
                .replace(/[!'()*]/g, (c) =>
                    `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
                );
        }

        return out;
    }

    private sign(sorted: Record<string, string>) {
        const signData = Object.keys(sorted)
            .map((k) => `${k}=${sorted[k]}`)
            .join('&');

        const secureHash = createHmac('sha512', this.hashSecret)
            .update(Buffer.from(signData, 'utf-8'))
            .digest('hex');

        return { signData, secureHash };
    }

    createPaymentUrl(args: {
        orderNumber: string;
        amount: number;
        clientIp?: string | null;
        txnRef: string;
        orderInfo?: string;
    }) {
        const params: Record<string, any> = {
            vnp_Version: '2.1.0',
            vnp_Command: 'pay',
            vnp_TmnCode: this.tmnCode,
            vnp_Locale: this.locale,
            vnp_CurrCode: this.currCode,
            vnp_TxnRef: args.txnRef,
            vnp_OrderInfo:
                args.orderInfo || `Thanh toan don hang ${args.orderNumber}`,
            vnp_OrderType: 'other',
            vnp_Amount: Math.round(Number(args.amount) * 100),
            vnp_ReturnUrl: this.returnUrl,
            vnp_IpAddr: args.clientIp || '127.0.0.1',
            vnp_CreateDate: this.formatDate(),
        };

        const sorted = this.sortParams(params);
        const { secureHash } = this.sign(sorted);

        const query = Object.keys(sorted)
            .map((k) => `${k}=${sorted[k]}`)
            .join('&');

        return {
            txnRef: args.txnRef,
            paymentUrl: `${this.vnpUrl}?${query}&vnp_SecureHash=${secureHash}`,
            params,
        };
    }

    verifyReturn(rawQuery: Record<string, any>) {
        const query = { ...rawQuery };
        const secureHash = String(query.vnp_SecureHash || '');
        delete query.vnp_SecureHash;
        delete query.vnp_SecureHashType;

        const sorted = this.sortParams(query);
        const { secureHash: signed } = this.sign(sorted);

        const ok = signed.toLowerCase() === secureHash.toLowerCase();

        return {
            ok,
            secureHash,
            signed,
            params: rawQuery,
            txnRef: String(rawQuery.vnp_TxnRef || ''),
            responseCode: String(rawQuery.vnp_ResponseCode || ''),
            transactionNo: rawQuery.vnp_TransactionNo
                ? String(rawQuery.vnp_TransactionNo)
                : null,
            bankCode: rawQuery.vnp_BankCode ? String(rawQuery.vnp_BankCode) : null,
            bankTranNo: rawQuery.vnp_BankTranNo
                ? String(rawQuery.vnp_BankTranNo)
                : null,
            payDate: rawQuery.vnp_PayDate ? String(rawQuery.vnp_PayDate) : null,
        };
    }
}