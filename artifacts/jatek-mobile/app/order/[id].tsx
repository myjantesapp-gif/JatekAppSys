/**
 * Order detail / live tracking screen.
 *
 * - Animated progress tracker with status-aware copy
 * - Live driver map (WebView + Leaflet) once status is picked_up
 * - Real-time updates via SSE (status + driver_location), polling fallback
 * - Driver card with vehicle, plate, rating once assigned
 * - Pulsing live indicator + haptic feedback on status changes
 */
import React, { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Linking,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useGetOrder, useListDrivers, getGetOrderQueryKey } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useSSE } from "@/hooks/useSSE";
import { scheduleOrderStatusNotification } from "@/hooks/usePushNotifications";
import { DriverMap } from "@/components/DriverMap";
import { getApiBase, geocodeAddress, getDriverLocation, getRestaurant, getAuthToken } from "@/lib/api";
import { useT, useLang } from "@/contexts/LanguageContext";
import type { TKey } from "@/lib/translations";

const STEP_KEYS: { key: string; icon: string; labelKey: TKey; descKey: TKey }[] = [
  { key: "pending",    icon: "bag-add-outline",          labelKey: "order_status_pending",    descKey: "order_status_pending_desc" },
  { key: "accepted",   icon: "checkmark-circle-outline", labelKey: "order_status_accepted",   descKey: "order_status_accepted_desc" },
  { key: "preparing",  icon: "restaurant-outline",       labelKey: "order_status_preparing",  descKey: "order_status_preparing_desc" },
  { key: "ready",      icon: "bag-check-outline",        labelKey: "order_status_ready",      descKey: "order_status_ready_desc" },
  { key: "picked_up",  icon: "bicycle-outline",          labelKey: "order_status_picked_up",  descKey: "order_status_picked_up_desc" },
  { key: "delivered",  icon: "home-outline",             labelKey: "order_status_delivered",  descKey: "order_status_delivered_desc" },
];
const STATUS_ORDER = STEP_KEYS.map((s) => s.key);

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function formatDateTime(iso: string | Date | undefined, locale: string) {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return "";
  try { return d.toLocaleString(locale, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); }
  catch { return d.toISOString(); }
}

function formatTime(d: Date, locale: string) {
  try { return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }); }
  catch { return d.toTimeString().slice(0, 5); }
}

function PulsingDot({ color }: { color: string }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);
  useEffect(() => {
    scale.value = withRepeat(withTiming(1.8, { duration: 1200, easing: Easing.out(Easing.ease) }), -1, false);
    opacity.value = withRepeat(withTiming(0, { duration: 1200, easing: Easing.out(Easing.ease) }), -1, false);
  }, [scale, opacity]);
  const ring = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: opacity.value }));
  return (
    <View style={pulseStyles.wrap}>
      <Animated.View style={[pulseStyles.ring, { backgroundColor: color }, ring]} />
      <View style={[pulseStyles.dot, { backgroundColor: color }]} />
    </View>
  );
}

