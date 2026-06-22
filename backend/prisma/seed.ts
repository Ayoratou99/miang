import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Permission → roles that hold it.
const MATRIX: Record<string, string[]> = {
  'session:create': ['player', 'admin', 'superadmin'],
  'session:lock': ['moderator', 'admin', 'superadmin'],
  'wallet:withdraw': ['player', 'admin', 'superadmin'],
  'payout:approve': ['finance', 'admin', 'superadmin'],
  'user:ban': ['moderator', 'admin', 'superadmin'],
  'report:review': ['moderator', 'admin', 'superadmin'],
  'admin:access': ['admin', 'superadmin'],
};

const ROLE_LABELS: Record<string, string> = {
  player: 'Joueur',
  moderator: 'Modérateur',
  finance: 'Finance',
  admin: 'Administrateur',
  superadmin: 'Super administrateur',
};

async function main() {
  const roleCodes = Object.keys(ROLE_LABELS);
  const permCodes = Object.keys(MATRIX);

  for (const code of permCodes) {
    await prisma.permission.upsert({ where: { code }, create: { code }, update: {} });
  }
  for (const code of roleCodes) {
    await prisma.role.upsert({
      where: { code },
      create: { code, libelle: ROLE_LABELS[code]! },
      update: { libelle: ROLE_LABELS[code]! },
    });
  }

  const roles = await prisma.role.findMany();
  const perms = await prisma.permission.findMany();
  const roleId = (code: string) => roles.find((r) => r.code === code)!.id;
  const permId = (code: string) => perms.find((p) => p.code === code)!.id;

  for (const [perm, grantedTo] of Object.entries(MATRIX)) {
    for (const role of grantedTo) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: roleId(role), permissionId: permId(perm) } },
        create: { roleId: roleId(role), permissionId: permId(perm) },
        update: {},
      });
    }
  }

  // ── Default demo user (matches the frontend persona @kevin_mba) ──
  const username = 'kevin_mba';
  const phone = '+24106000041';
  const motDePasse = await bcrypt.hash('miang1234', 10);
  const user = await prisma.user.upsert({
    where: { username },
    create: {
      nom: 'Kevin Mba',
      username,
      phone,
      motDePasse,
      phoneVerifie: true,
      kyc: 'verifie',
      couleur: 'forest',
    },
    update: { phone, motDePasse, phoneVerifie: true, kyc: 'verifie' },
  });

  await prisma.wallet.upsert({
    where: { userId: user.id },
    create: { userId: user.id, soldeFcfa: 12_500 },
    update: {},
  });
  const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
  if (wallet && wallet.soldeFcfa > 0) {
    const entries = await prisma.ledgerEntry.count({ where: { walletId: wallet.id } });
    if (entries === 0) {
      await prisma.ledgerEntry.create({
        data: {
          walletId: wallet.id,
          type: 'depot',
          montant: wallet.soldeFcfa,
          soldeApres: wallet.soldeFcfa,
          ref: 'Crédit de bienvenue',
        },
      });
    }
  }

  // The demo account holds `player` + `superadmin` so it can test everything.
  for (const code of ['player', 'superadmin']) {
    const role = roles.find((r) => r.code === code);
    if (role) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: role.id } },
        create: { userId: user.id, roleId: role.id },
        update: {},
      });
    }
  }

  console.log(`Seed RBAC: ${permCodes.length} permissions, ${roleCodes.length} rôles.`);
  console.log(`Seed user: @${username} / +241… (mot de passe « miang1234 »), solde 12 500 F.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
