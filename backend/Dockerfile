# syntax=docker/dockerfile:1

# ----------------------------------------------------------------------------
# base — common layer
# ----------------------------------------------------------------------------
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache tini

# ----------------------------------------------------------------------------
# builder — installs ALL deps, generates Prisma client, compiles TS
# (also the dev target: keeps dev dependencies for hot-reload)
# ----------------------------------------------------------------------------
FROM base AS builder
ENV NODE_ENV=development
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npx prisma generate && npm run build

# ----------------------------------------------------------------------------
# runtime — slim production image, prod deps only, non-root
# ----------------------------------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma
RUN addgroup -S app && adduser -S app -G app && chown -R app:app /app
USER app
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]
