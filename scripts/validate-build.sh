#!/usr/bin/env bash
# ============================================================
# validate-build.sh — Jatek monorepo pre-build sanity checks
# Read-only: never installs or mutates node_modules.
# Returns exit code 1 if any check fails.
# ============================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
PASS="${GREEN}✔${NC}"; FAIL="${RED}✗${NC}"; WARN="${YELLOW}⚠${NC}"
ERRORS=0

check() {
  local desc="$1"; shift
  if "$@" &>/dev/null; then
    echo -e "${PASS} ${desc}"
  else
    echo -e "${FAIL} ${desc}"
    ERRORS=$((ERRORS + 1))
  fi
}

# ── 1. Single lockfile at root ─────────────────────────────
echo -e "\n── Lockfile ──"
check "pnpm-lock.yaml present at root" test -f pnpm-lock.yaml
check "No package-lock.json" bash -c '! find . -name "package-lock.json" -not -path "*/node_modules/*" -not -path "*/.cache/*" | grep -q .'
check "No yarn.lock" bash -c '! find . -name "yarn.lock" -not -path "*/node_modules/*" | grep -q .'
check "No bun.lockb" bash -c '! find . -name "bun.lockb" -not -path "*/node_modules/*" | grep -q .'


# ── 2. pnpm version ────────────────────────────────────────
echo -e "\n── pnpm version ──"
REQUIRED_PNPM="10.26.1"
ACTUAL_PNPM=$(pnpm --version 2>/dev/null || echo "missing")
if [ "$ACTUAL_PNPM" = "$REQUIRED_PNPM" ]; then
  echo -e "${PASS} pnpm version ${ACTUAL_PNPM}"
else
  echo -e "${WARN} pnpm version: expected ${REQUIRED_PNPM}, got ${ACTUAL_PNPM} (non-blocking)"
fi

# ── 3. packageManager field ────────────────────────────────
echo -e "\n── package.json ──"
check "Root: packageManager field present" node -e "const p=require('./package.json'); if(!p.packageManager) process.exit(1)"
check "Root: packageManager starts with pnpm@" node -e "const p=require('./package.json'); if(!p.packageManager.startsWith('pnpm@')) process.exit(1)"
check "Mobile: packageManager field present" node -e "const p=require('./artifacts/jatek-mobile/package.json'); if(!p.packageManager) process.exit(1)"
check "Mobile: packageManager starts with pnpm@" node -e "const p=require('./artifacts/jatek-mobile/package.json'); if(!p.packageManager.startsWith('pnpm@')) process.exit(1)"

# ── 4. Node version ────────────────────────────────────────
echo -e "\n── Node version ──"
REQUIRED_NODE="20"
ACTUAL_NODE=$(node --version 2>/dev/null | sed 's/v//' | cut -d. -f1)
check "Node major >= ${REQUIRED_NODE}" bash -c "[ '${ACTUAL_NODE}' -ge '${REQUIRED_NODE}' ]"

# ── 5. Workspace packages exist ───────────────────────────
echo -e "\n── Workspace packages ──"
check "artifacts/api-server/package.json" test -f artifacts/api-server/package.json
check "artifacts/jatek-mobile/package.json" test -f artifacts/jatek-mobile/package.json
check "artifacts/jatek-landing/package.json" test -f artifacts/jatek-landing/package.json
check "artifacts/backend-dashboard/package.json" test -f artifacts/backend-dashboard/package.json

# ── 6. EAS config ─────────────────────────────────────────
echo -e "\n── EAS config ──"
check "eas.json present at root" test -f eas.json
check "eas.json present in artifacts/jatek-mobile" test -f artifacts/jatek-mobile/eas.json
check "app.config.js present" test -f artifacts/jatek-mobile/app.config.js
check ".easignore present" test -f .easignore
check "PNPM_VERSION set in root eas.json" node -e "
  const e=require('./eas.json');
  const profiles=Object.values(e.build||{});
  const ok=profiles.some(p=>p.env&&p.env.PNPM_VERSION);
  process.exit(ok?0:1)
"
check "PNPM_VERSION set in mobile eas.json" node -e "
  const e=require('./artifacts/jatek-mobile/eas.json');
  const profiles=Object.values(e.build||{});
  const ok=profiles.some(p=>p.env&&p.env.PNPM_VERSION);
  process.exit(ok?0:1)
"

# ── 7. Frozen lockfile ─────────────────────────────────────
# Runs pnpm install --frozen-lockfile to confirm the lockfile is consistent.
# This is the canonical check used by EAS build workers.
echo -e "\n── Frozen lockfile ──"
check "pnpm install --frozen-lockfile passes" pnpm install --frozen-lockfile --prefer-offline

# ── Summary ────────────────────────────────────────────────
echo ""
if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}All checks passed.${NC}"
  exit 0
else
  echo -e "${RED}${ERRORS} check(s) failed. Fix before building.${NC}"
  exit 1
fi
