import {
  Body, Controller, Delete, Get, Patch, Post, Put, Query, UploadedFile, UseGuards, UseInterceptors, Param,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

import { MerchantsService } from '../services/merchants.service';
import { ToppingsService } from '../services/toppings.service';
import { CreateToppingDto, UpdateToppingDto } from '../dtos/topping.dto';
import { getMerchantOrThrow } from '../utils/get-merchant-or-throw';
import { CloudinaryService } from 'src/common/services/cloudinary.service';
import { JwtAuthGuard } from 'src/modules/auth';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
const imageMulterOptions: MulterOptions = {
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file?.mimetype?.startsWith('image/')) {
      return cb(new BadRequestException('Only image files are allowed') as any, false);
    }
    cb(null, true);
  },
};
@Controller('merchant/menu/toppings')
@UseGuards(JwtAuthGuard)
export class ToppingsController {
  constructor(
    private readonly merchantsService: MerchantsService,
    private readonly toppingsService: ToppingsService,
    private readonly cloudinary: CloudinaryService,
  ) { }

  @Get()
  async list(
    @CurrentUser() user: any,
    @Query('includeInactive') includeInactive?: string,
    @Query('onlyAvailable') onlyAvailable?: string,
  ) {
    const merchant = await getMerchantOrThrow(this.merchantsService, user.sub);
    return this.toppingsService.findByMerchantId(merchant._id.toString(), {
      includeInactive: includeInactive === '1',
      onlyAvailable: onlyAvailable === '1',
    });
  }

  // ✅ CREATE: POST /merchant/menu/toppings (multipart: fields + image)
  @Post()
  @UseInterceptors(FileInterceptor('image', imageMulterOptions))
  async create(
    @CurrentUser() user: any,
    @Body() body: any,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    const merchant = await getMerchantOrThrow(this.merchantsService, user.sub);

    // vì multipart => body là string, parse nhẹ cho đúng type
    const payload = {
      ...body,
      price: body?.price !== undefined ? Number(body.price) : undefined,
      max_quantity: body?.max_quantity !== undefined ? Number(body.max_quantity) : undefined,
      sort_order: body?.sort_order !== undefined ? Number(body.sort_order) : undefined,
      is_available: body?.is_available !== undefined ? body.is_available === 'true' || body.is_available === '1' : undefined,
      is_active: body?.is_active !== undefined ? body.is_active === 'true' || body.is_active === '1' : undefined,
    };

    const dto = plainToInstance(CreateToppingDto, payload);
    const errors = validateSync(dto, { whitelist: true, forbidNonWhitelisted: true });
    if (errors.length) throw new BadRequestException(errors);

    let image_url: string | null = null;
    let image_public_id: string | null = null;

    if (image) {
      const up = await this.cloudinary.uploadImage(image, `merchants/${merchant._id}/toppings`);
      image_url = up.secure_url || up.url || null;
      image_public_id = up.public_id || null;
    }

    return this.toppingsService.create({
      merchant_id: merchant._id,
      ...dto,
      image_url,
      image_public_id,
    });
  }

  // ✅ UPDATE: PATCH /merchant/menu/toppings/:id (multipart: fields + image)
  @Patch(':id')
  @UseInterceptors(FileInterceptor('image', imageMulterOptions))
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: any,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    const merchant = await getMerchantOrThrow(this.merchantsService, user.sub);

    const top = await this.toppingsService.findById(id);
    if (!top || top.merchant_id.toString() !== merchant._id.toString()) {
      throw new NotFoundException('Topping not found');
    }

    const removeImage = body?.remove_image === '1' || body?.remove_image === 'true';

    const payload = {
      ...body,
      price: body?.price !== undefined ? Number(body.price) : undefined,
      max_quantity: body?.max_quantity !== undefined ? Number(body.max_quantity) : undefined,
      sort_order: body?.sort_order !== undefined ? Number(body.sort_order) : undefined,
      is_available: body?.is_available !== undefined ? body.is_available === 'true' || body.is_available === '1' : undefined,
      is_active: body?.is_active !== undefined ? body.is_active === 'true' || body.is_active === '1' : undefined,
    };

    const dto = plainToInstance(UpdateToppingDto, payload);
    const errors = validateSync(dto, { whitelist: true, forbidNonWhitelisted: true });
    if (errors.length) throw new BadRequestException(errors);

    // ✅ nếu user upload ảnh mới => xoá ảnh cũ rồi upload ảnh mới
    if (image) {
      if (top.image_public_id) {
        await this.cloudinary.deleteImage?.(top.image_public_id).catch(() => { });
      }

      const up = await this.cloudinary.uploadImage(image, `merchants/${merchant._id}/toppings`);
      const image_url = up.secure_url || up.url || null;
      const image_public_id = up.public_id || null;

      return this.toppingsService.updateById(id, {
        ...dto,
        image_url,
        image_public_id,
      });
    }

    // (tuỳ chọn) xoá ảnh nếu FE gửi remove_image=1
    if (removeImage) {
      if (top.image_public_id) {
        await this.cloudinary.deleteImage?.(top.image_public_id).catch(() => { });
      }
      return this.toppingsService.updateById(id, {
        ...dto,
        image_url: null,
        image_public_id: null,
      });
    }

    // không upload ảnh => chỉ update text/price
    return this.toppingsService.updateById(id, dto);
  }

  @Patch(':id/toggle-available')
  async toggleAvailable(@CurrentUser() user: any, @Param('id') id: string) {
    const merchant = await getMerchantOrThrow(this.merchantsService, user.sub);
    const top = await this.toppingsService.findById(id);
    if (!top || top.merchant_id.toString() !== merchant._id.toString()) throw new Error('Topping not found');
    return this.toppingsService.toggleAvailability(id);
  }

  @Patch(':id/toggle-active')
  async toggleActive(@CurrentUser() user: any, @Param('id') id: string) {
    const merchant = await getMerchantOrThrow(this.merchantsService, user.sub);
    const top = await this.toppingsService.findById(id);
    if (!top || top.merchant_id.toString() !== merchant._id.toString()) throw new Error('Topping not found');
    return this.toppingsService.toggleActive(id);
  }

  @Put('reorder')
  async reorder(@CurrentUser() user: any, @Body() body: { orderedIds: string[] }) {
    const merchant = await getMerchantOrThrow(this.merchantsService, user.sub);
    // nhớ thêm method reorder trong service như ở trên
    return (this.toppingsService as any).reorder(merchant._id.toString(), body.orderedIds || []);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    const merchant = await getMerchantOrThrow(this.merchantsService, user.sub);
    const top = await this.toppingsService.findById(id);
    if (!top || top.merchant_id.toString() !== merchant._id.toString()) throw new Error('Topping not found');
    return this.toppingsService.softDelete(id);
  }
}
