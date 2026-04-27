import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { FeedHomeQueryDto } from '../dto/feed-home.query';
import { OrderType } from '../../orders/schemas';
import { CurrentUser, JwtAuthGuard, OptionalJwtAuthGuard } from '../../auth';
import { LogInteractionDto } from '../dto/log-interaction.dto';
import { FeedService } from '../services/feed.service';

@Controller('feed')
export class FeedController {
    constructor(private readonly feedService: FeedService) { }

    @UseGuards(OptionalJwtAuthGuard)
    @Get('home')
    async getHome(@Query() query: FeedHomeQueryDto, @Req() req: any) {
        // MVP: userId optional (có đăng nhập thì personalize, không thì trả trending)
        const userId = req.user?.userId ?? req.user?.sub ?? req.user?._id ?? null;
        const orderType =
            query.order_type === OrderType.DINE_IN ? OrderType.DINE_IN : OrderType.DELIVERY;
        return this.feedService.getHomeFeed({
            userId,
            lat: query.lat,
            lng: query.lng,
            orderType,
            distanceKm: query.distance_km ?? 7,
            limitPerSection: query.limit_per_section ?? 10,
        });
    }
    @UseGuards(JwtAuthGuard)
    @Post('interaction')
    async logInteraction(@CurrentUser() user: any, @Body() dto: LogInteractionDto) {
        await this.feedService.logInteraction(user.userId ?? user.sub, dto);
        return { ok: true };
    }
}