const pulseStyles = StyleSheet.create({
  wrap: { width: 14, height: 14, alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", width: 14, height: 14, borderRadius: 7 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});

function haptic(type: "success" | "light" = "light") {
  if (Platform.OS === "web") return;
  if (type === "success") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export default function OrderDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { lang } = useLang();
  const locale = lang === "fr" ? "fr-FR" : lang === "ar" ? "ar-MA" : "en-GB";
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = parseInt(id, 10);

  const { data: order, isLoading, refetch } = useGetOrder(orderId, {
    query: {
      queryKey: getGetOrderQueryKey(orderId),
      enabled: !!orderId,
      // SSE pushes status / driver_location updates in real-time; polling is
      // only a safety net for the rare case the stream is unavailable.
      // 60s strikes a balance between freshness and battery / data usage.
      refetchInterval: 60_000,
      refetchOnWindowFocus: true,
    },
  });

  const { data: drivers } = useListDrivers();
  const driver = order?.driverId ? drivers?.find((d) => d.id === order.driverId) : null;

  const [driverPos, setDriverPos] = useState<{ lat: number; lng: number } | null>(null);
  const [destPos, setDestPos] = useState<{ lat: number; lng: number } | null>(null);
  const [restaurantPos, setRestaurantPos] = useState<{ lat: number; lng: number } | null>(null);
  const [sseEtaMinutes, setSseEtaMinutes] = useState<number | null>(null);
  const [sseToken, setSseToken] = useState<string | null>(null);
  const lastStatus = useRef<string | null>(null);

  useEffect(() => {
    getAuthToken().then((tok) => { if (tok) setSseToken(tok); }).catch(() => {});
  }, []);

  // Geocode delivery address once
  useEffect(() => {
    if (!order?.deliveryAddress) return;
    geocodeAddress(order.deliveryAddress).then((pos) => pos && setDestPos(pos));
  }, [order?.deliveryAddress]);

  // Geocode restaurant address for the restaurant marker
  useEffect(() => {
    if (!order?.restaurantId) return;
    getRestaurant(order.restaurantId).then((r) => {
      if (!r?.address) return;
      geocodeAddress(r.address).then((pos) => pos && setRestaurantPos(pos));
    });
  }, [order?.restaurantId]);

  // Initial driver position fetch when one is assigned
  useEffect(() => {
    if (!order?.driverId) return;
    getDriverLocation(order.driverId).then((loc) => {
      if (loc?.latitude != null && loc?.longitude != null) {
        setDriverPos({ lat: loc.latitude, lng: loc.longitude });
      }
    });
  }, [order?.driverId]);

  // SSE: order status + driver location
  useSSE({
    url: sseToken
      ? `${getApiBase()}/api/events?channels=order:${orderId}&token=${encodeURIComponent(sseToken)}`
      : `${getApiBase()}/api/events?channels=order:${orderId}`,
    enabled: !!orderId && !!sseToken,
    events: {
      order_status: () => {
        refetch();
      },
      driver_location: (data: any) => {
        if (data?.latitude != null && data?.longitude != null) {
          setDriverPos({ lat: data.latitude, lng: data.longitude });
          if (data?.eta != null) setSseEtaMinutes(data.eta as number);
        }
      },
    },
  });

  // Haptic + push notification when status changes (SSE or polling)
  useEffect(() => {
    if (!order) return;
    if (lastStatus.current && lastStatus.current !== order.status) {
      haptic("success");
      // User is already viewing this order in real-time — do NOT fire a local
      // push notification (which would create a duplicate alongside the live UI
      // update). Backend push handles the case when the app is in the background.
    }
    lastStatus.current = order.status;
  }, [order?.status, order?.id]);

  const currentIdx = order ? STATUS_ORDER.indexOf(order.status) : -1;

  if (isLoading || !order) {
    return (
      <View style={[styles.flex, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const currentStep = STEP_KEYS[currentIdx] ?? STEP_KEYS[0];
  const isCompleted = order.status === "delivered";
  const isCancelled = order.status === "cancelled";
  // Show the live driver map as soon as a driver has been assigned
  // (any status from "accepted" onwards) and we have *some* coordinate
  // for either the driver or the destination. Falls back to the
  // destination-only view while the driver is still being located.
  const driverAssigned = !!order.driverId;
  const inFlight = !isCompleted && !isCancelled;
  const PRE_PICKUP_STATUSES = ["accepted", "preparing", "ready"];
  const isPrePickup = PRE_PICKUP_STATUSES.includes(order.status);
  // Pre-pickup: show restaurant→client route using restaurant as origin.
  // Post-pickup: show driver→client route. Falls back to destination pin if no driver pos.
  const mapDriverPos = isPrePickup
    ? (restaurantPos ?? destPos)
    : (driverPos ?? (driverAssigned && destPos ? destPos : null));
  const showMap = inFlight && (driverAssigned || (isPrePickup && (restaurantPos || destPos))) && mapDriverPos;

  const distanceKm = driverPos && destPos ? haversineKm(driverPos, destPos) : null;
  const etaMin = order.estimatedDeliveryTime ?? null;
  const etaTime = etaMin != null ? formatTime(new Date(Date.now() + etaMin * 60_000), locale) : null;
  const placedAt = order.createdAt ? formatDateTime(order.createdAt, locale) : null;
  const paymentMethodLabel = order.paymentMethod === "card" ? t("order_payment_card") : t("order_payment_cash");

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, {
        paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16) + 8,
        borderBottomColor: colors.border,
        backgroundColor: colors.background,
      }]}>
        <TouchableOpacity onPress={() => router.replace("/(tabs)/orders")} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {order.reference || `${t("order_title")} #${order.id}`}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === "web" ? 40 : 30), paddingTop: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero status */}
        <Animated.View entering={FadeInDown.duration(350)} style={styles.hero}>
          <View style={styles.heroRow}>
            <View style={[styles.heroIcon, {
              backgroundColor: isCancelled ? colors.destructive + "20" : isCompleted ? colors.turquoiseSoft : colors.yellowSoft,
            }]}>
              <Ionicons
                name={isCancelled ? "close-circle" : isCompleted ? "checkmark-done-circle" : (currentStep.icon as any)}
                size={26}
                color={isCancelled ? colors.destructive : isCompleted ? colors.turquoise : colors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.heroLabel, { color: colors.mutedForeground }]}>
                {isCancelled ? t("order_status_cancelled") : isCompleted ? t("order_status_completed") : t("order_status")}
              </Text>
              <Text style={[styles.heroValue, { color: colors.foreground }]}>{t(currentStep.labelKey)}</Text>
              <Text style={[styles.heroDesc, { color: colors.mutedForeground }]}>{t(currentStep.descKey)}</Text>
              {!isCancelled && !isCompleted && etaMin != null && (
                <Text style={[styles.heroEta, { color: colors.turquoise }]}>
                  {t("order_eta")} · {t("order_eta_min", { n: etaMin })}{etaTime ? ` · ${t("order_eta_at", { time: etaTime })}` : ""}
                </Text>
              )}
            </View>
            {!isCancelled && !isCompleted && <PulsingDot color={colors.primary} />}
          </View>
        </Animated.View>

        {/* Pickup hand-off code — shown to the customer once the order is accepted. */}
        {order.pickupCode && !["delivered", "cancelled"].includes(order.status) && (
          <Animated.View entering={FadeInDown.duration(300)} style={[styles.pickupCard, { backgroundColor: colors.yellow }]}>
            <Text style={styles.pickupLabel}>{t("order_pickup_code_title")}</Text>
            <Text style={styles.pickupCode} testID="text-pickup-code">{order.pickupCode}</Text>
            <Text style={styles.pickupHelp}>{t("order_pickup_code_help")}</Text>
          </Animated.View>
        )}

        {/* Live map — visible as soon as a driver is assigned */}
        {showMap && (
          <Animated.View entering={FadeIn.duration(400)} style={styles.mapWrap}>
            <DriverMap
              driverLat={mapDriverPos!.lat}
              driverLng={mapDriverPos!.lng}
              destLat={destPos?.lat}
              destLng={destPos?.lng}
              restaurantLat={restaurantPos?.lat}
              restaurantLng={restaurantPos?.lng}
              height={320}
              pinColor={colors.primary}
              driverColor={colors.turquoise}
            />
            <View style={styles.mapOverlay}>
              <PulsingDot color={driverPos ? "#22C55E" : colors.yellow} />
              <Text style={[styles.mapOverlayText, { color: driverPos ? "#16A34A" : "#A07A00" }]}>
                {driverPos ? t("order_live_tracking") : t("order_status_accepted")}
              </Text>
            </View>
            {(sseEtaMinutes != null || distanceKm != null) && (
              <View style={[styles.mapEtaPill, { backgroundColor: colors.primary }]}>
                <Ionicons name="bicycle" size={14} color="#fff" />
                <Text style={styles.mapEtaText}>
                  {sseEtaMinutes != null
                    ? sseEtaMinutes < 1 ? "< 1 min" : `${Math.round(sseEtaMinutes)} min`
                    : `${distanceKm!.toFixed(1)} km`}
                </Text>
              </View>
            )}
          </Animated.View>
        )}
        {inFlight && !driverAssigned && (
          <Animated.View entering={FadeIn.duration(400)} style={[styles.mapWrap, { height: 140, backgroundColor: colors.muted, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10 }]}>
            <Ionicons name="time-outline" size={22} color={colors.mutedForeground} />
            <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
              {t("order_status_pending_desc")}
            </Text>
          </Animated.View>
        )}

        {/* Driver card */}
        {driver && order.status !== "delivered" && order.status !== "cancelled" && (
          <Animated.View entering={FadeInDown.duration(400)}>
            <View style={[styles.driverCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.driverAvatar, { backgroundColor: colors.accent }]}>
                <Ionicons name="person" size={26} color={colors.primary} />
              </View>
              <View style={styles.driverInfo}>
                <Text style={[styles.driverName, { color: colors.foreground }]}>{driver.name ?? t("order_your_driver")}</Text>
                <View style={styles.driverMetaRow}>
                  {driver.rating != null && (
                    <View style={styles.driverMeta}>
                      <Ionicons name="star" size={12} color={colors.yellow} />
                      <Text style={[styles.driverMetaText, { color: colors.mutedForeground }]}>
                        {driver.rating.toFixed(1)}
                      </Text>
                    </View>
                  )}
                  {driver.vehicleType && (
                    <Text style={[styles.driverMetaText, { color: colors.mutedForeground }]}>
                      · {driver.vehicleType}
                    </Text>
                  )}
                  {driver.vehiclePlate && (
                    <View style={[styles.platePill, { backgroundColor: colors.muted }]}>
                      <Text style={[styles.plateText, { color: colors.foreground }]}>{driver.vehiclePlate}</Text>
                    </View>
                  )}
                </View>
              </View>
              {driver.phone && (
                <TouchableOpacity
                  style={[styles.callBtn, { backgroundColor: colors.primary }]}
                  onPress={() => { haptic(); Linking.openURL(`tel:${driver.phone}`); }}
                >
                  <Ionicons name="call" size={18} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        )}

        {/* Restaurant + status pill */}
        <View style={styles.topInfo}>
          <Text style={[styles.restName, { color: colors.foreground }]}>{order.restaurantName}</Text>
        </View>

        {/* Progress tracker */}
        {!isCancelled && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t("order_tracking")}</Text>
            {STEP_KEYS.map((step, idx) => {
              const done = idx <= currentIdx;
              const active = idx === currentIdx;
              return (
                <View key={step.key} style={styles.step}>
                  <View style={[styles.stepIcon, {
                    backgroundColor: active ? colors.yellow : done ? colors.turquoise : colors.muted,
                    transform: [{ scale: active ? 1.1 : 1 }],
                  }]}>
                    <Ionicons name={step.icon as any} size={16} color={active ? colors.yellowForeground : done ? "#fff" : colors.mutedForeground} />
                  </View>
                  {idx < STEP_KEYS.length - 1 && (
                    <View style={[styles.stepLine, { backgroundColor: idx < currentIdx ? colors.turquoise : colors.border }]} />
                  )}
                  <Text style={[styles.stepLabel, {
                    color: done ? colors.foreground : colors.mutedForeground,
                    fontFamily: active ? "Inter_700Bold" : done ? "Inter_500Medium" : "Inter_400Regular",
                  }]}>
                    {t(step.labelKey)}
                    {active && etaMin != null ? `  · ${t("order_eta_min", { n: etaMin })}` : ""}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Order metadata: id, placed-at, payment, distance */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.metaRow}>
            <Ionicons name="receipt-outline" size={18} color={colors.primary} style={styles.metaIcon} />
            <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>{t("order_id")}</Text>
            <Text style={[styles.metaValue, { color: colors.foreground }]}>#{order.id}</Text>
          </View>
          {placedAt && (
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={18} color={colors.primary} style={styles.metaIcon} />
              <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>{t("order_placed_at")}</Text>
              <Text style={[styles.metaValue, { color: colors.foreground }]}>{placedAt}</Text>
            </View>
          )}
          <View style={styles.metaRow}>
            <Ionicons name="card-outline" size={18} color={colors.primary} style={styles.metaIcon} />
            <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>{t("order_payment")}</Text>
            <Text style={[styles.metaValue, { color: colors.foreground }]}>{paymentMethodLabel}</Text>
          </View>
          {distanceKm != null && (
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={18} color={colors.primary} style={styles.metaIcon} />
              <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>{t("order_distance_to_you")}</Text>
              <Text style={[styles.metaValue, { color: colors.foreground }]}>{t("order_km", { n: distanceKm.toFixed(1) })}</Text>
            </View>
          )}
        </View>

        {/* Delivery address */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.addrRow}>
            <View style={[styles.addrIcon, { backgroundColor: colors.accent }]}>
              <Ionicons name="location" size={18} color={colors.primary} />
            </View>
            <View style={styles.addrInfo}>
              <Text style={[styles.addrLabel, { color: colors.mutedForeground }]}>{t("order_deliver_to")}</Text>
              <Text style={[styles.addrText, { color: colors.foreground }]}>{order.deliveryAddress}</Text>
            </View>
          </View>
        </View>

        {/* Items + summary */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t("order_items")}</Text>
          {order.items.map((item, idx) => (
            <View key={item.id}>
              <View style={styles.itemRow}>
                <Text style={[styles.itemQty, { color: colors.primary }]}>{item.quantity}×</Text>
                <Text style={[styles.itemName, { color: colors.foreground }]}>{item.menuItemName}</Text>
                <Text style={[styles.itemPrice, { color: colors.foreground }]}>{item.totalPrice.toFixed(0)} MAD</Text>
              </View>
              {idx < order.items.length - 1 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
            </View>
          ))}
          <View style={[styles.divider, { backgroundColor: colors.border, marginTop: 6 }]} />
          <View style={styles.itemRow}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{t("order_subtotal")}</Text>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>{order.subtotal.toFixed(0)} MAD</Text>
          </View>
          <View style={styles.itemRow}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{t("order_delivery_fee")}</Text>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>{order.deliveryFee.toFixed(0)} MAD</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.itemRow}>
            <Text style={[styles.totalLabel, { color: colors.foreground }]}>{t("order_total")}</Text>
            <Text style={[styles.totalValue, { color: colors.primary }]}>{order.total.toFixed(0)} MAD</Text>
          </View>
        </View>

        {order.notes ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t("order_notes")}</Text>
            <Text style={[styles.notesText, { color: colors.mutedForeground }]}>{order.notes}</Text>
          </View>
        ) : null}

        {/* Invoice button — visible once delivered */}
        {isCompleted && (
          <TouchableOpacity
            style={[styles.invoiceBtn, { borderColor: colors.primary, backgroundColor: colors.primary + "10" }]}
            activeOpacity={0.8}
            onPress={async () => {
              const tok = await getAuthToken();
              const url = tok
                ? `${getApiBase()}/api/orders/${order.id}/invoice?token=${encodeURIComponent(tok)}`
                : `${getApiBase()}/api/orders/${order.id}/invoice`;
              Linking.openURL(url);
            }}
          >
            <Ionicons name="receipt" size={20} color={colors.primary} />
            <Text style={[styles.invoiceBtnText, { color: colors.primary }]}>{t("invoice_view")}</Text>
            <Ionicons name="open-outline" size={16} color={colors.primary} />
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },

  hero: { marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 18, backgroundColor: "rgba(0,0,0,0.02)" },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  heroIcon: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  heroLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
  heroValue: { fontSize: 18, fontFamily: "Inter_700Bold", marginTop: 1 },
  heroDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  heroEta: { fontSize: 12, fontFamily: "Inter_700Bold", marginTop: 6 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  metaIcon: { width: 22 },
  metaLabel: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  metaValue: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  mapWrap: { marginHorizontal: 16, marginBottom: 12, borderRadius: 18, overflow: "hidden", position: "relative" },
  mapOverlay: { position: "absolute", top: 12, left: 12, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.95)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  mapOverlayText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  mapEtaPill: { position: "absolute", bottom: 12, right: 12, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 22, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 5 },
  mapEtaText: { color: "#fff", fontSize: 12, fontFamily: "Inter_700Bold" },

  driverCard: { marginHorizontal: 16, marginBottom: 12, padding: 14, borderRadius: 16, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  driverAvatar: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" },
  driverInfo: { flex: 1, gap: 4 },
  driverName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  driverMetaRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  driverMeta: { flexDirection: "row", alignItems: "center", gap: 3 },
  driverMetaText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  platePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  plateText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  callBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },

  topInfo: { paddingHorizontal: 16, marginBottom: 8 },
  restName: { fontSize: 18, fontFamily: "Inter_700Bold" },

  card: { marginHorizontal: 16, borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 12, gap: 10 },
  cardTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  step: { flexDirection: "row", alignItems: "center", gap: 12, position: "relative" },
  stepIcon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", zIndex: 1 },
  stepLine: { position: "absolute", left: 17, top: 34, width: 2, height: 20, marginLeft: -1 },
  stepLabel: { fontSize: 14, lineHeight: 34 },
  addrRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  addrIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  addrInfo: { flex: 1, gap: 3 },
  addrLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  addrText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  itemQty: { fontSize: 14, fontFamily: "Inter_600SemiBold", minWidth: 24 },
  itemName: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  itemPrice: { fontSize: 14, fontFamily: "Inter_500Medium" },
  divider: { height: 1 },
  summaryLabel: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  summaryValue: { fontSize: 13, fontFamily: "Inter_500Medium" },
  totalLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_700Bold" },
  totalValue: { fontSize: 17, fontFamily: "Inter_700Bold" },
  notesText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  invoiceBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    marginHorizontal: 16, marginTop: 4, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5,
  },
  invoiceBtnText: { fontSize: 15, fontFamily: "Inter_700Bold" },

  pickupCard: {
    marginHorizontal: 16, marginTop: 4, marginBottom: 12, padding: 18, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  pickupLabel: {
    color: "rgba(255,255,255,0.9)", fontSize: 11, fontFamily: "Inter_700Bold",
    letterSpacing: 1.2, textTransform: "uppercase",
  },
  pickupCode: {
    color: "#fff", fontSize: 44, fontFamily: "Inter_700Bold",
    letterSpacing: 8, marginTop: 4, marginBottom: 6,
  },
  pickupHelp: {
    color: "rgba(255,255,255,0.92)", fontSize: 12, textAlign: "center",
  },
});
