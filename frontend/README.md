# Frontend — journal-frontend

React 18 + Vite 5 + TypeScript + Tailwind 4 + React Query + React Router 6.

## Requirements

* Node 22+ (Docker build uses `node:22-alpine`).
* Backend reachable for dev proxy (`http://127.0.0.1:8000` by default).

## Scripts

```bash
npm ci            # install (CI uses this, not npm install)
npm run dev       # Vite dev server on http://localhost:5173
npm run build     # tsc -b && vite build -> dist/
npm run preview   # serve dist/ locally
npm test          # vitest run (jsdom, see vitest.config.ts + src/test/setup.ts)
npm run seed      # node scripts/seed.mjs (demo data, needs backend up)
```

Path alias: `@` -> `./src` (see `vite.config.ts`, `vitest.config.ts`, `tsconfig.json`).

## API wiring

* All calls go through `src/lib/api.ts` as `/api/*` with `credentials: "include"` (session cookie).
* Dev: `vite.config.ts` proxies `/api` to `http://127.0.0.1:8000` when `VITE_API_BASE_URL` is empty.
* Prod: set `VITE_API_BASE_URL` to the backend origin at **build time** (baked by `Dockerfile` `ARG`):

```bash
cp .env.example .env
# .env: VITE_API_BASE_URL=""          (dev, use proxy)
# .env: VITE_API_BASE_URL=https://api.example.com  (prod build)
```

`nginx.conf` serves `dist/` as an SPA (`try_files ... /index.html`). The commented `/api/` `proxy_pass` block is an optional alternative to `VITE_API_BASE_URL` when frontend and backend share a compose network — see `docs/DEPLOYMENT.md`.

## Regenerating API types

Backend types are generated from the live OpenAPI spec (dev profile only — docs are disabled in prod):

```bash
# backend must be running locally first (dev profile, serves /api-docs)
npm run codegen   # -> src/api/generated/schema.d.ts (openapi-typescript)
```

Re-run whenever backend DTOs or endpoints change and commit the regenerated file with the backend change. The generated types are not yet wired into `src/lib/api.ts` or components — that migration is a separate task.

## Seeding demo data

```bash
# backend must be running first
node scripts/seed.mjs [backend-origin, default http://127.0.0.1:8000]
# then log in as demo@journal.local / journaldemo123
```

The seeder signs up (or logs in on `409`), writes ~3 months of entries via `PUT /api/entries/date/:date`, and prints streak stats from `/api/insights`.

## Tests

Vitest + Testing Library + MSW (`src/test/server.ts`, `handlers.ts`). Suites cover auth, today, timeline, offline queue, settings/import, ask/insights, unsubscribe, normalize, app load. Run:

```bash
npm test
```

## End-to-end tests (Playwright, real stack)

`e2e/` runs 4 specs (auth journey, auth-error parity, login rate limit, entry CRUD) against the compose stack — real Postgres + backend, no mocks. Serial (`workers: 1`): specs share the backend's in-memory rate-limit budget, so later specs are budget-aware and `rate-limit` runs last. Not in CI (no compose job there yet — follow-up).

```bash
# from frontend/
npm run e2e   # sh ../scripts/e2e.sh: rebuilds + starts compose, restarts backend
              # for deterministic budgets, waits for health, runs playwright
```

## Docker

`Dockerfile`: `node:22-alpine` build (`ARG VITE_API_BASE_URL`) -> `nginx:alpine` static. Build with context = this directory:

```bash
docker build --build-arg VITE_API_BASE_URL=https://api.example.com -t journal-frontend .
```
