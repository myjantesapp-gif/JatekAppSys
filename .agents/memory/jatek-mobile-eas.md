---
name: Jatek mobile EAS build setup
description: EAS build quirks for the jatek-mobile pnpm monorepo workspace — config format, pnpm version, CLI path.
---

## Rules

1. **Use `app.config.js`, not `app.config.ts`** — EAS CLI reads the config via its own transpiler, which fails on TypeScript with `Cannot read properties of undefined (reading 'CommonJS')`. The plain JS version works reliably.

2. **Pin pnpm 10+ for EAS AND disable frozen-lockfile** — root `package.json` must have `"packageManager": "pnpm@10.x"` (EAS reads it) AND every build profile env in BOTH eas.json files must have `PNPM_VERSION` + `"npm_config_frozen_lockfile": "false"`. EAS Cloud sets `CI=true` which makes pnpm auto-enable `--frozen-lockfile`; combined with the 69 `catalog:` specifiers in the lockfile this causes the build to fail even with the correct pnpm version. The `npm_config_frozen_lockfile=false` env var overrides the CI-triggered behavior.

2b. **Two eas.json files exist** — a repo-root `eas.json` (with `cli.appRoot: artifacts/jatek-mobile`) used by expo.dev GitHub-triggered builds, and `artifacts/jatek-mobile/eas.json` used by local CLI builds. Keep them in sync.

2c. **EAS project = `@myjantesapps-team/jatekclient`** (ID `11e89fef-b97e-4823-ba4a-07c2942ba6b0`). The EXPO_TOKEN is a robot on `myjantesapps-team` and cannot access older project IDs (`24f32081…`, `2437ecfc…`). `app.config.js` resolves owner/slug/projectId from `EXPO_OWNER`/`EXPO_SLUG`/`EXPO_PUBLIC_PROJECT_ID` — set them in eas.json profile envs; for CLI commands outside a build profile (e.g. `build:view`), export them in the shell too.

3. **EAS CLI is local to jatek-mobile** — run as `node_modules/.bin/eas` from `artifacts/jatek-mobile/`. Not globally installed. Command: `EXPO_TOKEN=$EXPO_TOKEN_DEV node_modules/.bin/eas build --profile <profile> --platform android --non-interactive --no-wait`. **Use `EXPO_TOKEN_DEV`** (robot `@riadov001`, role Developer on `straightpath`). `EXPO_TOKEN` is a robot on `rbe2656s-team` (no access to `straightpath`). `EXPO_TOKEN_2` is `myjantes` user (no access to `straightpath`).

4. **OTA update command** — `EXPO_TOKEN=$EXPO_TOKEN node_modules/.bin/eas update --channel production --message "..." --non-interactive` — bundles both iOS and Android, uploads to EAS.

5. **Remove `--go` from `expo start`** — the app uses `expo-dev-client`, `react-native-keyboard-controller`, `react-native-worklets`, and `expo-notifications`, all of which are custom native modules incompatible with standard Expo Go. `--go` forces Expo Go mode and breaks the dev server. Use `expo start --tunnel` instead; the CLI will show "Using development build" mode.

**Why:** Learned during a debugging session where EAS builds failed due to TypeScript config, pnpm catalog syntax errors, and the dev server showed connection errors from the `--go` flag forcing incompatible runtime.

6. **`serve.js` needs `BASE_PATH=/mobile`** — The production serve script must set `BASE_PATH=/mobile` so routing for `/mobile/` requests works. Without it, every request falls through to `serveStaticFile` and returns 500. The `serve` script in `package.json` should be `BASE_PATH=/mobile node server/serve.js`.

7. **EAS manifest proxy** — When `static-build/` is absent, `serve.js` proxies manifest requests to `https://u.expo.dev/PROJECT_ID`. The dev client sends `expo-platform`, `expo-runtime-version`, `expo-channel-name` headers which are forwarded. A 400 from EAS in curl tests is expected (missing headers); the real app sends them correctly.

8. **Landing page QR deep-link format** — The QR code uses `exp+jatek://expo-development-client/?url=https%3A%2F%2FHOST%2Fmobile%2F` (not `exps://HOST`). The `expsUrl` in `serveLandingPage` must include `basePath` so the URL is `ma.jatek.app/mobile` not just `ma.jatek.app`.

**How to apply:** Any time you touch `app.config.*`, `eas.json`, `serve.js`, or the `dev`/`serve` scripts in `artifacts/jatek-mobile/package.json`.
