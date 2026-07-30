import { clearToken, getToken, setToken } from "./auth";
import { getApiTarget, getBaseUrl } from "./apiTarget";

export type ApiError = { status: number; message: string; data?: unknown };

async function request<T>(
  path: string,
  init: RequestInit = {},
  auth = true,
): Promise<T> {
  const target = await getApiTarget();
  const base = getBaseUrl(target);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init.headers as Record<string, string>) ?? {}),
  };
  if (auth) {
    const token = await getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(`${base}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    });
    const text = await res.text();
    let data: unknown = null;
    if (text) {
      try { data = JSON.parse(text); } catch { data = text; }
    }
    if (!res.ok) {
      const message =
        (data && typeof data === "object" && "message" in data
          ? String((data as { message: unknown }).message)
          : data && typeof data === "object" && "error" in data
            ? String((data as { error: unknown }).error)
            : null) ?? `Request failed (${res.status})`;
      const err: ApiError = { status: res.status, message, data };
      if (res.status === 401) {
        await clearToken();
      }
      throw err;
    }
    return data as T;
  } catch (e: any) {
    if (e?.name === "AbortError") {
      throw { status: 408, message: "La requête a expiré. Vérifiez votre connexion." } as ApiError;
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// ─────────────────── Common types ───────────────────

export type Role = "client" | "driver" | "admin";

export type Me = {
  id: string;
  phone: string;
  role: Role;
  fullName?: string | null;
  email?: string | null;
  driver?: DriverProfile | null;
};

export type DriverStatus = "pending" | "approved" | "rejected";
export type VehicleType = "scooter" | "moto" | "voiture" | "velo";

export type DriverProfile = {
  id: string;
  fullName: string;
  vehicleType: VehicleType;
  vehiclePlate: string;
  cin: string;
  licenseNumber: string;
  photoUrl?: string | null;
  status: DriverStatus;
  isOnline: boolean;
  rating?: number | null;
  totalDeliveries?: number;
};

export type DriverOnboardingPayload = {
  fullName: string;
  vehicleType: VehicleType;
  vehiclePlate: string;
  cin: string;
  licenseNumber: string;
  photoUrl?: string | null;
};

export type OrderStatus =
  | "pending"
  | "assigned"
  | "accepted"
  | "arrived_pickup"
  | "picked_up"
  | "arrived_dropoff"
  | "delivered"
  | "cancelled";

export type PaymentMethod = "cash" | "card" | "online";

export type OrderItem = {
  name: string;
  quantity: number;
  unitPrice?: number;
  options?: string | null;
};

export type Order = {
  id: string;
  code: string;
  status: OrderStatus;
  restaurantName: string;
  restaurantPhone: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  distanceKm: number;
  etaMinutes: number;
  items: OrderItem[];
  subtotalMad: number;
  priceMad: number;
  driverEarningsMad: number;
  tipMad: number;
  paymentMethod: PaymentMethod;
  deliveryCode: string;
  customerName: string;
  customerPhone: string;
  notes?: string | null;
  createdAt: string;
};

export type Promotion = {
  id: string;
  title: string;
  description: string;
  bonusMad: number;
  required: number;
  progress: number;
  expiresAt: string;
};

export type EarningsSummary = {
  todayMad: number;
  weekMad: number;
  monthMad: number;
  todayDeliveries: number;
  weekDeliveries: number;
  todayTipsMad: number;
  weekTipsMad: number;
};

// ─────────────────── Backend API types (raw) ───────────────────

type BackendDriver = {
  id: number;
  userId: number;
  name?: string;
  phone?: string;
  vehicleType?: string;
  vehiclePlate?: string;
  nationalId?: string;
  licenseNumber?: string;
  photoUrl?: string;
  profileCompletedAt?: string;
  isAvailable?: boolean;
  totalDeliveries?: number;
  rating?: number;
  latitude?: number;
  longitude?: number;
};

type BackendOrderItem = {
  id: number;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

type BackendOrder = {
  id: number;
  reference?: string;
  userId: number;
  restaurantId: number;
  driverId?: number;
  restaurantName: string;
  userName: string;
  status: string;
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  total: number;
  deliveryAddress: string;
  notes?: string;
  estimatedDeliveryTime?: number;
  pickupCode?: string;
  isContactless?: boolean;
  createdAt: string;
  items?: BackendOrderItem[];
  restaurant?: { phone?: string; address?: string; latitude?: number; longitude?: number };
  user?: { phone?: string; name?: string };
};

type BackendMe = {
  id: number;
  phone?: string;
  email?: string;
  name?: string;
  role?: string;
  driver?: BackendDriver;
};

function mapDriver(d: BackendDriver): DriverProfile {
  return {
    id: String(d.id),
    fullName: d.name ?? "",
    vehicleType: (d.vehicleType as VehicleType) ?? "scooter",
    vehiclePlate: d.vehiclePlate ?? "",
    cin: d.nationalId ?? "",
    licenseNumber: d.licenseNumber ?? "",
    photoUrl: d.photoUrl ?? null,
    status: d.profileCompletedAt ? "approved" : "pending",
    isOnline: d.isAvailable ?? false,
    rating: d.rating ?? null,
    totalDeliveries: d.totalDeliveries ?? 0,
  };
}

function mapOrder(o: BackendOrder): Order {
  const COMMISSION = 0.15;
  const driverEarnings = Math.round(o.total * COMMISSION * 10) / 10;
  const items: OrderItem[] = (o.items ?? []).map((i) => ({
    name: i.menuItemName,
    quantity: i.quantity,
    unitPrice: i.unitPrice,
  }));
  const distanceKm = o.estimatedDeliveryTime
    ? Math.max(0.5, (o.estimatedDeliveryTime / 60) * 20)
    : 2.5;
  const restaurantLat = o.restaurant?.latitude ?? 34.6814;
  const restaurantLng = o.restaurant?.longitude ?? -1.9086;

  return {
    id: String(o.id),
    code: o.reference ?? `#${o.id}`,
    status: mapBackendStatus(o.status),
    restaurantName: o.restaurantName,
    restaurantPhone: o.restaurant?.phone ?? "",
    pickupAddress: o.restaurant?.address ?? o.restaurantName,
    dropoffAddress: o.deliveryAddress,
    pickupLat: restaurantLat,
    pickupLng: restaurantLng,
    dropoffLat: restaurantLat + 0.01,
    dropoffLng: restaurantLng + 0.01,
    distanceKm: Math.round(distanceKm * 10) / 10,
    etaMinutes: o.estimatedDeliveryTime ?? 20,
    items,
    subtotalMad: o.subtotal,
    priceMad: o.total,
    driverEarningsMad: driverEarnings,
    tipMad: 0,
    paymentMethod: "cash",
    deliveryCode: o.pickupCode ?? "",
    customerName: o.userName,
    customerPhone: o.user?.phone ?? "",
    notes: o.notes ?? null,
    createdAt: o.createdAt,
  };
}

