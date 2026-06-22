import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { configuration } from './config/configuration';
import { validate } from './config/env.validation';
import { ChatModule } from './chat/chat.module';
import { DrawModule } from './draw/draw.module';
import { FriendsModule } from './friends/friends.module';
import { HealthModule } from './health/health.module';
import { ModerationModule } from './moderation/moderation.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PaymentsModule } from './payments/payments.module';
import { PrismaModule } from './prisma/prisma.module';
import { PresenceModule } from './presence/presence.module';
import { RedisModule } from './redis/redis.module';
import { redisOptionsFromUrl } from './redis/redis.util';
import { SecurityModule } from './security/security.module';
import { SessionsModule } from './sessions/sessions.module';
import { UsersModule } from './users/users.module';
import { WalletModule } from './wallet/wallet.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration], validate, cache: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: redisOptionsFromUrl(config.getOrThrow<string>('redis.url'), true),
      }),
    }),
    // Platform (global)
    PrismaModule,
    RedisModule,
    PresenceModule,
    SecurityModule,
    // Features
    AuthModule,
    UsersModule,
    WalletModule,
    PaymentsModule,
    SessionsModule,
    DrawModule,
    ChatModule,
    FriendsModule,
    NotificationsModule,
    ModerationModule,
    AdminModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
