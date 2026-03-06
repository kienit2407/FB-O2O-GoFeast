import { Module } from '@nestjs/common';
import { MerchantsModule } from '../merchants/merchants.module';
import { AdminApprovalController } from './controllers/admin-merchants.controller';
import { AdminApprovalService } from './services/admin-approval.service';
import { DriversModule } from '../drivers/drivers.module';
import { UsersModule } from '../users/users.module';
import { AdminDriversController } from './controllers/admin-drivers.controller';
import { AdminUsersController } from './controllers/admin-users.controller';
import { AdminUsersService } from './services/admin-users.service';
import { MongooseModule } from '@nestjs/mongoose';
import { UserSchema } from '../users/schemas/user.schema';
import { SystemConfigsModule } from '../system-config/system-configs.module';
import { AdminSystemConfigsController } from './controllers/admin-system-configs.controller';

@Module({
  imports: [MerchantsModule, DriversModule, UsersModule, SystemConfigsModule],
  controllers: [AdminApprovalController, AdminDriversController, AdminUsersController, AdminSystemConfigsController],
  providers: [AdminApprovalService, AdminUsersService],
})
export class AdminModule { }