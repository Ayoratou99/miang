import { Injectable } from '@nestjs/common';
import { presenceKey } from '../common/constants';
import { RedisService } from '../redis/redis.service';

/** Realtime-presence read model, backed by Redis connection counters. */
@Injectable()
export class PresenceService {
  constructor(private readonly redis: RedisService) {}

  async isOnline(userId: string): Promise<boolean> {
    const n = Number((await this.redis.get(presenceKey(userId))) ?? '0');
    return n > 0;
  }

  async whoIsOnline(ids: string[]): Promise<Record<string, boolean>> {
    const out: Record<string, boolean> = {};
    await Promise.all(ids.map(async (id) => (out[id] = await this.isOnline(id))));
    return out;
  }
}
