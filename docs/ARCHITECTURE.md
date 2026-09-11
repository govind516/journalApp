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

## Rate limiting (auth endpoints)

`filter/AuthRateLimitFilter.java` (runs ahead of `SessionAuthFilter`) + `service/AuthRateLimiter.java` (Bucket4j, in-memory):

| Endpoint | Key | Budget |
|----------|-----|--------|
| `POST /api/auth/login` | client IP | 10/min |
| `POST /api/auth/login` | email (`strip().toLowerCase()`, same as `AuthService`) | 10/min |
| `POST /api/auth/signup` | client IP | 10/hour |

Over budget → `429` with the standard `ApiError` body and a `Retry-After` header, identical regardless of whether the attempt would have succeeded. `X-Forwarded-For` is honored only when `app.trust-proxy=true` (default `false`). Caveats: buckets live in JVM memory — **state resets on restart and is not shared across replicas**; horizontal scale requires a shared store (new ADR).

### Open hardening follow-ups

* **CSP `connect-src` (phase 2):** the nginx Report-Only policy leaves `connect-src` unrestricted because the prod API origin is only known at frontend build time. Tightening it needs build-time origin templating (e.g. an nginx entrypoint envsubst step); flip Report-Only to enforcing only after clean browser-console verification across all pages.
* **Signup enumeration (accepted, low severity):** `POST /api/auth/signup` returns `409 "An account with that email already exists"` for registered addresses — a confirmed, deliberate finding, not an oversight. Accepted as-is: the disclosed fact (an email has an account here) is low-sensitivity, and neutralizing it now would dead-end legitimate users (a mistaken signup instead of login gets actionable feedback today; a generic "check email" response would promise a reset flow that doesn't exist). Revisit trigger: when a password-reset/forgot-password flow is built, make it generic-from-day-one and reconsider neutralizing signup's 409 at the same time, so both flows land consistent together. For completeness: login is already uniform (identical 401 both ways), so the asymmetry is signup-only, not app-wide.

## What we removed (old stack) and why

The previous committed generation used MongoDB + Redis + Kafka + JWT + Google OAuth + browser E2EE. None of that exists in the current tree, and docs must not reference it as current.

| Removed | Why (MVP) |
|---------|-----------|
| **MongoDB (Atlas)** | Relational model (users/entries/sessions/reminders) fits Postgres + JPA; one database to operate, `ddl-auto=update` for local dev. Revisit only with a document-scale justification. |
| **Redis (Upstash)** | Sessions live in the `sessions` table; the only rate limiting is in-memory buckets (see above). Explicitly Postgres-only per product decision — do not add `spring-data-redis` or compose services speculatively. |
| **Kafka (Aiven)** | No async pipeline in MVP; reminders/insights run in-process via `ReminderService`/`InsightsService`. Revisit on real throughput needs. |
| **JWT (stateless)** | Replaced by revocable DB sessions (`Session.expiresAt`, `deleteByToken/UserId`). Simpler logout + account-delete semantics; cost is one session lookup per request. |
| **Google OAuth** | Removed to shrink auth surface; email+password via `PasswordService` only. Revisit with a full OAuth threat/CORS review. |
| **E2EE (AES-256-GCM/PBKDF2)** | Old client encrypted title/content in-browser; current `Entry` content is server-readable plaintext in Postgres. Do not claim E2EE anywhere — it would be false. Revisit as a deliberate crypto feature, not a doc line. |

Related records: `docs/DECISIONS/ADR-001-postgres-sessions.md`, `docs/DECISIONS/ADR-002-no-kafka-mongo.md`.
