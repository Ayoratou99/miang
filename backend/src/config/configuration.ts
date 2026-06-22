function int(v: string | undefined, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const configuration = () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  api: {
    port: int(process.env.API_PORT, 3000),
    corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:4200',
  },
  redis: {
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET as string,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET as string,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  otp: {
    provider: (process.env.OTP_PROVIDER ?? 'console') as 'console' | 'whatsapp' | 'ayospush',
    whatsappApiKey: process.env.WHATSAPP_API_KEY ?? '',
  },
  ayospush: {
    apiUrl: process.env.AYOSPUSH_API_URL ?? 'https://ayospush.com/api/v1',
    apiKey: process.env.AYOSPUSH_API_KEY ?? '',
    apiSecret: process.env.AYOSPUSH_API_SECRET ?? '',
    phoneNumberId: process.env.AYOSPUSH_PHONE_NUMBER_ID ?? '',
    templateName: process.env.AYOSPUSH_TEMPLATE_NAME ?? 'otp_verification',
  },
  mobileMoney: {
    provider: (process.env.MOBILE_MONEY_PROVIDER ?? 'stub') as
      | 'stub'
      | 'airtel'
      | 'moov'
      | 'aggregator',
    apiKey: process.env.MOBILE_MONEY_API_KEY ?? '',
    webhookSecret: process.env.PAYMENTS_WEBHOOK_SECRET ?? 'dev_webhook_secret',
  },
  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY ?? '',
    privateKey: process.env.VAPID_PRIVATE_KEY ?? '',
    subject: process.env.VAPID_SUBJECT ?? 'mailto:ops@miang.ga',
  },
  draw: {
    cron: process.env.DRAW_CRON ?? '0 0 * * *',
  },
});

export type AppConfig = ReturnType<typeof configuration>;
