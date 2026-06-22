import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Public()
  @Get()
  async check() {
    let database = 'down';
    let redis = 'down';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      database = 'up';
    } catch {
      database = 'down';
    }
    try {
      await this.redis.client.ping();
      redis = 'up';
    } catch {
      redis = 'down';
    }
    return { status: database === 'up' && redis === 'up' ? 'ok' : 'degraded', database, redis };
  }
}
