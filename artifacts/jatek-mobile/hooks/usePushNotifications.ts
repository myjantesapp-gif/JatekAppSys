/**
 * usePushNotifications — local + remote push notification support.
 *
 * Split into two concerns:
 *  - useNotificationSetup(authToken): requests permissions once, sets up the
 *    global tap listener once, AND re-registers the Expo push token with the
 *    backend whenever `authToken` changes (login/restore).  Call once at app
 *    root (_layout.tsx) with the live auth token from AuthContext.
 *  - scheduleOrderStatusNotification(): standalone async utility.
 *    Call from any screen when the order status changes locally.
 */
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { getApiBaseSafe } from "@/lib/apiBase";

/**
 * Expo Go on SDK 53+ no longer ships the native `expo-notifications` module.
 * Calling ANY Notifications API (even `setNotificationHandler` at module
 * top-level) crashes the JS bundle on Android with a blank blue screen.
 * Gate every call on this flag so the app boots cleanly in Expo Go (without
 * push) and works fully in development builds / production.
 */
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const pushSupported = Platform.OS !== "web" && !isExpoGo;

const STATUS_LABELS: Record<string, { title: string; body: string }> = {
  accepted:   { title: "Commande acceptée ✅",   body: "Le restaurant a confirmé votre commande." },
  preparing:  { title: "En préparation 🍳",       body: "Le chef est aux fourneaux !" },
  ready:      { title: "Commande prête 🛍️",      body: "Un livreur va bientôt récupérer votre commande." },
  picked_up:  { title: "En route 🛵",              body: "Votre livreur est en chemin vers vous." },
  delivered:  { title: "Commande livrée 🎉",       body: "Bon appétit ! N'oubliez pas de noter votre expérience." },
  cancelled:  { title: "Commande annulée ❌",      body: "Votre commande a été annulée." },
};

if (pushSupported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * Module-level cache for the Expo push token so we avoid redundant
 * getExpoPushTokenAsync calls on every auth change.
 */
let cachedExpoPushToken: string | null = null;

async function fetchExpoPushToken(): Promise<string | null> {
  if (!pushSupported) return null;
  if (cachedExpoPushToken) return cachedExpoPushToken;
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    });
    if (tokenData?.data) {
      cachedExpoPushToken = tokenData.data;
      return cachedExpoPushToken;
    }
  } catch (err) {
    console.warn("[push] could not get Expo push token:", err);
  }
  return null;
}

/**
 * Register the device's Expo push token with the backend so the server can
 * send remote push notifications for order status changes.
 * Requires a valid auth token — no-ops if absent.
 */
async function registerPushTokenWithBackend(authToken: string): Promise<void> {
  const expoPushToken = await fetchExpoPushToken();
  if (!expoPushToken) return;
  const base = getApiBaseSafe();
  try {
    await fetch(`${base}/api/notification-prefs`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ pushToken: expoPushToken }),
      signal: AbortSignal.timeout(8_000),
    });
  } catch (err) {
    console.warn("[push] could not register token with backend:", err);
  }
}

/**
 * Call once in the root layout to:
 *  1. Request notification permissions (one-time).
 *  2. Listen for notification taps app-wide (one-time).
 *  3. Re-register the Expo push token with the backend whenever `authToken`
 *     changes — this handles cold-start-while-logged-out and login-after-boot.
 *
 * @param authToken  Live auth token from AuthContext (null when logged out).
 */
export function useNotificationSetup(authToken: string | null) {
  const listenerRef = useRef<Notifications.EventSubscription | null>(null);
  // Keep a ref to the latest authToken so the async permission callback can
  // access it without capturing a stale closure value.
  const authTokenRef = useRef<string | null>(authToken);
  authTokenRef.current = authToken;

  // ── One-time: permission request + notification tap listener ──────────────
  useEffect(() => {
    if (!pushSupported) return;

    (async () => {
      const { status: existing } = await Notifications.getPermissionsAsync();
      let status = existing;
      if (status !== "granted") {
        const { status: asked } = await Notifications.requestPermissionsAsync();
        status = asked;
      }
      // After permission is resolved, re-trigger backend registration using the
      // current auth token (via ref) in case the auth-aware effect below fired
      // before permission was granted and was silently skipped by getExpoPushTokenAsync.
      if (status === "granted" && authTokenRef.current) {
        void registerPushTokenWithBackend(authTokenRef.current);
      }
    })();

    listenerRef.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const orderId = response.notification.request.content.data?.orderId as number | undefined;
      if (orderId) {
        router.push({ pathname: "/order/[id]", params: { id: String(orderId) } });
      }
    });

    return () => {
      listenerRef.current?.remove();
    };
  }, []);

  // ── Auth-aware: re-register token with backend whenever user logs in ───────
  // Covers the case where the user was already logged in on first render,
  // or logs in after the app started. If permission has not been granted yet,
  // the registration above (post-permission callback) will handle it instead.
  useEffect(() => {
    if (!pushSupported) return;
    if (!authToken) return;
    void registerPushTokenWithBackend(authToken);
  }, [authToken]);
}

/**
 * Schedules an immediate local notification for an order status change.
 * Safe to call on web (no-op).
 */
export async function scheduleOrderStatusNotification(status: string, orderId: number) {
  if (!pushSupported) return;
  const info = STATUS_LABELS[status];
  if (!info) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: info.title,
        body: info.body,
        data: { orderId },
        sound: true,
      },
      trigger: null,
    });
  } catch {
  }
}
