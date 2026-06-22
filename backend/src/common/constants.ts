/** BullMQ queues & jobs. */
export const QUEUE_DRAW = 'draw';
export const JOB_RUN_DRAW = 'run-draw';
export const JOB_SWEEP_DRAWS = 'sweep-draws';

/** Redis pub/sub channel for socket fan-out (works API↔worker, multi-instance).
 *  Payload: { room, event, data }. The chat gateway subscribes and re-emits. */
export const CHANNEL_SOCKET = 'miang:socket';

export const roomSession = (sessionId: string) => `session:${sessionId}`;
export const roomUser = (userId: string) => `user:${userId}`;

/** Presence keys. */
export const presenceKey = (userId: string) => `presence:count:${userId}`;
export const PRESENCE_GRACE_MS = 10_000;

/** RBAC permission codes. */
export const PERMISSIONS = {
  SESSION_CREATE: 'session:create',
  SESSION_LOCK: 'session:lock',
  WALLET_WITHDRAW: 'wallet:withdraw',
  PAYOUT_APPROVE: 'payout:approve',
  USER_BAN: 'user:ban',
  REPORT_REVIEW: 'report:review',
  ADMIN_ACCESS: 'admin:access',
} as const;

/** Roles. */
export const ROLES = {
  PLAYER: 'player',
  MODERATOR: 'moderator',
  FINANCE: 'finance',
  ADMIN: 'admin',
  SUPERADMIN: 'superadmin',
} as const;
