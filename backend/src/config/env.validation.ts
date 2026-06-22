import { Type, plainToInstance } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min, validateSync } from 'class-validator';

enum NodeEnv {
  development = 'development',
  production = 'production',
  test = 'test',
}

enum OtpProvider {
  console = 'console',
  whatsapp = 'whatsapp',
  ayospush = 'ayospush',
}

enum MobileMoneyProvider {
  stub = 'stub',
  airtel = 'airtel',
  moov = 'moov',
  aggregator = 'aggregator',
}

class EnvironmentVariables {
  @IsEnum(NodeEnv)
  @IsOptional()
  NODE_ENV: NodeEnv = NodeEnv.development;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  API_PORT = 3000;

  @IsString()
  @IsOptional()
  CORS_ORIGIN = 'http://localhost:4200';

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @IsOptional()
  REDIS_URL = 'redis://localhost:6379';

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @IsOptional()
  JWT_ACCESS_EXPIRES_IN = '15m';

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_SECRET!: string;

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRES_IN = '7d';

  @IsEnum(OtpProvider)
  @IsOptional()
  OTP_PROVIDER: OtpProvider = OtpProvider.console;

  @IsString()
  @IsOptional()
  WHATSAPP_API_KEY = '';

  // AyosPush (OTP_PROVIDER=ayospush) — WhatsApp template messaging.
  @IsString()
  @IsOptional()
  AYOSPUSH_API_URL = 'https://ayospush.com/api/v1';

  @IsString()
  @IsOptional()
  AYOSPUSH_API_KEY = '';

  @IsString()
  @IsOptional()
  AYOSPUSH_API_SECRET = '';

  @IsString()
  @IsOptional()
  AYOSPUSH_PHONE_NUMBER_ID = '';

  @IsString()
  @IsOptional()
  AYOSPUSH_TEMPLATE_NAME = 'otp_verification';

  @IsEnum(MobileMoneyProvider)
  @IsOptional()
  MOBILE_MONEY_PROVIDER: MobileMoneyProvider = MobileMoneyProvider.stub;

  @IsString()
  @IsOptional()
  MOBILE_MONEY_API_KEY = '';

  @IsString()
  @IsOptional()
  PAYMENTS_WEBHOOK_SECRET = 'dev_webhook_secret';

  @IsString()
  @IsOptional()
  VAPID_PUBLIC_KEY = '';

  @IsString()
  @IsOptional()
  VAPID_PRIVATE_KEY = '';

  @IsString()
  @IsOptional()
  VAPID_SUBJECT = 'mailto:ops@miang.ga';

  @IsString()
  @IsOptional()
  DRAW_CRON = '0 0 * * *';
}

export function validate(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration:\n${errors.toString()}`);
  }
  return validated;
}
