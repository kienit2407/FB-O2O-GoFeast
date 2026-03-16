import {
  Controller,
  Post,
  Patch,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  Get,
  UnauthorizedException,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UploadedFiles,
} from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { Client } from '../decorators/client.decorator';
import { Roles } from '../decorators/roles.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { ClientGuard } from '../guards/client.guard';
import { OptionalJwtAuthGuard } from '../guards';
import { RegisterDeviceDto } from 'src/modules/users/dto/register-device.dto';
import { DriverOnboardingDraftDto } from 'src/modules/drivers/dtos/driver-onboarding-draft.dto';
import { DriverOnboardingSubmitDto } from 'src/modules/drivers/dtos/driver-onboarding-submit.dto';
import type { ClientApp } from '../common/auth.constants';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CloudinaryService } from 'src/common/services/cloudinary.service';
import { DriverProfilesService } from 'src/modules/drivers/services/driver-profiles.service';

@Controller('auth/driver')
@Client('driver_mobile')
export class DriverAuthController {
  constructor(private readonly authService: AuthService, private readonly cloudinaryService: CloudinaryService, private readonly driverProfilesService: DriverProfilesService,) { }

  // ========= DEVICE REGISTER (giống customer) =========
  @Post('device/register')
  @UseGuards(JwtAuthGuard, RolesGuard, ClientGuard)
  @Roles('driver')
  @HttpCode(HttpStatus.OK)
  async registerDevice(@Req() req: any, @Body() dto: RegisterDeviceDto) {
    await this.authService.registerDriverDevice(req.user.userId, dto);
    return { success: true };
  }

  // ========= REFRESH (body refreshToken, giống customer) =========
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: { refreshToken: string }) {
    if (!dto?.refreshToken) throw new UnauthorizedException('Missing refreshToken');
    const app: ClientApp = 'driver_mobile';
    const data = await this.authService.refreshDriverMobile(dto.refreshToken, app);
    return { success: true, data }; // { accessToken, refreshToken }
  }

  // ========= ME =========
  @Get('me')
  @UseGuards(OptionalJwtAuthGuard)
  async me(@Req() req: any) {
    if (!req.user) return { success: true, data: null };
    const data = await this.authService.getMeDriver(req.user.userId);
    return { success: true, data };
  }

  // ========= ONBOARDING: save draft (step-by-step) =========
  @Post('upload')
  @UseGuards(JwtAuthGuard, RolesGuard, ClientGuard)
  @Roles('driver')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 8 * 1024 * 1024 }, // 8MB (tuỳ)
    }),
  )
  async upload(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { folder?: string },
  ) {
    if (!file) throw new BadRequestException('Missing file');

    // FE đang gửi "folder"
    const folderKey = body?.folder ?? 'misc';
    const folder = `drivers/${req.user.userId}/${folderKey}`;

    const result = await this.cloudinaryService.uploadImage(file, folder);
    const url = (result as any)?.secure_url ?? (result as any)?.url;
    if (!url) throw new BadRequestException('Upload failed');

    //  chỉ trả url, không đụng DB ở đây
    return { success: true, data: { url } };
  }
  //  NEW: SUBMIT 1 PHÁT (multipart)
  @Post('onboarding/submit-multipart')
  @UseGuards(JwtAuthGuard, RolesGuard, ClientGuard)
  @Roles('driver')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'idCardFront', maxCount: 1 },
        { name: 'idCardBack', maxCount: 1 },
        { name: 'licenseImage', maxCount: 1 },
        { name: 'vehicleImage', maxCount: 1 },
        { name: 'avatarImage', maxCount: 1 },
      ],
      {
        storage: memoryStorage(),
        limits: {
          fileSize: 8 * 1024 * 1024, // 8MB / file
          files: 4,
        },
      },
    ),
  )
  async submitMultipart(
    @Req() req: any,
    @UploadedFiles()
    files: {
      idCardFront?: Express.Multer.File[];
      idCardBack?: Express.Multer.File[];
      licenseImage?: Express.Multer.File[];
      vehicleImage?: Express.Multer.File[];
      avatarImage?: Express.Multer.File[];
    },
    @Body() body: any,
  ) {
    const userId = req.user.userId;

    // helper: lấy url từ file upload hoặc fallback url từ body (nếu đã có sẵn)
    const getUrl = async (key: string, file?: Express.Multer.File) => {
      if (file) {
        const folder = `drivers/${userId}/${key}`;
        const result = await this.cloudinaryService.uploadImage(file, folder);
        const url = (result as any)?.secure_url ?? (result as any)?.url;
        if (!url) throw new BadRequestException(`Upload failed for ${key}`);
        return url.toString();
      }
      // fallback nếu FE gửi url cũ (trường hợp resubmit không chọn lại ảnh)
      const fallback = body?.[key];
      if (typeof fallback === 'string' && fallback.trim().length) return fallback.trim();
      throw new BadRequestException(`Missing image for ${key}`);
    };

    // map field names: file field -> dto url field
    const idCardFrontUrl = await getUrl('idCardFrontUrl', files?.idCardFront?.[0]);
    const idCardBackUrl = await getUrl('idCardBackUrl', files?.idCardBack?.[0]);
    const licenseImageUrl = await getUrl('licenseImageUrl', files?.licenseImage?.[0]);
    const vehicleImageUrl = await getUrl('vehicleImageUrl', files?.vehicleImage?.[0]);
    const avatarUrl = await getUrl('avatarUrl', files?.avatarImage?.[0]);

    const payload: DriverOnboardingSubmitDto = {
      phone: (body?.phone ?? '').toString().trim(),
      idCardNumber: (body?.idCardNumber ?? '').toString().trim(),
      idCardFrontUrl,
      idCardBackUrl,

      licenseNumber: (body?.licenseNumber ?? '').toString().trim(),
      licenseType: (body?.licenseType ?? '').toString(), // A1/A2/B1/B2
      licenseImageUrl,
      licenseExpiry: (body?.licenseExpiry ?? '').toString(),

      vehicleBrand: (body?.vehicleBrand ?? '').toString(),
      vehicleModel: (body?.vehicleModel ?? '').toString().trim(),
      vehiclePlate: (body?.vehiclePlate ?? '').toString().trim(),
      vehicleImageUrl,
      avatarUrl,
    };
    const data = await this.authService.submitDriverOnboarding(userId, payload);
    return { success: true, data };
  }
  // ========= ONBOARDING: submit (step 5 nộp) =========
  @Post('onboarding/submit')
  @UseGuards(JwtAuthGuard, RolesGuard, ClientGuard)
  @Roles('driver')
  @HttpCode(HttpStatus.OK)
  async submitOnboarding(@Req() req: any, @Body() dto: DriverOnboardingSubmitDto) {
    const data = await this.authService.submitDriverOnboarding(req.user.userId, dto);
    return { success: true, data };
  }

  // ========= LOGOUT =========
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() dto: { refreshToken?: string }) {
    await this.authService.logoutDriverMobile(dto?.refreshToken);
    return { success: true };
  }
}