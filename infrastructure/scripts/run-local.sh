#!/usr/bin/env bash
# Start local stack: Postgres/Redis (Docker), API, admin web, member app (Chrome).
#
# Usage (from repo root):
#   ./infrastructure/scripts/run-local.sh
#   ./infrastructure/scripts/run-local.sh --no-docker   # skip compose (DB already up)
#   ./infrastructure/scripts/run-local.sh --seed        # also run npm run seed:demo once
#
# Defaults:
#   API     http://localhost:3000/api/v1
#   Admin   http://localhost:8080   (Chrome)
#   Member  http://localhost:9000   (Chrome)
#
# Env overrides: ADMIN_PORT, MOBILE_PORT, API_BASE_URL, APP_ENV, SKIP_PUB_GET=1
#
# Ctrl+C stops Flutter apps and the API this script started.
# Demo logins (after seed:demo):
#   Admin  demo.admin@example.test / DemoPassw0rd!
#   Member alex.tan@example.test   / DemoPassw0rd!

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
API_DIR="$ROOT/apps/api"
ADMIN_DIR="$ROOT/apps/admin"
MOBILE_DIR="$ROOT/apps/mobile"
LOG_DIR="${TMPDIR:-/tmp}/campaign-local"
APP_ENV="${APP_ENV:-development}"
API_BASE_URL="${API_BASE_URL:-http://localhost:3000/api/v1}"
ADMIN_PORT="${ADMIN_PORT:-8080}"
MOBILE_PORT="${MOBILE_PORT:-9000}"

SKIP_DOCKER=0
DO_SEED=0
API_PID=""
ADMIN_PID=""
MOBILE_PID=""
STARTED_API=0

die() {
  printf 'error: %s\n' "$*" >&2
  exit 1
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "missing command: $1"
}

api_healthy() {
  curl -fsS "$API_BASE_URL/health" >/dev/null 2>&1
}

cleanup() {
  local code=$?
  trap - EXIT INT TERM
  echo
  echo "→ stopping local processes…"
  if [[ -n "$MOBILE_PID" ]] && kill -0 "$MOBILE_PID" 2>/dev/null; then
    kill "$MOBILE_PID" 2>/dev/null || true
  fi
  if [[ -n "$ADMIN_PID" ]] && kill -0 "$ADMIN_PID" 2>/dev/null; then
    kill "$ADMIN_PID" 2>/dev/null || true
  fi
  if [[ "$STARTED_API" -eq 1 && -n "$API_PID" ]] && kill -0 "$API_PID" 2>/dev/null; then
    kill "$API_PID" 2>/dev/null || true
  fi
  wait 2>/dev/null || true
  exit "$code"
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --no-docker) SKIP_DOCKER=1 ;;
      --seed) DO_SEED=1 ;;
      -h|--help)
        sed -n '2,20p' "$0"
        exit 0
        ;;
      *) die "unknown arg: $1 (try --help)" ;;
    esac
    shift
  done
}

start_docker() {
  if [[ "$SKIP_DOCKER" -eq 1 ]]; then
    echo "→ skip docker (--no-docker)"
    return
  fi
  need_cmd docker
  echo "→ docker compose up -d --wait"
  (cd "$ROOT" && docker compose up -d --wait)
}

start_api() {
  need_cmd npm
  if api_healthy; then
    echo "→ API already healthy at $API_BASE_URL"
    return
  fi

  if [[ ! -d "$API_DIR/node_modules" ]]; then
    echo "→ npm install (apps/api)"
    (cd "$API_DIR" && npm install)
  fi

  if [[ "$DO_SEED" -eq 1 ]]; then
    echo "→ npm run seed:demo"
    (cd "$API_DIR" && npm run seed:demo)
  fi

  echo "→ API start:dev (log: $LOG_DIR/api.log)"
  (
    cd "$API_DIR"
    npm run start:dev
  ) >"$LOG_DIR/api.log" 2>&1 &
  API_PID=$!
  STARTED_API=1

  local i
  for i in $(seq 1 60); do
    if api_healthy; then
      echo "→ API ready"
      return
    fi
    if ! kill -0 "$API_PID" 2>/dev/null; then
      tail -n 40 "$LOG_DIR/api.log" >&2 || true
      die "API exited before becoming healthy — see $LOG_DIR/api.log"
    fi
    sleep 1
  done
  tail -n 40 "$LOG_DIR/api.log" >&2 || true
  die "API did not become healthy within 60s — see $LOG_DIR/api.log"
}

start_flutter_web() {
  local name="$1"
  local dir="$2"
  local port="$3"
  local logfile="$4"

  if [[ "${SKIP_PUB_GET:-0}" != "1" ]]; then
    echo "→ flutter pub get ($name)" >&2
    (cd "$dir" && flutter pub get) >&2
  fi

  if [[ ! -d "$dir/web" ]]; then
    die "$name has no web/ platform. Run: (cd $dir && flutter create --platforms=web .)"
  fi

  echo "→ $name on http://localhost:$port (log: $logfile)" >&2
  (
    cd "$dir"
    flutter run -d chrome \
      --web-port="$port" \
      --dart-define="APP_ENV=$APP_ENV" \
      --dart-define="API_BASE_URL=$API_BASE_URL"
  ) >"$logfile" 2>&1 &
  printf '%s\n' "$!"
}

main() {
  parse_args "$@"
  need_cmd flutter
  need_cmd curl
  mkdir -p "$LOG_DIR"
  trap cleanup EXIT INT TERM

  start_docker
  start_api

  ADMIN_PID="$(start_flutter_web admin "$ADMIN_DIR" "$ADMIN_PORT" "$LOG_DIR/admin.log")"
  MOBILE_PID="$(start_flutter_web mobile "$MOBILE_DIR" "$MOBILE_PORT" "$LOG_DIR/mobile.log")"

  echo
  echo "Local stack running:"
  echo "  API     $API_BASE_URL"
  echo "  Admin   http://localhost:$ADMIN_PORT"
  echo "  Member  http://localhost:$MOBILE_PORT"
  echo "  Logs    $LOG_DIR/"
  echo
  echo "Press Ctrl+C to stop."
  echo

  # Keep script alive while children run; surface a crash.
  while true; do
    if [[ -n "$ADMIN_PID" ]] && ! kill -0 "$ADMIN_PID" 2>/dev/null; then
      tail -n 40 "$LOG_DIR/admin.log" >&2 || true
      die "admin Flutter process exited — see $LOG_DIR/admin.log"
    fi
    if [[ -n "$MOBILE_PID" ]] && ! kill -0 "$MOBILE_PID" 2>/dev/null; then
      tail -n 40 "$LOG_DIR/mobile.log" >&2 || true
      die "mobile Flutter process exited — see $LOG_DIR/mobile.log"
    fi
    if [[ "$STARTED_API" -eq 1 && -n "$API_PID" ]] && ! kill -0 "$API_PID" 2>/dev/null; then
      tail -n 40 "$LOG_DIR/api.log" >&2 || true
      die "API process exited — see $LOG_DIR/api.log"
    fi
    sleep 2
  done
}

main "$@"
