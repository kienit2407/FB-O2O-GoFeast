import { Controller, Get, Post, Query, Body, Res } from '@nestjs/common';
import express from 'express';
import { CheckoutPaymentService } from '../services/checkout-payment.service';

@Controller('payments')
export class CheckoutPaymentController {
    constructor(private readonly svc: CheckoutPaymentService) { }

    @Get('vnpay/return')
    async vnpReturn(@Query() query: Record<string, any>, @Res() res: express.Response) {
        const result = await this.svc.handleVnpReturn(query);
        return res.redirect(result.redirectUrl);
    }

    @Get('vnpay/ipn')
    async vnpIpn(@Query() query: Record<string, any>) {
        return this.svc.handleVnpIpn(query);
    }

    @Get('momo/return')
    async momoReturn(@Query() query: Record<string, any>, @Res() res: express.Response) {
        const result = await this.svc.handleMomoReturn(query);
        return res.redirect(result.redirectUrl);
    }

    @Post('momo/ipn')
    async momoIpn(@Body() body: Record<string, any>, @Res() res: express.Response) {
        await this.svc.handleMomoIpn(body);
        return res.status(204).send();
    }
}