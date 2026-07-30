#!/usr/bin/env bash
# eas-update.sh — Push an OTA JS update to EAS channel.
#
# Usage:
#   bash scripts/eas-update.sh <app> <channel> [message]
#
# Examples:
#   bash scripts/eas-update.sh mobile production "Fix checkout bug"
#   bash scripts/eas-update.sh driver production "Fix location tracking"

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

APP="${1:-}"
CHANNEL="${2:-production}"
MESSAGE="${3:-OTA update $(date +%Y-%m-%d)}"

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
    echo "Usage: $0 <mobile|driver> <preview|production> [message]"
    exit 1
    ;;
esac

echo "[eas-update] Pushing OTA update for $APP_LABEL → channel: $CHANNEL"
echo "[eas-update] Message: $MESSAGE"
echo ""

cd "$APP_DIR"
npx eas update \
  --channel "$CHANNEL" \
  --message "$MESSAGE" \
  --non-interactive
