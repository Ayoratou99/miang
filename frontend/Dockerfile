# ── Build stage ───────────────────────────────────────────────
FROM node:24-alpine AS build
WORKDIR /app

COPY package*.json ./
# npm install (not ci): the lockfile is generated on Windows/npm 11; install
# reconciles it cleanly under the image's npm without a strict-sync failure.
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build

# ── Serve stage (nginx) ───────────────────────────────────────
FROM nginx:1.27-alpine AS runner
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/miang-frontend/browser /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1
