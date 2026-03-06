import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './services/users.service';
import { UsersController } from './controllers/users.controller';
import { User, UserSchema } from './schemas/user.schema';
import { UserDevicesService } from './services/user-devices.service';
import { UserDevice, UserDeviceSchema } from './schemas/user-device.schema';
import { LoginHistory, LoginHistorySchema } from './schemas/login-history.schema';
import { LoginHistoryService } from './services/login-history.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema }, 
      { name: UserDevice.name, schema: UserDeviceSchema }, 
      { name: LoginHistory.name, schema: LoginHistorySchema }
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService, UserDevicesService, LoginHistoryService],
  exports: [UsersService, UserDevicesService, LoginHistoryService, MongooseModule],
})
export class UsersModule { }