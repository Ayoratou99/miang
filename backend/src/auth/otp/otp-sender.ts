import { Injectable, Logger } from '@nestjs/common';

export const OTP_SENDER = 'OTP_SENDER';

export interface OtpSender {
  send(phone: string, code: string): Promise<void>;
}

/** Dev sender: prints the OTP to the logs. Swap for a WhatsApp/SMS impl in prod. */
@Injectable()
export class ConsoleOtpSender implements OtpSender {
  private readonly logger = new Logger('OTP');

  async send(phone: string, code: string): Promise<void> {
    this.logger.log(`Code WhatsApp pour ${phone} : ${code}`);
  }
}
