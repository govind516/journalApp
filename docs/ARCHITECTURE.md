# Architecture (MVP — Postgres-only)

```
Browser (React 18 + Vite, :5173 dev / nginx :80 prod)
  │  fetch /api/*, credentials:include (journal_session cookie)
  ▼
Spring Boot 3.3.4 (Java 21, :8000)
  │  SessionAuthFilter -> CurrentUserHolder -> controllers -> services
  ▼
Postgres 16 (:5432, journaldb)
```

There is no cache, queue, or second database in the MVP. No Redis.

## Backend map (`backend/src/main/java/com/journal/`)

* `controller/` — `Auth, Entry, Insights, Ask, Memory, Reflection, Import, Export, Settings, Account, Reminder`. All JSON under `/api`.
* `service/` — `AuthService` (signup/login sessions), `EntryService`, `InsightsService` (streaks/moods/tags), `AskService`, `MemoryService` ("on this day"), `ReflectionService`, `ImportService` + `EntryImportParser`, `BackupService`, `ReminderService` + `ReminderSchema`, `PasswordService`, `BrevoClient` (email), `SentryScrubber`.
* `ai/` — `ReflectionProvider` interface, `LocalReflectionProvider` (reads own entries only), `TextSearch`. No external LLM call in MVP.
* `repository/` + `model/` — JPA: `User`, `Entry`, `Session` (`sessions` table, token PK, `expiresAt`), `SentReminder` (+ `SentReminderId`).
* `filter/SessionAuthFilter.java` — reads `journal_session` cookie, loads `Session` + `User`, sets `util/CurrentUserHolder`.
* `config/CorsConfig.java`, `exception/` (`ApiException`, `GlobalExceptionHandler` -> `dto/ApiError`), `dto/` (~20 request/response types).
* `resources/application.properties` — port `8000`, JDBC `jdbc:postgresql://${DB_HOST:localhost}:5432/${DB_NAME:journaldb}`, `ddl-auto=update`, CORS `http://localhost:5173`, `app.ai.provider=local`.

## Frontend map (`frontend/src/`)

* `pages/` — `Today` (write), `Timeline`, `EntryDetail`, `Calendar`, `Insights`, `Ask`, `Settings`, `Auth`, `Landing`, `Unsubscribe`.
* `components/` — `AppShell`, `CommandPalette`, `ProtectedRoute`, `LockScreen`, `Onboarding`, `PageFade`, `PrivacyCard`, `ImportCard`, `EmberMark`, `ui/*`.
* `lib/` — `api.ts` (`/api` + cookie), `queryClient.ts`, `session.ts`, `drafts.ts`, `syncQueue.ts`, `offlineCache.ts`, `lock.ts`, `dates.ts`, `normalize.ts`, `types.ts`, `theme.tsx`.
* `test/` — vitest + MSW (`server.ts`, `handlers.ts`) suites for auth, today, timeline, offline, settings/import, ask/insights, unsubscribe.
* `vite.config.ts` dev proxy `/api -> 127.0.0.1:8000`; `@` alias; `nginx.conf` SPA fallback in prod image.

## API surface (all under `/api`)

| Area | Endpoints (representative) |
|------|----------------------------|
| Auth | `POST /auth/signup`, `POST /auth/login`, `POST /auth/logout` |
| Entries | `PUT /entries/date/:date`, entry CRUD + detail |
| Insights | `GET /insights` (streaks, moods, tags, badges) |
| Ask | `POST /ask` over own entries |
| Memory | "on this day" lookups |
| Reflection | local provider over own entries |
| Import/Export | `POST /import`, export download |
| Settings/Account | `PATCH /settings`, `DELETE /account` |
| Reminders | reminder CRUD + unsubscribe page |

Auth is cookie-based; every request carries `journal_session`. No `Authorization: Bearer` header.

## What we removed (old stack) and why

The previous committed generation used MongoDB + Redis + Kafka + JWT + Google OAuth + browser E2EE. None of that exists in the current tree, and docs must not reference it as current.

| Removed | Why (MVP) |
|---------|-----------|
| **MongoDB (Atlas)** | Relational model (users/entries/sessions/reminders) fits Postgres + JPA; one database to operate, `ddl-auto=update` for local dev. Revisit only with a document-scale justification. |
| **Redis (Upstash)** | Sessions live in the `sessions` table; no cache/rate-limit needs at MVP scale. Explicitly Postgres-only per product decision — do not add `spring-data-redis` or compose services speculatively. |
| **Kafka (Aiven)** | No async pipeline in MVP; reminders/insights run in-process via `ReminderService`/`InsightsService`. Revisit on real throughput needs. |
| **JWT (stateless)** | Replaced by revocable DB sessions (`Session.expiresAt`, `deleteByToken/UserId`). Simpler logout + account-delete semantics; cost is one session lookup per request. |
| **Google OAuth** | Removed to shrink auth surface; email+password via `PasswordService` only. Revisit with a full OAuth threat/CORS review. |
| **E2EE (AES-256-GCM/PBKDF2)** | Old client encrypted title/content in-browser; current `Entry` content is server-readable plaintext in Postgres. Do not claim E2EE anywhere — it would be false. Revisit as a deliberate crypto feature, not a doc line. |

Related records: `docs/DECISIONS/ADR-001-postgres-sessions.md`, `docs/DECISIONS/ADR-002-no-kafka-mongo.md`.
