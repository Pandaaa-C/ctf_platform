# ─────────────────────────────────────────────────────────────────────
#  CTF Platform — Dockerfile (Next.js + Postgres/Drizzle, TypeScript)
# ─────────────────────────────────────────────────────────────────────

# ---- deps ----
FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install

# ---- build ----
FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# DATABASE_URL isn't needed to build; a placeholder keeps config happy.
ENV DATABASE_URL=postgres://postgres@localhost:5432/ctf
RUN npm run build

# ---- runtime ----
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN groupadd -r ctf && useradd -r -g ctf ctf

# Next standalone server + static assets
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# seed data (used once if the challenges table is empty), migrations, scripts
COPY --from=builder /app/data ./data
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/scripts/migrate.mjs ./scripts/migrate.mjs
COPY --from=builder /app/scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh
# the migrate script (scripts/migrate.mjs) runs OUTSIDE Next's traced bundle,
# so it needs the FULL drizzle-orm + pg packages. Copy them from the deps stage
# (untrimmed), not from the builder's traced standalone output.
COPY --from=deps /app/node_modules/pg ./node_modules/pg
COPY --from=deps /app/node_modules/pg-pool ./node_modules/pg-pool
COPY --from=deps /app/node_modules/pg-protocol ./node_modules/pg-protocol
COPY --from=deps /app/node_modules/pg-types ./node_modules/pg-types
COPY --from=deps /app/node_modules/pg-connection-string ./node_modules/pg-connection-string
COPY --from=deps /app/node_modules/pg-cloudflare ./node_modules/pg-cloudflare
COPY --from=deps /app/node_modules/pg-int8 ./node_modules/pg-int8
COPY --from=deps /app/node_modules/pgpass ./node_modules/pgpass
COPY --from=deps /app/node_modules/postgres-array ./node_modules/postgres-array
COPY --from=deps /app/node_modules/postgres-bytea ./node_modules/postgres-bytea
COPY --from=deps /app/node_modules/postgres-date ./node_modules/postgres-date
COPY --from=deps /app/node_modules/postgres-interval ./node_modules/postgres-interval
COPY --from=deps /app/node_modules/split2 ./node_modules/split2
COPY --from=deps /app/node_modules/drizzle-orm ./node_modules/drizzle-orm

RUN chmod +x ./scripts/docker-entrypoint.sh && chown -R ctf:ctf /app

USER ctf
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0

ENTRYPOINT ["./scripts/docker-entrypoint.sh"]
