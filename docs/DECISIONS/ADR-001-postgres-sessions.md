# ADR-001: DB-backed sessions in Postgres (no JWT, no Redis)

* Status: accepted (MVP)
* Date: 2026-09-10

## Context

The old tree used stateless JWT (`JwtUtil`, `JwtFilter`) plus Redis (`RedisConfig`, `AppCache`, `RedisService`) for cache/sessions. The current tree has neither: `backend/pom.xml` has no `jjwt`/`spring-data-redis`, and `backend/docker-compose.yml` is Postgres-only. Auth is `Session` rows + `journal_session` HttpOnly cookie via `filter/SessionAuthFilter.java` and `service/AuthService.java`.

## Decision

Keep sessions in Postgres for the MVP. No JWT issuance/validation, no Redis session store.

## Consequences

* `+` Logout and account-delete are trivial revocation (`deleteByToken`, `deleteByUserId`); no token-blocklist problem.
* `+` One fewer service to run, back up, and pay for; local dev is `docker compose up -d` for Postgres only.
* `-` One DB lookup per authenticated request (`SessionRepository.findById` + user load); fine at MVP scale, revisit with caching if measured.
* `-` Cookie/CORS discipline required (`credentials: include`, allowed origins, `Secure`/`SameSite` in prod) instead of `Authorization` headers.

## Revisit when

Measured session-lookup latency matters, horizontal scale demands shared/external sessions, or a native-mobile client genuinely needs bearer tokens. Then evaluate an external session store — not speculative token claims.
