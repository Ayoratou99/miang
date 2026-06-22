import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

export interface PublicUser {
  id: string;
  nom: string;
  username: string;
  phone: string;
  phoneVerifie: boolean;
  couleur: string;
  avatarUrl: string | null;
  kyc: string;
  stats: { sessions: number; victoires: number; gainsFcfa: number };
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Frontend-shaped profile (matches the Angular `Utilisateur` model) with live stats. */
  async publicProfile(userId: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }
    const [sessions, wins] = await this.prisma.$transaction([
      this.prisma.stake.findMany({
        where: { userId },
        select: { sessionId: true },
        distinct: ['sessionId'],
      }),
      this.prisma.drawResult.findMany({ where: { winnerId: userId }, select: { montant: true } }),
    ]);
    return {
      id: user.id,
      nom: user.nom,
      username: user.username,
      phone: user.phone,
      phoneVerifie: user.phoneVerifie,
      couleur: user.couleur,
      avatarUrl: user.avatarUrl,
      kyc: user.kyc,
      stats: {
        sessions: sessions.length,
        victoires: wins.length,
        gainsFcfa: wins.reduce((n, w) => n + w.montant, 0),
      },
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<PublicUser> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.nom !== undefined ? { nom: dto.nom } : {}),
        ...(dto.couleur !== undefined ? { couleur: dto.couleur } : {}),
        ...(dto.avatarUrl !== undefined ? { avatarUrl: dto.avatarUrl } : {}),
      },
    });
    return this.publicProfile(userId);
  }
}
