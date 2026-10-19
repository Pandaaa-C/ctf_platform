# CTF Platform

A self-hosted, **CTFd-style** flag-submission platform and live scoreboard that
hosts **many Capture The Flag events at once**. Built with **Next.js +
TypeScript**, **PostgreSQL**, and **Drizzle ORM**, packaged with **Docker
Compose** (app + database) for one-command deployment.

Everything lives in Postgres: CTF events, challenges, per-event team accounts,
solves, and organiser accounts. The homepage lists the events; each event lives
at `/ctf/<slug>` with its own challenges, registration and scoreboard.

## Features

- **Multiple CTFs** — create as many events as you like. Each has its own
  challenges, teams, scoreboard and freeze state. Players pick an event from the
  homepage.
- **Per-event teams** — a team registers for a specific CTF (bcrypt-hashed
  password). The same team name can exist in different events.
- **Organiser accounts in the database** — not a shared password. Two access
  levels:
  - **Full admin** — manage every event, challenge, team and organiser.
  - **Scoped organiser** — can only edit/delete the specific challenges they're
    assigned; everything else is read-only or hidden.
- **Challenge board** — tiles grouped by category with points, solve counts, a
  solved ✓ and a 🩸 first-blood marker; a submit modal with staged hints.
- **Static or dynamic scoring** per challenge (fixed points, or CTFd-style decay
  as more teams solve).
- **Live scoreboard** per event — rankings plus a score-over-time graph, with an
  organiser-controlled freeze.
- **Markdown pages** — organisers add Rules/Guide/FAQ pages per event, stored in
  the database and rendered (sanitised) in the event's navigation.
- **Self-hosted fonts** — Inter + JetBrains Mono are bundled (no external font
  requests), so typography is identical on every machine and works offline.
- **Flags never reach the browser** — all checking is server-side.

## Run it with Docker Compose (recommended)

Compose brings up two services: `db` (PostgreSQL 16) and `ctf` (the app). On
start the app runs database migrations and seeds the first admin account.

```bash
cp .env.example .env     # set SESSION_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD, DB password
docker compose up --build
```

Open **http://<host-ip>:3000**. Sign in to the admin panel at **/admin** with the
`ADMIN_USERNAME` / `ADMIN_PASSWORD` you configured, create a CTF, and add
challenges to it.

All data lives in the Postgres volume (`ctf-db`). To wipe everything:

```bash
docker compose down -v
docker compose up --build
```

## Full installation guide

The recommended way to run this on any server is Docker Compose — it brings up
the app and the database together and survives reboots. The steps below are
end-to-end for a fresh **Linux server** and a fresh **Windows Server**.

You need: the project files on the server, Docker with the Compose plugin, and
an inbound firewall rule for the port you expose (3000 by default).

### Before you start (both platforms)

1. Get the project onto the server — either `git clone <your-repo>` or copy the
   `ctfd-platform` folder across (SCP, RDP copy-paste, a USB drive, etc.).
2. Create your `.env` from the template and change every secret:

   ```
   DATABASE_URL=postgres://ctf:A_STRONG_DB_PASSWORD@db:5432/ctf
   SESSION_SECRET=a_long_random_string
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=a_strong_admin_password
   ```

   Make the DB password in `DATABASE_URL` match the one in
   `docker-compose.yml` (the `POSTGRES_PASSWORD` of the `db` service), or set
   both from the same value. Generate a good `SESSION_SECRET` with
   `openssl rand -hex 32` (Linux/WSL) or any long random string.

---

### Linux server (Ubuntu / Debian)

Tested on Ubuntu 22.04/24.04 and Debian 12. Run as a user with `sudo`.

**1. Install Docker Engine + Compose plugin**

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

On Debian, replace `ubuntu` with `debian` in both URLs above.

Let your user run Docker without `sudo` (log out/in afterwards, or run `newgrp docker`):

```bash
sudo usermod -aG docker "$USER"
```

Enable Docker on boot:

```bash
sudo systemctl enable --now docker
```

**2. Build and start the platform**

```bash
cd ctfd-platform
cp .env.example .env
nano .env                      # set your secrets (see "Before you start")
docker compose up --build -d   # -d runs it in the background
```

Check it's up:

```bash
docker compose ps
docker compose logs -f ctf     # watch startup: migrate -> seed -> Ready
```

**3. Open the firewall** (if `ufw` is enabled)

```bash
sudo ufw allow 3000/tcp
```

**4. Use it** — browse to `http://<server-ip>:3000`, sign in at `/admin`.

**Managing it**

```bash
docker compose restart ctf     # restart just the app
docker compose down            # stop (keeps data)
docker compose down -v         # stop and delete all data
docker compose pull && docker compose up --build -d   # update after code changes
```

Because the services use `restart: unless-stopped`, they come back automatically
after a server reboot once the Docker service is enabled.

**Optional: serve on port 80/443 behind Nginx**

