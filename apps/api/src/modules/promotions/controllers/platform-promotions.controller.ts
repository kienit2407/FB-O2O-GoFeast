import { Controller, Get } from '@nestjs/common';
import { AdminPromotionsService } from '../services/admin-promotions.service';

@Controller('promotions/platform')
export class PlatformPromotionsController {
    constructor(
        private readonly adminPromotionsService: AdminPromotionsService,
    ) { }

    @Get('active')
    async listActive() {
        const rows =
            await this.adminPromotionsService.listActivePlatformPromotionsForCustomer();

        return {
            success: true,
            data: rows.map((x: any) => ({
                id: String(x._id),
                name: x.name ?? '',
                description: x.description ?? '',
                banner_url: x.banner_admin_url ?? null,
                show_as_popup: !!x.show_as_popup,
                push_noti_title: x.push_noti_title ?? null,
                push_noti_body: x.push_noti_body ?? null,
                valid_from: x.conditions?.valid_from ?? null,
                valid_to: x.conditions?.valid_to ?? null,
            })),
        };
    }
}