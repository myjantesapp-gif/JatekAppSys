#!/bin/bash
# Smoke-test the bundled production API server.
#
# Boots artifacts/api-server/dist/index.mjs in NODE_ENV=production on a random
# free port, waits for the "Server listening" log, then curls the routes the
# deployment relies on (/admin SPA, API health). Any non-200 or a server crash
# on startup fails the script with a clear error so broken production builds
# are caught before they ship.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVER_ENTRY="$ROOT_DIR/artifacts/api-server/dist/index.mjs"
ADMIN_INDEX="$ROOT_DIR/artifacts/backend-dashboard/dist/public/index.html"
LANDING_INDEX="$ROOT_DIR/artifacts/jatek-landing/dist/public/index.html"

fail() {
  echo "[smoke] FAIL: $*" >&2
  exit 1
}

[ -f "$SERVER_ENTRY" ]  || fail "missing $SERVER_ENTRY — run scripts/build-production.sh first"
[ -f "$ADMIN_INDEX" ]   || fail "missing $ADMIN_INDEX — backend-dashboard build did not produce dist/public/index.html"
[ -f "$LANDING_INDEX" ] || fail "missing $LANDING_INDEX — jatek-landing build did not produce dist/public/index.html"

# Pick a free random port (high range to avoid collisions with running dev workflows).
PORT="$(node -e 'const s=require("net").createServer();s.listen(0,()=>{const p=s.address().port;s.close(()=>console.log(p));});')"
LOG_FILE="$(mktemp -t smoke-prod-XXXXXX.log)"

echo "[smoke] Starting production server on port $PORT (logs: $LOG_FILE)"

# Start under NODE_ENV=production with a stub DATABASE_URL only if not already
# set — the smoke test does not exercise the DB, but the bundle may import
# modules that read it at construction time.
export NODE_ENV=production
export PORT
export DATABASE_URL="${DATABASE_URL:-postgres://smoke:smoke@127.0.0.1:5/smoke}"
# auth.ts hard-fails when NODE_ENV=production and SESSION_SECRET is missing.
export SESSION_SECRET="${SESSION_SECRET:-smoke-test-session-secret-not-used}"

node "$SERVER_ENTRY" >"$LOG_FILE" 2>&1 &
SERVER_PID=$!

cleanup() {
  if kill -0 "$SERVER_PID" 2>/dev/null; then
    kill -TERM "$SERVER_PID" 2>/dev/null || true
    # Give the server up to 10s to shut down cleanly, then SIGKILL.
    for _ in $(seq 1 20); do
      kill -0 "$SERVER_PID" 2>/dev/null || break
      sleep 0.5
    done
    if kill -0 "$SERVER_PID" 2>/dev/null; then
      echo "[smoke] server did not exit on SIGTERM, sending SIGKILL" >&2
      kill -KILL "$SERVER_PID" 2>/dev/null || true
    fi
  fi
  rm -f "$LOG_FILE"
}
trap cleanup EXIT

# Wait up to 30s for "Server listening" or for the process to die.
READY=0
for _ in $(seq 1 60); do
  if grep -q "Server listening" "$LOG_FILE"; then
    READY=1
    break
  fi
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    break
  fi
  sleep 0.5
done

if [ "$READY" -ne 1 ]; then
  echo "[smoke] --- server log ---" >&2
  cat "$LOG_FILE" >&2
  echo "[smoke] --- end log ---" >&2
  fail "server did not log 'Server listening' within 30s (likely crashed at startup)"
fi

BASE_URL="http://127.0.0.1:$PORT"

check() {
  local path="$1"
  local url="$BASE_URL$path"
  local code
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$url" || echo "000")"
  if [ "$code" != "200" ]; then
    echo "[smoke] --- server log ---" >&2
    cat "$LOG_FILE" >&2
    echo "[smoke] --- end log ---" >&2
    fail "GET $path returned HTTP $code (expected 200)"
  fi
  echo "[smoke]   GET $path → 200"
}

echo "[smoke] Probing routes…"
check "/"
check "/admin/"
check "/api/healthz"
check "/health"

echo "[smoke] OK — production bundle boots and serves all expected routes."
