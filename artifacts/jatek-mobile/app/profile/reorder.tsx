import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, RefreshControl, Alert } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ProfileScreenLayout from "@/components/ProfileScreenLayout";
import { useColors } from "@/hooks/useColors";
import { listMyOrders } from "@/lib/api";

export default function ReorderScreen() {
  const colors = useColors();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const rows = await listMyOrders();
      setOrders(Array.isArray(rows) ? rows : []);
    } catch (e: any) {
      Alert.alert("Erreur", e?.message ?? "Impossible de charger.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const reorder = (order: any) => {
    if (!order?.restaurantId) return;
    router.push(`/restaurant/${order.restaurantId}` as any);
  };

  return (
    <ProfileScreenLayout title="Recommander" scroll={false}>
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : orders.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="repeat-outline" size={64} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.heading }]}>Aucune commande passée</Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>Vos commandes récentes apparaîtront ici pour être recommandées en un tap.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        >
          {orders.map((o) => (
            <View key={o.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: colors.heading }]} numberOfLines={1}>
                  {o.restaurantName ?? `Commande #${o.id}`}
                </Text>
                <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                  {new Date(o.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })} · {Number(o.total).toFixed(2)} MAD
                </Text>
                <Text style={[styles.status, { color: colors.primary }]}>{o.status}</Text>
              </View>
              <TouchableOpacity onPress={() => reorder(o)} style={[styles.btn, { backgroundColor: colors.primary }]}>
                <Ionicons name="repeat" size={16} color="#fff" />
                <Text style={styles.btnText}>Recommander</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </ProfileScreenLayout>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 8 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginTop: 12 },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  card: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10, gap: 10 },
  title: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  meta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  status: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 4, textTransform: "capitalize" },
  btn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, height: 38, borderRadius: 19 },
  btnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_700Bold" },
});
