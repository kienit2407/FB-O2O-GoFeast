import {
    BadRequestException,
    Body,
    Controller,
    Get,
    Patch,
    Post,
    Req,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { MerchantsService } from '../services/merchants.service';
import { CloudinaryService } from 'src/common/services/cloudinary.service';
import { UpdateMerchantProfileDto } from '../dtos/update-merchant-profile.dto';
import { ClientGuard, JwtAuthGuard, Roles, RolesGuard } from 'src/modules/auth';

@Controller('merchants')
@UseGuards(JwtAuthGuard, RolesGuard, ClientGuard)
@Roles('merchant')
export class MerchantsController {
    constructor(
        private readonly merchantsService: MerchantsService,
        private readonly cloudinaryService: CloudinaryService,
    ) { }

    @Patch('me')
    async updateMe(@Req() req: any, @Body() dto: UpdateMerchantProfileDto) {
        const userId = req.user?.userId;
        const merchant = await this.merchantsService.findByOwnerUserId(userId);
        if (!merchant) throw new BadRequestException('Merchant not found');

        // chỉ lấy field thật sự được gửi lên (khác undefined)
        const update: any = Object.fromEntries(
            Object.entries(dto as any).filter(([, v]) => v !== undefined),
        );

        // Convert FE location -> GeoJSON
        if (update.location) {
            update.location = {
                type: 'Point',
                coordinates: [update.location.lng, update.location.lat],
            };
        }

        const turningOn = update.is_accepting_orders === true && merchant.is_accepting_orders !== true;

        if (turningOn) {
            const next = { ...merchant.toObject(), ...update, _id: merchant._id };
            const result = await this.merchantsService.getMissingForAcceptingOrders(next);

            // 1) thiếu profile (dù có menu hay không)
            if (result.missing_profile_fields.length) {
                throw new BadRequestException({
                    message: 'Không thể mở bán vì thiếu thông tin cửa hàng',
                    code: 'MERCHANT_PROFILE_NOT_READY',
                    missing_profile_fields: result.missing_profile_fields,
                    missing_menu: result.missing_menu,
                });
            }

            // 2) profile ok nhưng thiếu menu
            if (result.missing_menu) {
                throw new BadRequestException({
                    message: 'Không thể mở bán vì chưa có thực đơn',
                    code: 'MERCHANT_MENU_NOT_READY',
                    missing_menu: true,
                });
            }
        }

        const updated = await this.merchantsService.updateById(merchant._id.toString(), update);
        return { success: true, data: updated };
    }

    @Post('me/logo')
    @UseInterceptors(FileInterceptor('file'))
    async uploadLogo(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
        const userId = req.user?.userId;
        if (!file) throw new BadRequestException('File is required');

        const merchant = await this.merchantsService.findByOwnerUserId(userId);
        if (!merchant) throw new BadRequestException('Merchant not found');

        //  Xoá cũ theo public_id
        if (merchant.logo_public_id) {
            try {
                await this.cloudinaryService.deleteByPublicId(merchant.logo_public_id);
            } catch (e) {
                // không chặn luồng nếu xoá lỗi
                console.warn('[uploadLogo] delete old failed:', e?.message || e);
            }
        }

        const uploaded = await this.cloudinaryService.uploadImage(
            file,
            `merchants/${userId}/logo`,
        );

        const updated = await this.merchantsService.updateById(merchant._id.toString(), {
            logo_url: uploaded.secure_url || uploaded.url,
            logo_public_id: uploaded.public_id,
        });

        return { success: true, data: { logo_url: updated.logo_url, logo_public_id: updated.logo_public_id } };
    }

    @Post('me/cover')
    @UseInterceptors(FileInterceptor('file'))
    async uploadCover(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
        const userId = req.user?.userId;
        if (!file) throw new BadRequestException('File is required');

        const merchant = await this.merchantsService.findByOwnerUserId(userId);
        if (!merchant) throw new BadRequestException('Merchant not found');

        if (merchant.cover_image_public_id) {
            try {
                await this.cloudinaryService.deleteByPublicId(merchant.cover_image_public_id);
            } catch (e) {
                console.warn('[uploadCover] delete old failed:', e?.message || e);
            }
        }

        const uploaded = await this.cloudinaryService.uploadImage(
            file,
            `merchants/${userId}/cover`,
        );

        const updated = await this.merchantsService.updateById(merchant._id.toString(), {
            cover_image_url: uploaded.secure_url || uploaded.url,
            cover_image_public_id: uploaded.public_id,
        });

        return { success: true, data: { cover_image_url: updated.cover_image_url, cover_image_public_id: updated.cover_image_public_id } };
    }
}
