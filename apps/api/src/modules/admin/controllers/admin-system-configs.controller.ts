// src/modules/admin/controllers/admin-system-configs.controller.ts
import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, Roles, RolesGuard } from 'src/modules/auth';
import { UpdateCommissionRulesDto } from 'src/modules/system-config/dtos/update-commission-rules.dto';
import { SystemConfigsService } from 'src/modules/system-config/services/system-configs.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/system-configs')
export class AdminSystemConfigsController {
    constructor(private readonly systemConfigs: SystemConfigsService) { }

    // @UseGuards(AdminJwtGuard, RolesGuard)
    // @Roles('super_admin')
    @Get('commission-rules')
    async getCommissionRules() {
        return this.systemConfigs.getCommissionRulesV1();
    }

    // @UseGuards(AdminJwtGuard, RolesGuard)
    // @Roles('super_admin')
    @Put('commission-rules')
    async updateCommissionRules(
        @Body() dto: UpdateCommissionRulesDto,
    ) {
        // ✅ bạn lấy user id từ req.user tùy auth implementation
        const updatedBy = 'REPLACE_WITH_REQ_USER_ID';
        return this.systemConfigs.updateCommissionRulesV1(dto, updatedBy);
    }
}