// src/modules/admin/controllers/admin-users.controller.ts
import { Controller, Get, Param, Query, UseGuards, NotFoundException, Patch, HttpCode, HttpStatus, Body } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { GetAdminUsersDto } from '../dtos/get-admin-users.dto';
import { AdminUsersService } from '../services/admin-users.service';
import { UpdateUserActiveDto } from '../dtos/update-user-active.dto';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminUsersController {
    constructor(private readonly svc: AdminUsersService) { }

    @Get()
    async list(@Query() q: GetAdminUsersDto) {
        const data = await this.svc.listUsers(q);
        return { success: true, data };
    }
    @Patch(':id/active')
    @HttpCode(HttpStatus.OK)
    async setActive(@Param('id') id: string, @Body() dto: UpdateUserActiveDto) {
        const data = await this.svc.setActive(id, dto.active);
        return { success: true, data };
    }
    @Get(':id')
    async detail(
        @Param('id') id: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const data = await this.svc.getUserDetail(
            id,
            page ? Number(page) : 1,
            limit ? Number(limit) : 20,
        );
        if (!data) throw new NotFoundException('User not found');
        return { success: true, data };
    }
}