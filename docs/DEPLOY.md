# Deploy: Render (backend) + Vercel (frontend)

Manual dashboard work — no accounts, services, or secrets are created from
this repo. Read the two-pass order first: the backends and frontend need
each other's URLs, so this takes two passes by design.

## Pass 1 — Render backend + Postgres

1. Dashboard → Blueprints → New Blueprint → connect the GitHub repo.
   Review the plan preview from `render.yaml` (service plans/regions are
   starting suggestions — adjust before confirming).
2. Create the `journaldb` Postgres resource from the blueprint.
3. Create the `journal-backend` web service from the blueprint. The image
   is private on GHCR: when Render asks for registry access, connect with
   a GitHub personal access token that has `read:packages` scope.
4. Health check path is `/actuator/health`; the service should report
   healthy with no env secrets yet (Flyway migrates the empty database on
   first boot).
5. Generate the signing secret locally (run this on your machine — never
   commit the output anywhere):

   ```bash
   openssl rand -base64 32
   ```

6. Set `REMINDER_SIGNING_SECRET` to that value in the service environment.
   Leave `APP_CORS_ORIGINS_PROD` empty for now — the frontend URL doesn't
   exist yet. Note the backend's public URL (`https://<name>.onrender.com`).

## Pass 2 — Vercel frontend

1. Import the same GitHub repo. Set **Root Directory to `frontend/`** —
   without this Vercel looks at the repo root and finds no app. Framework
   preset (Vite) and build settings are auto-detected from there.
2. Environment variable: `VITE_API_BASE_URL=https://<backend>.onrender.com`
   (the URL from pass 1). This is baked at build time — changing it later
   requires a redeploy. Then deploy and note the frontend URL.

## Pass 3 — close the loop

1. Back in Render, set `APP_CORS_ORIGINS_PROD=https://<frontend-url>` and
   redeploy the backend. Until this is set, the backend refuses to boot
   (fail-fast by design) — and until it matches the real frontend origin,
   browsers will block every API call.
2. Verify live: open the frontend, sign up, create an entry, reload. Then
   confirm the session cookie in devtools shows `SameSite=None; Secure`
   (required for Vercel→Render cross-site requests) and that logout +
   re-login works.
