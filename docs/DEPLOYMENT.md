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

A. **Direct (default):** frontend built with `VITE_API_BASE_URL=https://api.example.com`; browser calls the backend origin directly with cookies. Backend CORS must allow the frontend origin; session cookies are `SameSite=Lax` with `Secure` driven by profile (`false` default/local, `true` under `SPRING_PROFILES_ACTIVE=prod`).

B. **Same-origin proxy:** serve frontend and proxy `/api/` to `http://backend:8000` (see commented block in `frontend/nginx.conf`). Then build frontend with empty `VITE_API_BASE_URL` and keep the Vite proxy dev-only.

## Required env

Backend (process env, same names as `application.properties` placeholders):

| Var | Example |
|-----|---------|
| `DB_HOST` | `postgres.internal` (hostname; port fixed `5432`) |
| `DB_NAME` | `journaldb` |
| `DB_USER` | `journal` |
| `DB_PASSWORD` | `<secret>` (never commit; root `.gitignore` covers `*.env`) |
| `SPRING_PROFILES_ACTIVE` | `prod` (prod only; activates Secure cookies + prod CORS) |
| `APP_CORS_ORIGINS_PROD` | e.g. `https://app.example.com` — REQUIRED in prod, no default; boot fails fast if unset |
| `REMINDER_SIGNING_SECRET` | REQUIRED in prod (signs unsubscribe links); boot refuses to start without it — same fail-fast pattern |

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

* `spring.jpa.hibernate.ddl-auto=validate` + Flyway (`backend/src/main/resources/db/migration/`, baseline `V1__initial_schema.sql`) own the schema; never hand-edit applied migrations.
* `backend/docker-compose.yml` is local-Postgres-only; full-stack local orchestration lives in root `compose.yml`.