Keep the app on 3000 and put a reverse proxy in front for a domain name and TLS.
Install Nginx (`sudo apt-get install -y nginx`) and add a site:

```nginx
server {
    listen 80;
    server_name ctf.example.edu;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Then `sudo ln -s` it into `sites-enabled`, `sudo nginx -t`, `sudo systemctl reload nginx`,
and add HTTPS with `sudo apt-get install -y certbot python3-certbot-nginx && sudo certbot --nginx`.

---

### Windows Server

Tested on Windows Server 2022. Two supported routes — **Docker (recommended)**
or **running Node directly**.

#### Option A — Docker Desktop (recommended)

**1. Enable the required Windows features** (PowerShell as Administrator), then reboot:

```powershell
Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux -All -NoRestart
Enable-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform -All -NoRestart
wsl --install --no-distribution
Restart-Computer
```

**2. Install Docker Desktop**

Download Docker Desktop for Windows from docker.com and run the installer,
keeping the **WSL 2 based engine** option. Launch Docker Desktop once so the
engine starts, and in **Settings → General** enable **Start Docker Desktop when
you log in** so it survives reboots. Confirm it works in PowerShell:

```powershell
docker version
docker compose version
```

**3. Build and start the platform**

```powershell
cd C:\path\to\ctfd-platform
Copy-Item .env.example .env
notepad .env                     # set your secrets (see "Before you start")
docker compose up --build -d
docker compose logs -f ctf       # Ctrl+C stops watching, not the app
```

**4. Open the firewall**

```powershell
New-NetFirewallRule -DisplayName "CTF Platform" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
```

**5. Use it** — browse to `http://<server-ip>:3000`, sign in at `/admin`.

> On Windows Server, Docker Desktop requires a logged-in session to keep the
> engine running. For an always-on headless host, either keep an admin session
> signed in, or use **Option B** below (Node as a Windows service), or install
> the Docker Engine under WSL and run it there.

#### Option B — Node.js + Postgres directly (no Docker)

**1. Install prerequisites**

- **Node.js 20 LTS** — download the Windows MSI from nodejs.org and install.
- **PostgreSQL 16** — download the EDB installer from postgresql.org, install,
  and note the `postgres` superuser password you set. Add PostgreSQL's `bin`
  folder to `PATH` if you want `psql` on the command line.

**2. Create the database** (in a PowerShell/`psql` session):

```sql
CREATE DATABASE ctf;
CREATE USER ctf WITH PASSWORD 'A_STRONG_DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE ctf TO ctf;
```

**3. Configure and build**

```powershell
cd C:\path\to\ctfd-platform
Copy-Item .env.example .env
notepad .env     # set DATABASE_URL=postgres://ctf:A_STRONG_DB_PASSWORD@localhost:5432/ctf and the secrets
npm install
npm run db:setup     # migrate + seed the admin
npm run build
```

**4. Run it**

```powershell
npm run start        # serves on http://0.0.0.0:3000
```

To keep it running as a background Windows service, use a process manager such
as [NSSM](https://nssm.cc): install the service to run `node` with the argument
`node_modules\next\dist\bin\next start -p 3000 -H 0.0.0.0`, with the working
directory set to the project folder and the environment variables from `.env`
configured on the service. Then open the firewall as in Option A step 4.

---

### Updating to a new version (any server)

```bash
# Docker
docker compose up --build -d          # rebuilds the app image; migrations run on start

# Bare Node
git pull                              # or copy new files in
npm install
npm run db:migrate
npm run build
# restart your service / npm run start
```

Migrations are additive and run automatically (Docker) or via `npm run db:migrate`
(bare Node), so your events, teams and solves are preserved across updates.

## Local development

Only a Postgres database needs to run in Docker; the app runs on your machine.

```bash
docker compose -f docker-compose.dev.yml up -d   # Postgres on localhost:5432
npm install
cp .env.example .env                              # DATABASE_URL already points at localhost
npm run db:setup                                  # migrate + seed the admin
npm run dev                                        # http://localhost:3000
```

Scripts: `npm run typecheck`, `npm run db:generate` (regenerate migration SQL
after editing `db/schema.ts`), `npm run db:migrate`, `npm run db:seed`,
`npm run db:setup` (migrate then seed).

## The admin panel (`/admin`)

Sign in with an organiser account. What you see depends on your access level.

**Full admin** gets four tabs:

- **CTFs** — create an event (name + tagline → auto-generated `/ctf/<slug>`),
  freeze/unfreeze its scoreboard, or delete it (removes its challenges, teams and
  solves).
- **Challenges** — pick an event, then add/edit/delete its challenges or bulk
  **import** a JSON pack. Each challenge is static or dynamic.
- **Teams** — pick an event; reset a team's solves or delete a team.
- **Pages** — pick an event, then add Markdown pages (Rules, Guide, FAQ…) with a
  write/preview editor. Pages are stored in the database and appear in that
  event's navigation at `/ctf/<slug>/p/<page>`. Markdown is sanitised on render.
- **Organisers** — add organiser accounts, set each to full or scoped, and for
  scoped ones tick exactly which challenges they may manage. Reset passwords or
  delete accounts.

**Scoped organiser** sees a single **My challenges** tab: only the challenges
they've been assigned, which they can edit and delete. They cannot create
challenges, manage events/teams, or see other organisers.

## Seeding the first admin

`npm run db:seed` (and the Docker entrypoint) create one **full admin** from the
environment, if it doesn't already exist:

```
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-me-admin-password
```

It's idempotent — it never overwrites an existing account. Create further
organisers from the Organisers tab.

## Importing challenges

In **Challenges → Import**, paste a JSON array of challenge objects (or an object
with a `challenges` array) to bulk-add them to the selected event. Tick "Replace"
to swap out that event's existing set. A ready-made example pack (a web +
reverse-engineering set) is in `data/examples/securecrypt-ctf.json`.

