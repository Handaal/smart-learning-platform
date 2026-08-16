# Deploying STEP on a Hostinger VPS

## Why the frontend was crash-looping

The old `docker-compose.yml` ran the frontend as a bare `node:20-alpine`
container executing `npm install && npm run dev` against a bind-mounted
source tree. That is a development setup and it fails on a VPS:

- `npm install` re-ran on every container start (~700 MB of MediaPipe /
  face-api deps). On a 2–4 GB VPS it OOM-killed, the container exited, and
  `restart: unless-stopped` restarted it — the "restarting" loop.
- `npm run dev` is `vite --host 127.0.0.1`; the appended `-- --host 0.0.0.0`
  left two conflicting `--host` flags.
- `vite.config.ts` sets `watch.usePolling` with a 150 ms interval, which
  pegs a CPU core for nothing on a server.
- `VITE_API_BASE_URL` was hardcoded to `http://127.0.0.1:3001`, which resolves
  to the *visitor's* machine, not the server.
- `frontend/Dockerfile` (the real production image) was never referenced by
  compose at all.

The compose file now builds `frontend/Dockerfile`: a static Vite build served
by nginx, which also reverse-proxies `/api`, `/uploads`, and `/ws` to the
backend. Everything is one origin, so there is no CORS config to get wrong.

## Two deploy paths — pick one

### A. Hostinger Docker Manager (paste-in panel)

The panel has **no repo checkout on the server**. It cannot build from a
`build:` context. A compose file that relies on one will come up with
missing images. Use `docker-compose.deploy.yml`, which is registry-images-only
(the `db` service is the stock `timescale/timescaledb` image — nothing to
build there).

1. Push to `main`. `.github/workflows/publish-images.yml` builds and pushes
   `step-backend` and `step-frontend` to GHCR.
2. Make both packages **public** (GitHub → your profile → Packages →
   each package → Package settings → Change visibility). Otherwise the VPS
   needs a registry login the panel can't supply.
3. Copy `docker-compose.deploy.yml`, replace every `CHANGE_ME_*`, paste it
   into the Docker Manager, deploy.
4. Redeploy after a code change: wait for the workflow, then hit
   **Recreate/Update** in the panel so it re-pulls `:latest`.

The schema is Prisma migrations baked into the `step-backend` image
(`backend/prisma/migrations`). The backend container runs
`prisma migrate deploy` on every start — it's a no-op once the DB is current,
so redeploying is always safe. A new schema change just needs a new
`step-backend` image; the `db_data` volume does not need to be wiped.

### B. SSH onto the VPS and build there

```bash
git clone <repo> step && cd step
cp .env.example .env
```

Fill in `.env` — `POSTGRES_PASSWORD` and `JWT_SECRET` are mandatory
(`openssl rand -hex 48` for the secret). Then:

```bash
docker compose up -d --build
```

The app is on `http://<vps-ip>:80`. `ai-services` is excluded by default;
bring it in with `docker compose --profile ai up -d`.

## Notes

- Postgres and Redis publish on `127.0.0.1` only. Docker's published ports
  bypass `ufw`, so binding them to `0.0.0.0` would expose the database to the
  internet.
- The backend is not published to the host at all — nginx reaches it over the
  compose network.
- The DB schema is Prisma migrations, applied by the backend container on
  every start (`prisma migrate deploy` — safe to re-run). Reference data
  (modules, episodes, quizzes) only loads when `SEED_ON_START=true`; the seed
  uses upserts, so re-running it is harmless. `database/schema.sql` and
  `database/seed.sql` are leftovers from before the move to Prisma and are not
  used by any Dockerfile or compose file — ignore them.
- TimescaleDB hypertables, continuous aggregates, and compression are **not**
  set up automatically. After the first successful deploy, run
  `database/timescale_setup.sql` once against the database (from the repo
  checkout, path B only):
  `docker compose exec -T db psql -U step_user -d step_db < database/timescale_setup.sql`
  It's idempotent (`IF NOT EXISTS` throughout), so re-running it after future
  deploys is harmless too.
- Building the frontend needs ~1.5 GB RAM. If the VPS has 2 GB or less, add
  swap first: `fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap
  /swapfile && swapon /swapfile`.
- Redeploy after a code change: `docker compose build && docker compose up -d`.

## TLS

Point a domain at the VPS, set `HTTP_PORT=8080` in `.env`, and put Caddy or
nginx + certbot on the host proxying 443 → `127.0.0.1:8080`. Set
`CORS_ORIGIN=https://your-domain` too. WebSocket upgrade headers must be
forwarded for `/ws/emotion` to work.

## Local development

The old HMR workflow is preserved as an override:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```
