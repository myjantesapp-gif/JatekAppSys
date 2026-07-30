import type { Request, Response } from "express";

/**
 * Lightweight SSE (Server-Sent Events) bus.
 *
 * Channels are just strings, e.g.:
 *   "restaurant:42"   – all events for restaurant #42
 *   "order:7"         – status/location updates for order #7
 *   "available_orders"– broadcast when a new order becomes ready for pickup
 *   "driver:5"        – events for driver #5 (new assignment)
 */

interface Subscriber {
  res: Response;
  channels: Set<string>;
}

const subscribers = new Map<string, Subscriber>(); // clientId → Subscriber

let _counter = 0;
function nextId() { return String(++_counter); }

/** Register a new SSE connection. Sends a keep-alive every 25 s. */
export function subscribe(req: Request, res: Response, channels: string[]): void {
  const clientId = nextId();

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // disable nginx buffering
  res.flushHeaders();

  // Send a "connected" event immediately
  res.write(`event: connected\ndata: ${JSON.stringify({ clientId, channels })}\n\n`);

  const sub: Subscriber = { res, channels: new Set(channels) };
  subscribers.set(clientId, sub);

  // Keep-alive heartbeat every 25 seconds
  const heartbeat = setInterval(() => {
    if (res.writableEnded) { clearInterval(heartbeat); return; }
    res.write(":heartbeat\n\n");
  }, 25_000);

  // Clean up on disconnect
  req.on("close", () => {
    clearInterval(heartbeat);
    subscribers.delete(clientId);
  });
}

/** Publish an event to all subscribers of a channel. */
export function publish(channel: string, eventName: string, data: unknown): void {
  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const [, sub] of subscribers) {
    if (sub.channels.has(channel) && !sub.res.writableEnded) {
      sub.res.write(payload);
    }
  }
}

/** Number of active SSE connections (for monitoring). */
export function connectionCount(): number { return subscribers.size; }
