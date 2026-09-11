# JournalApp

Monorepo for a personal journaling app: quiet daily writing, timeline/calendar review, insights, memory ("on this day"), ask-your-journal, import/export, and reminders.

Postgres-only MVP. No Redis, no MongoDB, no Kafka.

## Layout

```
journalApp/
  backend/               # Spring Boot 3.3.4 + Java 21 + Postgres
    src/main/java/com/journal/
      controller/        # Auth, Entry, Insights, Ask, Memory, Reflection, Import, Export, Settings, Account, Reminder
      service/           # business logic (Entry, Auth, Insights, Ask, Memory, Reflection, Import, Backup, Reminder, ...)
      ai/                # local reflection provider + text search (no external AI in MVP)
      repository/        # Spring Data JPA (User, Entry, Session, SentReminder)
      model/ dto/ filter/ config/ exception/ util/
    src/main/resources/application.properties
    docker-compose.yml   # local Postgres only
    Dockerfile           # backend image build
  frontend/              # React 18 + Vite 5 + TypeScript + Tailwind 4 + React Query
    src/
      pages/             # Today, Timeline, EntryDetail, Calendar, Insights, Ask, Settings, Auth, Landing, Unsubscribe
      components/        # AppShell, CommandPalette, ProtectedRoute, LockScreen, ui/*
      lib/               # api.ts, queryClient.ts, session.ts, drafts.ts, syncQueue.ts, offlineCache.ts, ...
      test/              # vitest + Testing Library + MSW handlers
    scripts/seed.mjs     # demo-account seeder against a running backend
    nginx.conf           # SPA fallback for the production image
    Dockerfile           # static build -> nginx image
  docs/
    ARCHITECTURE.md
    LOCAL_DEV.md
    DEPLOYMENT.md
    DECISIONS/
  .github/workflows/build.yml
```

## Stack

| Layer | Tech |
|-------|------|
| Backend | Spring Boot 3.3.4, Java 21, Spring Data JPA, Validation |
| DB | Postgres 16 (local via `backend/docker-compose.yml`) |
| Auth | DB-backed sessions (`sessions` table) + `journal_session` HttpOnly cookie |
| Frontend | React 18, Vite 5, TypeScript, Tailwind 4, React Query, React Router 6 |
| Tests | Backend: JUnit (`mvn verify`); Frontend: Vitest + Testing Library + MSW (`npm test`) |

Ports: frontend dev `5173`, backend `8000`, Postgres `5432`.

## Quickstart

Prereqs: JDK 21, Maven 3.9+, Node 22+, Docker (for Postgres).

```bash
# 1. Start Postgres (Postgres-only, no Redis)
docker compose -f backend/docker-compose.yml up -d

# 2. Run backend (http://127.0.0.1:8000)
cd backend
mvn spring-boot:run

# 3. Run frontend in a second terminal (http://localhost:5173)
cd frontend
npm ci
npm run dev
```

Seed a demo account with ~3 months of entries:

```bash
cd frontend
node scripts/seed.mjs http://127.0.0.1:8000
# login: demo@journal.local / journaldemo123
```

See `docs/LOCAL_DEV.md` for details and troubleshooting.

## Environment

Copy the examples — never commit real secrets (root `.gitignore` ignores `*.env`):

```bash
cp backend/.env.example backend/.env        # informational; app reads process env, see backend/README.md
cp frontend/.env.example frontend/.env      # VITE_API_BASE_URL, see frontend/README.md
```

| Var | Where | Default / meaning |
|-----|-------|-------------------|
| `DB_HOST` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` | backend | `localhost` / `journaldb` / `journal` / `journal` |
| `VITE_API_BASE_URL` | frontend | empty in dev (Vite proxies `/api` to `127.0.0.1:8000`); set to backend origin in prod |

## Tests

```bash
cd backend && mvn verify        # backend unit + context tests (needs JDK 21)
cd frontend && npm ci && npm test  # vitest run
cd frontend && npm run build    # tsc + vite build
```

## Docs

* `docs/ARCHITECTURE.md` — system diagram, backend/frontend maps, API surface, and an explicit "What we removed" section (Mongo, Redis, Kafka, JWT, OAuth, E2EE).
* `docs/LOCAL_DEV.md` — day-to-day dev loop, seed script, troubleshooting.
* `docs/DEPLOYMENT.md` — Docker images, env matrix, Nginx SPA notes.
* `docs/DECISIONS/ADR-001-postgres-sessions.md` — why DB sessions instead of JWT/Redis.
* `docs/DECISIONS/ADR-002-no-kafka-mongo.md` — why Postgres-only MVP.
* `backend/README.md`, `frontend/README.md` — per-package run/test reference.
