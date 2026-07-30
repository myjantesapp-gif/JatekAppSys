import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useListOrders, getListOrdersQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { OrderCard } from "@/components/OrderCard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WaveEdge } from "@/components/WaveEdge";
import { LinearGradient } from "expo-linear-gradient";

const PINK = "#E91E8C";
const PINK_LIGHT = "#FF5FAD";
const PINK_DEEP = "#C81877";
const ORANGE = "#F97316";

type Filter = "all" | "active" | "past";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Toutes" },
  { key: "active", label: "En cours" },
  { key: "past", label: "Passées" },
];

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const webTopPad = Platform.OS === "web" ? 67 : 0;
  const [filter, setFilter] = useState<Filter>("all");

  const ordersParams = user ? { userId: user.id } : undefined;
  const { data: orders, isLoading, refetch } = useListOrders(
    ordersParams,
    {
      query: {
        queryKey: getListOrdersQueryKey(ordersParams),
        enabled: !!token && !!user,
        refetchInterval: 30000,
      },
    }
  );

  // Match the canonical order status enum used by the API + tracking screen.
  const ACTIVE_STATUSES = ["pending", "accepted", "preparing", "ready", "picked_up"];
  const sorted = [...(orders ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const filtered = sorted.filter((o) => {
    if (filter === "all") return true;
    if (filter === "active") return ACTIVE_STATUSES.includes(o.status ?? "");
    return !ACTIVE_STATUSES.includes(o.status ?? "");
  });

  return (
    <View style={styles.flex}>
      {/* ── Gradient header — style Talabat ── */}
      <View style={styles.headerWrap}>
        <LinearGradient
          colors={[PINK_LIGHT, PINK, PINK_DEEP]}
          locations={[0, 0.55, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[styles.headerBg, { paddingTop: insets.top + 14 + webTopPad }]}
        >
          <Text style={styles.headerTitle}>Mes commandes</Text>

          {/* Filter pills */}
          <View style={styles.filterRow}>
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f.key}
                onPress={() => setFilter(f.key)}
                activeOpacity={0.8}
                style={[
                  styles.filterPill,
                  filter === f.key && styles.filterPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterLabel,
                    filter === f.key && styles.filterLabelActive,
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </LinearGradient>
        <WaveEdge
          color={PINK_DEEP}
          height={28}
          gradientStops={[{ offset: 0, color: PINK }, { offset: 1, color: PINK_DEEP }]}
        />
      </View>

      {!token ? (
        <View style={styles.center}>
          <Ionicons name="lock-closed-outline" size={52} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>Connecte-toi pour voir tes commandes</Text>
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => router.push("/(auth)/login" as any)}
            activeOpacity={0.85}
          >
            <Text style={styles.loginBtnText}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      ) : isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={PINK} size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(o) => String(o.id)}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 90) },
          ]}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isLoading}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="bag-outline" size={52} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>Aucune commande ici</Text>
              <Text style={styles.emptyText}>
                {filter === "active"
                  ? "Tu n'as aucune commande en cours."
                  : filter === "past"
                  ? "Aucune commande passée pour le moment."
                  : "Tes commandes apparaîtront ici."}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              onPress={() =>
                router.push({ pathname: "/order/[id]", params: { id: String(item.id) } })
              }
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#F8F8F8" },

  // Header
  headerWrap: { position: "relative" },
  headerBg: {
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    marginBottom: 12,
  },

  // Filters
  filterRow: { flexDirection: "row", gap: 8 },
  filterPill: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  filterPillActive: {
    backgroundColor: "#fff",
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  filterLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.9)",
    letterSpacing: 0.2,
  },
  filterLabelActive: {
    color: PINK,
  },

  list: { paddingHorizontal: 16, paddingTop: 20 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingTop: 40,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: "#0A1B3D",
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 32,
  },
  loginBtn: {
    marginTop: 8,
    backgroundColor: PINK,
    paddingHorizontal: 32,
    paddingVertical: 13,
    borderRadius: 24,
  },
  loginBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
});
