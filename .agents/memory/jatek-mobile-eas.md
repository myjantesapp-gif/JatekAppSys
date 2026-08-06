---
name: Jatek mobile EAS build setup
description: EAS build quirks for the jatek-mobile pnpm monorepo workspace — config format, pnpm version, CLI path, account.
---

## Rules

1. **Use `app.config.js`, not `app.config.ts`** — EAS CLI reads the config via its own transpiler, which fails on TypeScript with `Cannot read properties of undefined (reading 'CommonJS')`. The plain JS version works reliably.

2. **Pin pnpm 10+ for EAS AND disable frozen-lockfile** — root `package.json` must have `"packageManager": "pnpm@10.x"` (EAS reads it) AND every build profile env in BOTH eas.json files must have `PNPM_VERSION` + BOTH `"npm_config_frozen_lockfile": "false"` AND `"pnpm_config_frozen_lockfile": "false"`. EAS Cloud sets `CI=true` which makes pnpm auto-enable `--frozen-lockfile`; combined with the 69 `catalog:` specifiers in the lockfile this causes the build to fail even with the correct pnpm version.

2b. **Two eas.json files exist** — a repo-root `eas.json` (with `cli.appRoot: artifacts/jatek-mobile`) used by expo.dev GitHub-triggered builds, and `artifacts/jatek-mobile/eas.json` used by local CLI builds. Keep them in sync.

2c. **Active EAS project = `@jatekplatforms-team/jatekclient`** (ID `d30cddea-9dd6-42aa-8339-80d86b9ad76e`). Use `EXPO_TOKEN_JATEK` (robot `Jatek`, role Admin on `jatekplatforms-team`). Previous project on `straightpath` (used `EXPO_TOKEN_DEV`) is now obsolete.

3. **EAS CLI is local to jatek-mobile** — run as `node_modules/.bin/eas` from `artifacts/jatek-mobile/`. Not globally installed. Command: `EXPO_TOKEN=$EXPO_TOKEN_JATEK node_modules/.bin/eas build --profile <profile> --platform android --non-interactive --no-wait`.

4. **OTA update command** — `EXPO_TOKEN=$EXPO_TOKEN_JATEK node_modules/.bin/eas update --channel preview --message "..." --non-interactive` — bundles both iOS and Android, uploads to EAS.

5. **Remove `--go` from `expo start`** — the app uses `expo-dev-client`, `react-native-keyboard-controller`, `react-native-worklets`, and `expo-notifications`, all of which are custom native modules incompatible with standard Expo Go. `--go` forces Expo Go mode and breaks the dev server. Use `expo start --tunnel` instead.

6. **`serve.js` needs `BASE_PATH=/mobile`** — The production serve script must set `BASE_PATH=/mobile` so routing for `/mobile/` requests works. Without it, every request falls through to `serveStaticFile` and returns 500.

7. **EAS manifest proxy** — When `static-build/` is absent, `serve.js` proxies manifest requests to `https://u.expo.dev/PROJECT_ID`. The dev client sends `expo-platform`, `expo-runtime-version`, `expo-channel-name` headers which are forwarded.

8. **Landing page QR deep-link format** — The QR code uses `exp+jatek://expo-development-client/?url=https%3A%2F%2FHOST%2Fmobile%2F` (not `exps://HOST`). The `expsUrl` in `serveLandingPage` must include `basePath`.

9. **Token mapping** (as of last check):
   - `EXPO_TOKEN` → robot `@myjantesapp-gif`, account `rbe2656s-team`
   - `EXPO_TOKEN_2` → user `myjantes`, accounts `myjantes`, `myjantess-organization`, `mytoolsapps`, `jatek`
   - `EXPO_TOKEN_DEV` → robot `@riadov001`, account `straightpath` (old project — no longer used)
   - `EXPO_TOKEN_JATEK` → robot `Jatek`, account `jatekplatforms-team` ← **use this for all builds**

**Why:** Account migrated from `straightpath` to `jatekplatforms-team` with new project ID and slug. New keystore generated in the cloud by EAS on first build.

**How to apply:** Any time you touch `app.config.*`, `eas.json`, `serve.js`, or run `eas build`/`eas update` commands.
