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
  BadRequestException,
  UseInterceptors,
  UploadedFile,
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
import type { LoginDto } from '../dtos/login.dto';
import { MerchantBasicInfoDto, MerchantRegisterDto } from '../dtos/merchant/merchant-register.dto';
import { UsersService } from '../../users/services/users.service';
import { MerchantsService } from '../../merchants/services/merchants.service';
import { MerchantApprovalStatus } from '../../merchants/schemas/merchant.schema';
import { FileInterceptor } from '@nestjs/platform-express/multer';
import { CloudinaryService } from 'src/common/services/cloudinary.service';
import { MerchantRefreshGuard } from '../guards/refresh.guard';
import { RefreshSessionService } from '../services/refresh-session-service';
import { getClientInfo } from 'src/common/utils/request-client-info';
import { LoginHistoryService } from 'src/modules/users/services/login-history.service';
import { LoginAuthMethod } from 'src/modules/users/schemas/login-history.schema';

@Controller('auth/merchant')
@Client('merchant_web')
export class MerchantAuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
    private readonly usersService: UsersService,
    private readonly merchantsService: MerchantsService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly refreshSessionService: RefreshSessionService,
    private readonly loginHistoryService: LoginHistoryService,
  ) { }

  /**
   * POST /auth/merchant/register
   * Đăng ký merchant mới
   */
  @Post('register')
  async register(
    @Body() dto: MerchantRegisterDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    const app: ClientApp = 'merchant_web';
    const deviceId = req.headers['x-device-id'] as string;

    console.log('[MerchantRegister] Starting registration for:', dto.email);

    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new BadRequestException('Email đã được đăng ký');
    }

    const user = await this.authService.createMerchantUser({
      email: dto.email,
      password: dto.password,
      full_name: dto.full_name,
      phone: dto.phone,
    });

    const userDoc = user as any;
    const uid = userDoc._id.toString();

    const merchant = await this.merchantsService.create({
      owner_user_id: uid,
      email: dto.email,
      phone: dto.phone,
      approval_status: MerchantApprovalStatus.DRAFT,
      onboarding_step: 1,
    });

    const sid = await this.refreshSessionService.createSession({
      userId: uid,
      deviceId,
      aud: app,
      role: 'merchant',
    }) as string;

    const { access_token } = await this.tokenService.signAccessToken({
      userId: uid,
      email: userDoc.email,
      role: 'merchant',
      aud: app,
      sid,
    });

    const { refresh_token } = await this.tokenService.signRefreshToken({
      userId: uid,
      email: userDoc.email,
      role: 'merchant',
      aud: app,
      sid,
    });

    res.cookie(REFRESH_COOKIE_NAME[app], refresh_token, {
      httpOnly: true,
      path: '/',
      // DEV (http): dùng lax cho ổn
      sameSite: 'none',
      secure: true, // prod + sameSite none => phải https
      maxAge: 30 * 24 * 60 * 60 * 1000, // = 30d (hoặc 7d nếu bạn đổi)
    });

    return {
      success: true,
      message: 'Đăng ký thành công',
      data: {
        access_token,
        user: {
          id: uid,
          email: userDoc.email,
          full_name: userDoc.full_name,
          role: userDoc.role,
          status: userDoc.status,
        },
        onboarding: {
          has_onboarding: true,
          current_step: 'basic_info',
          step_number: 1,
          merchant_approval_status: merchant.approval_status,
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
    const app: ClientApp = 'merchant_web';
    const deviceId = req.headers['x-device-id'] as string;

    const user = await this.authService.validateUser(dto.email, dto.password);
    const userDoc = user as any;

    if (userDoc.role !== 'merchant') {
      throw new BadRequestException('Tài khoản không phải là merchant');
    }
    const info = getClientInfo(req, app);
    await this.loginHistoryService.record({
      userId: userDoc._id.toString(),
      role: 'merchant',
      app,
      platform: info.platform,
      authMethod: LoginAuthMethod.PASSWORD,
      deviceId: info.deviceId,
      ip: info.ip,
      userAgent: info.userAgent,
    });
    const merchant = await this.merchantsService.findByOwnerUserId(userDoc._id.toString());
    const approvalStatus = merchant?.approval_status || MerchantApprovalStatus.DRAFT;

    let currentStep = 'basic_info';
    let stepNumber = 1;

    if (approvalStatus === MerchantApprovalStatus.PENDING_APPROVAL) {
      currentStep = 'waiting_approval';
      stepNumber = 4;
    } else if (approvalStatus === MerchantApprovalStatus.APPROVED) {
      currentStep = 'approved';
      stepNumber = 4;
    }

    const sid = await this.refreshSessionService.createSession({
      userId: userDoc._id.toString(),
      deviceId,
      aud: app,
      role: 'merchant',
    }) as string;

    const { access_token } = await this.tokenService.signAccessToken({
      userId: userDoc._id.toString(),
      email: userDoc.email,
      role: 'merchant',
      aud: app,
      sid,
    });

    const { refresh_token } = await this.tokenService.signRefreshToken({
      userId: userDoc._id.toString(),
      email: userDoc.email,
      role: 'merchant',
      aud: app,
      sid,
    });

    res.cookie(REFRESH_COOKIE_NAME[app], refresh_token, {
      httpOnly: true,
      path: '/',
      // DEV (http): dùng lax cho ổn
      sameSite: 'none',
      secure: true, // prod + sameSite none => phải https
      maxAge: 30 * 24 * 60 * 60 * 1000, // = 30d (hoặc 7d nếu bạn đổi)
    });

    return {
      success: true,
      message: 'Đăng nhập thành công',
      data: {
        access_token,
        user: {
          id: userDoc._id,
          email: userDoc.email,
          full_name: userDoc.full_name,
          role: userDoc.role,
          status: userDoc.status,
        },
        onboarding: {
          has_onboarding: true,
          current_step: currentStep,
          step_number: stepNumber,
          merchant_approval_status: approvalStatus,
          basic_info: merchant?.name ? {
            store_name: merchant.name,
            store_phone: merchant.phone,
            store_address: merchant.address,
            store_category: merchant.category,
            description: merchant.description,
          } : undefined,
        },
      },
    };
  }

  @Post('refresh')
  @UseGuards(MerchantRefreshGuard)
  async refresh(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    const app: ClientApp = 'merchant_web';
    const user = req.user;
    const deviceId = req.headers['x-device-id'] as string;

    const newSid = await this.refreshSessionService.rotateSession(user.sid, {
      userId: user.userId,
      deviceId,
      aud: app,
      role: user.role,
    }) as string;

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
      path: '/',
      // DEV (http): dùng lax cho ổn
      sameSite: 'none',
      secure: true, // prod + sameSite none => phải https
      maxAge: 30 * 24 * 60 * 60 * 1000, // = 30d (hoặc 7d nếu bạn đổi)
    });

    return { success: true, data: { access_token } };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  // ✅ Nếu bạn muốn logout kể cả khi access token hết hạn, dùng MerchantRefreshGuard
  @UseGuards(MerchantRefreshGuard)
  async logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    const app: ClientApp = 'merchant_web';

    // 1) Lấy refresh token từ cookie
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME[app]];

    // 2) Verify refresh token để lấy sid/userId
    if (rawRefreshToken) {
      try {
        const payload: any = await this.tokenService.verifyRefreshToken(rawRefreshToken);
        const sidFromRt = payload?.sid;
        // const userIdFromRt = payload?.sub; // nếu cần

        if (sidFromRt) {
          await this.refreshSessionService.revokeSession(sidFromRt);
        }
      } catch (e) {
        // refresh token invalid thì vẫn clear cookie + clear FE state là OK
        // (không throw để logout vẫn "thành công" ở UI)
        console.warn('[logout] verify refresh token failed:', e);
      }
    }

    // 3) Clear cookie (⚠️ options phải KHỚP lúc set cookie)
    res.clearCookie(REFRESH_COOKIE_NAME[app], {
      httpOnly: true,
      sameSite: 'none',
      secure: true, // ✅ phải giống lúc res.cookie(... secure:true)
      path: '/',
    });

    return { success: true, message: 'Đăng xuất thành công' };
  }

  @UseGuards(JwtAuthGuard, RolesGuard, ClientGuard)
  @Roles('merchant')
  @Get('me')
  async me(@Req() req: any) {
    const user = req.user;
    const merchant = await this.merchantsService.findByOwnerUserId(user.userId);

    if (!merchant) {
      return {
        success: true,
        data: {
          id: user.userId,
          email: user.email,
          full_name: user.email?.split('@')[0],
          role: user.role,
          status: 'active',
          merchant: null,
          onboarding: {
            has_onboarding: false,
            current_step: 'basic_info',
            step_number: 1,
            merchant_approval_status: 'draft',
          },
        },
      };
    }

    const approval = merchant.approval_status;
    const stepNum = merchant.onboarding_step ?? 1;

    let currentStep: any = 'basic_info';
    if (approval === MerchantApprovalStatus.PENDING_APPROVAL) currentStep = 'waiting_approval';
    else if (approval === MerchantApprovalStatus.APPROVED) currentStep = 'approved';
    else if (stepNum === 1) currentStep = 'basic_info';
    else if (stepNum === 2) currentStep = 'documents';
    else if (stepNum >= 3) currentStep = 'ready_to_submit';

    return {
      success: true,
      data: {
        id: user.userId,
        email: user.email,
        full_name: merchant.name || user.email?.split('@')[0],
        role: user.role,
        status: 'active',
        merchant: {
          id: merchant._id?.toString(),
          owner_user_id: merchant.owner_user_id.toString(),
          name: merchant.name,
          description: merchant.description,
          phone: merchant.phone,
          email: merchant.email,
          category: merchant.category,
          address: merchant.address,
          location: merchant.location ?? null,
          is_accepting_orders: merchant.is_accepting_orders,
          approval_status: merchant.approval_status,
          rejection_reasons: merchant.rejection_reasons,
          rejection_note: merchant.rejection_note,
          onboarding_step: merchant.onboarding_step,
          submitted_at: merchant.submitted_at,
          commission_rate: merchant.commission_rate,
          logo_url: merchant.logo_url,
          logo_public_id: merchant.logo_public_id,
          cover_image_url: merchant.cover_image_url,
          cover_image_public_id: merchant.cover_image_public_id,
          documents: merchant.documents,
          business_hours: merchant.business_hours,
          average_prep_time_min: merchant.average_prep_time_min,
          delivery_radius_km: merchant.delivery_radius_km,
          total_orders: merchant.total_orders,
          average_rating: merchant.average_rating,
          total_reviews: merchant.total_reviews,
          deleted_at: merchant.deleted_at,
          created_at: merchant.created_at,
          updated_at: (merchant as any).updated_at,
        },
        onboarding: {
          has_onboarding: true,
          current_step: currentStep,
          step_number: stepNum,
          merchant_approval_status: approval,
          rejection_reasons: merchant.rejection_reasons,
          rejection_note: merchant.rejection_note,
          basic_info: {
            store_name: merchant.name,
            store_phone: merchant.phone,
            store_address: merchant.address,
            store_category: merchant.category,
            description: merchant.description,
          },
          documents: merchant.documents,
        },
      },
    };
  }

  @Post('onboarding/basic-info')
  @UseGuards(JwtAuthGuard, RolesGuard, ClientGuard)
  @Roles('merchant')
  async saveBasicInfo(@Req() req: any, @Body() dto: MerchantBasicInfoDto) {
    const userId = req.user.userId;
    const merchant = await this.merchantsService.findByOwnerUserId(userId);
    if (!merchant) throw new BadRequestException('Merchant not found');

    const updated = await this.merchantsService.updateById(merchant._id.toString(), {
      name: dto.store_name,
      phone: dto.store_phone,
      address: dto.store_address,
      category: dto.store_category,
      description: dto.description ?? null,
      onboarding_step: Math.max(merchant.onboarding_step ?? 1, 2),
      approval_status: MerchantApprovalStatus.DRAFT,
    });

    return {
      success: true,
      data: {
        onboarding: {
          has_onboarding: true,
          current_step: 'documents',
          step_number: 2,
          merchant_approval_status: updated.approval_status,
        }
      }
    };
  }

  @Post('onboarding/documents')
  @UseGuards(JwtAuthGuard, RolesGuard, ClientGuard)
  @Roles('merchant')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDoc(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    const userId = req.user.userId;
    const { documentType } = body;

    if (!file) throw new BadRequestException('File is required');
    if (!documentType) throw new BadRequestException('documentType is required');

    const merchant = await this.merchantsService.findByOwnerUserId(userId);
    if (!merchant) throw new BadRequestException('Merchant not found');

    try {
      const uploaded = await this.cloudinaryService.uploadMerchantDocument(
        file,
        userId,
        documentType,
      );
      const url = uploaded.secure_url || uploaded.url;

      const fieldMap: Record<string, string> = {
        id_card_front: 'id_card_front_url',
        id_card_back: 'id_card_back_url',
        business_license: 'business_license_url',
        store_front: 'store_front_image_url',
      };

      const field = fieldMap[documentType];
      if (!field) throw new BadRequestException('Invalid documentType');

      const patch: any = {
        onboarding_step: Math.max(merchant.onboarding_step ?? 1, 3),
      };
      patch[`documents.${field}`] = url;

      const updated = await this.merchantsService.updateById(
        merchant._id.toString(),
        patch,
      );

      return {
        success: true,
        data: {
          documents: updated.documents,
          onboarding: {
            has_onboarding: true,
            current_step: 'ready_to_submit',
            step_number: 3,
            merchant_approval_status: updated.approval_status,
          }
        }
      };
    } catch (error) {
      console.error('[uploadDoc] Error:', error);
      throw error;
    }
  }

  @Post('onboarding/submit')
  @UseGuards(JwtAuthGuard, RolesGuard, ClientGuard)
  @Roles('merchant')
  async submit(@Req() req: any) {
    const userId = req.user.userId;
    const merchant = await this.merchantsService.findByOwnerUserId(userId);
    if (!merchant) throw new BadRequestException('Merchant not found');

    const d = merchant.documents || ({} as any);
    const ok = d.id_card_front_url && d.id_card_back_url && d.business_license_url && d.store_front_image_url;

    if (!ok) throw new BadRequestException('Thiếu giấy tờ');

    const updateData: any = {
      approval_status: MerchantApprovalStatus.PENDING_APPROVAL,
      submitted_at: new Date(),
      onboarding_step: 4,
    };

    if (merchant.approval_status === MerchantApprovalStatus.REJECTED) {
      updateData.rejection_reasons = [];
      updateData.rejection_note = null;
    }

    await this.merchantsService.updateById(merchant._id.toString(), updateData);

    return {
      success: true,
      data: {
        onboarding: {
          has_onboarding: true,
          current_step: 'waiting_approval',
          step_number: 4,
          merchant_approval_status: 'pending_approval',
        },
      },
    };
  }

  @Post('onboarding/restart')
  @UseGuards(JwtAuthGuard, RolesGuard, ClientGuard)
  @Roles('merchant')
  async restartOnboarding(@Req() req: any) {
    const userId = req.user.userId;
    const merchant = await this.merchantsService.findByOwnerUserId(userId);
    if (!merchant) throw new BadRequestException('Merchant not found');

    if (merchant.approval_status !== MerchantApprovalStatus.REJECTED) {
      throw new BadRequestException('Chỉ có thể chỉnh sửa khi hồ sơ bị từ chối');
    }

    await this.merchantsService.updateById(merchant._id.toString(), {
      onboarding_step: 1,
    });

    return {
      success: true,
      data: {
        onboarding: {
          has_onboarding: true,
          current_step: 'basic_info',
          step_number: 1,
          merchant_approval_status: merchant.approval_status,
          rejection_reasons: merchant.rejection_reasons ?? [],
          rejection_note: merchant.rejection_note ?? null,
        },
      },
    };
  }

  @Get('onboarding/status')
  @UseGuards(JwtAuthGuard, RolesGuard, ClientGuard)
  @Roles('merchant')
  async status(@Req() req: any) {
    const userId = req.user.userId;
    const merchant = await this.merchantsService.findByOwnerUserId(userId);

    const approval = merchant?.approval_status ?? 'draft';
    let current_step: any = 'basic_info';

    if (approval === MerchantApprovalStatus.REJECTED) {
      current_step = (merchant?.onboarding_step ?? 1) <= 1 ? 'basic_info' : 'documents';
    } else if (approval === MerchantApprovalStatus.PENDING_APPROVAL) {
      current_step = 'waiting_approval';
    } else if (approval === MerchantApprovalStatus.APPROVED) {
      current_step = 'approved';
    } else if ((merchant?.onboarding_step ?? 1) === 2) {
      current_step = 'documents';
    } else if ((merchant?.onboarding_step ?? 1) >= 3) {
      current_step = 'ready_to_submit';
    }

    return {
      success: true,
      data: {
        has_onboarding: !!merchant,
        current_step,
        step_number: merchant?.onboarding_step ?? 1,
        merchant_approval_status: approval,
        rejection_reasons: merchant?.rejection_reasons,
        rejection_note: merchant?.rejection_note,
        basic_info: merchant?.name ? {
          store_name: merchant.name,
          store_phone: merchant.phone,
          store_address: merchant.address,
          store_category: merchant.category,
          description: merchant.description,
        } : undefined,
        documents: merchant?.documents,
      },
    };
  }
}
