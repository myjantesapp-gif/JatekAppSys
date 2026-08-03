/**
 * Lightweight helpers for endpoints not yet in the generated client.
 * All requests authenticate via the token stored in AuthContext (`jatek_jwt`).
 */
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { getApiBaseSafe } from "./apiBase";

// Lazy: resolved on the first actual request so Expo Go dev mode has time
// to populate Constants.expoConfig before any fetch fires.
// Only caches a successful (non-placeholder) result so that a later request
// can retry if the first attempt raced ahead of manifest hydration.
const PLACEHOLDER = "https://missing-domain.invalid";
let _apiBase: string | null = null;
function resolvedApiBase(): string {
  if (_apiBase && _apiBase !== PLACEHOLDER) return _apiBase;
  const base = getApiBaseSafe();
  if (base !== PLACEHOLDER) _apiBase = base;
  return base;
}

const TOKEN_KEY = "jatek_jwt";

async function getToken(): Promise<string | null> {
  if (Platform.OS === "web") return localStorage.getItem(TOKEN_KEY);
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export const getAuthToken = getToken;

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Default per-request timeout. Network calls that hang forever are the
// single biggest source of "stuck loading spinner" complaints on cellular.
const DEFAULT_TIMEOUT_MS = 15_000;

async function jsonFetch<T = any>(path: string, init?: RequestInit & { timeoutMs?: number }): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, signal: externalSignal, ...rest } = init ?? {};
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  // Bridge an externally-supplied signal so callers (e.g. react-query) can
  // still abort us on unmount.
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  try {
    const res = await fetch(`${resolvedApiBase()}${path}`, {
      ...rest,
      signal: controller.signal,
      headers: {
        ...(rest.body ? { "Content-Type": "application/json" } : {}),
        ...(await authHeaders()),
        ...(rest.headers as Record<string, string> | undefined),
      },
    });
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try {
        const err = await res.json();
        msg = err?.error || msg;
      } catch (parseErr) {
        console.warn(`[api] could not parse error body for ${res.status}:`, parseErr);
      }
      throw new Error(msg);
    }
    if (res.status === 204) return undefined as T;
    return await res.json();
  } catch (err: any) {
    if (err?.name === "AbortError") {
      // Don't leak an opaque AbortError to UI — replace with a useful message
      // unless the caller explicitly aborted.
      if (externalSignal?.aborted) throw err;
      throw new Error("La requête a expiré, vérifiez votre connexion.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** Lazily-resolved API base URL — call at request time, not at import time. */
export function getApiBase(): string { return resolvedApiBase(); }

// Drivers ------------------------------------------------------------
export async function fetchAvailableOrders(): Promise<any[]> {
  return jsonFetch("/api/orders/available");
}

export async function acceptDelivery(orderId: number, driverId: number): Promise<any> {
  return jsonFetch(`/api/orders/${orderId}/accept-delivery`, {
    method: "POST",
    body: JSON.stringify({ driverId }),
  });
}

/** Driver confirms delivery by entering the 4-digit code shown on the customer's phone. */
export async function confirmDelivery(orderId: number, pickupCode: string): Promise<any> {
  return jsonFetch(`/api/orders/${orderId}/confirm-delivery`, {
    method: "POST",
    body: JSON.stringify({ pickupCode }),
  });
}

export interface DriverProfileInput {
  vehicleType: string;
  vehiclePlate: string;
  nationalId: string;
  licenseNumber?: string;
  photoUrl?: string;
}
export async function completeDriverProfile(driverId: number, data: DriverProfileInput): Promise<any> {
  return jsonFetch(`/api/drivers/${driverId}/complete-profile`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateDriverLocation(driverId: number, lat: number, lng: number, signal?: AbortSignal): Promise<void> {
  await jsonFetch(`/api/drivers/${driverId}/location`, {
    method: "PATCH",
    body: JSON.stringify({ latitude: lat, longitude: lng }),
    signal,
  });
}

export async function getRestaurant(id: number): Promise<{ id: number; name: string; address: string } | null> {
  try {
    return await jsonFetch<{ id: number; name: string; address: string }>(`/api/restaurants/${id}`);
  } catch {
    return null;
  }
}

export async function getDriverLocation(driverId: number): Promise<{ latitude: number | null; longitude: number | null } | null> {
  try {
    const driver = await jsonFetch<any>(`/api/drivers/${driverId}`);
    return { latitude: driver.latitude, longitude: driver.longitude };
  } catch {
    return null;
  }
}

/**
 * Geocode an address to lat/lng. Prefers Google Maps Geocoding API when a key
 * is available (more accurate for Moroccan addresses), falls back to the free
 * OpenStreetMap Nominatim service. Always uses HTTPS and a hard timeout so a
 * slow third-party call can never freeze the UI.
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const googleKey = (process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY ?? process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? "").trim();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);

  try {
    if (googleKey) {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${googleKey}`;
      const res = await fetch(url, { signal: controller.signal });
      const data = await res.json();
      const loc = data?.results?.[0]?.geometry?.location;
      if (loc?.lat != null && loc?.lng != null) return { lat: loc.lat, lng: loc.lng };
    }
    const osmUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
    const res = await fetch(osmUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "Jatek/1.0 (contact@jatek.ma)" },
    });
    const data = await res.json();
    if (data?.[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch (err) {
    console.warn("[geocode] lookup failed:", err);
  } finally {
    clearTimeout(timer);
  }
  return null;
}

// Users --------------------------------------------------------------
export async function fetchMe(): Promise<any> {
  return jsonFetch("/api/auth/me");
}

export async function fetchMyDriver(): Promise<any> {
  return jsonFetch("/api/drivers/me");
}

export async function updateUserProfile(userId: number, data: { name?: string; email?: string; phone?: string | null; address?: string | null; avatarUrl?: string | null }): Promise<any> {
  return jsonFetch(`/api/users/${userId}`, { method: "PATCH", body: JSON.stringify(data) });
}

// Favorites ----------------------------------------------------------
export async function listFavorites(): Promise<Array<{ id: number; restaurantId: number; restaurant: any }>> {
  return jsonFetch("/api/favorites");
}
export async function addFavorite(restaurantId: number): Promise<any> {
  return jsonFetch("/api/favorites", { method: "POST", body: JSON.stringify({ restaurantId }) });
}
export async function removeFavorite(restaurantId: number): Promise<void> {
  await jsonFetch(`/api/favorites/${restaurantId}`, { method: "DELETE" });
}

// Addresses ----------------------------------------------------------
export interface SavedAddress { id: number; label: string; fullAddress: string; details: string | null; isDefault: boolean; }
export async function listAddresses(): Promise<SavedAddress[]> { return jsonFetch("/api/addresses"); }
export async function createAddress(data: Omit<SavedAddress, "id">): Promise<SavedAddress> {
  return jsonFetch("/api/addresses", { method: "POST", body: JSON.stringify(data) });
}
export async function updateAddress(id: number, data: Partial<Omit<SavedAddress, "id">>): Promise<SavedAddress> {
  return jsonFetch(`/api/addresses/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}
export async function deleteAddress(id: number): Promise<void> { await jsonFetch(`/api/addresses/${id}`, { method: "DELETE" }); }

// Payment methods ----------------------------------------------------
export interface PaymentMethod { id: number; type: string; label: string; last4: string | null; brand: string | null; isDefault: boolean; }
export async function listPaymentMethods(): Promise<PaymentMethod[]> { return jsonFetch("/api/payment-methods"); }
export async function createPaymentMethod(data: Omit<PaymentMethod, "id">): Promise<PaymentMethod> {
  return jsonFetch("/api/payment-methods", { method: "POST", body: JSON.stringify(data) });
}
export async function updatePaymentMethod(id: number, data: Partial<Omit<PaymentMethod, "id">>): Promise<PaymentMethod> {
  return jsonFetch(`/api/payment-methods/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}
export async function deletePaymentMethod(id: number): Promise<void> { await jsonFetch(`/api/payment-methods/${id}`, { method: "DELETE" }); }

// Support tickets ----------------------------------------------------
export interface SupportTicket { id: number; category: string; subject: string; message: string; status: string; createdAt: string; }
export async function listSupportTickets(): Promise<SupportTicket[]> { return jsonFetch("/api/support-tickets"); }
export async function createSupportTicket(data: { category: string; subject: string; message: string }): Promise<SupportTicket> {
  return jsonFetch("/api/support-tickets", { method: "POST", body: JSON.stringify(data) });
}

// Notification prefs -------------------------------------------------
export interface NotifPrefs { pushOrders: boolean; pushPromos: boolean; emailReceipts: boolean; emailNewsletter: boolean; smsAlerts: boolean; language: string; }
export async function fetchNotifPrefs(signal?: AbortSignal): Promise<NotifPrefs> { return jsonFetch("/api/notification-prefs", { signal }); }
export async function updateNotifPrefs(data: Partial<NotifPrefs & { pushToken?: string }>, signal?: AbortSignal): Promise<NotifPrefs> {
  return jsonFetch("/api/notification-prefs", { method: "PATCH", body: JSON.stringify(data), signal });
}

// Notifications inbox -------------------------------------------------
export interface AppNotification {
  id: number;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}
export async function listNotifications(): Promise<{ notifications: AppNotification[]; unreadCount: number }> {
  return jsonFetch("/api/notifications");
}
export async function markNotificationRead(id: number): Promise<AppNotification> {
  return jsonFetch(`/api/notifications/${id}/read`, { method: "PATCH" });
}
export async function markAllNotificationsRead(): Promise<void> {
  await jsonFetch("/api/notifications/read-all", { method: "PATCH" });
}
export async function deleteNotification(id: number): Promise<void> {
  await jsonFetch(`/api/notifications/${id}`, { method: "DELETE" });
}

// Reviews ------------------------------------------------------------
export async function listReviews(params?: { userId?: number; restaurantId?: number }): Promise<any[]> {
  const q = new URLSearchParams();
  if (params?.userId) q.set("userId", String(params.userId));
  if (params?.restaurantId) q.set("restaurantId", String(params.restaurantId));
  const qs = q.toString();
  return jsonFetch(`/api/reviews${qs ? `?${qs}` : ""}`);
}
export async function createReview(data: { restaurantId: number; rating: number; comment?: string }): Promise<any> {
  return jsonFetch("/api/reviews", { method: "POST", body: JSON.stringify(data) });
}
export async function deleteReview(id: number): Promise<void> { await jsonFetch(`/api/reviews/${id}`, { method: "DELETE" }); }

// Orders -------------------------------------------------------------
export async function listMyOrders(): Promise<any[]> {
  return jsonFetch("/api/orders");
}
export async function updateOrderStatus(orderId: number, status: string): Promise<any> {
  return jsonFetch(`/api/orders/${orderId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

// Menu item options (sizes + extras) ---------------------------------
export interface MenuItemSize { id: number; menuItemId: number; name: string; priceAdjustment: number; sortOrder: number; isAvailable: boolean; }
export interface MenuItemExtra { id: number; menuItemId: number; name: string; price: number; sortOrder: number; isAvailable: boolean; }
export async function listMenuItemSizes(menuItemId: number): Promise<MenuItemSize[]> {
  return jsonFetch(`/api/menu/${menuItemId}/sizes`);
}
export async function listMenuItemExtras(menuItemId: number): Promise<MenuItemExtra[]> {
  return jsonFetch(`/api/menu/${menuItemId}/extras`);
}

// Restaurants --------------------------------------------------------
export interface RestaurantProfileInput {
  legalName: string;
  ice: string;
  printerEmail?: string;
}
export async function completeRestaurantProfile(restaurantId: number, data: RestaurantProfileInput): Promise<any> {
  return jsonFetch(`/api/restaurants/${restaurantId}/complete-profile`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// RGPD / Consents ----------------------------------------------------
export interface UserConsents {
  cookiesEssential: boolean;
  cookiesAnalytics: boolean;
  cookiesMarketing: boolean;
  dataProcessing: boolean;
  dataSharing: boolean;
  personalization: boolean;
  marketingEmails: boolean;
  marketingSms: boolean;
  marketingPush: boolean;
  termsAcceptedAt: string | null;
  privacyAcceptedAt: string | null;
  cookiesAcceptedAt: string | null;
  termsVersion: string | null;
  privacyVersion: string | null;
  cookiesVersion: string | null;
  currentVersions?: { terms: string; privacy: string; cookies: string };
}
export async function fetchConsents(): Promise<UserConsents> { return jsonFetch("/api/consents"); }
export async function updateConsents(data: Partial<UserConsents> & { acceptTerms?: boolean; acceptPrivacy?: boolean; acceptCookies?: boolean }): Promise<UserConsents> {
  return jsonFetch("/api/consents", { method: "PATCH", body: JSON.stringify(data) });
}
export async function acceptAllConsents(): Promise<UserConsents> {
  return jsonFetch("/api/consents/accept-all", { method: "POST", body: JSON.stringify({}) });
}
export async function rejectAllConsents(): Promise<UserConsents> {
  return jsonFetch("/api/consents/reject-all", { method: "POST", body: JSON.stringify({}) });
}
export function exportMyDataUrl(): string { return `${resolvedApiBase()}/api/me/export`; }
export async function deleteMyAccount(): Promise<void> { await jsonFetch("/api/me", { method: "DELETE" }); }
