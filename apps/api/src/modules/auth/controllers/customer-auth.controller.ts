import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  Get,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthService } from '../services/auth.service';
import { TokenService } from '../services/token.service';
import { Client } from '../decorators/client.decorator';
import { Roles } from '../decorators/roles.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { ClientGuard } from '../guards/client.guard';
import { REFRESH_COOKIE_NAME, ClientApp } from '../common/auth.constants';
import { AuthGuard } from '@nestjs/passport';
import { OptionalJwtAuthGuard } from '../guards';
import { RegisterDeviceDto } from 'src/modules/users/dto/register-device.dto';
import { CustomerProfilesService } from 'src/modules/customers/services/customer-profile.service';

@Controller('auth/customer')
@Client('customer_mobile')
export class CustomerAuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
     private readonly customerProfilesService: CustomerProfilesService,
  ) { }

  @Post('device/register')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async registerDevice(@Req() req: any, @Body() dto: RegisterDeviceDto) {
    console.log('[device/register] user=', req.user?.userId, 'dto=', dto);
    const userId = req.user.userId;
    await this.authService.registerCustomerDevice(userId, dto);
    return { success: true };
  }
  // =========================ac
  // OAUTH START (Google/GitHub)
  // =========================
  // Google: mở URL này từ mobile (FlutterWebAuth2)
  @Get('oauth/google')
  @UseGuards(AuthGuard('google'))
  async googleStart() {
    // passport sẽ tự redirect sang Google
  }

  @Get('oauth/google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const app: ClientApp = 'customer_mobile';

    // req.user là object từ GoogleStrategy.validate()
    const result = await this.authService.loginCustomerOAuth(req.user as any, {
      app,
      deviceId: null,
    });

    // Redirect về deep-link của app
    const redirectUri =
      `myshop://oauth-callback` +
      `?accessToken=${encodeURIComponent(result.accessToken)}` +
      `&refreshToken=${encodeURIComponent(result.refreshToken)}`;

    return res.redirect(redirectUri);
  }

  // GitHub
  @Get('oauth/github')
  @UseGuards(AuthGuard('github'))
  async githubStart() { }

  @Get('oauth/github/callback')
  @UseGuards(AuthGuard('github'))
  async githubCallback(@Req() req: Request, @Res() res: Response) {
    const app: ClientApp = 'customer_mobile';

    const result = await this.authService.loginCustomerOAuth(req.user as any, {
      app,
      deviceId: null,
    });

    const redirectUri =
      `myshop://oauth-callback` +
      `?accessToken=${encodeURIComponent(result.accessToken)}` +
      `&refreshToken=${encodeURIComponent(result.refreshToken)}`;

    return res.redirect(redirectUri);
  }

  // =========================
  // MOBILE REFRESH (body refreshToken)
  // =========================
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: { refreshToken: string }) {
    if (!dto?.refreshToken) throw new UnauthorizedException('Missing refreshToken');

    const app: ClientApp = 'customer_mobile';
    const data = await this.authService.refreshCustomerMobile(dto.refreshToken, app);

    // ✅ key đồng nhất cho mobile
    return { success: true, data }; // { accessToken, refreshToken }
  }

  // =========================
  // ME (optional auth) -> trả null nếu guest
  // =========================
  @Get('me')
  @UseGuards(OptionalJwtAuthGuard)
  async me(@Req() req: any) {
    if (!req.user) return { success: true, data: null };

    const userId = req.user.userId;

    // ✅ thay vì getUserSafe -> lấy kèm profile
    const data = await this.customerProfilesService.getMyProfile(userId);

    return { success: true, data };
  }

  // =========================
  // LOGOUT (revoke sid theo refreshToken nếu có)
  // =========================
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() dto: { refreshToken?: string }) {
    await this.authService.logoutCustomerMobile(dto?.refreshToken);
    return { success: true };
  }
}
