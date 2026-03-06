import { Controller, Get, Patch, Param, Body, UseGuards, HttpCode, HttpStatus, BadRequestException, Req, Query } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { DriverProfilesService } from 'src/modules/drivers/services/driver-profiles.service';
import { UsersService } from 'src/modules/users/services/users.service';
import { DriverVerificationStatus } from 'src/modules/drivers/schemas/driver-profile.schema';
import { UpdateDriverVerificationDto } from '../dtos/update-driver-verification.dto';
// import { AdminDriversService } from '../services/admin-drivers.service';

@Controller('admin/drivers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminDriversController {
    constructor(
        private readonly driverProfilesService: DriverProfilesService,
        private readonly usersService: UsersService,
        // private readonly adminDrivers: AdminDriversService
    ) { }
    
    @Get('pending')
    async listPending() {
        const rows = await this.driverProfilesService.listPending(100);
        return { success: true, data: rows };
    }
    // ✅ NEW: list all (FE fetch 1 lần)
    @Get()
    async listAll(@Query('scope') scope?: 'list' | 'all') {
        const rows = await this.driverProfilesService.listForAdmin({ scope: scope ?? 'list' });
        return { success: true, data: rows };
    }
    @Get(':userId')
    async detail(@Param('userId') userId: string) {
        const user = await this.usersService.findById(userId);
        if (!user) throw new BadRequestException('User not found');

        const profile = await this.driverProfilesService.findByUserId(userId);
        return { success: true, data: { user, driver_profile: profile } };
    }

    @Patch(':userId/verification')
    @HttpCode(HttpStatus.OK)
    async updateVerification(
        @Param('userId') userId: string,
        @Body() dto: UpdateDriverVerificationDto,
        @Req() req: any,
    ) {
        const adminId = req.user?.userId;

        const profile = await this.driverProfilesService.adminSetVerification({
            userId,
            status: dto.verificationStatus,
            reasons: dto.verificationReasons ?? [],
            note: dto.verificationNote ?? null,
            verifiedBy: adminId,
        });

        // đồng bộ status của user (tuỳ policy)
        if (dto.verificationStatus === DriverVerificationStatus.APPROVED) {
            await this.usersService.update(userId, { status: 'active' } as any);
        } else if (dto.verificationStatus === DriverVerificationStatus.REJECTED) {
            await this.usersService.update(userId, { status: 'inactive' } as any);
        } else {
            await this.usersService.update(userId, { status: 'pending' } as any);
        }

        return { success: true, data: profile };
    }
}