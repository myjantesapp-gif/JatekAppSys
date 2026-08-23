/**
 * Jatek Merchant Service Worker
 * Strategy:
 *  - API calls (/api/*): network-first, fall back to cache
 *  - Static assets: cache-first (cache on first fetch, serve from cache thereafter)
 */

const CACHE_VERSION = "jatek-merchant-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const API_CACHE = `${CACHE_VERSION}-api`;

const PRECACHE_URLS = [
  "/admin/",
  "/admin/index.html",
];

// Install — pre-cache the app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(PRECACHE_URLS).catch(() => {
        // Silently ignore pre-cache failures (e.g. during offline install)
      })
    ).then(() => self.skipWaiting())
  );
});

// Activate — purge old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("jatek-merchant-") && key !== STATIC_CACHE && key !== API_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch handler
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin or /api requests
  if (request.method !== "GET") return;

  // API: network-first
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // Static assets: cache-first
  event.respondWith(cacheFirst(request, STATIC_CACHE));
});

async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: "Offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    // Return a minimal offline page for navigation requests
    if (request.mode === "navigate") {
      const appShell = await caches.match("/admin/") || await caches.match("/admin/index.html");
      if (appShell) return appShell;
    }
    return new Response("Offline", { status: 503 });
  }
}