function mapBackendStatus(s: string): OrderStatus {
  const map: Record<string, OrderStatus> = {
    pending: "pending",
    accepted: "accepted",
    confirmed: "accepted",
    preparing: "accepted",
    ready: "assigned",
    picked_up: "picked_up",
    driver_at_restaurant: "arrived_pickup",
    en_route: "picked_up",
    out_for_delivery: "arrived_dropoff",
    delivered: "delivered",
    cancelled: "cancelled",
  };
  return map[s] ?? "pending";
}

// ─────────────────── Auth ───────────────────

export type SendOtpResponse = { ok: true; debugCode?: string };
export type VerifyOtpResponse = { token: string; isNewUser: boolean };

export async function sendOtp(phone: string): Promise<SendOtpResponse> {
  return request<SendOtpResponse>(
    "/auth/send-otp",
    { method: "POST", body: JSON.stringify({ phone, role: "driver" }) },
    false,
  );
}

export async function verifyOtp(phone: string, code: string): Promise<VerifyOtpResponse> {
  return request<VerifyOtpResponse>(
    "/auth/verify-otp",
    { method: "POST", body: JSON.stringify({ phone, code, role: "driver" }) },
    false,
  );
}

export async function forgotPassword(email: string): Promise<{ success: boolean; message: string; demoOtp?: string }> {
  return request<{ success: boolean; message: string; demoOtp?: string }>(
    "/auth/forgot-password",
    { method: "POST", body: JSON.stringify({ email }) },
    false,
  );
}

