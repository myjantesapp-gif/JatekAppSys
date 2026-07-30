#!/bin/bash
set -e

echo "================================================"
echo "  Build Android APK (EAS profil DEVELOPMENT)"
echo "================================================"

if [ -z "$EXPO_TOKEN" ]; then
  echo "ERROR: secret EXPO_TOKEN manquant."
  echo "Ajoute-le via le panneau Secrets puis relance."
  exit 1
fi

PROFILE="${EAS_PROFILE:-development}"
PLATFORM="android"

echo "Profile : $PROFILE"
echo "Platform: $PLATFORM"
echo

# Nettoie un éventuel cache npx corrompu
rm -rf ~/.npm/_npx/ 2>/dev/null || true

# Se placer dans le répertoire du projet Expo
cd "$(dirname "$0")/../artifacts/jatek-mobile"

echo "[1/3] Vérification de l'authentification EAS..."
EXPO_TOKEN="$EXPO_TOKEN" npx --yes eas-cli@latest whoami

echo
echo "[2/3] Soumission du build à EAS (non-interactif, --no-wait)..."
echo "      Le build s'exécute sur les serveurs Expo ; cette commande"
echo "      rend la main dès que le job est en file d'attente."
echo

EXPO_TOKEN="$EXPO_TOKEN" npx --yes eas-cli@latest build \
  --platform "$PLATFORM" \
  --profile "$PROFILE" \
  --non-interactive \
  --no-wait

echo
echo "[3/3] Build mis en file d'attente."
echo "Suivi : https://expo.dev/accounts/myjantes/projects/jatek-mobile/builds"
