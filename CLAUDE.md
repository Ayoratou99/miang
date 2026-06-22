# MIANG — Mémoire projet (Claude Code)

> Constitution du projet. Lue au début de chaque session. Garder concis.

## Produit

MIANG (« argent » en fang, Gabon) est une **PWA de jeu d'argent social**.
Slogan : « Et si tu devenais millionaire… comme la blague ».

Concept : un joueur rejoint ou crée une **session de mise** (titre + mise
minimale). Chacun mise dans une cagnotte commune. À **minuit pile**, un tirage
aléatoire désigne **un seul gagnant** qui rafle toute la cagnotte.

Devise : **FCFA (XAF)**, stockée en **entiers** (pas de décimales).

## État du dépôt

- **`frontend/`** — **implémenté** : PWA **Angular 22** (standalone, zoneless,
  signals), selon le patron du frontend Okoumé. Écrans des maquettes : landing /
  auth (OTP WhatsApp), accueil/sessions, détail + mise, tirage de minuit animé,
  portefeuille, messagerie + chat, profil, amis, info, onboarding (mascotte
  Miango). Tourne sur une **couche mock en mémoire** (drapeau `USE_MOCK` dans
  `frontend/src/app/core/api.ts`) en attendant le backend. Voir `frontend/README.md`.
- **`backend/`** — **implémenté** : monolithe modulaire **NestJS 11** (Prisma 6 +
  PostgreSQL, Redis, BullMQ, Socket.IO). Modules : auth, users, security (RBAC),
  wallet, payments, sessions, draw, chat, friends, presence, notifications,
  moderation, admin. Règles d'or appliquées (argent atomique + ledger append-only,
  webhooks idempotents, tirage provably-fair côté serveur, KYC au retrait).
  Parcours bout-en-bout vérifié sur Postgres + Redis. Voir `backend/README.md`.

### Lancer le frontend

Angular 22 exige **Node ≥ 24.15.0** (ou 22.22.3, ou ≥ 26) — sinon la CLI refuse de
démarrer. Sous Node trop ancien, utiliser un Node portable et l'ajouter au PATH.

```
cd frontend && npm install && npm start   # http://localhost:4200
npm run build                             # → dist/miang-frontend/browser
```

### Lancer le backend (Node ≥ 20 ; system Node suffit)

```
cd backend && cp .env.example .env
docker compose -f docker-compose.dev.yml up -d   # Postgres + Redis
npm install && npx prisma migrate dev && npm run seed
npm run start:dev            # API  → http://localhost:3000/api  (/health hors /api)
npm run start:worker:dev     # worker BullMQ (tirage de minuit)
```

## Règles produit non négociables

- Jeu d'argent au Gabon = monopole de la Gabonaise Des Jeux (GDJ). Cible :
  licence/partenariat GDJ, OU version « sociale » (jetons gratuits, gains non
  monétaires) tant que la licence n'est pas obtenue.
- Réservé aux **18 ans et +**. **KYC** (âge + identité) obligatoire avant le
  premier retrait — la vérification du téléphone ne suffit pas.
- Le bloc « jeu responsable » doit rester présent et visible.

## Stack visée (cible complète)

- Node 20+ + TypeScript, **NestJS** (monolithe modulaire) côté serveur.
- **PostgreSQL** + **Prisma** (données, transactions ACID).
- **Redis** (cache, adapter pub/sub Socket.IO, files BullMQ, OTP, présence).
- **Socket.IO** (temps réel), **BullMQ** (jobs), **S3/R2** (photos de profil).
- Mobile Money via agrégateur (Airtel Money, Moov Money). OTP via WhatsApp/SMS.
- **PWA Angular** côté client (ce dépôt, `frontend/`).

## Architecture backend — résumé (détails: docs/ARCHITECTURE.md du dossier)

Chaque module suit une structure **hexagonale** : `domain/` (entities, ports,
events, errors — zéro dépendance technique), `application/` (use-cases, dto),
`infrastructure/` (repositories, clients, acl — adapters sortants), `interface/`
(http, ws, jobs — adapters entrants), `<module>.module.ts` (câblage).

La dépendance pointe **toujours vers le domaine**. Modules : `auth` `users`
`security`(RBAC) `wallet` `payments` `sessions` `draw` `chat` `friends`
`presence` `notifications` `moderation` `admin`.

## Règles d'ingénierie (IMPORTANT)

- **Argent** : toute modification de solde se fait dans une **transaction
  PostgreSQL atomique**. Le ledger est **append-only**. Jamais de calcul de solde
  côté client (le front mock est une commodité de démo, pas la source de vérité).
- **Webhooks Mobile Money idempotents** : une clé unique par paiement.
- **Tirage** : 100 % côté serveur, **provably-fair** (hash de la graine scellé
  avant minuit, graine révélée après), payout atomique. Le front ne joue que le
  suspense visuel.
- **Frontières des modules** : ne jamais importer l'entité d'un autre module ;
  référencer par `id` et passer par l'`acl`.
- **Temps réel vs push** : au premier plan, tout passe par Socket.IO. Le Web Push
  ne sert qu'en arrière-plan/app fermée. Le résultat du tirage = push systématique.
- **Authn ≠ Authz** : `auth` émet les tokens ; `security` décide des droits (RBAC
  `ressource:action`).

## Conventions frontend

- Composants **standalone**, `ChangeDetectionStrategy.OnPush`, **zoneless** — l'état
  passe par des **signals** ; pas de zone.js.
- Préfixe de sélecteur `miang-`. Styles SCSS, jeton de design dans `styles.scss`
  (charte : Encre Forêt, Vert Forêt, Émeraude, Or Jackpot, Crème, Corail).
- Titres = Bricolage Grotesque (800) ; UI = Plus Jakarta Sans ; icônes = Tabler.
- Montants via la pipe `fcfa` (entiers, suffixe « F »).
- Services de données dans `core/data/*` : mêmes signatures en mock et en HTTP
  (basculer `USE_MOCK`).
