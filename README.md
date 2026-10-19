# CTF Platform

A self-hosted, **CTFd-style** flag-submission platform and live scoreboard for
running a Capture The Flag event — **any** event, not tied to one challenge set.
Built with **Next.js + TypeScript**, **PostgreSQL**, and **Drizzle ORM**,
packaged with **Docker Compose** (app + database) for one-command deployment.

Everything — team accounts (authentication), challenges, solves, and event
settings — lives in Postgres. There's no file-based state at runtime; the bundled
`data/challenges.json` is only an optional first-boot seed.

It's a single standalone project: one app, one database, the only scoring system
you need to run. Out of the box it starts as a generic, unbranded event with a
couple of sample challenges. You set the event name, add your own challenges, and
run it — then wipe it and run a completely different CTF next time, all from the
admin panel. No code changes, no redeploy.

A ready-made example challenge pack (the "SecureCrypt" web + reverse-engineering
set) ships in `data/examples/` so you can load a full event in one click to try
things out.

## Features (the CTFd-style bits)

- **Team register / log in** — hashed passwords (bcrypt), signed session cookies.
- **Challenge board** — tiles grouped by category, showing points and solve
  counts, with a solved ✓ and a 🩸 first-blood marker.
- **Submit modal** — click a challenge to read its description, reveal hints
  one at a time, and submit a flag. Right/wrong/duplicate all handled.
- **Live scoreboard** — rankings plus a score-over-time line graph of the top
  teams; auto-refreshes every 15 seconds.
- **Admin panel** (`/admin`) — set the event name/tagline, add / edit / delete
  challenges live, import a challenge pack as JSON, reset or delete teams, freeze
  the scoreboard, and wipe everything to start a fresh event. Password-protected,
  separate from team login.
- **Static or dynamic scoring** per challenge (fixed points, or CTFd-style decay).
- **Flags never reach the browser** — all checking is server-side. This platform
  is *not* a vulnerable target; keep it separate from any challenge infra.

## Run it with Docker Compose (recommended)

Compose brings up **two** services: `db` (PostgreSQL 16) and `ctf` (the app).
Database migrations run automatically when the app container starts.

```bash
# 1. set your secrets (edit SESSION_SECRET, ADMIN_PASSWORD, DB password)
cp .env.example .env     # or edit the values directly in docker-compose.yml

# 2. build and start both services
docker compose up --build
```

Then open **http://<the-host's-ip>:3000** on the student machines.

All data lives in the Postgres volume (`ctf-db`), so you can stop and restart
without losing teams or scores. To wipe everything and start completely fresh:

```bash
docker compose down -v        # the -v removes the DB volume (all data)
docker compose up --build
```

## Run it without Docker (local dev)

Requires Node.js 20+ and a PostgreSQL database.

```bash
npm install

# point at your Postgres (see .env.example)
export DATABASE_URL="postgres://user:pass@localhost:5432/ctf"

npm run db:migrate   # create the tables
npm run dev          # http://localhost:3000  (dev, hot reload)
# or, production:
npm run build && npm start
```

Useful scripts: `npm run typecheck` (tsc), `npm run db:generate` (regenerate
migration SQL after editing `db/schema.ts`), `npm run db:migrate` (apply
migrations).

## Running your own event (and reusing for many CTFs)

This platform is event-agnostic. A typical lifecycle:

1. **Set the event identity.** In the admin panel → **Settings → Event details**,
   set the name and tagline (or set `EVENT_NAME` / `EVENT_TAGLINE` in the
   environment). The header logo mark is derived from the name automatically.
2. **Add your challenges.** Either create them one by one in **Challenges**, or
   paste a JSON pack in **Settings → Import challenges**. A pack is a JSON array
   of challenge objects, or an object `{ "event": {...}, "challenges": [...] }`.
3. **Run the event.** Teams register and submit; you freeze/unfreeze the board.
4. **Reset for the next CTF.** In **Settings → Danger zone**, delete all teams
   and all challenges, then set the new event name and import the next pack. The
   same running instance now hosts a completely different CTF.

