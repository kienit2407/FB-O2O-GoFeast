import { Injectable, BadRequestException } from '@nestjs/common';
import { createHmac, randomUUID } from 'crypto';
import { ConfigService } from 'src/config/config.service';

@Injectable()
export class MomoService {
    constructor(private readonly config: ConfigService) { }

    private get partnerCode() {
        const v = this.config.get<string>('MOMO_PARTNER_CODE');
        if (!v) throw new BadRequestException('MOMO_PARTNER_CODE is missing');
        return v.trim();
    }

    private get accessKey() {
        const v = this.config.get<string>('MOMO_ACCESS_KEY');
        if (!v) throw new BadRequestException('MOMO_ACCESS_KEY is missing');
        return v.trim();
    }

    private get secretKey() {
        const v = this.config.get<string>('MOMO_SECRET_KEY');
        if (!v) throw new BadRequestException('MOMO_SECRET_KEY is missing');
        return v.trim();
    }

    private get createUrl() {
        return (
            this.config.get<string>('MOMO_CREATE_URL') ||
            'https://test-payment.momo.vn/v2/gateway/api/create'
        );
    }

    private get queryUrl() {
        return (
            this.config.get<string>('MOMO_QUERY_URL') ||
            'https://test-payment.momo.vn/v2/gateway/api/query'
        );
    }

    private get redirectUrl() {
        const v = this.config.get<string>('MOMO_REDIRECT_URL');
        if (!v) throw new BadRequestException('MOMO_REDIRECT_URL is missing');
        return v.trim();
    }

    private get ipnUrl() {
        const v = this.config.get<string>('MOMO_IPN_URL');
        if (!v) throw new BadRequestException('MOMO_IPN_URL is missing');
        return v.trim();
    }

    private get requestType() {
        return this.config.get<string>('MOMO_REQUEST_TYPE') || 'payWithMethod';
    }

    private sign(raw: string) {
        return createHmac('sha256', this.secretKey).update(raw).digest('hex');
    }

    private buildCreateSignature(payload: {
        amount: number;
        extraData: string;
        orderId: string;
        orderInfo: string;
        requestId: string;
        requestType: string;
        redirectUrl: string;
        ipnUrl: string;
    }) {
        const raw =
            `accessKey=${this.accessKey}` +
            `&amount=${payload.amount}` +
            `&extraData=${payload.extraData}` +
            `&ipnUrl=${payload.ipnUrl}` +
            `&orderId=${payload.orderId}` +
            `&orderInfo=${payload.orderInfo}` +
            `&partnerCode=${this.partnerCode}` +
            `&redirectUrl=${payload.redirectUrl}` +
            `&requestId=${payload.requestId}` +
            `&requestType=${payload.requestType}`;

        return this.sign(raw);
    }

    private buildIpnSignature(payload: Record<string, any>) {
        const raw =
            `accessKey=${this.accessKey}` +
            `&amount=${payload.amount}` +
            `&extraData=${payload.extraData ?? ''}` +
            `&message=${payload.message}` +
            `&orderId=${payload.orderId}` +
            `&orderInfo=${payload.orderInfo}` +
            `&orderType=${payload.orderType}` +
            `&partnerCode=${payload.partnerCode}` +
            `&payType=${payload.payType ?? ''}` +
            `&requestId=${payload.requestId}` +
            `&responseTime=${payload.responseTime}` +
            `&resultCode=${payload.resultCode}` +
            `&transId=${payload.transId}`;

        return this.sign(raw);
    }

    async createPaymentUrl(args: {
        orderId: string;
        amount: number;
        orderInfo: string;
        extraData?: Record<string, any>;
    }) {
        const requestId = randomUUID();
        const extraData = Buffer.from(
            JSON.stringify(args.extraData ?? {}),
            'utf-8',
        ).toString('base64');

        const body: any = {
            partnerCode: this.partnerCode,
            requestId,
            amount: Math.round(Number(args.amount)),
            orderId: args.orderId,
            orderInfo: args.orderInfo,
            redirectUrl: this.redirectUrl,
            ipnUrl: this.ipnUrl,
            lang: 'vi',
            requestType: this.requestType,
            autoCapture: true,
            extraData,
        };

        body.signature = this.buildCreateSignature({
            amount: body.amount,
            extraData,
            orderId: body.orderId,
            orderInfo: body.orderInfo,
            requestId: body.requestId,
            requestType: body.requestType,
            redirectUrl: body.redirectUrl,
            ipnUrl: body.ipnUrl,
        });

        const res = await fetch(this.createUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
            throw new BadRequestException(
                json?.message || 'MoMo create payment failed',
            );
        }

        if (Number(json?.resultCode ?? -1) !== 0 || !json?.payUrl) {
            throw new BadRequestException(
                json?.message || 'MoMo did not return payUrl',
            );
        }

        return {
            requestId,
            orderId: body.orderId,
            payUrl: String(json.payUrl),
            shortLink: json.shortLink ? String(json.shortLink) : null,
            raw: json,
        };
    }

    verifyIpn(payload: Record<string, any>) {
        const incomingSignature = String(payload.signature || '');
        const signed = this.buildIpnSignature(payload);

        return {
            ok: incomingSignature === signed,
            signed,
            incomingSignature,
            payload,
        };
    }

    async queryStatus(orderId: string) {
        const requestId = randomUUID();

        const raw =
            `accessKey=${this.accessKey}` +
            `&orderId=${orderId}` +
            `&partnerCode=${this.partnerCode}` +
            `&requestId=${requestId}`;

        const body = {
            partnerCode: this.partnerCode,
            requestId,
            orderId,
            lang: 'vi',
            signature: this.sign(raw),
        };

        const res = await fetch(this.queryUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
            throw new BadRequestException(
                json?.message || 'MoMo query status failed',
            );
        }

        return json;
    }
}