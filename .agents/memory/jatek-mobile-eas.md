---
name: Jatek mobile EAS build setup
description: EAS build quirks for the jatek-mobile pnpm monorepo workspace — config format, pnpm version, CLI path.
---

## Rules

1. **Use `app.config.js`, not `app.config.ts`** — EAS CLI reads the config via its own transpiler, which fails on TypeScript with `Cannot read properties of undefined (reading 'CommonJS')`. The plain JS version works reliably.

2. **Set `PNPM_VERSION: "10.0.0"` in every EAS build profile env** — EAS Cloud defaults to an older pnpm that doesn't understand `catalog:` specifiers used in the workspace's `pnpm-workspace.yaml`. Without this, installs fail.

3. **EAS CLI is local to jatek-mobile** — run as `node_modules/.bin/eas` from `artifacts/jatek-mobile/`. Not globally installed. Command: `EXPO_TOKEN=$EXPO_TOKEN node_modules/.bin/eas build --profile <profile> --platform android --non-interactive --no-wait`.

4. **OTA update command** — `EXPO_TOKEN=$EXPO_TOKEN node_modules/.bin/eas update --channel production --message "..." --non-interactive` — bundles both iOS and Android, uploads to EAS.

5. **Remove `--go` from `expo start`** — the app uses `expo-dev-client`, `react-native-keyboard-controller`, `react-native-worklets`, and `expo-notifications`, all of which are custom native modules incompatible with standard Expo Go. `--go` forces Expo Go mode and breaks the dev server. Use `expo start --tunnel` instead; the CLI will show "Using development build" mode.

**Why:** Learned during a debugging session where EAS builds failed due to TypeScript config, pnpm catalog syntax errors, and the dev server showed connection errors from the `--go` flag forcing incompatible runtime.

6. **`serve.js` needs `BASE_PATH=/mobile`** — The production serve script must set `BASE_PATH=/mobile` so routing for `/mobile/` requests works. Without it, every request falls through to `serveStaticFile` and returns 500. The `serve` script in `package.json` should be `BASE_PATH=/mobile node server/serve.js`.

7. **EAS manifest proxy** — When `static-build/` is absent, `serve.js` proxies manifest requests to `https://u.expo.dev/PROJECT_ID`. The dev client sends `expo-platform`, `expo-runtime-version`, `expo-channel-name` headers which are forwarded. A 400 from EAS in curl tests is expected (missing headers); the real app sends them correctly.

8. **Landing page QR deep-link format** — The QR code uses `exp+jatek://expo-development-client/?url=https%3A%2F%2FHOST%2Fmobile%2F` (not `exps://HOST`). The `expsUrl` in `serveLandingPage` must include `basePath` so the URL is `ma.jatek.app/mobile` not just `ma.jatek.app`.

**How to apply:** Any time you touch `app.config.*`, `eas.json`, `serve.js`, or the `dev`/`serve` scripts in `artifacts/jatek-mobile/package.json`.
