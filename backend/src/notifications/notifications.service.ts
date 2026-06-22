import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import * as webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';
import { SubscribePushDto } from './dto/subscribe-push.dto';

export interface NotifyPayload {
  type: string;
  titre: string;
  corps: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger('Notifications');
  private readonly pushEnabled: boolean;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    const pub = config.get<string>('vapid.publicKey');
    const priv = config.get<string>('vapid.privateKey');
    const subject = config.get<string>('vapid.subject') ?? 'mailto:ops@miang.ga';
    this.pushEnabled = !!pub && !!priv;
    if (this.pushEnabled) {
      webpush.setVapidDetails(subject, pub!, priv!);
    }
  }

  async subscribe(userId: string, dto: SubscribePushDto): Promise<{ ok: true }> {
    await this.prisma.pushSubscription.upsert({
      where: { endpoint: dto.endpoint },
      create: {
        userId,
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        appareil: dto.appareil,
      },
      update: { userId, p256dh: dto.keys.p256dh, auth: dto.keys.auth },
    });
    return { ok: true };
  }

  list(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async unreadCount(userId: string): Promise<{ unread: number }> {
    const unread = await this.prisma.notification.count({ where: { userId, lu: false } });
    return { unread };
  }

  async markRead(userId: string, id: string): Promise<{ ok: true }> {
    await this.prisma.notification.updateMany({ where: { id, userId }, data: { lu: true } });
    return { ok: true };
  }

  /** Persist an in-app notification and (best-effort) send Web Push to all devices. */
  async notify(userId: string, payload: NotifyPayload): Promise<void> {
    await this.prisma.notification.create({
      data: {
        userId,
        type: payload.type,
        titre: payload.titre,
        corps: payload.corps,
        data: payload.data ? (payload.data as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });
    if (!this.pushEnabled) {
      return;
    }
    const subs = await this.prisma.pushSubscription.findMany({ where: { userId } });
    const body = JSON.stringify({
      title: payload.titre,
      body: payload.corps,
      url: payload.url ?? '/',
      tag: payload.tag,
    });
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            body,
          );
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            await this.prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => undefined);
          } else {
            this.logger.warn(`Push échoué pour ${s.endpoint}`);
          }
        }
      }),
    );
  }
}
