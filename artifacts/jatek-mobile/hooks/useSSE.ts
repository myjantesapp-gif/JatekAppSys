/**
 * useSSE — lightweight SSE hook for React Native.
 *
 * React Native's fetch() supports ReadableStream on the new architecture
 * (expo SDK ≥ 51, newArchEnabled: true).  We use it to parse text/event-stream.
 *
 * Adds:
 *  - Exponential-backoff reconnection on transient network errors (1s → 30s)
 *  - 60s read timeout heartbeat so we re-open if the proxy silently drops us
 *  - Falls back gracefully (no error) on platforms without streaming support
 *  - AppState-aware: disconnects when app backgrounds, reconnects on foreground
 */
import { useEffect, useRef } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";
import { getAuthToken } from "@/lib/api";

type EventHandler = (data: unknown) => void;

interface SSEOptions {
  url: string;
  events: Record<string, EventHandler>;
  enabled?: boolean;
}

const MAX_BACKOFF_MS = 30_000;
const INITIAL_BACKOFF_MS = 1_000;
// If we go this long without receiving anything, assume the connection died
// behind some intermediate proxy and force a reconnect.
const READ_TIMEOUT_MS = 60_000;

export function useSSE({ url, events, enabled = true }: SSEOptions) {
  // Keep latest handlers in a ref so the effect doesn't have to re-subscribe
  // (and tear down the stream) every time a parent re-renders.
  const eventsRef = useRef(events);
  eventsRef.current = events;

  useEffect(() => {
    if (!enabled) return;
    if (Platform.OS === "web") return; // web uses native EventSource

    let cancelled = false;
    let backoff = INITIAL_BACKOFF_MS;
    let currentController: AbortController | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    // Track whether the app is in the foreground
    let isActive = AppState.currentState === "active";

    const scheduleReconnect = () => {
      if (cancelled || !isActive) return;
      const delay = backoff;
      backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
      reconnectTimer = setTimeout(connect, delay);
    };

    const disconnect = () => {
      if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
      currentController?.abort();
      currentController = null;
    };

    async function connect() {
      if (cancelled || !isActive) return;
      const controller = new AbortController();
      currentController = controller;

      let lastReadAt = Date.now();
      // Watchdog: if we don't see any data for READ_TIMEOUT_MS, abort and
      // let the catch block schedule a reconnect.
      const watchdog = setInterval(() => {
        if (Date.now() - lastReadAt > READ_TIMEOUT_MS) {
          controller.abort();
        }
      }, 10_000);

      try {
        const token = await getAuthToken();
        const res = await fetch(url, {
          signal: controller.signal,
          headers: {
            Accept: "text/event-stream",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!res.ok) {
          // Auth or 5xx — back off and retry, but skip retry for 4xx.
          if (res.status >= 400 && res.status < 500) return;
          throw new Error(`SSE HTTP ${res.status}`);
        }
        if (!res.body) return; // streaming not supported

        // Successful connection — reset backoff so the next failure starts
        // fresh from 1s instead of continuing the exponential ramp.
        backoff = INITIAL_BACKOFF_MS;

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let currentEvent = "message";

        while (!cancelled && isActive) {
          const { done, value } = await reader.read();
          if (done) break;
          lastReadAt = Date.now();
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.startsWith("event:")) {
              currentEvent = line.slice(6).trim();
            } else if (line.startsWith("data:")) {
              const rawData = line.slice(5).trim();
              if (!rawData) continue;
              try {
                const parsed = JSON.parse(rawData);
                const handler = eventsRef.current[currentEvent];
                if (handler) handler(parsed);
              } catch (err) {
                console.warn("[SSE] failed to parse event payload:", err);
              }
              currentEvent = "message";
            }
            // Empty line marks end of event — already handled by buffer split
          }
        }
        // Clean EOF — try to reconnect with reset backoff
        if (!cancelled && isActive) scheduleReconnect();
      } catch (err: any) {
        if (cancelled) return;
        // AbortError from cleanup or backgrounding — only retry if this is
        // still the active connection. If a newer connect() call has already
        // taken over (currentController !== controller), do NOT schedule
        // another reconnect to prevent two parallel connections racing.
        if (err?.name === "AbortError") {
          if (!cancelled && isActive && currentController === controller) scheduleReconnect();
          return;
        }
        // Network blip — silently retry (only if still active connection)
        if (currentController === controller) scheduleReconnect();
      } finally {
        clearInterval(watchdog);
        if (currentController === controller) currentController = null;
      }
    }

    // Handle app going to background / coming back to foreground
    const handleAppStateChange = (nextState: AppStateStatus) => {
      const nowActive = nextState === "active";
      if (nowActive && !isActive) {
        // Came to foreground — reconnect immediately with reset backoff
        isActive = true;
        backoff = INITIAL_BACKOFF_MS;
        connect();
      } else if (!nowActive && isActive) {
        // Went to background — disconnect to save battery & data
        isActive = false;
        disconnect();
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    connect();

    return () => {
      cancelled = true;
      subscription.remove();
      disconnect();
    };
  }, [url, enabled]);
}
