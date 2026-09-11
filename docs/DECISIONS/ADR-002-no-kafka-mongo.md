# ADR-002: Postgres-only persistence (no MongoDB, no Kafka)

* Status: accepted (MVP)
* Date: 2026-09-10

## Context

The old tree ran MongoDB (Atlas), Redis (Upstash), and Kafka (Aiven) with schedulers/consumers (`UserScheduler`, `SentimentConsumerService`), weather/quote integrations, and E2EE'd journal payloads. The current tree persists `User`, `Entry`, `Session`, `SentReminder` via Spring Data JPA to Postgres, with reminders/insights computed in-process (`ReminderService`, `InsightsService`) and local-only journal intelligence (`ai/LocalReflectionProvider`, `ai/TextSearch`).

## Decision

Ship the MVP on Postgres alone. Do not add MongoDB, Kafka (or an external queue), Redis, Google OAuth, or E2EE claims in code, compose, CI, or docs.

## Consequences

* `+` One database, one local service, one backup story; matches the relational shape (users -> entries/sessions/reminders).
* `+` No cloud-vendor setup (Atlas/Upstash/Aiven) for dev or deploy; deleted `DEPLOYMENT_ACTIONS.md` stays deleted.
* `-` `ddl-auto=update` is not real migrations — Flyway/Liquibase needed before production data matters.
* `-` In-process reminders/insights don't scale horizontally yet; acceptable until measured.

## Revisit when

A concrete need appears: document-shaped scale for Mongo, measured async throughput for Kafka, cross-service cache for Redis, SSO demand for OAuth, or a full crypto design review for E2EE. Each returns as its own ADR with code, not just docs.
