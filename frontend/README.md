# MIANG — PWA (frontend)

Progressive Web App de MIANG, le jeu d'argent social gabonais : on rejoint une
**session de mise** (cagnotte commune), et à **minuit pile** un tirage aléatoire
désigne un seul gagnant qui rafle tout. _« Deviens millionaire… comme la blague. »_

Construite avec **Angular 22** (composants standalone, **zoneless**, signals),
selon le même patron que le frontend d'Okoumé (`core` / `features` / `layout` /
`shared`, guards + interceptor, manifest + service worker push-only).

## Prérequis

Angular 22 exige **Node ≥ 24.15.0** (ou 22.22.3, ou ≥ 26). La CLI refuse de
démarrer sous une version inférieure. Si `node --version` est trop ancien, utilise
un Node portable :

```
# exemple (Windows) — Node portable, sans toucher au Node système
#   https://nodejs.org/dist/v24.17.0/node-v24.17.0-win-x64.zip
#   puis ajoute le dossier au PATH avant les commandes ci-dessous
```

## Démarrer

```
npm install
npm start        # ng serve --proxy-config proxy.conf.json → http://localhost:4200
```

## Construire

```
npm run build    # → dist/miang-frontend/browser
```

## Couche de données (mock)

Tant que le backend NestJS n'est pas branché, le front tourne sur une **couche
mock en mémoire** (`src/app/core/mock/seed.ts`) pour être démontrable de bout en
bout. Le drapeau `USE_MOCK` dans `src/app/core/api.ts` bascule les services vers
`HttpClient` (appels `/api`) le jour venu — les signatures des services ne changent
pas.

Conséquences en mode mock :

- **Connexion / inscription** : n'importe quel identifiant + mot de passe
  fonctionne ; le code WhatsApp (OTP) accepte **n'importe quels 6 chiffres**.
  L'authentification ouvre toujours la session du **persona de démo** (« Kevin Mba /
  @kevin_mba »), pour que les données de démo (« Vous / Moi ») restent cohérentes.
- **Argent** : solde, dépôts/retraits (Airtel/Moov), mises et gains sont gérés en
  mémoire par `WalletService` (FCFA entiers). _Le vrai backend ne calcule jamais un
  solde côté client : ledger append-only + transactions atomiques._
- **Tirage** : l'écran de minuit ne joue que le **suspense**. Le vrai tirage est
  100 % serveur et _provably-fair_ (hash de la graine scellé avant minuit).

## Structure

```
src/app/
  core/
    api.ts                  base /api, préfixe +241, drapeau USE_MOCK
    models.ts               types métier (vue front)
    auth/                   service (signals + localStorage), guards, interceptor
    data/                   sessions, wallet, draw, chat, friends (mock-backed)
    mock/seed.ts            données + persona de démo
    push.service.ts         Web Push (VAPID) — actif hors mock
    pwa-install.service.ts  invite « Installer l'app »
    onboarding.service.ts   drapeau du tour guidé (1re connexion)
  features/
    landing/  auth/  sessions/  wallet/  messages/  profile/  friends/  info/  onboarding/
  layout/shell.component    nav du bas + bannière d'install + hôte du tour
  shared/                   logo, mascotte Miango, avatar, compte à rebours, pipe FCFA
```

## PWA

- `public/manifest.webmanifest` — thème Encre Forêt, icône « M » or, installable.
- `public/sw.js` — service worker **push-only** (pas de precache, pas de chunk périmé).
  Le temps réel au premier plan passera par Socket.IO ; le Web Push ne sert qu'en
  arrière-plan (résultat du tirage = push systématique).

## Déploiement

`Dockerfile` (build Node 24 → nginx) + `nginx.conf` (fallback SPA, proxy `/api` +
WebSocket vers le service `api:3000`).

## Cadrage légal

Jeu d'argent au Gabon = monopole de la Gabonaise Des Jeux (GDJ). Réservé aux **18
ans et +**, **KYC** (âge + identité) obligatoire avant tout retrait. Le bloc « jeu
responsable » reste visible (onglet Info). Les montants affichés sont fictifs.