export async function resetPassword(email: string, code: string, newPassword: string): Promise<{ success: boolean; token: string }> {
  const data = await request<{ success: boolean; token: string }>(
    "/auth/reset-password",
    { method: "POST", body: JSON.stringify({ email, code, newPassword }) },
    false,
  );
  if (data.token) await setToken(data.token);
  return data;
}

export async function loginWithCredentials(email: string, password: string): Promise<{ token: string }> {
  const data = await request<Record<string, unknown>>(
    "/auth/login",
    { method: "POST", body: JSON.stringify({ email, password }) },
    false,
  );
  const token =
    (typeof data.token === "string" && data.token) ||
    (typeof data.accessToken === "string" && data.accessToken) ||
    (typeof data.access_token === "string" && data.access_token) ||
    (typeof data.jwt === "string" && data.jwt) ||
    null;
  if (!token) throw { status: 401, message: "Aucun token reçu dans la réponse." } as ApiError;
  await setToken(token);
  return { token };
}

// ─────────────────── Me ───────────────────

export async function getMe(): Promise<Me> {
  const u = await request<BackendMe>("/auth/me");
  return {
    id: String(u.id),
    phone: u.phone ?? "",
    email: u.email ?? null,
    role: (u.role as Role) ?? "driver",
    fullName: u.name ?? null,
    driver: u.driver ? mapDriver(u.driver) : null,
  };
}

// ─────────────────── Driver profile ───────────────────

async function resolveDriverId(): Promise<string> {
  const me = await getMe();
  return me.driver?.id ?? me.id;
}

export async function submitDriverOnboarding(payload: DriverOnboardingPayload): Promise<DriverProfile> {
  const driverId = await resolveDriverId();
  const updated = await request<BackendDriver>(`/drivers/${driverId}/complete-profile`, {
    method: "POST",
    body: JSON.stringify({
      vehicleType: payload.vehicleType,
      vehiclePlate: payload.vehiclePlate,
      nationalId: payload.cin,
      licenseNumber: payload.licenseNumber,
      photoUrl: payload.photoUrl ?? null,
    }),
  });
  return mapDriver(updated);
}

export async function setDriverOnline(isOnline: boolean): Promise<{ isOnline: boolean }> {
  const driverId = await resolveDriverId();
  await request<BackendDriver>(`/drivers/${driverId}`, {
    method: "PATCH",
    body: JSON.stringify({ isAvailable: isOnline }),
  });
  return { isOnline };
}

export async function updateDriverLocation(coords: {
  latitude: number;
  longitude: number;
  heading?: number | null;
  speed?: number | null;
}): Promise<{ ok: true }> {
  const driverId = await resolveDriverId();
  await request(`/drivers/${driverId}/location`, {
    method: "PATCH",
    body: JSON.stringify({
      latitude: coords.latitude,
      longitude: coords.longitude,
    }),
  });
  return { ok: true };
}

// ─────────────────── Push token ───────────────────

export async function updatePushToken(pushToken: string): Promise<{ ok: true }> {
  try {
    await request("/drivers/me/push-token", {
      method: "PATCH",
      body: JSON.stringify({ pushToken }),
    });
  } catch {
    // best-effort — don't block auth flow if backend doesn't support the field
  }
  return { ok: true };
}

// ─────────────────── Orders ───────────────────

export async function listAvailableOrders(): Promise<Order[]> {
  const list = await request<BackendOrder[]>("/orders/available");
  return list.map(mapOrder);
}

