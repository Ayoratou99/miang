import { Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { createAdapter } from '@socket.io/redis-adapter';
import { Server, Socket } from 'socket.io';
import { CHANNEL_SOCKET, presenceKey, roomSession, roomUser } from '../common/constants';
import { RedisService } from '../redis/redis.service';
import { ChatService } from './chat.service';

/**
 * Realtime layer. JWT-authenticated handshake. Rooms: user:{id} (DM/notifs) and
 * session:{id} (collective chat + live session events). The Redis adapter spreads
 * sockets across instances; a Redis subscription on CHANNEL_SOCKET fans out events
 * published from anywhere (API or the BullMQ worker → e.g. draw:winner).
 */
@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  private readonly logger = new Logger('ChatGateway');
  @WebSocketServer() server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly chat: ChatService,
    private readonly redis: RedisService,
  ) {}

  onModuleInit(): void {
    // no-op; afterInit wires the server
  }

  afterInit(server: Server): void {
    const pubClient = this.redis.duplicate();
    const subClient = this.redis.duplicate();
    server.adapter(createAdapter(pubClient, subClient));

    const fanout = this.redis.duplicate();
    void fanout.subscribe(CHANNEL_SOCKET);
    fanout.on('message', (_channel, raw) => {
      try {
        const { room, event, data } = JSON.parse(raw) as { room: string; event: string; data: unknown };
        server.to(room).emit(event, data);
      } catch {
        /* ignore malformed */
      }
    });
    this.logger.log('Gateway prêt (adapter Redis + fan-out)');
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token =
        (client.handshake.auth?.['token'] as string) ||
        (client.handshake.query?.['token'] as string);
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token, {
        secret: this.config.getOrThrow<string>('jwt.accessSecret'),
      });
      client.data.userId = payload.sub;
      await client.join(roomUser(payload.sub));
      await this.redis.incr(presenceKey(payload.sub));
    } catch {
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const userId = client.data.userId as string | undefined;
    if (userId) {
      await this.redis.decr(presenceKey(userId));
    }
  }

  @SubscribeMessage('session:join')
  onJoin(@ConnectedSocket() client: Socket, @MessageBody() sessionId: string): void {
    void client.join(roomSession(sessionId));
  }

  @SubscribeMessage('session:leave')
  onLeave(@ConnectedSocket() client: Socket, @MessageBody() sessionId: string): void {
    void client.leave(roomSession(sessionId));
  }

  @SubscribeMessage('chat:send')
  async onSend(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId: string; corps: string },
  ): Promise<void> {
    const userId = client.data.userId as string | undefined;
    if (!userId || !body?.corps?.trim()) {
      return;
    }
    await this.chat.send(body.conversationId, userId, body.corps.trim());
  }
}
