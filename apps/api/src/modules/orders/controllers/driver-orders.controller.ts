import {
    Body,
    Controller,
    Get,
    Param,
    Patch,
    Post,
    Req,
    UploadedFiles,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { ClientGuard } from 'src/modules/auth/guards/client.guard';
import { Client } from 'src/modules/auth/decorators/client.decorator';

import { MerchantOrderActionDto } from '../dtos/merchant-order-action.dto';
import { DriverCompleteOrderDto } from '../dtos/driver-complete-order.dto';
import { OrderLifecycleService } from '../services/order-lifecycle.service';
import { DriverOrderQueryService } from '../services/driver-order-query.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { DriverProofUploadService } from '../services/driver-proof-upload.service';

@Controller('driver/orders')
@Client('driver_mobile')
@UseGuards(JwtAuthGuard, RolesGuard, ClientGuard)
@Roles('driver')
export class DriverOrdersController {
    constructor(
        private readonly lifecycle: OrderLifecycleService,
        private readonly queryService: DriverOrderQueryService,
        private readonly proofUploadService: DriverProofUploadService,


    ) { }
    @Post('upload-proof-images')
    @UseInterceptors(
        FilesInterceptor('files', 10, {
            storage: memoryStorage(),
            limits: { fileSize: 10 * 1024 * 1024 }, // 10MB / file
        }),
    )
    async uploadProofImages(@UploadedFiles() files: Express.Multer.File[]) {
        const data = await this.proofUploadService.uploadMany(files);
        return { success: true, data };
    }
    @Get('current')
    async current(@Req() req: any) {
        const data = await this.queryService.getCurrentForDriver(req.user.userId);
        return { success: true, data };
    }
    @Patch(':id/arrived')
    arrived(@Req() req: any, @Param('id') id: string, @Body() dto: MerchantOrderActionDto) {
        return this.lifecycle.driverArrivedAtMerchant(req.user.userId, id, dto.note);
    }

    @Patch(':id/picked-up')
    pickedUp(@Req() req: any, @Param('id') id: string, @Body() dto: MerchantOrderActionDto) {
        return this.lifecycle.driverPickedUpOrder(req.user.userId, id, dto.note);
    }

    @Patch(':id/delivering')
    delivering(@Req() req: any, @Param('id') id: string, @Body() dto: MerchantOrderActionDto) {
        return this.lifecycle.driverStartDelivering(req.user.userId, id, dto.note);
    }

    @Patch(':id/delivered')
    delivered(@Req() req: any, @Param('id') id: string, @Body() dto: MerchantOrderActionDto) {
        return this.lifecycle.driverDeliveredOrder(req.user.userId, id, dto.note);
    }

    @Patch(':id/complete')
    complete(@Req() req: any, @Param('id') id: string, @Body() dto: DriverCompleteOrderDto) {
        return this.lifecycle.driverCompleteOrder(req.user.userId, id, dto);
    }
}