To try the included example immediately, paste the contents of
`data/examples/securecrypt-ctf.json` into the import box (tick "Replace existing
set"), or copy it over `data/challenges.json` before first boot.

## Admin panel

Go to **`/admin`** and log in with `ADMIN_PASSWORD`. Three tabs:

- **Challenges** — add a new challenge, edit any field (title, category, points,
  flag, description, hints) or delete one. Changes are live immediately for
  every team. Deleting a challenge also removes its solves. Each challenge can
  use **static** or **dynamic** scoring (see below).
- **Teams** — see every team with their score and solve count. **Reset** zeroes
  a team's solves (keeps the team); **Delete** removes the team entirely.
- **Settings** — event stats, plus:
  - **Event details** — set the event name and tagline shown across the site.
  - **Freeze / Unfreeze the scoreboard.** Freezing locks the *public*
    scoreboard at the current standings while teams keep solving. Unfreeze at the
    end to reveal the final results — a classic CTF finish.
  - **Import challenges** — paste a JSON pack (array, or `{event, challenges}`).
    Merge into the current set, or tick "Replace existing set" to swap it out.
    Also a one-click re-import of the bundled `data/challenges.json`.
  - **Danger zone** — delete all teams, or delete all challenges, to reset the
    instance for a new event.

> **Challenges become database-managed after first run.** On the very first
> boot the platform seeds challenges from `data/challenges.json`; after that,
> the admin panel is the source of truth and your edits persist across
> restarts. Editing the JSON later only takes effect if you hit **Re-import from
> file** (or start with a fresh database).

## Scoring: static or dynamic (optional)

Every challenge is **static by default** — worth a fixed number of points. You
can opt any individual challenge into **dynamic** scoring in the admin editor
(or in `challenges.json`); nothing changes for the ones you leave static.

**Dynamic** means the challenge is worth a lot while few teams have solved it and
drops toward a floor as more do — rewarding early solvers. Every team that has
solved it is always worth its *current* value, so standings shift as solves come
in. Three numbers control it:

- **Initial** — value at zero solves.
- **Minimum** — the floor it can't drop below.
- **Decay** — roughly the number of solves at which it reaches the minimum.

The value follows the standard CTFd curve:
`value = ((minimum − initial) / decay²) × solves² + initial`, clamped to the
minimum. For example `initial 500, minimum 100, decay 10` gives: 500 → 496 (1
solve) → 400 (5) → 100 (10+).

Dynamic challenges are tagged on the board and in the challenge view so teams
know the points are dropping. In `challenges.json`, a dynamic entry looks like:

```json
{
  "id": "fast_pwn",
  "title": "Race to Pwn",
  "category": "Pwn",
  "scoring": "dynamic",
  "initial": 500,
  "minimum": 100,
  "decay": 15,
  "flag": "FLAG{...}",
  "description": "First to pop the binary earns the most."
}
```

Leave `scoring` out (or set `"static"`) and use `points` for a fixed-value
challenge, exactly as before.

## Editing the challenges (file-based)

If you'd rather manage challenges as a file, edit **`data/challenges.json`**
before first run (or re-import afterwards). Each entry:

```json
{
  "id": "sqli_login",
  "title": "Open Sesame",
  "category": "Web",
  "points": 100,
  "flag": "FLAG{sql_1nject1on_l0gs_y0u_1n}",
  "description": "Make the login let you in without a password.",
  "hints": ["What does a single quote ' do?", "Search: SQL injection login bypass."]
}
```

- `id` is a stable key — don't reuse one. Editing other fields and restarting
  updates the challenge **without wiping existing solves**.
- `category` groups the tiles (e.g. Web, Recon, Reverse Engineering).
- `flag` is checked exactly and case-sensitively. It's never sent to the client.
- `hints` are optional; students reveal them one at a time in the modal.

After editing, restart (`docker compose restart`, or re-run `npm start`).

> The flags here match the SecureCrypt vulnerable site and the three ELF
> reverse-engineering engines, so the two projects work together out of the box.

## Configuration

| Env var | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | — | Postgres connection string — **required** |
| `SESSION_SECRET` | dev placeholder | Signs session cookies — **set this** for a real event |
| `ADMIN_PASSWORD` | `changeme` | Password for the `/admin` panel — **set this** |
| `EVENT_NAME` | `Capture The Flag` | Default event name (admin panel overrides it) |
| `EVENT_TAGLINE` | — | Default tagline (admin panel overrides it) |
| `PORT` | `3000` | Port the server listens on |

Event name precedence: **admin panel setting → `EVENT_NAME` env → `data/challenges.json` → "Capture The Flag"**.

## Project layout

```
ctfd-platform/
├─ app/                       Next.js App Router (TypeScript)
│  ├─ page.tsx                landing
│  ├─ register/ login/        auth pages
│  ├─ challenges/             challenge board (client)
│  ├─ scoreboard/             scoreboard + score graph (client)
│  ├─ admin/                  admin panel + admin login (client)
│  ├─ components/*.tsx        Nav, Board, ChallengeModal, Scoreboard, ScoreGraph,
│  │                          AuthForm, Admin, ChallengeEditor, AdminLogin, types
│  └─ api/
│     ├─ (team) register, login, logout, me, challenges, submit, scoreboard
│     └─ admin/               login, logout, me, challenges[/id], teams[/id], settings
├─ db/
│  ├─ schema.ts               Drizzle schema (teams, challenges, solves, settings)
│  └─ client.ts               pg Pool + Drizzle instance (singleton)
├─ lib/
│  ├─ data.ts                 settings, event meta, import/wipe, seed (async)
│  ├─ scoring.ts              static + dynamic scoring engine
│  ├─ auth.ts                 signed-cookie sessions (HMAC-SHA256)
│  └─ validate.ts             challenge input validation
├─ drizzle/                   generated SQL migrations (run on startup)
├─ scripts/
│  ├─ migrate.ts / migrate.mjs  migration runner (mjs is used in the container)
│  └─ docker-entrypoint.sh      migrate → start server
├─ data/challenges.json       optional first-boot seed (generic sample event)
├─ data/examples/
│  └─ securecrypt-ctf.json    web + reverse-engineering example pack to import
├─ drizzle.config.ts          drizzle-kit config
├─ tsconfig.json
├─ Dockerfile                 multi-stage (Next standalone + migrations)
├─ docker-compose.yml         app + Postgres, with a persistent DB volume
└─ next.config.mjs
```

## Database schema

Four tables, defined in `db/schema.ts` and migrated by Drizzle:

- **teams** — `id, name (unique), pass_hash (bcrypt), created_at` — the auth system.
- **challenges** — `id, title, category, points, description, flag, hints (jsonb),
  sort_order, scoring, initial, minimum, decay`.
- **solves** — `id, team_id, challenge_id, points, solved_at` — unique per (team, challenge).
- **settings** — `key, value` — event name/tagline, scoreboard freeze, etc.

To change the schema: edit `db/schema.ts`, run `npm run db:generate` to produce a
new migration in `drizzle/`, and it's applied automatically on next startup.

## Notes for a real event

- **Change `SESSION_SECRET` and `ADMIN_PASSWORD`** before students arrive.
- Run this on the **same machine or LAN** as the challenge target site. It
  doesn't need to be internet-facing.
- The `/admin` panel is unlinked from the student-facing nav — reach it by
  typing the URL. Keep the admin password to yourself.
- A good end-of-event flow: **freeze** the scoreboard ~15 minutes before the
  end (so the last stretch is suspenseful), then **unfreeze** live in front of
  everyone to reveal the winner.
- The XSS challenge is "prove it to the instructor" style — its flag is awarded
  by you, then the team submits it here like any other.
