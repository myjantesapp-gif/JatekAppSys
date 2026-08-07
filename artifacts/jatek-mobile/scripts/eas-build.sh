#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# eas-build.sh — Jatek EAS build launcher
#
# Jatek builds always use the Jatek Expo project. The repository's `dev` branch
# is a source-control branch, not a separate Expo project/account.
#
# Usage (from artifacts/jatek-mobile/):
#   ./scripts/eas-build.sh --profile preview --platform android --non-interactive
#   ./scripts/eas-build.sh --profile production --platform android --non-interactive
# ─────────────────────────────────────────────────────────────────────────────

set -e

export EXPO_TOKEN="${EXPO_TOKEN_JATEK:-$EXPO_TOKEN}"
export EXPO_OWNER="jatekplatforms-team"
export EXPO_SLUG="jatekclient"
export EXPO_PUBLIC_PROJECT_ID="d30cddea-9dd6-42aa-8339-80d86b9ad76e"

echo "👤 Owner : $EXPO_OWNER"
echo "📦 Slug  : $EXPO_SLUG"
echo "🆔 ID    : $EXPO_PUBLIC_PROJECT_ID"
echo ""

# Forward all arguments to EAS CLI
exec node_modules/.bin/eas "$@"
