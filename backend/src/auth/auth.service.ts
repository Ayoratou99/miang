import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash, randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SecurityService } from '../security/security.service';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { OTP_SENDER, OtpSender } from './otp/otp-sender';

const BCRYPT_ROUNDS = 10;
const OTP_TTL_MIN = 10;
const MAX_OTP_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly users: UsersService,
    private readonly security: SecurityService,
    @Inject(OTP_SENDER) private readonly otpSender: OtpSender,
  ) {}

  async register(dto: RegisterDto): Promise<{ message: string; phone: string }> {
    const phone = this.normalizePhone(dto.phone);
    const username = dto.username.replace(/^@/, '').toLowerCase();

    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ phone }, { username }] },
    });
    if (existing && existing.phoneVerifie) {
      throw new ConflictException('Un compte existe déjà avec ce numéro ou ce nom.');
    }

    const motDePasse = await bcrypt.hash(dto.motDePasse, BCRYPT_ROUNDS);
    const user = existing
      ? await this.prisma.user.update({
          where: { id: existing.id },
          data: { nom: dto.nom, username, phone, motDePasse },
        })
      : await this.prisma.user.create({ data: { nom: dto.nom, username, phone, motDePasse } });

    await this.prisma.wallet.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {},
    });
    await this.security.ensureDefaultRole(user.id);
    await this.issueOtp(user.id, phone);

    return { message: 'Code de vérification envoyé par WhatsApp', phone };
  }

  async verifyOtp(rawPhone: string, code: string) {
    const phone = this.normalizePhone(rawPhone);
    const otp = await this.prisma.otpRequest.findFirst({
      where: { phone, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp || !otp.userId) {
      throw new BadRequestException('Code expiré ou introuvable. Renvoie un nouveau code.');
    }
    if (otp.attempts >= MAX_OTP_ATTEMPTS) {
      throw new BadRequestException('Trop de tentatives. Renvoie un nouveau code.');
    }
    if (!(await bcrypt.compare(code, otp.codeHash))) {
      await this.prisma.otpRequest.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Code incorrect.');
    }
    await this.prisma.otpRequest.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
    const user = await this.prisma.user.update({
      where: { id: otp.userId },
      data: { phoneVerifie: true },
    });
    return this.issueTokens(user);
  }

  async resendOtp(rawPhone: string): Promise<{ message: string }> {
    const phone = this.normalizePhone(rawPhone);
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (user) {
      await this.issueOtp(user.id, phone);
    }
    // Always 200 to avoid leaking which numbers exist.
    return { message: 'Si le numéro existe, un code a été renvoyé.' };
  }

  async login(identifiant: string, motDePasse: string) {
    const username = identifiant.trim().replace(/^@/, '').toLowerCase();
    const phone = this.normalizePhone(identifiant);
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ username }, { phone }] },
    });
    if (!user || !(await bcrypt.compare(motDePasse, user.motDePasse))) {
      throw new UnauthorizedException('Identifiants invalides');
    }
    if (!user.phoneVerifie) {
      throw new ForbiddenException({ message: 'Numéro non vérifié', code: 'PHONE_NON_VERIFIE' });
    }
    return this.issueTokens(user);
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.getOrThrow<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token invalide');
    }
    const stored = await this.prisma.refreshToken.findFirst({
      where: {
        userId: payload.sub,
        tokenHash: this.hashToken(refreshToken),
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (!stored) {
      throw new UnauthorizedException('Session expirée, reconnecte-toi');
    }
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException();
    }
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    return this.issueTokens(user);
  }

  async logout(refreshToken: string): Promise<{ message: string }> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { message: 'Déconnecté' };
  }

  // ── helpers ──────────────────────────────────────────────────────
  private async issueOtp(userId: string, phone: string): Promise<void> {
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const codeHash = await bcrypt.hash(code, BCRYPT_ROUNDS);
    await this.prisma.otpRequest.create({
      data: { userId, phone, codeHash, expiresAt: new Date(Date.now() + OTP_TTL_MIN * 60_000) },
    });
    await this.otpSender.send(phone, code);
  }

  private async issueTokens(user: User) {
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, username: user.username, phone: user.phone },
      {
        secret: this.config.getOrThrow<string>('jwt.accessSecret'),
        // jsonwebtoken types over-narrow expiresIn; "15m" is valid at runtime.
        expiresIn: this.config.getOrThrow<string>('jwt.accessExpiresIn') as unknown as number,
      },
    );
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id },
      {
        secret: this.config.getOrThrow<string>('jwt.refreshSecret'),
        expiresIn: this.config.getOrThrow<string>('jwt.refreshExpiresIn') as unknown as number,
      },
    );
    const decoded = this.jwt.decode(refreshToken) as { exp: number };
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(decoded.exp * 1000),
      },
    });
    const utilisateur = await this.users.publicProfile(user.id);
    return { accessToken, refreshToken, utilisateur };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private normalizePhone(input: string): string {
    const p = input.replace(/[^\d+]/g, '');
    if (p.startsWith('+')) return p;
    if (p.startsWith('241')) return `+${p}`;
    if (p.startsWith('0')) return `+241${p.slice(1)}`;
    return `+241${p}`;
  }
}
