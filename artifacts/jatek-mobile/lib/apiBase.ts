import Constants from "expo-constants";

function clean(domain: string | undefined | null): string | null {
  if (!domain) return null;
  const trimmed = domain.trim();
  if (!trimmed || trimmed === "undefined" || trimmed === "null") return null;
  return trimmed.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
}

/**
 * Resolves the API host. Order of precedence:
 *  1. EXPO_PUBLIC_DOMAIN baked at build time (set by `expo start` and build.js)
 *  2. expo-constants `extra.apiDomain` (allows hot-overriding via app.json/extra)
 *  3. Manifest's `hostUri` (Expo Go dev — same host as Metro, useful for LAN dev)
 *
 * Throws a clear error instead of silently producing `https://undefined`.
 */
export function getApiBase(): string {
  const fromEnv = clean(process.env.EXPO_PUBLIC_DOMAIN);
  if (fromEnv) return `https://${fromEnv}`;

  const fromExtra = clean(
    (Constants.expoConfig?.extra as Record<string, string> | undefined)?.["apiDomain"],
  );
  if (fromExtra) return `https://${fromExtra}`;

  const apiUrl = clean(
    (Constants.expoConfig?.extra as Record<string, string> | undefined)?.["apiUrl"],
  );
  if (apiUrl) {
    if (/^https?:\/\//i.test(apiUrl)) return apiUrl.startsWith("http") ? apiUrl : `https://${apiUrl}`;
    return `https://${apiUrl}`;
  }

  const hostUri = clean(
    Constants.expoConfig?.hostUri ?? (Constants as unknown as { manifest2?: { extra?: { expoGo?: { developer?: { hostUri?: string } } } } }).manifest2?.extra?.expoGo?.developer?.hostUri,
  );
  if (hostUri) {
    const host = hostUri.split("/")[0]?.split(":")[0];
    if (host) return `http://${host}:8080`;
  }

  throw new Error(
    "[apiBase] Cannot resolve API domain. Set EXPO_PUBLIC_DOMAIN at build time " +
      "(automatically wired by `pnpm dev` and the deployment build script).",
  );
}

/** Safe variant — returns a placeholder URL and warns instead of throwing. */
export function getApiBaseSafe(): string {
  try {
    return getApiBase();
  } catch (err) {
    console.warn((err as Error).message);
    return "https://missing-domain.invalid";
  }
}
