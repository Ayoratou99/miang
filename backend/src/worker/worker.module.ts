import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { configuration } from '../config/configuration';
import { validate } from '../config/env.validation';
import { DrawModule } from '../draw/draw.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { redisOptionsFromUrl } from '../redis/redis.util';
import { DrawProcessor } from './draw.processor';
import { DrawScheduler } from './draw.scheduler';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration], validate, cache: true }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: redisOptionsFromUrl(config.getOrThrow<string>('redis.url'), true),
      }),
    }),
    PrismaModule,
    RedisModule,
    DrawModule,
  ],
  providers: [DrawProcessor, DrawScheduler],
})
export class WorkerModule {}
