# ADR-003: One Postgres story — root compose pg16, no backend/docker-compose.yml

* Status: accepted (implemented in `9110938`)
* Date: 2026-09-11

## Context

Three Postgres stories had accumulated: a long-running `postgres:15` container on host 5432 (used by `mvn verify` and local runs), `backend/docker-compose.yml` (also `postgres:15`-era, `container_name: journal-postgres`, host port 5432 — unstartable while the old container lived, and referenced by nothing), and the new root `compose.yml` running `postgres:16-alpine` as `journal-postgres-app` with no host port. Local runs and tests silently depended on the stale pg15 instance while compose standardized on pg16 — a version skew plus a name/port collision.

## Decision

Delete `backend/docker-compose.yml`; standardize local dev and tests on the root compose `postgres:16` service. The old pg15 container was inspected first (seed demo account + two empty signup smoke-test accounts + login churn — disposable, regenerable via `seed.mjs`) and removed. `LOCAL_DEV.md` now starts Postgres via root compose, with the host-port mapping documented as opt-in for backend-only iteration. `mvn verify` was re-confirmed green against pg16 with no code changes required.

## Consequences

* `+` Exactly one database definition, one version (16), no name/port collisions.
* `+` Tests and local runs exercise the same major version compose ships.
* `-` Backend-only iteration needs the ports override (or the uncommented mapping) since root compose publishes no host port by default — documented, but one more step than before.
* `-` The old pg15 dev data is gone (judged disposable at removal time; noted here so the call is reviewable).

## Revisit when

A second database is genuinely needed (read replica, analytics store) — that returns as its own proposal, not as a second compose file for the same DB.
