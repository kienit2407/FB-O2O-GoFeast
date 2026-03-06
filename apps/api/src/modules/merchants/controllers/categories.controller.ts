import {
  Body, Controller, Delete, Get, Patch, Post, Put, Query, UploadedFile, UseGuards, UseInterceptors, Param,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { MerchantsService } from '../services/merchants.service';
import { CategoriesService } from '../services/categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from '../dtos/category.dto';
import { getMerchantOrThrow } from '../utils/get-merchant-or-throw';
import { CloudinaryService } from 'src/common/services/cloudinary.service';
import { JwtAuthGuard } from 'src/modules/auth';

@Controller('merchant/menu/categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  constructor(
    private readonly merchantsService: MerchantsService,
    private readonly categoriesService: CategoriesService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  // DEBUG: Endpoint tạm để tạo merchant cho user hiện tại
  @Post('debug/create-merchant')
  async createMerchantForCurrentUser(@CurrentUser() user: any) {
    const userId = user.sub || user.userId;
    console.log('[DEBUG] Creating merchant for user:', { userId, email: user.email });

    // Check if merchant already exists
    const existing = await this.merchantsService.findByOwnerUserId(userId);
    if (existing) {
      console.log('[DEBUG] Merchant already exists:', existing._id);
      return { message: 'Merchant already exists', merchant: existing };
    }

    // Create new merchant
    const merchant = await this.merchantsService.create({
      owner_user_id: userId,
      email: user.email,
      name: 'Test Merchant',
      phone: '',
      approval_status: 'draft' as any,
      onboarding_step: 1,
    });

    console.log('[DEBUG] Merchant created:', merchant._id);
    return { message: 'Merchant created', merchant };
  }

  @Get()
  async list(
    @CurrentUser() user: any,
    @Query('includeInactive') includeInactive?: string,
  ) {
    const merchant = await getMerchantOrThrow(this.merchantsService, user.sub);
    return this.categoriesService.list(merchant._id.toString(), { includeInactive: includeInactive === '1' });
  }

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  async create(
    @CurrentUser() user: any,
    @Body() dto: CreateCategoryDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    const merchant = await getMerchantOrThrow(this.merchantsService, user.sub);

    let image_url: string | undefined;
    if (image) {
      const up = await this.cloudinary.uploadImage(image, `merchants/${merchant._id}/categories`);
      image_url = up.secure_url || up.url;
    }

    return this.categoriesService.create(merchant._id.toString(), { ...dto });
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('image'))
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    const merchant = await getMerchantOrThrow(this.merchantsService, user.sub);

    let image_url: string | undefined;
    if (image) {
      const up = await this.cloudinary.uploadImage(image, `merchants/${merchant._id}/categories`);
      image_url = up.secure_url || up.url;
    }

    return this.categoriesService.update(merchant._id.toString(), id, { ...dto, ...(image_url ? { image_url } : {}) });
  }

  @Patch(':id/toggle-active')
  async toggle(@CurrentUser() user: any, @Param('id') id: string) {
    const merchant = await getMerchantOrThrow(this.merchantsService, user.sub);
    return this.categoriesService.toggleActive(merchant._id.toString(), id);
  }

  @Put('reorder')
  async reorder(
    @CurrentUser() user: any,
    @Body() body: { orderedIds: string[] },
  ) {
    const merchant = await getMerchantOrThrow(this.merchantsService, user.sub);
    return this.categoriesService.reorder(merchant._id.toString(), body.orderedIds || []);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    const merchant = await getMerchantOrThrow(this.merchantsService, user.sub);
    return this.categoriesService.softDelete(merchant._id.toString(), id);
  }
}
