/**
 * VAPID key management for Web Push notifications.
 *
 * Keys are loaded from VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY env vars.
 * If neither is set, a new pair is auto-generated and printed to the console
 * on startup so the operator can persist them as env vars.
 *
 * Keys are stored in a module-level singleton so they stay stable for the
 * lifetime of the server process (subscriptions created during this session
 * will continue to work across hot-reloads, but not across restarts without
 * env vars).
 */
import webPush from "web-push";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const KEY_FILE = path.join(os.tmpdir(), ".jatek_vapid_keys.json");

export const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:admin@jatek.app";

function loadOrGenerateKeys(): { publicKey: string; privateKey: string } {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    return {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY,
    };
  }

  if (fs.existsSync(KEY_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(KEY_FILE, "utf-8")) as { publicKey: string; privateKey: string };
    } catch {}
  }

  const keys = webPush.generateVAPIDKeys();
  try { fs.writeFileSync(KEY_FILE, JSON.stringify(keys), "utf-8"); } catch {}

  console.log("\n[VAPID] Generated new VAPID key pair. Set these as env vars to persist:");
  console.log(`  VAPID_PUBLIC_KEY=${keys.publicKey}`);
  if (process.env.NODE_ENV !== "production") {
    console.log("  VAPID_PRIVATE_KEY=<set VAPID_PRIVATE_KEY env var — check /tmp/.jatek_vapid_keys.json on this host>\n");
  }

  return keys;
}

const keys = loadOrGenerateKeys();
webPush.setVapidDetails(VAPID_SUBJECT, keys.publicKey, keys.privateKey);

export const vapidPublicKey = keys.publicKey;

/**
 * Send a web push notification to a stored PushSubscription JSON string.
 * Returns silently on any error (stale subscription, network failure, etc.).
 */
export async function sendWebPush(
  subscriptionJson: string,
  payload: { title: string; body: string; data?: Record<string, unknown> },
): Promise<void> {
  try {
    const sub = JSON.parse(subscriptionJson) as webPush.PushSubscription;
    await webPush.sendNotification(sub, JSON.stringify(payload));
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    if (statusCode === 410 || statusCode === 404) {
      console.info("[webPush] Subscription gone (410/404) — client should re-subscribe.");
    } else {
      console.warn("[webPush] sendNotification failed:", err);
    }
  }
}
