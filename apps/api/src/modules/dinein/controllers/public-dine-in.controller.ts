import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    UseGuards,
} from '@nestjs/common';

import { TablesService } from '../services/tables.service';
import { EnterTableDto } from '../dtos/enter-table.dto';
import { PublicDineInService } from '../services/public-dinein.service';
import { DineInSessionGuard } from '../guards/dinein-session.guard';
import { CurrentDineIn } from '../decorators/current-dinein.decorator';

@Controller('dine-in/public')
export class PublicDineInController {
    constructor(
        private readonly tablesService: TablesService,
        private readonly publicDineInService: PublicDineInService,
    ) { }

    @Get('resolve-table/:tableId')
    async resolveTable(@Param('tableId') tableId: string) {
        const data = await this.tablesService.resolvePublicTable(tableId);
        return { success: true, data };
    }

    @Post('enter-table')
    async enterTable(@Body() dto: EnterTableDto) {
        const data = await this.publicDineInService.enterTable({
            tableId: dto.table_id,
            guestName: dto.guest_name ?? null,
        });
        return { success: true, data };
    }

    @Get('session/current')
    @UseGuards(DineInSessionGuard)
    async getCurrentSession(@CurrentDineIn() dineIn: any) {
        const data = await this.publicDineInService.getCurrentSessionFromToken({
            merchantId: dineIn.merchantId,
            tableId: dineIn.tableId,
            tableSessionId: dineIn.tableSessionId,
        });
        return { success: true, data };
    }

    @Post('leave-table')
    @UseGuards(DineInSessionGuard)
    async leaveTable() {
        const data = await this.publicDineInService.leaveTable();
        return { success: true, data };
    }
}