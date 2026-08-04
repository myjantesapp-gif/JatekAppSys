/**
 * Lightweight fetch helper for endpoints not yet covered by the generated
 * Orval client (e.g. custom permissions APIs). Mirrors the auth setup used by
 * the api-client-react custom-fetch (Bearer token from localStorage).
 */
export async function apiFetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("jatek_backend_token");
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(path, { ...init, headers });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch {}
    throw new Error(msg);
  }
  // No body: 204 or empty Content-Length
  if (res.status === 204) return undefined as T;
  const contentLength = res.headers.get("content-length");
  if (contentLength === "0") return undefined as T;
  // Only parse JSON when the response declares it
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json") && !contentType.includes("+json")) {
    return undefined as T;
  }
  return (await res.json()) as T;
}
