/**
 * Standalone production server for Expo static builds.
 *
 * Serves the output of build.js (static-build/) with two special routes:
 * - GET / or /manifest with expo-platform header → platform manifest JSON
 * - GET / without expo-platform → landing page HTML
 * Everything else falls through to static file serving from ./static-build/.
 *
 * Zero external dependencies — uses only Node.js built-ins (http, fs, path).
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const STATIC_ROOT = path.resolve(__dirname, "..", "static-build");
const TEMPLATE_PATH = path.resolve(__dirname, "templates", "landing-page.html");
const basePath = (process.env.BASE_PATH || "/").replace(/\/+$/, "");

// EAS Update project ID — used as fallback manifest source when static-build/ is absent.
// Keep this aligned with eas.json/app.config.js. Production does not inject the
// mobile build variables, so a stale fallback here makes the published QR code
// load a different Expo project than the current Android preview APK.
const EAS_PROJECT_ID =
  process.env.EXPO_PUBLIC_PROJECT_ID || "d29ba8e6-bdfb-4019-9888-d7045ed65d71";
const EAS_CHANNEL = process.env.EXPO_CHANNEL_NAME || "preview";
const EAS_UPDATE_URL = `https://u.expo.dev/${EAS_PROJECT_ID}`;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".map": "application/json",
};

function getAppName() {
  try {
    const appJsonPath = path.resolve(__dirname, "..", "app.json");
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf-8"));
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}

async function proxyEasManifest(platform, incomingHeaders, res) {
  try {
    const headers = {
      "expo-platform": platform,
      "expo-channel-name": incomingHeaders["expo-channel-name"] || EAS_CHANNEL,
      "accept": "multipart/mixed,application/expo+json,application/json",
    };
    // Forward runtime/SDK version headers if present
    for (const h of ["expo-runtime-version", "expo-sdk-version", "expo-updates-environment", "expo-expect-signature"]) {
      if (incomingHeaders[h]) headers[h] = incomingHeaders[h];
    }

    const easRes = await fetch(EAS_UPDATE_URL, { headers, signal: AbortSignal.timeout(10000) });

    if (!easRes.ok) {
      console.warn(`[serve] EAS manifest proxy failed: ${easRes.status}`);
      res.writeHead(easRes.status, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: `EAS manifest error: ${easRes.status}` }));
      return;
    }

    // Forward all EAS response headers except transfer-encoding
    const resHeaders = { "cache-control": "no-store, no-cache, must-revalidate" };
    easRes.headers.forEach((v, k) => {
      if (k.toLowerCase() !== "transfer-encoding") resHeaders[k] = v;
    });
    const body = await easRes.arrayBuffer();
    res.writeHead(easRes.status, resHeaders);
    res.end(Buffer.from(body));
    console.info(`[serve] EAS manifest proxied for ${platform}`);
  } catch (err) {
    console.error("[serve] EAS manifest proxy error:", err.message);
    res.writeHead(502, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "EAS proxy timeout" }));
  }
}

function serveManifest(platform, req, res) {
  const manifestPath = path.join(STATIC_ROOT, platform, "manifest.json");

  // Local static-build exists → serve it directly
  if (fs.existsSync(manifestPath)) {
    const manifest = fs.readFileSync(manifestPath, "utf-8");
    res.writeHead(200, {
      "content-type": "application/json",
      "expo-protocol-version": "1",
      "expo-sfv-version": "0",
      "cache-control": "no-store, no-cache, must-revalidate",
      "pragma": "no-cache",
    });
    res.end(manifest);
    return;
  }

  // No local build → proxy to EAS Update CDN
  console.info(`[serve] No local manifest for ${platform}, proxying to EAS Update...`);
  proxyEasManifest(platform, req.headers, res);
}

function serveLandingPage(req, res, landingPageTemplate, appName) {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol = forwardedProto || "https";
  const host = req.headers["x-forwarded-host"] || req.headers["host"];
  const baseUrl = `${protocol}://${host}`;
  // Include basePath so the QR deep-link points to /mobile/ not just /
  const expsUrl = basePath ? `${host}${basePath}` : host;

  const html = landingPageTemplate
    .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
    .replace(/EXPS_URL_PLACEHOLDER/g, expsUrl)
    .replace(/APP_NAME_PLACEHOLDER/g, appName);

  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(html);
}

function serveStaticFile(urlPath, res, req) {
  const safePath = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const filePath = path.join(STATIC_ROOT, safePath);

  if (!filePath.startsWith(STATIC_ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    // Unknown path → redirect users to the landing page rather than showing a
    // bare "Not Found" string. The landing page explains how to open the app
    // in Expo Go, which is what visitors are looking for here.
    const acceptsHtml = (req?.headers?.accept ?? "").includes("text/html");
    if (acceptsHtml) {
      const target = (basePath || "") + "/";
      res.writeHead(302, { location: target });
      res.end();
      return;
    }
    res.writeHead(404);
    res.end("Not Found");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  const content = fs.readFileSync(filePath);
  // Hashed Expo bundles (timestamped folders + content-hashed filenames)
  // can be cached aggressively. Everything else (HTML, manifests, fallback
  // assets) must revalidate on every load so a fresh deploy is picked up
  // immediately instead of being masked by CDN/proxy caches.
  const isHashedBundle = /\/_expo\/static\//.test(safePath);
  const cacheControl = isHashedBundle
    ? "public, max-age=31536000, immutable"
    : "no-store, no-cache, must-revalidate";
  res.writeHead(200, {
    "content-type": contentType,
    "cache-control": cacheControl,
  });
  res.end(content);
}

const landingPageTemplate = fs.readFileSync(TEMPLATE_PATH, "utf-8");
const appName = getAppName();

const server = http.createServer((req, res) => {
  // Guard against missing or malformed Host header (e.g. health-check probes).
  // new URL() throws synchronously on invalid input, so we wrap it and return
  // a 400 rather than letting the exception propagate and crash the process.
  let url;
  try {
    const host = req.headers.host || "localhost";
    url = new URL(req.url || "/", `http://${host}`);
  } catch {
    res.writeHead(400, { "content-type": "text/plain" });
    res.end("Bad Request");
    return;
  }
  let pathname = url.pathname;

  // Segment-aware basePath stripping: only strip when the URL starts with
  // basePath followed by "/" (or is exactly basePath). Avoids incorrectly
  // matching siblings like "/apple" when basePath is "/app".
  if (basePath && (pathname === basePath || pathname.startsWith(basePath + "/"))) {
    pathname = pathname.slice(basePath.length) || "/";
  }

  if (pathname === "/" || pathname === "/manifest") {
    const platform = req.headers["expo-platform"];
    if (platform === "ios" || platform === "android") {
      return serveManifest(platform, req, res);
    }

    if (pathname === "/") {
      return serveLandingPage(req, res, landingPageTemplate, appName);
    }
  }

  serveStaticFile(pathname, res, req);
});

const port = parseInt(process.env.PORT || "3000", 10);
server.listen(port, "0.0.0.0", () => {
  console.log(`Serving static Expo build on port ${port}`);
});
