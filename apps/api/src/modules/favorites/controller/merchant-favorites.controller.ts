import { Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { MerchantFavoritesService } from '../services/merchant-favorites.service';


import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthGuard } from '@nestjs/passport';

@Controller()
export class MerchantFavoritesController {
  constructor(private readonly favs: MerchantFavoritesService) { }

  @UseGuards(AuthGuard('jwt'))
  @Post('merchants/:merchantId/favorite')
  favorite(@CurrentUser() u: any, @Param('merchantId') merchantId: string) {
    return this.favs.favorite(String(u.userId ?? u.sub), merchantId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('merchants/:merchantId/favorite')
  unfavorite(@CurrentUser() u: any, @Param('merchantId') merchantId: string) {
    return this.favs.unfavorite(String(u.userId ?? u.sub), merchantId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me/favorites/merchants')
  list(
    @CurrentUser('userId') userId: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
  ) {
    return this.favs.listMyFavorites(String(userId), {
      limit: Number(limit ?? 10),
      cursor,
      lat: lat != null ? Number(lat) : null,
      lng: lng != null ? Number(lng) : null,
    });
  }
}