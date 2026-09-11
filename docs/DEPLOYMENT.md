# Deployment

Two images + managed Postgres. No Redis, no Kafka, no Mongo to provision.

## Images

Build each package with its own directory as context (Dockerfiles assume this):

```bash
docker build -t journal-backend ./backend
docker build --build-arg VITE_API_BASE_URL=https://api.example.com -t journal-frontend ./frontend
```

* Backend: multi-stage `maven -> temurin:21-jre-alpine`, `ENTRYPOINT java -jar app.jar`, listens `8000`.
* Frontend: multi-stage `node:22-alpine -> nginx:alpine`; `VITE_API_BASE_URL` is baked at build time; `nginx.conf` falls back to `index.html` for SPA routes.

## Production wiring (pick one API strategy)

A. **Direct (default):** frontend built with `VITE_API_BASE_URL=https://api.example.com`; browser calls the backend origin directly with cookies. Backend CORS must allow the frontend origin; cookies need `Secure`/`SameSite` appropriate to same-site vs cross-site (separate hardening task).

B. **Same-origin proxy:** serve frontend and proxy `/api/` to `http://backend:8000` (see commented block in `frontend/nginx.conf`). Then build frontend with empty `VITE_API_BASE_URL` and keep the Vite proxy dev-only.

## Required env

Backend (process env, same names as `application.properties` placeholders):

| Var | Example |
|-----|---------|
| `DB_HOST` | `postgres.internal` (hostname; port fixed `5432`) |
| `DB_NAME` | `journaldb` |
| `DB_USER` | `journal` |
| `DB_PASSWORD` | `<secret>` (never commit; root `.gitignore` covers `*.env`) |

Frontend (build arg / build-time env):

| Var | Example |
|-----|---------|
| `VITE_API_BASE_URL` | `https://api.example.com` (strategy A) or `""` (strategy B) |

No `REDIS_URL`, `MONGODB_URI`, `KAFKA_*`, `JWT_SECRET`, or OAuth client vars exist in this tree — if a host dashboard asks for them, it is following the deleted `DEPLOYMENT_ACTIONS.md`.

## CI

`.github/workflows/build.yml` runs two jobs on push/PR:

* `backend` — JDK 21, `mvn -B verify` with `working-directory: backend`, plus Sonar (`SONAR_TOKEN`, project `springboot-projects_journalapp`) on `master`.
* `frontend` — Node 22, `npm ci`, `npm test` (`vitest run`), `npm run build`.

Docker image builds are manual for now (no registry push in CI).

## Notes

* `spring.jpa.hibernate.ddl-auto=update` is convenient for MVP but not a migration strategy — introduce Flyway/Liquibase before production writes matter.
* `backend/docker-compose.yml` is local-Postgres-only; production compose (postgres volume, backend, frontend, healthchecks) is a separate infra task and intentionally not in this doc change.
