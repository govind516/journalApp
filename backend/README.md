# Backend — journal-backend

Spring Boot 3.3.4 + Java 21 + Postgres. DB-backed cookie sessions, no JWT, no Redis.

## Requirements

* JDK 21 exactly (the build enforces `[21,22)` — newer JDKs break Mockito inline mocks).
* Maven 3.9+ (wrapper not checked in; use system `mvn`).
* Postgres 16 reachable at `DB_HOST:5432` (local: `docker compose -f docker-compose.yml up -d` from this dir).

## Run

```bash
# from backend/
docker compose up -d          # starts journal-postgres
mvn spring-boot:run           # http://127.0.0.1:8000
```

## Configure

`src/main/resources/application.properties` reads process env with local defaults:

| Var | Default | Notes |
|-----|---------|-------|
| `DB_HOST` | `localhost` | hostname only; port is fixed `5432` in the JDBC URL |
| `DB_NAME` | `journaldb` | |
| `DB_USER` | `journal` | |
| `DB_PASSWORD` | `journal` | use a real secret outside local dev |
| `app.cors.origins` | `http://localhost:5173` | override via env/system property in deployed envs |

Copy for reference (app reads process env, not the file itself):

```bash
cp .env.example .env
```

Other behavior: `server.port=8000`, `ddl-auto=update`, `open-in-view=false`, Hibernate timezone UTC, `app.ai.provider=local`.

## Auth model

* `POST /api/auth/signup` / `/api/auth/login` create a row in `sessions` and set the `journal_session` HttpOnly cookie.
* `SessionAuthFilter` resolves the cookie per request into `CurrentUserHolder`; `POST /api/auth/logout` and `DELETE /api/account` clear/revoke sessions.
* See `docs/DECISIONS/ADR-001-postgres-sessions.md` for why sessions live in Postgres (no Redis in MVP).

## Build & test

```bash
mvn verify        # compiles, runs JUnit suite incl. ContextLoadsTest
mvn -q package -DskipTests   # jar used by Dockerfile (multi-stage maven -> temurin 21-jre)
```

Tests live under `src/test/java/com/journal/` (`ai/`, `service/`).

## Docker

`Dockerfile` is a two-stage build (`maven:3.9.9-eclipse-temurin-21` -> `eclipse-temurin:21-jre-alpine`, exposes `8000`). Build with context = this directory:

```bash
docker build -t journal-backend .
```

`docker-compose.yml` in this directory is **Postgres-only** (volume `journal_pg_data`) for local dev. Full app composition is described in `docs/DEPLOYMENT.md`.
