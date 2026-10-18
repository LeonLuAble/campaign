#!/usr/bin/env bash
# Build and run the participant mobile app against a local API.
#
# Usage:
#   ./infrastructure/scripts/run-mobile.sh              # pick first phone/emulator
#   ./infrastructure/scripts/run-mobile.sh android       # Android emulator / device
#   ./infrastructure/scripts/run-mobile.sh ios           # iOS Simulator / device
#   ./infrastructure/scripts/run-mobile.sh <device-id>   # exact flutter devices id
#   ./infrastructure/scripts/run-mobile.sh --list        # list devices and exit
#
# Prerequisites (separate terminals if needed):
#   1. docker compose up -d --wait          # Postgres + Redis
#   2. cd apps/api && npm run start:dev     # API on :3000
#   3. Optional once: npm run seed:demo     # demo.admin / alex.tan @example.test
#
# After launch, leave this process running:
#   r  hot reload   (most Dart UI changes)
#   R  hot restart  (state / initState / routing)
#   q  quit
# Re-run this script for a clean rebuild after pubspec or native changes.
#
# Env overrides:
#   API_BASE_URL   default: localhost for iOS, 10.0.2.2 for Android emulator
#   APP_ENV        default: development
#   SKIP_PUB_GET=1 skip flutter pub get
#   DEVICE_TIMEOUT seconds to wait for devices (default 10)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
MOBILE="$ROOT/apps/mobile"
APP_ENV="${APP_ENV:-development}"
DEVICE_TIMEOUT="${DEVICE_TIMEOUT:-10}"

die() {
  printf 'error: %s\n' "$*" >&2
  exit 1
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "missing command: $1"
}

list_devices() {
  flutter devices --device-timeout="$DEVICE_TIMEOUT"
}

# Returns device ids (one per line) that look like phones/tablets/emulators.
phone_device_ids() {
  flutter devices --machine --device-timeout="$DEVICE_TIMEOUT" \
    | python3 -c '
import json, sys
rows = json.load(sys.stdin)
for row in rows:
    target = (row.get("targetPlatform") or "").lower()
    name = (row.get("name") or "").lower()
    did = row.get("id") or ""
    if not did:
        continue
    if target.startswith("android") or target.startswith("ios"):
        print(did)
        continue
    # Some toolchains report simulator/emulator without a clear platform tag.
    if "emulator" in name or "simulator" in name:
        print(did)
'
}

is_android_id() {
  local id="$1"
  flutter devices --machine --device-timeout="$DEVICE_TIMEOUT" \
    | python3 -c '
import json, sys
want = sys.argv[1]
for row in json.load(sys.stdin):
    if row.get("id") == want:
        target = (row.get("targetPlatform") or "").lower()
        name = (row.get("name") or "").lower()
        sys.exit(0 if target.startswith("android") or "emulator" in name else 1)
sys.exit(1)
' "$id"
}

resolve_device() {
  local arg="${1:-}"
  if [[ -z "$arg" ]]; then
    local ids
    ids="$(phone_device_ids || true)"
    if [[ -z "$ids" ]]; then
      die "no Android/iOS device found.
Start an Android emulator (Android Studio) or an iOS Simulator, then re-run.
Or pass a device id from: $0 --list"
    fi
    printf '%s\n' "$ids" | head -n 1
    return
  fi

  case "$arg" in
    android|Android)
      local id
      id="$(phone_device_ids | while read -r candidate; do
        if is_android_id "$candidate"; then
          printf '%s\n' "$candidate"
          break
        fi
      done)"
      [[ -n "$id" ]] || die "no Android device/emulator connected.
Open Android Studio → Device Manager → start an emulator, then re-run."
      printf '%s\n' "$id"
      ;;
    ios|iOS)
      local id
      id="$(phone_device_ids | while read -r candidate; do
        if ! is_android_id "$candidate"; then
          printf '%s\n' "$candidate"
          break
        fi
      done)"
      [[ -n "$id" ]] || die "no iOS Simulator/device connected.
Open Simulator.app or plug in a device, then re-run."
      printf '%s\n' "$id"
      ;;
    *)
      printf '%s\n' "$arg"
      ;;
  esac
}

default_api_base() {
  local id="$1"
  if is_android_id "$id"; then
    # Android emulator loopback to the host machine.
    printf 'http://10.0.2.2:3000/api/v1'
  else
    printf 'http://localhost:3000/api/v1'
  fi
}

main() {
  need_cmd flutter
  need_cmd python3

  if [[ "${1:-}" == "--list" || "${1:-}" == "-l" ]]; then
    list_devices
    exit 0
  fi

  local device_arg="${1:-}"
  if [[ $# -gt 0 ]]; then
    shift
  fi

  cd "$MOBILE"

  if [[ "${SKIP_PUB_GET:-0}" != "1" ]]; then
    echo "→ flutter pub get"
    flutter pub get
  fi

  local device
  device="$(resolve_device "$device_arg")"
  local api_base="${API_BASE_URL:-$(default_api_base "$device")}"

  echo "→ device: $device"
  echo "→ API_BASE_URL=$api_base"
  echo "→ APP_ENV=$APP_ENV"
  echo "→ tip: keep this running; press r / R after Dart edits (re-run script after pubspec/native changes)"
  echo

  exec flutter run \
    -d "$device" \
    --dart-define="APP_ENV=$APP_ENV" \
    --dart-define="API_BASE_URL=$api_base" \
    "$@"
}

main "$@"
