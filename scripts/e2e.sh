#!/bin/sh
# Full-stack E2E runner: rebuild + start the compose stack, restart the
# backend once for deterministic rate-limit budgets (in-memory buckets),
# then run Playwright. Run from the repo root: sh scripts/e2e.sh
set -eu
cd "$(dirname "$0")/.."

docker compose up -d --build

echo "[e2e] waiting for backend health..."
for i in $(seq 1 60); do
  if curl -sf http://localhost:8000/actuator/health >/dev/null 2>&1; then
    break
  fi
  sleep 2
done
curl -sf http://localhost:8000/actuator/health >/dev/null

echo "[e2e] restarting backend for deterministic rate-limit budgets..."
docker compose restart backend
for i in $(seq 1 60); do
  if curl -sf http://localhost:8000/actuator/health >/dev/null 2>&1; then
    break
  fi
  sleep 2
done
curl -sf http://localhost:8000/actuator/health >/dev/null

cd frontend
npx playwright test
