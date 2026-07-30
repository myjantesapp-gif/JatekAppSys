#!/usr/bin/env bash
# EAS pre-install hook — ensures pnpm workspace deps are installed from the root.
set -euo pipefail

echo "[eas-hook] Working directory: $(pwd)"
echo "[eas-hook] Node: $(node --version), pnpm: $(pnpm --version)"

# EAS Cloud checks out code at the workspace root; install all workspace deps.
WORKSPACE_ROOT="$(pwd)"
echo "[eas-hook] Installing workspace dependencies from $WORKSPACE_ROOT ..."
pnpm install --frozen-lockfile --prefer-offline || pnpm install --no-frozen-lockfile

echo "[eas-hook] Install complete."
