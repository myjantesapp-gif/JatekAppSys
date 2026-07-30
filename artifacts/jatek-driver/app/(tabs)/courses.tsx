import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { listMyOrders, type Order, type OrderStatus } from "@/lib/api";

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "En attente",
  assigned: "Assignée",
  accepted: "Acceptée",
  arrived_pickup: "Au restaurant",
  picked_up: "Récupérée",
  arrived_dropoff: "À destination",
  delivered: "Livrée",
  cancelled: "Annulée",
};

const STATUS_COLOR: Record<OrderStatus, string> = {
  pending: "#F59E0B",
  assigned: "#00B4D8",
  accepted: "#00B4D8",
  arrived_pickup: "#F59E0B",
  picked_up: "#8B5CF6",
  arrived_dropoff: "#F59E0B",
  delivered: "#9BA617",
  cancelled: "#EF4444",
};

const FILTERS = ["Toutes", "Actives", "Terminées", "Annulées"] as const;
type Filter = typeof FILTERS[number];

export default function CoursesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("Toutes");

  const { data = [], isRefetching, refetch } = useQuery({
    queryKey: ["my-orders"],
    queryFn: listMyOrders,
    refetchInterval: 30_000,
  });

  const filtered = data.filter((o) => {
    if (filter === "Actives") return !["delivered", "cancelled"].includes(o.status);
    if (filter === "Terminées") return o.status === "delivered";
    if (filter === "Annulées") return o.status === "cancelled";
    return true;
  });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.filterRow, { paddingTop: insets.top + 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        {FILTERS.map((f) => {
          const active = filter === f;
          return (
            <Pressable key={f} onPress={() => setFilter(f)} style={[styles.filterBtn, { backgroundColor: active ? colors.primary : colors.muted, borderRadius: 20 }]}>
              <Text style={{ color: active ? colors.primaryForeground : colors.mutedForeground, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>{f}</Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: insets.bottom + 80 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        renderItem={({ item }) => <CourseCard order={item} colors={colors} onPress={() => router.push(`/order/${item.id}`)} />}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="package" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Aucune course à afficher.</Text>
          </View>
        }
      />
    </View>
  );
}

function CourseCard({ order, colors, onPress }: { order: Order; colors: ReturnType<typeof useColors>; onPress: () => void }) {
  const statusColor = STATUS_COLOR[order.status] ?? colors.mutedForeground;
  const isActive = !["delivered", "cancelled"].includes(order.status);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, { backgroundColor: colors.card, borderColor: isActive ? colors.primary + "40" : colors.border, borderRadius: colors.radius, opacity: pressed ? 0.9 : 1 }]}>
      <View style={styles.cardTop}>
        <View>
          <Text style={[styles.code, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>{order.code}</Text>
          <Text style={[styles.restaurant, { color: colors.foreground, fontFamily: "Inter_700Bold" }]} numberOfLines={1}>{order.restaurantName}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <View style={[styles.statusPill, { backgroundColor: statusColor + "20" }]}>
            <Text style={{ color: statusColor, fontFamily: "Inter_600SemiBold", fontSize: 11 }}>{STATUS_LABEL[order.status]}</Text>
          </View>
          <Text style={[styles.price, { color: colors.success, fontFamily: "Inter_700Bold" }]}>{order.driverEarningsMad + order.tipMad} DH</Text>
        </View>
      </View>
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <View style={styles.route}>
        <Feather name="shopping-bag" size={13} color={colors.info} />
        <Text style={[styles.address, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>{order.pickupAddress}</Text>
      </View>
      <View style={styles.route}>
        <Feather name="map-pin" size={13} color={colors.primary} />
        <Text style={[styles.address, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>{order.dropoffAddress}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 8 },
  card: { padding: 14, borderWidth: 1, gap: 10 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  code: { fontSize: 11, letterSpacing: 0.5 },
  restaurant: { fontSize: 15, marginTop: 2 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginBottom: 4 },
  price: { fontSize: 16 },
  divider: { height: 1 },
  route: { flexDirection: "row", alignItems: "center", gap: 8 },
  address: { flex: 1, fontSize: 13 },
  empty: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14 },
});
