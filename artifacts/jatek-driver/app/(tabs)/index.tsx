import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IncomingOrderModal } from "@/components/IncomingOrderModal";
import { PromotionsCarousel } from "@/components/PromotionsCarousel";
import { useAuth } from "@/context/AuthContext";
import { useOnline } from "@/context/OnlineContext";
import { useColors } from "@/hooks/useColors";
import { getEarnings, listAvailableOrders, type Order } from "@/lib/api";
import { fireNewOrderNotification } from "@/services/notificationService";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { isOnline, toggling, toggleOnline } = useOnline();
  const [incoming, setIncoming] = useState<Order | null>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const dismissedIds = useRef<Set<string>>(new Set());

  const earnings = useQuery({
    queryKey: ["earnings"],
    queryFn: getEarnings,
    refetchInterval: 60_000,
  });

  const available = useQuery({
    queryKey: ["available-orders"],
    queryFn: listAvailableOrders,
    enabled: isOnline,
    refetchInterval: isOnline ? 12_000 : false,
  });

  useEffect(() => {
    if (!isOnline || !available.data?.length || incoming) return;
    const fresh = available.data.find(
      (o) => !seenIds.current.has(o.id) && !dismissedIds.current.has(o.id),
    );
    if (fresh) {
      seenIds.current.add(fresh.id);
      setIncoming(fresh);
      fireNewOrderNotification(fresh).catch(console.warn);
    } else {
      available.data.forEach((o) => seenIds.current.add(o.id));
    }
  }, [available.data, isOnline, incoming]);

  useEffect(() => {
    if (!isOnline) {
      seenIds.current.clear();
      dismissedIds.current.clear();
      setIncoming(null);
    }
  }, [isOnline]);

  const onRefresh = () => {
    earnings.refetch();
    if (isOnline) available.refetch();
  };

  const driverName = user?.fullName ?? user?.driver?.fullName ?? "Chauffeur";
  const firstName = driverName.split(" ")[0];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <FlatList
        data={isOnline ? available.data ?? [] : []}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 16,
        }}
        refreshControl={
          <RefreshControl
            refreshing={available.isRefetching || earnings.isRefetching}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={{ marginBottom: 16 }}>
            <View style={styles.header}>
              <View style={[styles.logoPill, { backgroundColor: colors.primary }]}>
                <Text style={[styles.logoText, { color: colors.primaryForeground, fontFamily: "Inter_700Bold" }]}>
                  JATEK
                </Text>
              </View>
              <Text style={[styles.greeting, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                Bonjour {firstName}
              </Text>
            </View>

            <Pressable
              onPress={toggleOnline}
              disabled={toggling}
              style={({ pressed }) => [
                styles.onlineCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: colors.radius,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.onlineToggle,
                  { backgroundColor: isOnline ? colors.primary : colors.mutedForeground },
                ]}
              >
                {toggling ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={[styles.onlineToggleText, { fontFamily: "Inter_700Bold" }]}>
                    {isOnline ? "En ligne" : "Hors ligne"}
                  </Text>
                )}
              </View>
              <Text style={[styles.onlineStatus, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                {isOnline ? "Vous êtes en ligne" : "Vous êtes hors ligne"}
              </Text>
              <Text style={[styles.onlineHint, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {isOnline
                  ? "Recherche de courses en cours..."
                  : "Passez en ligne pour recevoir des courses"}
              </Text>
            </Pressable>

            <View style={styles.statsRow}>
              {[
                { value: String(earnings.data?.todayDeliveries ?? 0), label: "Livraisons", color: colors.info },
                { value: `${earnings.data?.todayMad ?? 0} DH`, label: "Gains", color: colors.success },
                { value: `${earnings.data?.todayTipsMad ?? 0} DH`, label: "Pourboires", color: colors.primary },
              ].map((s) => (
                <View
                  key={s.label}
                  style={[
                    styles.statCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      borderRadius: colors.radius,
                    },
                  ]}
                >
                  <Text style={[styles.statValue, { color: s.color, fontFamily: "Inter_700Bold" }]}>
                    {s.value}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                    {s.label}
                  </Text>
                </View>
              ))}
            </View>

            <PromotionsCarousel />

            {isOnline && (
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                  Courses disponibles
                </Text>
                {available.data?.length ? (
                  <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 12 }}>
                    {available.data.length}
                  </Text>
                ) : null}
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            colors={colors}
            onPress={() => router.push(`/order/${item.id}`)}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name={isOnline ? "search" : "moon"} size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
              {isOnline
                ? "Aucune course disponible pour le moment."
                : "Passez en ligne pour voir les courses."}
            </Text>
          </View>
        }
      />
      <IncomingOrderModal
        visible={!!incoming}
        order={incoming}
        onClose={() => {
          if (incoming) dismissedIds.current.add(incoming.id);
          setIncoming(null);
        }}
      />
    </View>
  );
}

function OrderCard({
  order,
  colors,
  onPress,
}: {
  order: Order;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.orderCard,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
          borderRadius: colors.radius,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View style={styles.orderTop}>
        <View style={{ flex: 1 }}>
          <Text
            style={[styles.restaurant, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}
            numberOfLines={1}
          >
            {order.restaurantName}
          </Text>
          <View style={styles.metaRow}>
            <Feather name="clock" size={13} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
              ~{order.etaMinutes} min · {order.distanceKm.toFixed(1)} km
            </Text>
          </View>
        </View>
        <Text style={[styles.orderPrice, { color: colors.success, fontFamily: "Inter_700Bold" }]}>
          {order.driverEarningsMad + order.tipMad} DH
        </Text>
      </View>

      <View style={styles.routeWrapper}>
        <View style={styles.routeLine}>
          <View style={[styles.routeDotOrigin, { backgroundColor: colors.foreground }]} />
          <View style={[styles.routeConnector, { backgroundColor: colors.border }]} />
          <View style={[styles.routeDotDest, { backgroundColor: colors.primary }]} />
        </View>
        <View style={styles.routeAddresses}>
          <View>
            <Text
              style={[styles.routeAddrText, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}
              numberOfLines={1}
            >
              {order.pickupAddress}
            </Text>
            <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 2 }}>
              Retrait
            </Text>
          </View>
          <View style={{ marginTop: 12 }}>
            <Text
              style={[styles.routeAddrText, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}
              numberOfLines={1}
            >
              {order.dropoffAddress}
            </Text>
            <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 2 }}>
              Livraison
            </Text>
          </View>
        </View>
      </View>

      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.acceptBtn,
          {
            backgroundColor: colors.primary,
            borderRadius: colors.radius * 2,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <Text style={[styles.acceptBtnText, { color: colors.primaryForeground, fontFamily: "Inter_700Bold" }]}>
          Voir la course
        </Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingTop: 4,
  },
  logoPill: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 50 },
  logoText: { fontSize: 14, letterSpacing: 1 },
  greeting: { fontSize: 16 },
  onlineCard: { borderWidth: 1, padding: 20, marginBottom: 16, alignItems: "center", gap: 8 },
  onlineToggle: { paddingHorizontal: 28, paddingVertical: 10, borderRadius: 50 },
  onlineToggleText: { color: "#fff", fontSize: 14 },
  onlineStatus: { fontSize: 18, marginTop: 4 },
  onlineHint: { fontSize: 13 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  statCard: { flex: 1, padding: 14, borderWidth: 1, alignItems: "center", gap: 4 },
  statValue: { fontSize: 18 },
  statLabel: { fontSize: 11 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18 },
  orderCard: {
    borderWidth: 1,
    padding: 16,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  orderTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  restaurant: { fontSize: 16, marginBottom: 4 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontSize: 13 },
  orderPrice: { fontSize: 20 },
  routeWrapper: { flexDirection: "row", gap: 12, paddingLeft: 4 },
  routeLine: { alignItems: "center", paddingTop: 4 },
  routeDotOrigin: { width: 8, height: 8, borderRadius: 4 },
  routeConnector: { width: 2, flex: 1, marginVertical: 2, minHeight: 24 },
  routeDotDest: { width: 8, height: 8, borderRadius: 2 },
  routeAddresses: { flex: 1 },
  routeAddrText: { fontSize: 13 },
  acceptBtn: { height: 48, alignItems: "center", justifyContent: "center" },
  acceptBtnText: { fontSize: 15 },
  empty: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, textAlign: "center", paddingHorizontal: 20, lineHeight: 22 },
});
