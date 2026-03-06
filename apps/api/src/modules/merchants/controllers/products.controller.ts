import {
  Body, Controller, Delete, Get, Patch, Post, Put, Query, UploadedFiles, UseGuards, UseInterceptors, Param,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { MerchantsService } from '../services/merchants.service';
import { ProductsService } from '../services/products.service';
import { CreateProductDto, UpdateProductDto } from '../dtos/product.dto';
import { getMerchantOrThrow } from '../utils/get-merchant-or-throw';
import { CloudinaryService } from 'src/common/services/cloudinary.service';
import { JwtAuthGuard } from 'src/modules/auth';

@Controller('merchant/menu/products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(
    private readonly merchantsService: MerchantsService,
    private readonly productsService: ProductsService,
    private readonly cloudinary: CloudinaryService,
  ) { }

  @Get()
  async list(
    @CurrentUser() user: any,
    @Query('q') q?: string,
    @Query('categoryId') categoryId?: string,
    @Query('status') status?: 'all' | 'available' | 'unavailable',
  ) {
    const merchant = await getMerchantOrThrow(this.merchantsService, user.sub);
    return this.productsService.list(merchant._id.toString(), { q, categoryId, status: status || 'all' });
  }

  @Post()
  @UseInterceptors(FilesInterceptor('images'))
  async create(
    @CurrentUser() user: any,
    @Body() dto: CreateProductDto,
    @UploadedFiles() images?: Express.Multer.File[],
  ) {
    const merchant = await getMerchantOrThrow(this.merchantsService, user.sub);

    const imgs: { url: string; public_id: string; position: number }[] = [];

    if (images?.length) {
      for (let i = 0; i < images.length; i++) {
        const file = images[i];
        const up = await this.cloudinary.uploadImage(file, `merchants/${merchant._id}/products`);
        imgs.push({
          url: up.secure_url || up.url,
          public_id: up.public_id,
          position: i,
        });
      }
    }

    return this.productsService.create(merchant._id.toString(), {
      ...(dto as any),
      images: imgs, // ✅
    } as any);
  }

  @Patch(':id')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @UseInterceptors(FilesInterceptor('images'))
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @UploadedFiles() images?: Express.Multer.File[],
    @Query('replaceImages') replaceImages?: string,
  ) {
    const merchant = await getMerchantOrThrow(this.merchantsService, user.sub);

    const patch: any = { ...dto };
    console.log('is_active:', dto.is_active, typeof dto.is_active);
    if (images?.length) {
      const isReplace = replaceImages === '1';

      const current = await this.productsService.findByMerchantOrThrow(merchant._id.toString(), id);

      // upload ảnh mới trước (để khỏi mất dữ liệu nếu upload fail)
      const uploaded: { url: string; public_id: string }[] = [];
      for (const file of images) {
        const up = await this.cloudinary.uploadImage(file, `merchants/${merchant._id}/products`);
        uploaded.push({ url: up.secure_url || up.url, public_id: up.public_id });
      }

      if (isReplace) {
        // xoá cloudinary ảnh cũ
        const oldPublicIds = (current.images || []).map((x) => x.public_id);
        if (oldPublicIds.length) {
          await Promise.allSettled(oldPublicIds.map((pid) => this.cloudinary.deleteByPublicId(pid)));
        }

        // set images mới
        patch.images = uploaded.map((x, idx) => ({ ...x, position: idx }));
      } else {
        // append vào images hiện tại
        const startPos = (current.images || []).length;
        patch.images = [
          ...(current.images || []),
          ...uploaded.map((x, idx) => ({ ...x, position: startPos + idx })),
        ];
      }
    }

    return this.productsService.update(merchant._id.toString(), id, patch);
  }
  @Get(':id/images')
  async listImages(@CurrentUser() user: any, @Param('id') id: string) {
    const merchant = await getMerchantOrThrow(this.merchantsService, user.sub);
    return this.productsService.listImages(merchant._id.toString(), id);
  }

  @Post(':id/images')
  @UseInterceptors(FilesInterceptor('images'))
  async uploadImages(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @UploadedFiles() images?: Express.Multer.File[],
  ) {
    const merchant = await getMerchantOrThrow(this.merchantsService, user.sub);
    if (!images?.length) return { items: [] };

    const uploaded: { url: string; public_id: string }[] = [];
    for (const file of images) {
      const up = await this.cloudinary.uploadImage(file, `merchants/${merchant._id}/products`);
      uploaded.push({ url: up.secure_url || up.url, public_id: up.public_id });
    }

    return this.productsService.addImages(merchant._id.toString(), id, uploaded);
  }

  @Delete(':id/images/:publicId')
  async deleteOneImage(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Param('publicId') publicId: string,
  ) {
    const merchant = await getMerchantOrThrow(this.merchantsService, user.sub);

    // xoá cloudinary (publicId nên decode ở đây)
    const pid = decodeURIComponent(publicId);
    await Promise.allSettled([this.cloudinary.deleteByPublicId(pid)]);

    return this.productsService.deleteImage(merchant._id.toString(), id, pid);
  }

  @Patch(':id/images/reorder')
  async reorderImages(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { orderedPublicIds: string[] },
  ) {
    const merchant = await getMerchantOrThrow(this.merchantsService, user.sub);
    return this.productsService.reorderImages(merchant._id.toString(), id, body.orderedPublicIds || []);
  }
  @Patch(':id/toggle-available')
  async toggleAvailable(@CurrentUser() user: any, @Param('id') id: string) {
    const merchant = await getMerchantOrThrow(this.merchantsService, user.sub);
    return this.productsService.toggleAvailable(merchant._id.toString(), id);
  }

  @Put('reorder')
  async reorder(@CurrentUser() user: any, @Body() body: { orderedIds: string[] }) {
    const merchant = await getMerchantOrThrow(this.merchantsService, user.sub);
    return this.productsService.reorder(merchant._id.toString(), body.orderedIds || []);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    const merchant = await getMerchantOrThrow(this.merchantsService, user.sub);
    return this.productsService.softDelete(merchant._id.toString(), id);
  }
}
