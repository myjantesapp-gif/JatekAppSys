#!/usr/bin/env bash
# eas-build.sh — Trigger an EAS build for a Jatek Expo app.
#
# Usage:
#   bash scripts/eas-build.sh <app> <profile> [platform]
#
#   <app>      : mobile  → artifacts/jatek-mobile
#              : driver  → artifacts/jatek-driver
#   <profile>  : development | preview | production
#   [platform] : android (default) | ios | all
#
# Examples:
#   bash scripts/eas-build.sh mobile preview android
#   bash scripts/eas-build.sh driver preview android
#   bash scripts/eas-build.sh mobile production android

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

APP="${1:-}"
PROFILE="${2:-preview}"
PLATFORM="${3:-android}"

case "$APP" in
  mobile)
    APP_DIR="$ROOT_DIR/artifacts/jatek-mobile"
    APP_LABEL="Jatek (customer)"
    ;;
  driver)
    APP_DIR="$ROOT_DIR/artifacts/jatek-driver"
    APP_LABEL="Jatek Driver"
    ;;
  *)
    echo "Usage: $0 <mobile|driver> <development|preview|production> [android|ios|all]"
    exit 1
    ;;
esac

if [ ! -d "$APP_DIR" ]; then
  echo "[eas-build] ERROR: app directory not found: $APP_DIR"
  exit 1
fi

echo "[eas-build] Building $APP_LABEL — profile: $PROFILE, platform: $PLATFORM"
echo "[eas-build] Directory: $APP_DIR"
echo ""

cd "$APP_DIR"
npx eas build \
  --profile "$PROFILE" \
  --platform "$PLATFORM" \
  --non-interactive
