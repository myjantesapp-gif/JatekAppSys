/**
 * OrderStatusToast — global in-app toast for order status changes.
 *
 * Subscribes to a `user:{userId}` SSE channel. When the app is in the
 * foreground and an order_status event arrives, shows a brief toast with
 * the new status and a "Voir la commande" button.
 *
 * Automatically suppressed when the user is already viewing that order.
 */
import React, { useEffect, useRef, useState, useCallback, type ComponentProps } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Platform,
  Animated, Easing,
} from "react-native";
import { router, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useT } from "@/contexts/LanguageContext";
import { getApiBase } from "@/lib/api";
import { useSSE } from "@/hooks/useSSE";

interface ToastData {
  orderId: number;
  status: string;
  title: string;
  body: string;
}

const STATUS_INFO: Record<string, { title: string; titleAr: string; body: string; bodyAr: string; icon: ComponentProps<typeof Ionicons>["name"] }> = {
  pending:   { title: "Commande reçue ✅",    titleAr: "تم استلام طلبك ✅", body: "Votre commande est en attente de confirmation.", bodyAr: "طلبك في انتظار التأكيد.", icon: "time" },
  accepted:  { title: "Commande acceptée ✅",  titleAr: "تم قبول الطلب ✅",  body: "Le restaurant a confirmé votre commande.", bodyAr: "المطعم أكّد طلبك.", icon: "checkmark-circle" },
  preparing: { title: "En préparation 🍳",      titleAr: "قيد التحضير 🍳",     body: "Le chef prépare votre commande.",           bodyAr: "الطاهي يحضّر طلبك.",   icon: "restaurant" },
  ready:     { title: "Commande prête 🛍️",     titleAr: "الطلب جاهز 🛍️",    body: "Un livreur va bientôt récupérer votre commande.", bodyAr: "موصِّل سيستلم طلبك قريباً.", icon: "bag-check" },
  picked_up: { title: "En route 🛵",            titleAr: "في الطريق 🛵",       body: "Votre livreur est en chemin vers vous.",   bodyAr: "الموصِّل في طريقه إليك.",  icon: "bicycle" },
  delivered: { title: "Commande livrée 🎉",     titleAr: "تم التوصيل 🎉",     body: "Bon appétit !",                           bodyAr: "بالهناء والشفاء!",          icon: "home" },
  cancelled: { title: "Commande annulée ❌",    titleAr: "تم إلغاء الطلب ❌", body: "Votre commande a été annulée.",           bodyAr: "تم إلغاء طلبك.",            icon: "close-circle" },
};

const TOAST_DURATION_MS = 5000;

export function OrderStatusToast() {
  const { user, token } = useAuth();
  const userId = user?.id;
  const colors = useColors();
  const t = useT();
  const pathname = usePathname();
  const [toast, setToast] = useState<ToastData | null>(null);
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isShowing = useRef(false);

  const dismiss = useCallback(() => {
    if (!isShowing.current) return;
    isShowing.current = false;
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    Animated.parallel([
      Animated.timing(translateY, { toValue: -120, duration: 280, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start(() => setToast(null));
  }, [translateY, opacity]);

  const showToast = useCallback((data: ToastData) => {
    setToast(data);
    isShowing.current = true;
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, friction: 8, tension: 100, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    dismissTimer.current = setTimeout(dismiss, TOAST_DURATION_MS);
  }, [translateY, opacity, dismiss]);

  const handleStatusEvent = useCallback((rawData: unknown) => {
    const data = rawData as {
      orderId?: number;
      status?: string;
      title?: string;
      body?: string;
    } | null;
    if (!data?.orderId || !data?.status) return;

    // Suppress if the user is already viewing this order
    const onOrderScreen = typeof pathname === "string" && pathname.includes(`/order/${data.orderId}`);
    if (onOrderScreen) return;

    // Prefer server-localized title/body from SSE payload; fallback to local copy
    const info = STATUS_INFO[data.status];
    if (!info && !data.title) return;

    showToast({
      orderId: data.orderId,
      status: data.status,
      title: data.title ?? info?.title ?? "",
      body: data.body ?? info?.body ?? "",
    });
  }, [pathname, showToast]);

  useSSE({
    url: `${getApiBase()}/api/events?channels=user:${userId}&token=${encodeURIComponent(token ?? "")}`,
    enabled: !!userId && !!token && Platform.OS !== "web",
    events: {
      order_status: handleStatusEvent,
    },
  });

  useEffect(() => {
    if (Platform.OS !== "web" || !userId || !token) return;
    const url = `${getApiBase()}/api/events?channels=user:${userId}&token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    es.addEventListener("order_status", (e) => {
      try { handleStatusEvent(JSON.parse((e as MessageEvent).data)); } catch {}
    });
    es.onerror = () => {};
    return () => es.close();
  }, [userId, token, handleStatusEvent]);

  if (!toast) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          transform: [{ translateY }],
          opacity,
          shadowColor: "#000",
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.iconWrap}>
        <Ionicons
          name={STATUS_INFO[toast.status]?.icon ?? "notifications"}
          size={22}
          color={colors.primary}
        />
      </View>
      <View style={styles.textWrap}>
        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>{toast.title}</Text>
        <Text style={[styles.body, { color: colors.mutedForeground }]} numberOfLines={2}>{toast.body}</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.viewBtn, { backgroundColor: colors.primary }]}
          onPress={() => {
            dismiss();
            router.push({ pathname: "/order/[id]", params: { id: String(toast.orderId) } });
          }}
        >
          <Text style={styles.viewBtnText}>{t("notif_view_order")}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={dismiss} hitSlop={10} style={styles.closeBtn}>
          <Ionicons name="close" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: Platform.OS === "ios" ? 54 : 16,
    left: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    zIndex: 9999,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(233,30,140,0.10)",
    flexShrink: 0,
  },
  textWrap: { flex: 1 },
  title: { fontSize: 13, fontFamily: "Inter_700Bold", marginBottom: 2 },
  body: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 16 },
  actions: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 0 },
  viewBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  viewBtnText: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" },
  closeBtn: { padding: 2 },
});
