import { logger } from "./logger";
import { publish } from "./sse";

/**
 * In-memory live tracking service.
 *
 * Maintains the most recent GPS position and last-seen timestamp for every
 * driver currently broadcasting. The state is intentionally NOT persisted —
 * it only mirrors what is happening in the last few seconds. The drivers
 * table still owns the durable `latitude`, `longitude`, `locationUpdatedAt`
 * snapshot for each driver.
 *
 * A watchdog runs every 15s and flips drivers that have been silent for more
 * than `OFFLINE_THRESHOLD_MS` to offline, broadcasting a `driver_offline`
 * event on their active channels (order:{id}, driver:{id}, admin_tracking).
 */

const OFFLINE_THRESHOLD_MS = 30_000;
const WATCHDOG_INTERVAL_MS = 15_000;
const AVG_DRIVER_SPEED_KMH = 25;

interface DriverState {
  driverId: number;
  lat: number | null;
  lng: number | null;
  lastSeen: number;
  /** Last ETA in minutes computed at the most recent location update.
   *  `null` when no destination coords were supplied by the driver app. */
  eta: number | null;
  /** Active orders currently being delivered by this driver. Drives which
   *  channels we publish driver_location / driver_offline events on. */
  orderIds: Set<number>;
  /** Whether we already broadcast that this driver went offline. Avoids
   *  spamming a `driver_offline` event every 15s while they stay silent. */
  offlineNotified: boolean;
}

const drivers = new Map<number, DriverState>();

function getOrCreate(driverId: number): DriverState {
  let s = drivers.get(driverId);
  if (!s) {
    s = {
      driverId,
      lat: null,
      lng: null,
      lastSeen: Date.now(),
      eta: null,
      orderIds: new Set(),
      offlineNotified: false,
    };
    drivers.set(driverId, s);
  }
  return s;
}

/** Record a fresh GPS position for the driver. */
export function updateLocation(
  driverId: number,
  lat: number,
  lng: number,
  opts?: { orderId?: number; eta?: number | null },
): DriverState {
  const s = getOrCreate(driverId);
  s.lat = lat;
  s.lng = lng;
  s.lastSeen = Date.now();
  s.offlineNotified = false;
  if (opts?.eta !== undefined) s.eta = opts.eta;
  if (typeof opts?.orderId === "number") s.orderIds.add(opts.orderId);
  logger.debug({ driverId, lat, lng, eta: s.eta, orderId: opts?.orderId }, "trackingService.updateLocation");
  return s;
}

/** Record a heartbeat ping (no GPS coordinates). */
export function recordHeartbeat(driverId: number): DriverState {
  const s = getOrCreate(driverId);
  s.lastSeen = Date.now();
  s.offlineNotified = false;
  logger.debug({ driverId, ts: s.lastSeen }, "trackingService.recordHeartbeat");
  return s;
}

/** Mark a single order as actively being delivered by this driver. */
export function attachOrder(driverId: number, orderId: number): void {
  const s = getOrCreate(driverId);
  s.orderIds.add(orderId);
}

/** Stop publishing live updates for a delivered/cancelled order. */
export function detachOrder(driverId: number, orderId: number): void {
  const s = drivers.get(driverId);
  if (!s) return;
  s.orderIds.delete(orderId);
}

/** Snapshot of the driver's last known live state. */
export function getState(driverId: number): DriverState | null {
  return drivers.get(driverId) ?? null;
}

/** Returns all tracked drivers with their current live state (for the admin dashboard). */
export function getAllLocations(): Array<{
  driverId: number;
  lat: number | null;
  lng: number | null;
  eta: number | null;
  lastSeen: number;
  isOnline: boolean;
  orderIds: number[];
}> {
  const now = Date.now();
  return Array.from(drivers.values()).map((s) => ({
    driverId: s.driverId,
    lat: s.lat,
    lng: s.lng,
    eta: s.eta,
    lastSeen: s.lastSeen,
    isOnline: now - s.lastSeen <= OFFLINE_THRESHOLD_MS,
    orderIds: Array.from(s.orderIds),
  }));
}

/** Has the driver been seen within `thresholdMs` (default 30s)? */
export function isOnline(driverId: number, thresholdMs = OFFLINE_THRESHOLD_MS): boolean {
  const s = drivers.get(driverId);
  if (!s) return false;
  return Date.now() - s.lastSeen <= thresholdMs;
}

/**
 * Estimate ETA in minutes from `(fromLat, fromLng)` to `(toLat, toLng)` using
 * the haversine great-circle distance and an average urban driver speed.
 *
 * Returns `null` if any coordinate is missing — the caller should treat that
 * as "unknown ETA" rather than 0.
 */
export function calculateETA(
  fromLat: number | null | undefined,
  fromLng: number | null | undefined,
  toLat: number | null | undefined,
  toLng: number | null | undefined,
  speedKmh: number = AVG_DRIVER_SPEED_KMH,
): number | null {
  if (
    fromLat == null || fromLng == null ||
    toLat == null || toLng == null
  ) return null;

  const R = 6371; // km
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(toLat - fromLat);
  const dLng = toRad(toLng - fromLng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(fromLat)) * Math.cos(toRad(toLat)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = R * c;

  const minutes = (distanceKm / speedKmh) * 60;
  // Round up to the nearest minute, with a sensible floor of 1 minute when
  // the driver is essentially on top of the destination.
  return Math.max(1, Math.ceil(minutes));
}

/** Watchdog: every WATCHDOG_INTERVAL_MS, flag silent drivers as offline. */
function runWatchdogTick(): void {
  const now = Date.now();
  for (const s of drivers.values()) {
    const silentMs = now - s.lastSeen;
    if (silentMs > OFFLINE_THRESHOLD_MS && !s.offlineNotified) {
      s.offlineNotified = true;
      const payload = {
        driverId: s.driverId,
        lastSeen: s.lastSeen,
        silentMs,
        isOnline: false,
      };
      publish(`driver:${s.driverId}`, "driver_offline", payload);
      publish("admin_tracking", "driver_offline", payload);
      for (const orderId of s.orderIds) {
        publish(`order:${orderId}`, "driver_offline", { ...payload, orderId });
      }
      logger.info(
        { driverId: s.driverId, silentMs, orderIds: Array.from(s.orderIds) },
        "trackingService: driver offline",
      );
    }
  }
}

let watchdogTimer: ReturnType<typeof setInterval> | null = null;

/** Start the periodic offline watchdog. Idempotent. */
export function startTrackingWatchdog(): void {
  if (watchdogTimer) return;
  watchdogTimer = setInterval(runWatchdogTick, WATCHDOG_INTERVAL_MS);
  // Don't keep the Node event loop alive just for the watchdog.
  if (typeof watchdogTimer.unref === "function") watchdogTimer.unref();
  logger.info({ thresholdMs: OFFLINE_THRESHOLD_MS, tickMs: WATCHDOG_INTERVAL_MS }, "trackingService watchdog started");
}

/** Test-only: stop the watchdog and clear all state. */
export function _resetForTests(): void {
  if (watchdogTimer) {
    clearInterval(watchdogTimer);
    watchdogTimer = null;
  }
  drivers.clear();
}
