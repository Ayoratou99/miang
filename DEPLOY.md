# Déploiement MIANG (production)

Services : **frontend** (nginx + PWA) · **api** (NestJS) · **worker** (BullMQ, tirage
de 20h) · **redis**. La base **PostgreSQL est externe** (votre conteneur existant,
ex. `principale-postgres-1`). Le frontend relaie `/api` et `/socket.io` vers le
backend ; on place le reverse proxy de l'hôte (domaine + TLS) devant le port **8091**.

URL publique : **https://miang.ayospush.com** · port exposé : **127.0.0.1:8091**

## 1. Créer la base `miang` sur votre Postgres

MIANG utilise une base **dédiée** `miang` (ne partagez pas la base `okoume` : les
schémas entreraient en collision). Dans votre conteneur Postgres existant :

```bash
# Le superutilisateur n'est pas forcément « postgres » — on le récupère :
SU=$(docker exec principale-postgres-1 printenv POSTGRES_USER)

docker exec -i principale-postgres-1 psql -U "$SU" <<'SQL'
CREATE DATABASE miang;
CREATE USER miang WITH PASSWORD 'mypassword';
ALTER DATABASE miang OWNER TO miang;
SQL

# PostgreSQL 15+ : le rôle doit posséder le schéma public de SA base.
docker exec -i principale-postgres-1 psql -U "$SU" -d miang <<'SQL'
ALTER SCHEMA public OWNER TO miang;
GRANT ALL ON SCHEMA public TO miang;
SQL

# Vérifier la connexion :
docker exec -it principale-postgres-1 psql -U miang -d miang -c "SELECT 1"
```

Repérez le **réseau Docker** du conteneur Postgres (pour `MIANG_DB_NETWORK`) :

```bash
docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' principale-postgres-1
```

## 2. Configurer

```bash
cp .env.prod.example .env.prod
# éditer .env.prod :
#  - DATABASE_URL=postgresql://miang:mypassword@principale-postgres-1:5432/miang?schema=public
#  - MIANG_DB_NETWORK=principale_default   (le réseau repéré ci-dessus)
#  - JWT_ACCESS_SECRET, JWT_REFRESH_SECRET  (openssl rand -hex 48)
#  - OTP_PROVIDER=ayospush + AYOSPUSH_*  (template WhatsApp approuvé, {{1}} = le code)
#  - SEED_TEST=true  pour une démo (login prêt),  false  en vrai déploiement
```

## 2. Démarrer

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
docker compose -f docker-compose.prod.yml --env-file .env.prod ps
docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f api
```

Au boot, le service **`migrate`** applique les migrations Prisma, puis **si
`SEED_TEST=true`** il seed les données de démo (RBAC + le compte par défaut). Sinon
il ne seed rien.

## 3. Démo « pour présenter à quelqu'un » (SEED_TEST=true)

Une connexion par défaut est créée :

| | |
|---|---|
| Identifiant | `kevin_mba` (ou `+24106000041`) |
| Mot de passe | `miang1234` |
| Solde | 12 500 F · KYC vérifié · rôles player + superadmin |

> Le frontend tourne sur sa couche mock (démontrable sans backend) : à la connexion,
> n'importe quel identifiant ouvre la session du persona de démo. Le compte seedé
> ci-dessus est le **même persona** côté API (utile dès que le front sera branché à
> l'API réelle, drapeau `USE_MOCK` dans `frontend/src/app/core/api.ts`).

Pour relancer le seed après coup : `docker compose -f docker-compose.prod.yml --env-file .env.prod run --rm migrate`.

## 4. Domaine + TLS — https://miang.ayospush.com

Le frontend est publié sur `127.0.0.1:8091`. Reverse proxy de l'hôte :

1. **DNS** : enregistrement **A** `miang.ayospush.com` → IP du VPS.
2. **Nginx (hôte)** — `/etc/nginx/sites-available/miang.ayospush.com` :

   ```nginx
   server {
       listen 80;
       server_name miang.ayospush.com;
       location / {
           proxy_pass http://127.0.0.1:8091;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;       # WebSocket (Socket.IO)
           proxy_set_header Connection "upgrade";
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

   ```bash
   ln -s /etc/nginx/sites-available/miang.ayospush.com /etc/nginx/sites-enabled/
   nginx -t && systemctl reload nginx
   certbot --nginx -d miang.ayospush.com     # ajoute le 443 + redirection HTTPS
   ```

> Reverse proxy conteneurisé (NPM, Traefik…) : `127.0.0.1` n'est pas joignable —
> attachez plutôt le service `frontend` au réseau du proxy et routez vers
> `miang-frontend-1:80`.

Le backend n'est jamais exposé : le nginx du frontend relaie `/api` et `/socket.io`
en interne (même origine, donc pas de CORS).

## 5. Mises à jour

```bash
git pull
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

Les migrations s'appliquent au démarrage du service `migrate`. Avec `SEED_TEST=false`,
aucune donnée de démo n'est (ré)injectée — les comptes réels sont préservés.

## 6. Sauvegardes

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod exec postgres \
  pg_dump -U miang miang | gzip > miang_$(date +%F).sql.gz
```

## Cadrage légal

Jeu d'argent au Gabon = monopole GDJ. Réservé aux **18 ans et +**, **KYC** avant tout
retrait. Démarrer en « social » (jetons/gains non monétaires) tant que la licence GDJ
n'est pas obtenue.
