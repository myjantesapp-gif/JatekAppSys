// The mobile product is intentionally pinned to the public API. Do not route
// customer data through Metro, localhost, or a Replit preview server.
const REMOTE_API_BASE = "https://ma.jatek.app";

/** Resolves the only permitted mobile API host. */
export function getApiBase(): string {
  return REMOTE_API_BASE;
}

/** Safe variant retained for callers that should not crash during render. */
export function getApiBaseSafe(): string {
  return getApiBase();
}
