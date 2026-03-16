import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Req,
    UseGuards,
} from '@nestjs/common';
import { ClientGuard, JwtAuthGuard, Roles, RolesGuard } from 'src/modules/auth';
import { CreateTableDto } from '../dtos/create-table.dto';
import { UpdateTableDto } from '../dtos/update-table.dto';
import { TablesService } from '../services/tables.service';

@Controller('dine-in/tables')
@UseGuards(JwtAuthGuard, RolesGuard, ClientGuard)
@Roles('merchant')
export class MerchantTablesController {
    constructor(private readonly tablesService: TablesService) { }

    @Get('me')
    async listMine(@Req() req: any) {
        const data = await this.tablesService.listMine(req.user.userId);
        return { success: true, data };
    }

    @Get('me/:id')
    async getOneMine(@Req() req: any, @Param('id') id: string) {
        const data = await this.tablesService.getOneMine(req.user.userId, id);
        return { success: true, data };
    }

    @Post('me')
    async createMine(@Req() req: any, @Body() dto: CreateTableDto) {
        const data = await this.tablesService.createByMerchantUser(req.user.userId, dto);
        return { success: true, data };
    }

    @Patch('me/:id')
    async updateMine(
        @Req() req: any,
        @Param('id') id: string,
        @Body() dto: UpdateTableDto,
    ) {
        const data = await this.tablesService.updateMine(req.user.userId, id, dto);
        return { success: true, data };
    }

    @Patch('me/:id/regenerate-qr')
    async regenerateQr(@Req() req: any, @Param('id') id: string) {
        const data = await this.tablesService.regenerateQr(req.user.userId, id);
        return { success: true, data };
    }

    @Delete('me/:id')
    async deleteMine(@Req() req: any, @Param('id') id: string) {
        const data = await this.tablesService.softDeleteMine(req.user.userId, id);
        return { success: true, data };
    }
}