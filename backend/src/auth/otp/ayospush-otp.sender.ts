import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpSender } from './otp-sender';

/**
 * Sends the OTP as a WhatsApp **template** through AyosPush (same integration as
 * Okoumé). Flow: login (api_key/api_secret → cached Bearer token), then POST a
 * multipart `messages/template` with `variables: {"1": <code>}`.
 */
@Injectable()
export class AyosPushOtpSender implements OtpSender {
  private readonly logger = new Logger('OTP:AyosPush');
  private token: string | null = null;
  private tokenExpiry = 0;

  constructor(private readonly config: ConfigService) {}

  async send(phone: string, code: string): Promise<void> {
    const apiUrl = this.config.getOrThrow<string>('ayospush.apiUrl');
    const phoneNumberId = this.config.getOrThrow<string>('ayospush.phoneNumberId');
    const templateName = this.config.getOrThrow<string>('ayospush.templateName');
    const token = await this.authToken();

    // multipart/form-data; recipient in plain digits (no leading '+').
    const form = new FormData();
    form.append('phone_number_id', phoneNumberId);
    form.append('recipient_number', phone.replace(/^\+/, ''));
    form.append('template_name', templateName);
    form.append('variables', JSON.stringify({ '1': code }));

    // Do NOT set Content-Type — fetch adds the multipart boundary itself.
    const response = await fetch(`${apiUrl}/messages/template`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, accept: 'application/json' },
      body: form,
    });

    // AyosPush can answer 200 with { success: false } on a logical failure.
    const raw = await response.text();
    let ok = response.ok;
    if (ok) {
      try {
        if ((JSON.parse(raw) as { success?: boolean }).success === false) {
          ok = false;
        }
      } catch {
        /* non-JSON 2xx body → assume delivered */
      }
    }
    if (!ok) {
      this.logger.error(`Envoi AyosPush échoué (${response.status}): ${raw}`);
      throw new ServiceUnavailableException("Impossible d'envoyer le code de vérification");
    }
  }

  private async authToken(): Promise<string> {
    if (this.token && Date.now() < this.tokenExpiry) {
      return this.token;
    }
    const apiUrl = this.config.getOrThrow<string>('ayospush.apiUrl');
    const apiKey = this.config.getOrThrow<string>('ayospush.apiKey');
    const apiSecret = this.config.getOrThrow<string>('ayospush.apiSecret');

    const response = await fetch(`${apiUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey, api_secret: apiSecret }),
    });
    if (!response.ok) {
      const detail = await response.text();
      this.logger.error(`Auth AyosPush échouée (${response.status}): ${detail}`);
      throw new ServiceUnavailableException('Service de vérification indisponible');
    }
    const body = (await response.json()) as {
      token?: string;
      access_token?: string;
      jwt?: string;
      data?: { token?: string; access_token?: string; expires_in_seconds?: number };
    };
    const token =
      body.data?.token ?? body.data?.access_token ?? body.token ?? body.access_token ?? body.jwt;
    if (!token) {
      throw new ServiceUnavailableException('Service de vérification indisponible');
    }
    const ttlMs = (body.data?.expires_in_seconds ?? 3600) * 1000;
    this.token = token;
    this.tokenExpiry = Date.now() + Math.max(ttlMs - 5 * 60 * 1000, 60 * 1000);
    return token;
  }
}
