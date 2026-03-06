import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard } from 'src/modules/auth';
import { AdminApprovalService } from '../services/admin-approval.service';
import { RejectMerchantDto } from '../dtos/reject-merchant.dto';
// import { AdminMerchantsService } from '../services/admin-merchants.service';


@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminApprovalController {
  constructor(private readonly adminApprovalService: AdminApprovalService,
    // private readonly adminMerchants: AdminMerchantsService
  ) { }

  // FE: GET /admin/merchants?scope=list
  @Get('merchants')
  async getMerchants(@Query('scope') scope?: 'list' | 'all') {
    const merchants = await this.adminApprovalService.getAllMerchants(scope);
    return { success: true, data: merchants };
  }

  //  FE: GET /admin/merchants/review
  @Get('merchants/review')
  async getReviewQueue() {
    const data = await this.adminApprovalService.getReviewQueue();
    return { success: true, data };
  }

  @Post('merchants/:userId/approve')
  async approveMerchant(@Param('userId') userId: string, @CurrentUser() user: any) {
    const merchant = await this.adminApprovalService.approve(userId);
    return { success: true, message: 'Merchant approved', data: merchant };
  }

  @Get('merchants/:id')
  async getMerchantById(@Param('id') id: string) {
    const merchant = await this.adminApprovalService.getMerchantById(id);
    return { success: true, data: merchant };
  }

  @Post('merchants/:userId/reject')
  async rejectMerchant(
    @Param('userId') userId: string,
    @Body() body: RejectMerchantDto,
    @CurrentUser() user: any,
  ) {
    const merchant = await this.adminApprovalService.reject(userId, body,);
    return { success: true, message: 'Merchant rejected', data: merchant };
  }
}
