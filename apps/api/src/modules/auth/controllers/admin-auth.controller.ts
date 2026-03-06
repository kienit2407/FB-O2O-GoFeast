import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Get,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthService } from '../services/auth.service';
import { TokenService } from '../services/token.service';
import { Client } from '../decorators/client.decorator';
import { Roles } from '../decorators/roles.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { ClientGuard } from '../guards/client.guard';
import { MerchantRefreshGuard } from '../guards/refresh.guard';
import { REFRESH_COOKIE_NAME, ClientApp } from '../common/auth.constants';
import type { LoginDto } from '../dtos/login.dto';
import * as bcrypt from 'bcryptjs';
import { RefreshSessionService } from '../services/refresh-session-service';
import { getClientInfo } from 'src/common/utils/request-client-info';
import { LoginHistoryService } from 'src/modules/users/services/login-history.service';
import { LoginAuthMethod } from 'src/modules/users/schemas/login-history.schema';

@Controller('auth/admin')
@Client('admin_web')
export class AdminAuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
    private readonly refreshSessionService: RefreshSessionService,
    private readonly loginHistoryService: LoginHistoryService,
  ) { }

  /**
   * POST /auth/admin/register
   * Đăng ký super admin mới (chỉ dùng cho initial setup)
   */
  @Post('register')
  async register(
    @Body() body: { email: string; password: string },
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    const app: ClientApp = 'admin_web';
    const deviceId = req.headers['x-device-id'] as string;

    // Check if email already exists
    const existingUser = await this.authService.findUserByEmail(body.email);
    if (existingUser) {
      throw new BadRequestException('Email đã được đăng ký');
    }

    // Create admin user
    const password_hash = await bcrypt.hash(body.password, 10);
    const user = await this.authService.createUser({
      email: body.email,
      phone: '',
      password_hash,
      full_name: 'Super Admin',
      role: 'admin',
      status: 'active',
      auth_methods: ['password'],
    });

    const userDoc = user as any;
    const uid = userDoc._id.toString();

    // Create session for this device
    const sid = await this.refreshSessionService.createSession({
      userId: uid,
      deviceId,
      aud: app,
      role: 'admin',
    }) as string;

    // Generate tokens with sid
    const { access_token } = await this.tokenService.signAccessToken({
      userId: uid,
      email: userDoc.email,
      role: 'admin',
      aud: app,
      sid: sid,
    });

    const { refresh_token } = await this.tokenService.signRefreshToken({
      userId: uid,
      email: userDoc.email,
      role: 'admin',
      aud: app,
      sid: sid,
    });

    // Set refresh cookie
    res.cookie(REFRESH_COOKIE_NAME[app], refresh_token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
    });

    return {
      success: true,
      data: {
        access_token,
        user: {
          id: uid,
          email: userDoc.email,
          role: userDoc.role,
        },
      },
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    const app: ClientApp = 'admin_web';
    const deviceId = req.headers['x-device-id'] as string;
    const info = getClientInfo(req, app);

    const user = await this.authService.validateUser(dto.email, dto.password);
    const userDoc = user as any;
    const uid = userDoc._id.toString();
    
    await this.loginHistoryService.record({
      userId: uid,
      role: 'admin',
      app,
      platform: info.platform,
      authMethod: LoginAuthMethod.PASSWORD,
      deviceId: info.deviceId,
      ip: info.ip,
      userAgent: info.userAgent,
    });

    // Create session for this device
    const sid = await this.refreshSessionService.createSession({
      userId: uid,
      deviceId,
      aud: app,
      role: 'admin',
    }) as string;

    // Generate tokens with sid
    const { access_token } = await this.tokenService.signAccessToken({
      userId: uid,
      email: userDoc.email,
      role: userDoc.role,
      aud: app,
      sid: sid,
    });

    const { refresh_token } = await this.tokenService.signRefreshToken({
      userId: uid,
      email: userDoc.email,
      role: userDoc.role,
      aud: app,
      sid: sid,
    });

    res.cookie(REFRESH_COOKIE_NAME[app], refresh_token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
    });

    return {
      data: {
        access_token,
        user: {
          id: uid,
          email: userDoc.email,
          role: userDoc.role,
        },
      },
    };
  }

  @UseGuards(MerchantRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    const app: ClientApp = 'admin_web';
    const deviceId = req.headers['x-device-id'] as string;
    const user = req.user;

    // Rotate session for security
    const newSid = await this.refreshSessionService.rotateSession(user.sid, {
      userId: user.userId,
      deviceId,
      aud: app,
      role: user.role,
    }) as string;

    // Generate new tokens with new sid
    const { access_token } = await this.tokenService.signAccessToken({
      userId: user.userId,
      email: user.email,
      role: user.role,
      aud: app,
      sid: newSid,
    });

    const { refresh_token } = await this.tokenService.signRefreshToken({
      userId: user.userId,
      email: user.email,
      role: user.role,
      aud: app,
      sid: newSid,
    });

    res.cookie(REFRESH_COOKIE_NAME[app], refresh_token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
    });

    return { success: true, data: { access_token } };
  }

  /**
   * GET /auth/admin/me
   * Lấy thông tin admin hiện tại
   */
  @UseGuards(JwtAuthGuard, RolesGuard, ClientGuard)
  @Roles('admin')
  @Get('me')
  async me(@Req() req: any) {
    const user = req.user;

    return {
      success: true,
      data: {
        id: user.userId,
        email: user.email,
        role: user.role,
      },
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard, ClientGuard)
  @Roles('admin')
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    const app: ClientApp = 'admin_web';
    const sid = req.user?.sid;
    if (sid) {
      await this.refreshSessionService.revokeSession(sid);
    }
    res.clearCookie(REFRESH_COOKIE_NAME[app], { path: '/' });
    return { success: true, message: 'Logged out successfully' };
  }
}
