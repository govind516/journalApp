# Local development

Postgres-only. No Redis to start.

## Prereqs

* JDK 21, Maven 3.9+, Node 22+, Docker.

## 1. Start Postgres

```bash
docker compose -f backend/docker-compose.yml up -d
docker compose -f backend/docker-compose.yml ps   # journal-postgres on 5432
```

Defaults match `backend/src/main/resources/application.properties`: db `journaldb`, user/password `journal`/`journal`. To override: `DB_HOST / DB_NAME / DB_USER / DB_PASSWORD` in the backend process env.

## 2. Run backend

```bash
cd backend
mvn spring-boot:run
# -> http://127.0.0.1:8000
```

Sanity: unauthenticated `GET http://127.0.0.1:8000/api/insights` should return `401` JSON (`ApiError`), not a connection error.

## 3. Run frontend

```bash
cd frontend
npm ci
npm run dev
# -> http://localhost:5173
```

Dev API routing: empty `VITE_API_BASE_URL` + `vite.config.ts` proxy (`/api -> 127.0.0.1:8000`) with `credentials: include`. No frontend env needed for the default loop; see `frontend/.env.example`.

## 4. Seed demo data (optional)

```bash
cd frontend
node scripts/seed.mjs http://127.0.0.1:8000
```

Logs in (or signs up) `demo@journal.local / journaldemo123`, writes entries via `PUT /api/entries/date/:date`, prints `streak/longest/entries` from `/api/insights`.

## 5. Tests

```bash
cd backend && mvn verify
cd frontend && npm test
cd frontend && npm run build   # tsc + vite, catches type errors CI would catch
```

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Connection to localhost:5432 refused` | `docker compose -f backend/docker-compose.yml up -d`; check `DB_HOST` (hostname only, port fixed in JDBC URL). |
| `Build requires JDK 21` (enforcer) | `export JAVA_HOME=<jdk-21>`; `java -version` must be 21.x. |
| Frontend `Failed to fetch /api/*` | Backend not on `8000`, or `VITE_API_BASE_URL` set to a stale origin — unset it for proxy mode. |
| `401` on every page after login | Cookies blocked (private window / cross-origin without backend CORS for that origin). Keep dev on `localhost:5173` (allowed by default). |
| Stale `dist/` served | `npm run build` after pulling; `npm run preview` only serves last build. |
