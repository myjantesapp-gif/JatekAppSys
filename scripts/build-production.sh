#!/bin/bash
set -e

echo "========================================"
echo "  Jatek — Production Build"
echo "========================================"

echo ""
echo "[1/4] Build API server (TypeScript → ESM)…"
pnpm --filter @workspace/api-server run build

echo ""
echo "[2/4] Build landing page (SPA → dist/public)…"
BASE_PATH=/ pnpm --filter @workspace/jatek-landing run build

echo ""
echo "[3/4] Build backend-dashboard (SPA → dist/public)…"
BASE_PATH=/admin/ pnpm --filter @workspace/backend-dashboard run build

echo ""
echo "[4/4] Smoke-test bundled production server (boot + route checks)…"
bash "$(dirname "$0")/smoke-production.sh"

echo ""
echo "========================================"
echo "  Build production terminé avec succès!"
echo "========================================"
echo ""
echo "Note: DB schema migration runs at container startup (start-production.sh), not here."
echo "Démarrage : NODE_ENV=production PORT=8080 node artifacts/api-server/dist/index.mjs"
