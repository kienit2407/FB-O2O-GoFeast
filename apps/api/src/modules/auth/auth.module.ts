import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '../../config/config.service';
import { AdminAuthController } from './controllers/admin-auth.controller';
import { MerchantAuthController } from './controllers/merchant-auth.controller';
import { CustomerAuthController } from './controllers/customer-auth.controller';
import { DriverAuthController } from './controllers/driver-auth.controller';
import { AuthService } from './services/auth.service';
import { TokenService } from './services/token.service';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { GithubStrategy } from './strategies/github.strategy';
import { User, UserSchema } from '../users/schemas/user.schema';
import { UserDevice, UserDeviceSchema } from '../users/schemas/user-device.schema';
import { UsersModule } from '../users/users.module';
import { MerchantsModule } from '../merchants/merchants.module';
import { EmailService } from '../../common/services/email.service';
import { RefreshSessionService } from './services/refresh-session-service';
import { CloudinaryModule } from 'src/common/services/cloudinary.module';
import { CommonModule } from 'src/common/common.module';
import { JwtAccessStrategy } from './strategies';
import { OAuthController } from './controllers/oauth.controller';
import { CustomerModule } from '../customers/customer.module';
import { DriversModule } from '../drivers/drivers.module';

@Global()
@Module({
  imports: [
    UsersModule,
    CommonModule,
    MerchantsModule,
    CustomerModule,
    CloudinaryModule,
    DriversModule,
    // DriversModule, // TEMPORARILY DISABLED
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.jwtSecret,
        signOptions: { expiresIn: configService.jwtExpirationSeconds },
      }),
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: UserDevice.name, schema: UserDeviceSchema },
    ]),
  ],
  controllers: [
    AdminAuthController,
    MerchantAuthController,
    CustomerAuthController,
    DriverAuthController,
    OAuthController
  ],
  providers: [
    AuthService,
    TokenService,
    JwtAccessStrategy,
    JwtRefreshStrategy,
    GoogleStrategy,
    GithubStrategy,
    EmailService,
    RefreshSessionService
  ],
  exports: [
    AuthService,
    TokenService,
    JwtModule,
    EmailService,
  ],
})
export class AuthModule { }
