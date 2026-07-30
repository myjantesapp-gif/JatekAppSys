/**
 * Expo Push Notification dispatcher.
 *
 * Uses the Expo Push API (https://exp.host/--/api/v2/push/send) to deliver
 * remote notifications to drivers even when the app is fully closed.
 * Chunks are capped at 100 recipients per request (Expo limit).
 *
 * This module is intentionally fire-and-forget: individual ticket errors are
 * logged but never thrown so they never break the calling request flow.
 */

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export type PushMessage = {
  to: string | string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  badge?: number;
  priority?: "default" | "normal" | "high";
  channelId?: string;
  ttl?: number;
};

type ExpoTicket =
  | { status: "ok"; id: string }
  | { status: "error"; message: string; details?: { error?: string } };

/**
 * Send one or more push messages. `to` may be a single token or an array.
 * Returns true if the request was dispatched (regardless of per-token errors).
 */
export async function sendExpoPush(messages: PushMessage | PushMessage[]): Promise<boolean> {
  const batch = Array.isArray(messages) ? messages : [messages];
  if (!batch.length) return true;

  // Expo allows max 100 messages per request
  const chunks: PushMessage[][] = [];
  for (let i = 0; i < batch.length; i += 100) {
    chunks.push(batch.slice(i, i + 100));
  }

  let ok = true;
  for (const chunk of chunks) {
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(chunk),
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) {
        console.error(`[expoPush] HTTP ${res.status}:`, await res.text());
        ok = false;
        continue;
      }

      const json = (await res.json()) as { data: ExpoTicket[] };
      for (const ticket of json.data ?? []) {
        if (ticket.status === "error") {
          console.warn("[expoPush] ticket error:", ticket.message, ticket.details);
        }
      }
    } catch (err) {
      console.error("[expoPush] dispatch failed:", err);
      ok = false;
    }
  }
  return ok;
}

/**
 * Convenience — notify a list of drivers with their push tokens.
 * Filters out blank/invalid tokens automatically.
 */
export async function notifyDrivers(
  tokens: (string | null | undefined)[],
  title: string,
  body: string,
  data?: Record<string, unknown>,
  opts?: Partial<Omit<PushMessage, "to" | "title" | "body" | "data">>,
): Promise<void> {
  const valid = tokens.filter(
    (t): t is string => typeof t === "string" && t.startsWith("ExponentPushToken["),
  );
  if (!valid.length) return;

  const messages: PushMessage[] = valid.map((token) => ({
    to: token,
    title,
    body,
    data: data ?? {},
    sound: "default",
    priority: "high",
    channelId: "incoming-order",
    ttl: 60,
    ...opts,
  }));

  await sendExpoPush(messages);
}