A challenge object:

```json
{
  "slug": "rot13",
  "title": "ROT13",
  "category": "Crypto",
  "points": 100,
  "flag": "FLAG{...}",
  "description": "Decode it.",
  "hints": ["It's a Caesar cipher."]
}
```

For a dynamic challenge, set `"scoring": "dynamic"` with `initial`, `minimum` and
`decay` instead of `points`. The value follows the CTFd curve
`((minimum − initial) / decay²) × solves² + initial`, clamped to the minimum.

## Configuration

| Env var | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | — | Postgres connection string — **required** |
| `SESSION_SECRET` | dev placeholder | Signs session cookies — **set this** |
| `ADMIN_USERNAME` | `admin` | Username for the seeded first admin |
| `ADMIN_PASSWORD` | `changeme` | Password for the seeded first admin — **set this** |
| `PORT` | `3000` | Port the server listens on |

## Project layout

```
ctfd-platform/
├─ app/
│  ├─ page.tsx                landing: lists all CTFs
│  ├─ ctf/[slug]/             per-event pages (challenges, scoreboard, register,
│  │                          login, p/[page] markdown content)
│  ├─ admin/                  admin panel + sign in
│  ├─ components/*.tsx        TopBar, CtfNav, Board, ChallengeModal, Scoreboard,
│  │                          ScoreGraph, AuthForm, Admin, ChallengeEditor,
│  │                          OrganiserEditor, PageEditor, AdminLogin, types
│  └─ api/
│     ├─ ctfs                 public CTF list
│     ├─ ctf/[slug]/          register, login, logout, me, challenges, submit, scoreboard
│     └─ admin/               login, logout, me, ctfs[/id], challenges[/id],
│                             pages[/id], teams[/id], organisers[/id]
├─ db/
│  ├─ schema.ts               ctfs, admins, admin_challenges, teams, challenges, solves
│  └─ client.ts               pg Pool + Drizzle instance
├─ lib/
│  ├─ auth.ts                 admin + per-event team sessions, scope checks
│  ├─ ctfs.ts                 CTF CRUD + slugs
│  ├─ challenges.ts           import/wipe per event
│  ├─ scoring.ts              static + dynamic scoring engine
│  └─ validate.ts             challenge input validation
├─ drizzle/                   generated SQL migrations (run on startup)
├─ scripts/
│  ├─ migrate.ts / migrate.mjs   migration runner
│  ├─ seed.ts / seed.mjs         first-admin seed
│  └─ docker-entrypoint.sh       migrate → seed → start
├─ data/examples/            importable challenge packs
├─ Dockerfile
├─ docker-compose.yml        app + Postgres (production)
├─ docker-compose.dev.yml    Postgres only (local dev)
└─ drizzle.config.ts
```

## Database schema

Six tables (`db/schema.ts`), migrated by Drizzle:

- **ctfs** — `id, slug (unique), name, tagline, frozen_at, created_at`.
- **admins** — `id, username (unique), pass_hash, role ('full'|'scoped'), created_at`.
- **admin_challenges** — `admin_id, challenge_id` — which challenges a scoped
  organiser may manage.
- **teams** — `id, ctf_id, name, pass_hash, created_at` — unique per (ctf, name).
- **challenges** — `id, ctf_id, slug, title, category, points, description, flag,
  hints, sort_order, scoring, initial, minimum, decay` — unique per (ctf, slug).
- **pages** — `id, ctf_id, slug, title, body (markdown), sort_order, created_at,
  updated_at` — unique per (ctf, slug).
- **solves** — `id, team_id, challenge_id, points, solved_at` — unique per
  (team, challenge).

Change the schema by editing `db/schema.ts`, then `npm run db:generate` and the
new migration applies on next startup.

> This platform is for scoring and submission. Keep it separate from any
> deliberately vulnerable challenge infrastructure.
