/**
 * Driver Deliver tab — Uber-Eats-grade screen for couriers.
 *
 * - Online/Offline hero with haptic toggle
 * - Live "Available to pick up" feed (SSE-pushed, polling fallback)
 * - One-tap accept → driver self-assigns the order
 * - Active delivery card with status progression buttons
 * - Background GPS loop while a delivery is active (3-second cadence)
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Linking,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeInDown, Layout } from "react-native-reanimated";
import { router } from "expo-router";

import {
  useListDrivers,
  useUpdateDriver,
  useGetDriverEarnings,
  useListOrders,
  useUpdateOrderStatus,
  getGetDriverEarningsQueryKey,
  getListOrdersQueryKey,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { useSSE } from "@/hooks/useSSE";
import {
  getApiBase,
  fetchAvailableOrders,
  acceptDelivery,
  confirmDelivery,
  updateDriverLocation,
} from "@/lib/api";
import { PickupCodeModal } from "@/components/PickupCodeModal";

function haptic(type: "light" | "medium" | "success" | "warning" | "error" = "light") {
  if (Platform.OS === "web") return;
  if (type === "success") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  else if (type === "warning") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  else if (type === "error") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  else if (type === "medium") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export default function DeliverScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const { data: drivers, refetch: refetchDrivers } = useListDrivers();
  const myDriver = drivers?.find((d) => d.userId === user?.id);

  const updateDriver = useUpdateDriver();
  const updateStatus = useUpdateOrderStatus();

  const { data: earnings } = useGetDriverEarnings(myDriver?.id ?? 0, {
    query: {
      queryKey: getGetDriverEarningsQueryKey(myDriver?.id ?? 0),
      enabled: !!myDriver,
    },
  });

  const myOrdersParams = myDriver ? { driverId: myDriver.id } : undefined;
  const { data: myOrders, refetch: refetchMyOrders } = useListOrders(
    myOrdersParams,
    {
      query: {
        queryKey: getListOrdersQueryKey(myOrdersParams),
        enabled: !!myDriver,
        refetchInterval: 30000,
      },
    }
  );

  const [available, setAvailable] = useState<any[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accepting, setAccepting] = useState<number | null>(null);
  const [pickupModalOrderId, setPickupModalOrderId] = useState<number | null>(null);
  const [confirmingPickup, setConfirmingPickup] = useState(false);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const locationAbortRef = useRef<AbortController | null>(null);

  const isOnline = !!myDriver?.isAvailable;
  const profileComplete = !!(myDriver as any)?.profileCompletedAt;
  const activeDelivery = myOrders?.find((o) =>
    ["ready", "picked_up", "driver_at_restaurant", "en_route", "out_for_delivery"].includes(o.status ?? "")
  );

  // Load available orders on mount + when becoming online
  const loadAvailable = useCallback(async () => {
    try {
      setLoadingAvailable(true);
      const list = await fetchAvailableOrders();
      setAvailable(list);
    } catch {
      setAvailable([]);
    } finally {
      setLoadingAvailable(false);
    }
  }, []);

  useEffect(() => {
    if (isOnline) loadAvailable();
  }, [isOnline, loadAvailable]);

  // SSE: listen for new ready orders + assignments to this driver
  useSSE({
    url: `${getApiBase()}/api/events?channels=available_orders${myDriver ? `,driver_orders:${myDriver.id}` : ""}`,
    enabled: isOnline && !!myDriver,
    events: {
      order_ready: () => {
        haptic("success");
        Alert.alert("📦 Nouvelle commande prête", "Une commande vient d'être préparée près de vous.");
        loadAvailable();
      },
      order_assigned: () => {
        haptic("success");
        Alert.alert("🎯 Livraison assignée", "Une nouvelle livraison vous a été attribuée.");
        refetchMyOrders();
      },
      order_status: () => {
        refetchMyOrders();
      },
    },
  });

  // GPS tracking loop while active delivery
  useEffect(() => {
    if (!activeDelivery || !myDriver) {
      if (watchRef.current) {
        watchRef.current.remove();
        watchRef.current = null;
      }
      return;
    }

    let cancelled = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted" || cancelled) return;

      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 3000,
          distanceInterval: 8,
        },
        (loc) => {
          // Cancel any previous in-flight request before sending a new one
          // to prevent out-of-order location updates reaching the server.
          locationAbortRef.current?.abort();
          const abortCtrl = new AbortController();
          locationAbortRef.current = abortCtrl;
          updateDriverLocation(myDriver.id, loc.coords.latitude, loc.coords.longitude, abortCtrl.signal).catch((err) => {
            if (err?.name !== "AbortError") {
              console.warn("[deliver] location update failed:", err?.message ?? err);
            }
          });
        }
      );
      if (cancelled) sub.remove();
      else watchRef.current = sub;
    })();

    return () => {
      cancelled = true;
      if (watchRef.current) {
        watchRef.current.remove();
        watchRef.current = null;
      }
      // Cancel any pending location request when cleanup runs
      locationAbortRef.current?.abort();
      locationAbortRef.current = null;
    };
  }, [activeDelivery?.id, myDriver?.id]);

  const toggleOnline = async () => {
    if (!myDriver) return;
    haptic("medium");
    if (!isOnline) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        haptic("error");
        Alert.alert("Location required", "Jatek needs location access to accept deliveries.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      await updateDriverLocation(myDriver.id, loc.coords.latitude, loc.coords.longitude);
    }
    await updateDriver.mutateAsync({
      id: myDriver.id,
      data: { isAvailable: !isOnline },
    });
    refetchDrivers();
  };

  const onAccept = async (orderId: number) => {
    if (!myDriver) return;
    if (!profileComplete) {
      haptic("warning");
      Alert.alert(
        "Profile incomplete",
        "Please complete your driver profile (vehicle, plate, ID) before accepting deliveries.",
        [
          { text: "Later", style: "cancel" },
          { text: "Complete now", onPress: () => router.push("/driver-onboarding") },
        ]
      );
      return;
    }
    setAccepting(orderId);
    haptic("medium");
    try {
      await acceptDelivery(orderId, myDriver.id);
      haptic("success");
      setAvailable((prev) => prev.filter((o) => o.id !== orderId));
      refetchMyOrders();
    } catch (e: any) {
      haptic("error");
      Alert.alert("Could not accept", e.message ?? "This order is no longer available.");
      loadAvailable();
    } finally {
      setAccepting(null);
    }
  };

  const onMarkDelivered = (orderId: number) => {
    haptic("medium");
    setPickupModalOrderId(orderId);
  };

  const onConfirmPickupCode = async (code: string) => {
    if (pickupModalOrderId == null) return;
    setConfirmingPickup(true);
    try {
      await confirmDelivery(pickupModalOrderId, code);
      haptic("success");
      setPickupModalOrderId(null);
      refetchMyOrders();
    } catch (e: any) {
      haptic("error");
      Alert.alert("Wrong code", e?.message ?? "The code does not match. Ask the customer to read it again.");
    } finally {
      setConfirmingPickup(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    haptic("light");
    await Promise.all([loadAvailable(), refetchMyOrders(), refetchDrivers()]);
    setRefreshing(false);
  };

  const openNavigation = (address: string) => {
    haptic("light");
    const url = Platform.select({
      ios: `http://maps.apple.com/?q=${encodeURIComponent(address)}`,
      android: `geo:0,0?q=${encodeURIComponent(address)}`,
      default: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
    });
    if (url) Linking.openURL(url);
  };

  if (!user) {
    return (
      <View style={[styles.flex, styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground }}>Sign in to access driver mode</Text>
      </View>
    );
  }

  if (user.role !== "driver") {
    return (
      <View style={[styles.flex, styles.center, { backgroundColor: colors.background, padding: 24 }]}>
        <Ionicons name="bicycle-outline" size={56} color={colors.mutedForeground} />
        <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 18, marginTop: 16 }}>
          Driver mode
        </Text>
        <Text style={{ color: colors.mutedForeground, textAlign: "center", marginTop: 6 }}>
          This section is for delivery drivers. Contact support to apply.
        </Text>
      </View>
    );
  }

  if (!myDriver) {
    return (
      <View style={[styles.flex, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <PickupCodeModal
        visible={pickupModalOrderId != null}
        loading={confirmingPickup}
        onCancel={() => setPickupModalOrderId(null)}
        onSubmit={onConfirmPickupCode}
      />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 100,
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.greeting, { color: colors.mutedForeground }]}>Driver dashboard</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>{user.name}</Text>
          </View>
          <View style={[styles.dotPulse, { backgroundColor: isOnline ? "#22C55E" : colors.mutedForeground }]} />
        </View>

        {/* Profile completion gate */}
        {!profileComplete && (
          <Animated.View entering={FadeIn.duration(350)}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push("/driver-onboarding")}
              style={[styles.profileGate, { backgroundColor: colors.yellowSoft, borderColor: colors.yellow }]}
              testID="banner-driver-profile"
            >
              <Ionicons name="warning-outline" size={22} color={colors.yellowForeground} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.profileGateTitle, { color: colors.yellowForeground }]}>Complete your driver profile</Text>
                <Text style={[styles.profileGateSub, { color: colors.yellowForeground, opacity: 0.75 }]}>Add your vehicle plate and national ID to start accepting deliveries.</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.yellowForeground} />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Online toggle hero */}
        <Animated.View entering={FadeIn.duration(400)} layout={Layout.springify()}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={toggleOnline}
            disabled={updateDriver.isPending}
            style={[
              styles.onlineCard,
              {
                backgroundColor: isOnline ? "#16A34A" : colors.card,
                borderColor: isOnline ? "#16A34A" : colors.border,
              },
            ]}
          >
            <View style={styles.onlineLeft}>
              <View
                style={[
                  styles.onlineIcon,
                  { backgroundColor: isOnline ? "rgba(255,255,255,0.2)" : colors.accent },
                ]}
              >
                <Ionicons
                  name={isOnline ? "radio" : "power"}
                  size={26}
                  color={isOnline ? "#fff" : colors.primary}
                />
              </View>
              <View>
                <Text style={[styles.onlineTitle, { color: isOnline ? "#fff" : colors.foreground }]}>
                  {isOnline ? "You're online" : "You're offline"}
                </Text>
                <Text
                  style={[
                    styles.onlineSub,
                    { color: isOnline ? "rgba(255,255,255,0.85)" : colors.mutedForeground },
                  ]}
                >
                  {isOnline ? "Receiving delivery requests" : "Tap to start earning"}
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.toggleTrack,
                { backgroundColor: isOnline ? "rgba(255,255,255,0.3)" : colors.border },
              ]}
            >
              <Animated.View
                layout={Layout.springify()}
                style={[
                  styles.toggleThumb,
                  {
                    backgroundColor: "#fff",
                    transform: [{ translateX: isOnline ? 22 : 0 }],
                  },
                ]}
              />
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Earnings strip */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {earnings?.today?.toFixed(0) ?? 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>MAD today</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {earnings?.completedToday ?? 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Deliveries</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {myDriver.rating?.toFixed(1) ?? "—"}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Rating</Text>
          </View>
        </View>

        {/* Active delivery */}
        {activeDelivery && (
          <Animated.View entering={FadeInDown.duration(350)}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Your active delivery</Text>
            <View style={[styles.activeCard, { backgroundColor: colors.card, borderColor: "#22C55E" }]}>
              <View style={styles.activeHeader}>
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
                <Text style={[styles.activeOrderId, { color: colors.mutedForeground }]}>
                  Order #{activeDelivery.id}
                </Text>
              </View>

              <Text style={[styles.activeRest, { color: colors.foreground }]}>
                {activeDelivery.restaurantName}
              </Text>

              {(activeDelivery as any).reference && (
                <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 12 }}>
                  Réf · {(activeDelivery as any).reference}
                </Text>
              )}

              <TouchableOpacity
                style={[styles.addrPill, { backgroundColor: colors.accent }]}
                onPress={() => openNavigation(activeDelivery.deliveryAddress)}
              >
                <Ionicons name="navigate" size={16} color={colors.primary} />
                <Text style={[styles.addrPillText, { color: colors.foreground }]} numberOfLines={2}>
                  {activeDelivery.deliveryAddress}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>

              <View style={styles.activeMetaRow}>
                <View style={styles.activeMeta}>
                  <Text style={[styles.activeMetaLabel, { color: colors.mutedForeground }]}>Total</Text>
                  <Text style={[styles.activeMetaValue, { color: colors.foreground }]}>
                    {activeDelivery.total.toFixed(0)} MAD
                  </Text>
                </View>
                <View style={styles.activeMeta}>
                  <Text style={[styles.activeMetaLabel, { color: colors.mutedForeground }]}>Items</Text>
                  <Text style={[styles.activeMetaValue, { color: colors.foreground }]}>
                    {activeDelivery.items?.length ?? 0}
                  </Text>
                </View>
                <View style={styles.activeMeta}>
                  <Text style={[styles.activeMetaLabel, { color: colors.mutedForeground }]}>Fee</Text>
                  <Text style={[styles.activeMetaValue, { color: colors.foreground }]}>
                    {activeDelivery.deliveryFee?.toFixed(0) ?? 0} MAD
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.deliveredBtn}
                onPress={() => onMarkDelivered(activeDelivery.id)}
                disabled={updateStatus.isPending}
              >
                {updateStatus.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.deliveredBtnText}>Mark as delivered</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* Available orders */}
        {!activeDelivery && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 0 }]}>
                Available to pick up
              </Text>
              {available.length > 0 && (
                <View style={[styles.countPill, { backgroundColor: colors.primary }]}>
                  <Text style={styles.countPillText}>{available.length}</Text>
                </View>
              )}
            </View>

            {!isOnline ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="moon-outline" size={32} color={colors.mutedForeground} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Go online to receive orders</Text>
                <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                  Tap the toggle above when you're ready to start your shift.
                </Text>
              </View>
            ) : loadingAvailable ? (
              <View style={[styles.center, { paddingVertical: 40 }]}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : available.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="hourglass-outline" size={32} color={colors.mutedForeground} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No orders right now</Text>
                <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                  We'll notify you the moment a restaurant has food ready.
                </Text>
              </View>
            ) : (
              available.map((order, idx) => (
                <Animated.View
                  key={order.id}
                  entering={FadeInDown.delay(idx * 60).duration(300)}
                  layout={Layout.springify()}
                >
                  <View style={[styles.availCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.availTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.availRest, { color: colors.foreground }]} numberOfLines={1}>
                          {order.restaurantName}
                        </Text>
                        <Text style={[styles.availAddr, { color: colors.mutedForeground }]} numberOfLines={1}>
                          <Ionicons name="location-outline" size={12} /> {order.deliveryAddress}
                        </Text>
                      </View>
                      <View style={styles.availPayout}>
                        <Text style={[styles.availPayoutValue, { color: "#16A34A" }]}>
                          +{order.deliveryFee?.toFixed(0) ?? 0}
                        </Text>
                        <Text style={[styles.availPayoutLabel, { color: colors.mutedForeground }]}>MAD</Text>
                      </View>
                    </View>

                    <View style={styles.availDivider} />

                    <View style={styles.availBottom}>
                      <View style={styles.availMeta}>
                        <Ionicons name="cube-outline" size={14} color={colors.mutedForeground} />
                        <Text style={[styles.availMetaText, { color: colors.mutedForeground }]}>
                          {order.items?.length ?? 0} items
                        </Text>
                      </View>
                      <View style={styles.availMeta}>
                        <Ionicons name="cash-outline" size={14} color={colors.mutedForeground} />
                        <Text style={[styles.availMetaText, { color: colors.mutedForeground }]}>
                          {order.total?.toFixed(0)} MAD
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.acceptBtn, { backgroundColor: colors.primary }]}
                        onPress={() => onAccept(order.id)}
                        disabled={accepting === order.id}
                      >
                        {accepting === order.id ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <>
                            <Ionicons name="checkmark" size={16} color="#fff" />
                            <Text style={styles.acceptBtnText}>Accept</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </Animated.View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 12 },
  greeting: { fontSize: 12, fontFamily: "Inter_500Medium" },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  dotPulse: { width: 12, height: 12, borderRadius: 6 },

  onlineCard: {
    marginHorizontal: 16, padding: 18, borderRadius: 20, borderWidth: 1,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  onlineLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
  onlineIcon: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" },
  onlineTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  onlineSub: { fontSize: 12, marginTop: 2 },
  toggleTrack: { width: 50, height: 28, borderRadius: 14, padding: 3, justifyContent: "center" },
  toggleThumb: { width: 22, height: 22, borderRadius: 11 },

  profileGate: {
    marginHorizontal: 16, marginBottom: 14, padding: 14, borderRadius: 16, borderWidth: 1,
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  profileGateTitle: { fontSize: 13, fontFamily: "Inter_700Bold" },
  profileGateSub: { fontSize: 11, marginTop: 2 },

  statsRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginTop: 14, marginBottom: 16 },
  statBox: { flex: 1, padding: 12, borderRadius: 14, borderWidth: 1, alignItems: "center" },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 2 },

  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", paddingHorizontal: 20, marginBottom: 10 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingRight: 20, marginBottom: 10 },
  countPill: { paddingHorizontal: 10, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", minWidth: 22 },
  countPillText: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" },

  activeCard: { marginHorizontal: 16, marginBottom: 16, padding: 16, borderRadius: 18, borderWidth: 2, gap: 12 },
  activeHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#22C55E", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#fff" },
  liveText: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  activeOrderId: { fontSize: 12, fontFamily: "Inter_500Medium" },
  activeRest: { fontSize: 18, fontFamily: "Inter_700Bold" },
  addrPill: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12 },
  addrPillText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  activeMetaRow: { flexDirection: "row", justifyContent: "space-around", paddingVertical: 4 },
  activeMeta: { alignItems: "center", gap: 2 },
  activeMetaLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  activeMetaValue: { fontSize: 15, fontFamily: "Inter_700Bold" },
  deliveredBtn: { backgroundColor: "#22C55E", flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 14, marginTop: 4 },
  deliveredBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 15 },

  emptyCard: { marginHorizontal: 16, padding: 24, borderRadius: 16, borderWidth: 1, alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  emptySub: { fontSize: 13, textAlign: "center", lineHeight: 18 },

  availCard: { marginHorizontal: 16, marginBottom: 10, padding: 14, borderRadius: 16, borderWidth: 1, gap: 10 },
  availTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  availRest: { fontSize: 15, fontFamily: "Inter_700Bold" },
  availAddr: { fontSize: 12, marginTop: 2 },
  availPayout: { alignItems: "flex-end" },
  availPayoutValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  availPayoutLabel: { fontSize: 10, fontFamily: "Inter_500Medium" },
  availDivider: { height: 1, backgroundColor: "rgba(0,0,0,0.06)" },
  availBottom: { flexDirection: "row", alignItems: "center", gap: 12 },
  availMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  availMetaText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  acceptBtn: { marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10, minWidth: 92, justifyContent: "center" },
  acceptBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 13 },
});
