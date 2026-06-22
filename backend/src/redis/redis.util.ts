import { RedisOptions } from 'ioredis';

/** Parse a redis:// URL into ioredis options. BullMQ requires maxRetriesPerRequest=null. */
export function redisOptionsFromUrl(url: string, forBullmq = false): RedisOptions {
  const u = new URL(url);
  const opts: RedisOptions = {
    host: u.hostname || 'localhost',
    port: u.port ? Number(u.port) : 6379,
  };
  if (u.password) {
    opts.password = decodeURIComponent(u.password);
  }
  if (u.username) {
    opts.username = decodeURIComponent(u.username);
  }
  const db = u.pathname.replace(/^\//, '');
  if (db) {
    opts.db = Number(db);
  }
  if (forBullmq) {
    opts.maxRetriesPerRequest = null;
  }
  return opts;
}
