#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# eas-build.sh — Branch-aware EAS build launcher
#
# Automatically selects the right Expo account based on the current git branch:
#   • dev  → uses *_DEV secrets  (EXPO_TOKEN_DEV, EXPO_PUBLIC_OWNER_DEV, …)
#   • any other branch → uses default secrets (EXPO_TOKEN, EXPO_PUBLIC_OWNER, …)
#
# Usage (from artifacts/jatek-mobile/):
#   ./scripts/eas-build.sh --profile preview --platform android --non-interactive
#   ./scripts/eas-build.sh --profile production --platform android --non-interactive
# ─────────────────────────────────────────────────────────────────────────────

set -e

BRANCH=$(git -C "$(dirname "$0")/../.." rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")

if [ "$BRANCH" = "dev" ]; then
  echo "🔀 Branch: dev — using DEV Expo account"
  export EXPO_TOKEN="$EXPO_TOKEN_DEV"
  export EXPO_OWNER="$EXPO_PUBLIC_OWNER_DEV"
  export EXPO_SLUG="$EXPO_PUBLIC_SLUG_DEV"
  export EXPO_PUBLIC_PROJECT_ID="$EXPO_PUBLIC_PROJECT_ID_DEV"
else
  echo "🔀 Branch: $BRANCH — using default Expo account"
  export EXPO_TOKEN="$EXPO_TOKEN"
  export EXPO_OWNER="$EXPO_PUBLIC_OWNER"
  export EXPO_SLUG="$EXPO_PUBLIC_SLUG"
  export EXPO_PUBLIC_PROJECT_ID="$EXPO_PUBLIC_PROJECT_ID_2"
fi

echo "👤 Owner : $EXPO_OWNER"
echo "📦 Slug  : $EXPO_SLUG"
echo "🆔 ID    : $EXPO_PUBLIC_PROJECT_ID"
echo ""

# Forward all arguments to EAS CLI
exec node_modules/.bin/eas "$@"
