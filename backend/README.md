# MIANG — API (backend)

Monolithe modulaire **NestJS 11** (TypeScript) : auth, portefeuille, paiements
Mobile Money, sessions de mise, **tirage de minuit provably-fair**, chat temps réel
(Socket.IO), amis, présence, notifications (Web Push), modération, admin.

**PostgreSQL + Prisma** (transactions ACID, ledger append-only) · **Redis** (cache,
adapter Socket.IO, files BullMQ, OTP, présence) · **BullMQ** (job de minuit).

> Stack résolue : NestJS 11.1 · Prisma 6 (stable avec NestJS) · BullMQ 5 · Socket.IO 4.

## Prérequis

- Node ≥ 20 (testé sur 24.11).
- Docker (pour Postgres + Redis).

## Démarrer (dev)

```bash
cp .env.example .env                          # secrets de dev
docker compose -f docker-compose.dev.yml up -d   # Postgres + Redis
npm install
npx prisma migrate dev --name init            # crée + applique le schéma
npm run seed                                  # rôles + permissions RBAC
npm run start:dev                             # API → http://localhost:3000/api
npm run start:worker:dev                      # worker BullMQ (tirage de minuit)
```

`GET /health` (hors préfixe `/api`, pour la sonde du conteneur) ; tout le reste
sous `/api`. OTP en dev : `OTP_PROVIDER=console` imprime le code dans les logs.

## Pile complète en Docker

```bash
docker compose up -d --build       # api + worker + postgres + redis (+ migrate)
docker compose --profile tools up -d adminer   # Adminer sur :8080
```

## Architecture (modules)

```
src/
  config/            validation d'env (class-validator) + factory de config
  prisma/            PrismaModule global + PrismaService
  redis/             client ioredis partagé (+ options BullMQ/adapter)
  common/            guards (JWT, permissions), decorators (@Public,@CurrentUser,
                     @RequirePermission), filtre d'exceptions, constantes
  auth/              register · verify-otp · login · refresh (rotation) · logout
  users/             profil + stats, KYC
  security/          RBAC : permissions/rôles, garde @RequirePermission
  wallet/            ledger append-only, soldes — JAMAIS piloté par le client
  payments/          dépôt/retrait Mobile Money, webhooks IDEMPOTENTS, KYC au retrait
  sessions/          créer/rejoindre/lister, mise (débit atomique du wallet)
  draw/              tirage provably-fair, payout atomique (+ worker BullMQ minuit)
  chat/              REST historique + gateway Socket.IO (rooms, fan-out Redis)
  friends/ presence/ notifications/ moderation/ admin/
  main.ts            API · worker.ts  BullMQ (dist/worker.js)
```

## Règles d'or (implémentées)

- **Argent** : chaque mouvement de solde est une écriture **signée** du ledger dans
  la **même transaction PostgreSQL** que la mise à jour du wallet (atomique,
  append-only). Le solde n'est jamais calculé côté client.
- **Webhooks Mobile Money idempotents** : clé `idempotencyKey` unique ; un callback
  rejoué sur un paiement déjà réglé est un no-op (pas de double crédit).
- **Tirage** : 100 % serveur, **provably-fair** — `serverSeedHash = sha256(serverSeed)`
  est publié à la création (engagement) ; à minuit le worker tire le gagnant
  (pondéré par la mise), **paie atomiquement**, puis révèle `serverSeed`. Diffusé en
  temps réel via Redis → gateway (`draw:winner`).
- **KYC** : retrait refusé tant que `kyc !== verifie` (réservé aux 18 ans et +).
- **Authn ≠ Authz** : `auth` émet les JWT ; `security` décide des droits (RBAC).
- **Temps réel** : Socket.IO (handshake JWT, adapter Redis multi-instance) au premier
  plan ; Web Push (VAPID) en arrière-plan ; résultat du tirage = push systématique.

## Surface API (extrait)

| Méthode | Route | Rôle |
|---|---|---|
| POST | `/api/auth/register` · `/verify-otp` · `/login` · `/refresh` · `/logout` | auth |
| GET/PATCH | `/api/users/me` | profil |
| GET | `/api/wallet` · `/api/wallet/transactions` | solde + historique |
| POST | `/api/payments/deposit` · `/withdraw` · `/webhook` | Mobile Money |
| GET/POST | `/api/sessions` · `/api/sessions/:id` · `/:id/stake` | sessions + mise |
| GET/POST | `/api/draw/:sessionId` · `/:sessionId/run` | tirage |
| GET/POST | `/api/chat/conversations…` | messagerie |
| GET/POST | `/api/friends…` · `/api/notifications…` · `/api/presence` | social |
| * | `/api/moderation…` · `/api/admin…` | modération / back-office |

## Vérifié

Parcours de bout en bout passé sur la pile réelle (Postgres + Redis) : register →
OTP → dépôt 50 000 F (webhook idempotent) → création de session → mise 5 000 F (débit
atomique) → tirage provably-fair → payout atomique → ledger `depot/mise/gain`
cohérent, `GET /api/wallet` exact, route protégée → 401 sans token.

## Cadrage légal

Jeu d'argent au Gabon = monopole GDJ. Réservé aux **18 ans et +**, **KYC** avant tout
retrait. Voir `docs/ARCHITECTURE.md` du dossier de conception pour le détail.
