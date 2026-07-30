import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { Order, OrderStatus } from "@/lib/api";

// ─── Notification handler (must run before any notification fires) ───

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── Android channels ────────────────────────────────────────────────

export const CHANNEL_INCOMING = "incoming-order";
export const CHANNEL_STATUS = "order-status";

async function createAndroidChannels(): Promise<void> {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync(CHANNEL_INCOMING, {
    name: "Nouvelles courses",
    description: "Alerte sonore pour chaque nouvelle course disponible",
    importance: Notifications.AndroidImportance.MAX,
    sound: "default",
    vibrationPattern: [0, 300, 200, 300],
    lightColor: "#E91E8C",
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: true,
    enableVibrate: true,
  });

  await Notifications.setNotificationChannelAsync(CHANNEL_STATUS, {
    name: "Statut de course",
    description: "Mises à jour de progression lors d'une livraison",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "default",
    vibrationPattern: [0, 150],
    lightColor: "#E91E8C",
    enableVibrate: true,
  });
}

// ─── Permissions ─────────────────────────────────────────────────────

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

// ─── Expo push token ─────────────────────────────────────────────────

export async function getExpoPushToken(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  try {
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_REPL_ID ?? undefined,
    });
    return token.data;
  } catch {
    return null;
  }
}

// ─── Boot setup (call once on app start) ─────────────────────────────

export async function setupNotifications(): Promise<void> {
  await createAndroidChannels();
  await requestNotificationPermissions();
}

// ─── New incoming order notification ─────────────────────────────────
// Fires when a fresh order appears in the polling loop while the driver is online.
// Uses CHANNEL_INCOMING (MAX importance, bypassDnd) on Android.

export async function fireNewOrderNotification(order: Order): Promise<void> {
  if (Platform.OS === "web") return;
  const earning = order.driverEarningsMad + order.tipMad;
  const distanceStr = order.distanceKm.toFixed(1);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "🏍️ Nouvelle course !",
      body: `${order.restaurantName}\n${earning} DH · ${distanceStr} km · ~${order.etaMinutes} min`,
      sound: true,
      color: "#E91E8C",
      badge: 1,
      data: { orderId: order.id, type: "new_order" },
      ...(Platform.OS === "android" ? { channelId: CHANNEL_INCOMING } : {}),
    },
    trigger: null,
  });
}

// ─── Order status change notification ────────────────────────────────
// Fires during an active delivery whenever the order moves to a new status.

type StepMessage = { title: string; body: string };

const STATUS_MESSAGES: Partial<Record<OrderStatus, StepMessage>> = {
  accepted: {
    title: "🏍️ En route vers le restaurant",
    body: "Course acceptée — rejoignez le restaurant pour récupérer la commande.",
  },
  arrived_pickup: {
    title: "🏪 Au restaurant",
    body: "Récupérez la commande et vérifiez les articles.",
  },
  picked_up: {
    title: "📦 Commande récupérée",
    body: "En route vers le client — bonne livraison !",
  },
  arrived_dropoff: {
    title: "📍 Arrivé à destination",
    body: "Remettez la commande et demandez le code de livraison.",
  },
  delivered: {
    title: "✅ Course terminée !",
    body: "Excellent travail. La livraison est confirmée.",
  },
  cancelled: {
    title: "❌ Course annulée",
    body: "Cette course a été annulée.",
  },
};

export async function fireStatusNotification(status: OrderStatus): Promise<void> {
  if (Platform.OS === "web") return;
  const msg = STATUS_MESSAGES[status];
  if (!msg) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: msg.title,
      body: msg.body,
      sound: true,
      color: "#E91E8C",
      data: { type: "status_update", status },
      ...(Platform.OS === "android" ? { channelId: CHANNEL_STATUS } : {}),
    },
    trigger: null,
  });
}

// ─── Notification tap handler ─────────────────────────────────────────
// Returns the orderId from the notification data if present.

export function getOrderIdFromResponse(
  response: Notifications.NotificationResponse,
): string | null {
  const data = response.notification.request.content.data as {
    orderId?: string;
    type?: string;
  };
  return data?.orderId ?? null;
}
