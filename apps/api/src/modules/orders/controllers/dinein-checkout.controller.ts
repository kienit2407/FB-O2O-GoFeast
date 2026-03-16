import {
    Body,
    Controller,
    Get,
    Post,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';
import express from 'express';

import { JwtAuthGuard } from 'src/modules/auth';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';

import { DineInCheckoutPreviewQueryDto } from '../dtos/dinein-checkout-preview.query.dto';
import { DineInPlaceOrderDto } from '../dtos/dinein-place-order.dto';
import { DineInCheckoutService } from '../services/dinein-checkout.service';

@Controller('checkout/dine-in')
@UseGuards(JwtAuthGuard)
export class DineInCheckoutController {
    constructor(private readonly svc: DineInCheckoutService) { }

    private userId(user: any) {
        const id = user?.sub ?? user?.userId ?? user?._id ?? user?.id;
        return String(id);
    }

    private getClientIp(req: express.Request) {
        const xff = req.headers['x-forwarded-for'];
        if (typeof xff === 'string' && xff.trim()) {
            return xff.split(',')[0].trim();
        }
        if (Array.isArray(xff) && xff.length) {
            return String(xff[0]).split(',')[0].trim();
        }
        return req.ip || req.socket?.remoteAddress || '127.0.0.1';
    }

    @Get('preview')
    preview(
        @CurrentUser() user: any,
        @Query() q: DineInCheckoutPreviewQueryDto,
    ) {
        return this.svc.preview(this.userId(user), q);
    }

    @Post('place-order')
    placeOrder(
        @CurrentUser() user: any,
        @Body() dto: DineInPlaceOrderDto,
        @Req() req: express.Request,
    ) {
        return this.svc.placeOrder(this.userId(user), dto, {
            clientIp: this.getClientIp(req),
        });
    }
}