export async function listMyOrders(): Promise<Order[]> {
  try {
    const driverId = await resolveDriverId();
    const list = await request<BackendOrder[]>(`/orders?driverId=${driverId}`);
    return list.map(mapOrder);
  } catch {
    return [];
  }
}

export async function getOrder(id: string): Promise<Order> {
  const o = await request<BackendOrder>(`/orders/${id}`);
  return mapOrder(o);
}

async function patchOrderStatus(id: string, status: string): Promise<Order> {
  const o = await request<BackendOrder>(`/orders/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  return mapOrder(o);
}

export async function acceptOrder(id: string): Promise<Order> {
  const driverId = await resolveDriverId();
  const o = await request<BackendOrder>(`/orders/${id}/accept-delivery`, {
    method: "POST",
    body: JSON.stringify({ driverId: Number(driverId) }),
  });
  return mapOrder(o);
}

export async function markArrivedPickup(id: string): Promise<Order> {
  return patchOrderStatus(id, "driver_at_restaurant");
}

export async function markPickedUp(id: string): Promise<Order> {
  return patchOrderStatus(id, "picked_up");
}

export async function markArrivedDropoff(id: string): Promise<Order> {
  return patchOrderStatus(id, "out_for_delivery");
}

export async function markDelivered(id: string, deliveryCode: string): Promise<Order> {
  const o = await request<BackendOrder>(`/orders/${id}/confirm-delivery`, {
    method: "POST",
    body: JSON.stringify({ pickupCode: deliveryCode }),
  });
  return mapOrder(o);
}

export async function cancelOrder(id: string): Promise<Order> {
  return patchOrderStatus(id, "cancelled");
}

// ─────────────────── Earnings & Promos ───────────────────

export async function getEarnings(): Promise<EarningsSummary> {
  try {
    const driverId = await resolveDriverId();
    const raw = await request<{
      today: number;
      thisWeek: number;
      thisMonth: number;
      completedToday: number;
      totalDeliveries: number;
    }>(`/drivers/${driverId}/earnings`);
    return {
      todayMad: raw.today ?? 0,
      weekMad: raw.thisWeek ?? 0,
      monthMad: raw.thisMonth ?? 0,
      todayDeliveries: raw.completedToday ?? 0,
      weekDeliveries: 0,
      todayTipsMad: 0,
      weekTipsMad: 0,
    };
  } catch {
    return { todayMad: 0, weekMad: 0, monthMad: 0, todayDeliveries: 0, weekDeliveries: 0, todayTipsMad: 0, weekTipsMad: 0 };
  }
}

export async function getPromotions(): Promise<Promotion[]> {
  // Promotions endpoint is not implemented in the backend yet.
  return [];
}

// ─────────────────── Live Tracking ───────────────────

export type TrackingInfo =
  | { available: false }
  | {
      available: true;
      latitude: number;
      longitude: number;
      heading: number | null;
      updatedAt: number | null;
      orderStatus: OrderStatus;
      pickupLat: number;
      pickupLng: number;
      dropoffLat: number;
      dropoffLng: number;
    };

export async function getOrderTracking(orderId: string): Promise<TrackingInfo> {
  try {
    const driver = await request<{ latitude: number | null; longitude: number | null; lastSeenAt?: string | null }>(
      `/drivers/by-order/${orderId}`,
    ).catch(() => null);
    if (!driver || driver.latitude == null || driver.longitude == null) {
      return { available: false };
    }
    const order = await request<BackendOrder>(`/orders/${orderId}`);
    const restaurantLat = order.restaurant?.latitude ?? 34.6814;
    const restaurantLng = order.restaurant?.longitude ?? -1.9086;
    return {
      available: true,
      latitude: driver.latitude,
      longitude: driver.longitude,
      heading: null,
      updatedAt: driver.lastSeenAt ? Date.parse(driver.lastSeenAt) : null,
      orderStatus: mapBackendStatus(order.status),
      pickupLat: restaurantLat,
      pickupLng: restaurantLng,
      dropoffLat: restaurantLat + 0.01,
      dropoffLng: restaurantLng + 0.01,
    };
  } catch {
    return { available: false };
  }
}
