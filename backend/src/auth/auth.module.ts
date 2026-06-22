import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AyosPushOtpSender } from './otp/ayospush-otp.sender';
import { ConsoleOtpSender, OTP_SENDER, OtpSender } from './otp/otp-sender';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [PassportModule, JwtModule.register({}), UsersModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    {
      provide: OTP_SENDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): OtpSender =>
        config.get<string>('otp.provider') === 'ayospush'
          ? new AyosPushOtpSender(config)
          : new ConsoleOtpSender(),
    },
  ],
})
export class AuthModule {}
