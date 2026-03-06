import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { UsersModule } from './modules/users/users.module';
import { MerchantsModule } from './modules/merchants/merchants.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PromotionsModule } from './modules/promotions/promotions.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { CommonModule } from './common/common.module';
import { ApiStandardModule } from './common/modules/api-standard.module';
import { KafkaModule } from './common/kafka/kafka.module';
import { SessionMiddleware, RateLimitMiddleware } from './middleware';
import { GeoModule } from './modules/geo/geo.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { FeedModule } from './modules/feed/feed.module';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-ioredis-yet';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { BenefitsModule } from './modules/benefits/benefits.module';
import { CartModule } from './modules/carts/cart.module';

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => {
        const store = await redisStore({
          host: process.env.REDIS_HOST ?? 'localhost',
          port: Number(process.env.REDIS_PORT ?? 6379),
          password: process.env.REDIS_PASSWORD || undefined,
          // ttl mặc định tính bằng GIÂY
          ttl: 300,
        });

        return { store };
      },
    }),
    ConfigModule,
    CommonModule,
    ApiStandardModule,
    KafkaModule,
    DatabaseModule,
    AuthModule,
    AdminModule,
    UsersModule,
    MerchantsModule,
    OrdersModule,
    PaymentsModule,
    PromotionsModule,
    GeoModule,
    NotificationsModule,
    DriversModule,
    FeedModule,
    ReviewsModule,
    FavoritesModule,
    CartModule,
    BenefitsModule,
    ReviewsModule,
  ],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply middleware to all routes
    consumer
      .apply(SessionMiddleware)
      .forRoutes('*');

    // Rate limiting - apply to all API routes
    consumer
      .apply(RateLimitMiddleware)
      .forRoutes('*');
  }
}
