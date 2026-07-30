import { Platform } from "react-native";
import { getToken } from "@/lib/auth";
import { getApiTarget, getBaseUrl } from "@/lib/apiTarget";

type WsChannel = "driver-location" | "order-tracking";
type Listener = (data: unknown) => void;

export type WsStatus =
  | "idle"
  | "connecting"
  | "open"
  | "closed"
  | "error"
  | "reconnecting";

type StatusListener = (status: WsStatus) => void;

const HEARTBEAT_MS = 25_000;
const MAX_BACKOFF_MS = 30_000;

function tag(channel: WsChannel): string {
  return `[ws:${channel}]`;
}

function buildWsUrl(httpBase: string, channel: WsChannel, token: string): string {
  let absolute = httpBase;
  if (absolute.startsWith("/")) {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      absolute = `${window.location.origin}${absolute}`;
    } else {
      absolute = `https://localhost${absolute}`;
    }
  }
  const url = new URL(absolute);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = `/ws/${channel}`;
  url.search = `?token=${encodeURIComponent(token)}`;
  return url.toString();
}

export class WsClient {
  private channel: WsChannel;
  private ws: WebSocket | null = null;
  private status: WsStatus = "idle";
  private retry = 0;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionallyClosed = false;
  private outbox: string[] = [];
  private listeners = new Set<Listener>();
  private statusListeners = new Set<StatusListener>();

  constructor(channel: WsChannel) {
    this.channel = channel;
  }

  getStatus(): WsStatus { return this.status; }

  onMessage(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  onStatus(fn: StatusListener): () => void {
    this.statusListeners.add(fn);
    fn(this.status);
    return () => this.statusListeners.delete(fn);
  }

  private setStatus(s: WsStatus): void {
    if (this.status === s) return;
    this.status = s;
    for (const l of this.statusListeners) l(s);
  }

  async connect(): Promise<void> {
    this.intentionallyClosed = false;
    // The backend does not currently expose a WebSocket server. All real-time
    // updates flow through SSE (customers) and REST PATCH (drivers' location
    // is pushed via `updateDriverLocation`). Keep this client as a no-op so it
    // does not enter an infinite reconnect loop. Set EXPO_PUBLIC_WS_ENABLED=1
    // at build time to opt back in when the backend gains WS support.
    if (process.env.EXPO_PUBLIC_WS_ENABLED !== "1") {
      this.setStatus("closed");
      return;
    }
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
    const token = await getToken();
    if (!token) { this.setStatus("closed"); return; }
    const target = await getApiTarget();
    const base = getBaseUrl(target);
    let url: string;
    try { url = buildWsUrl(base, this.channel, token); } catch { this.scheduleReconnect(); return; }
    this.setStatus(this.retry > 0 ? "reconnecting" : "connecting");

    let ws: WebSocket;
    try { ws = new WebSocket(url); } catch (e) {
      console.warn(`${tag(this.channel)} construct failed`, e);
      this.scheduleReconnect(); return;
    }
    this.ws = ws;

    ws.onopen = () => {
      this.retry = 0;
      this.setStatus("open");
      this.startHeartbeat();
      while (this.outbox.length > 0) {
        const msg = this.outbox.shift()!;
        try { ws.send(msg); } catch { this.outbox.unshift(msg); break; }
      }
    };

    ws.onmessage = (ev) => {
      const data = typeof ev.data === "string" ? ev.data : "";
      if (!data) return;
      let parsed: unknown = null;
      try { parsed = JSON.parse(data); } catch { return; }
      for (const l of this.listeners) { try { l(parsed); } catch (e) { console.warn(`${tag(this.channel)} listener error`, e); } }
    };

    ws.onerror = () => this.setStatus("error");

    ws.onclose = (ev) => {
      this.stopHeartbeat();
      this.ws = null;
      if (this.intentionallyClosed) { this.setStatus("closed"); return; }
      this.scheduleReconnect();
    };
  }

  close(): void {
    this.intentionallyClosed = true;
    this.stopHeartbeat();
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    if (this.ws) { try { this.ws.close(1000, "client-close"); } catch {} this.ws = null; }
    this.setStatus("closed");
  }

  send(payload: unknown): boolean {
    const json = JSON.stringify(payload);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try { this.ws.send(json); return true; } catch {}
    }
    if (this.outbox.length > 100) this.outbox.shift();
    this.outbox.push(json);
    if (!this.ws || this.ws.readyState === WebSocket.CLOSED) this.connect().catch(() => {});
    return false;
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      try { this.ws.send(JSON.stringify({ type: "ping", t: Date.now() })); } catch {}
    }, HEARTBEAT_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null; }
  }

  private scheduleReconnect(): void {
    if (this.intentionallyClosed) return;
    this.retry += 1;
    const backoff = Math.min(MAX_BACKOFF_MS, Math.round(1000 * Math.pow(1.7, this.retry) * (0.7 + Math.random() * 0.6)));
    this.setStatus("reconnecting");
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => { this.connect().catch(() => {}); }, backoff);
  }
}

let driverLocationClient: WsClient | null = null;
let orderTrackingClient: WsClient | null = null;

export function getDriverLocationClient(): WsClient {
  if (!driverLocationClient) driverLocationClient = new WsClient("driver-location");
  return driverLocationClient;
}

export function getOrderTrackingClient(): WsClient {
  if (!orderTrackingClient) orderTrackingClient = new WsClient("order-tracking");
  return orderTrackingClient;
}
