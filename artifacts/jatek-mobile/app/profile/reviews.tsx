import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, RefreshControl, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ProfileScreenLayout from "@/components/ProfileScreenLayout";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { listReviews, deleteReview } from "@/lib/api";

function Stars({ n, color }: { n: number; color: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons key={i} name={i <= n ? "star" : "star-outline"} size={14} color={color} />
      ))}
    </View>
  );
}

export default function ReviewsScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const rows = await listReviews({ userId: user.id });
      setItems(Array.isArray(rows) ? rows : []);
    } catch (e: any) {
      Alert.alert("Erreur", e?.message ?? "Impossible de charger.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const onDelete = (id: number) => {
    Alert.alert("Supprimer cet avis ?", "Cette action est irréversible.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer", style: "destructive", onPress: async () => {
          setItems((prev) => prev.filter((r) => r.id !== id));
          try { await deleteReview(id); } catch { load(); }
        },
      },
    ]);
  };

  return (
    <ProfileScreenLayout title="Mes avis" scroll={false}>
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="star-outline" size={64} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.heading }]}>Aucun avis pour le moment</Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>Après une commande, partagez votre expérience pour aider la communauté.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        >
          {items.map((r) => (
            <View key={r.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={[styles.title, { color: colors.heading }]} numberOfLines={1}>
                  {r.restaurantName ?? `Restaurant #${r.restaurantId}`}
                </Text>
                <TouchableOpacity onPress={() => onDelete(r.id)} hitSlop={10}>
                  <Ionicons name="trash-outline" size={18} color={colors.destructive} />
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 }}>
                <Stars n={r.rating} color={colors.primary} />
                <Text style={[styles.date, { color: colors.mutedForeground }]}>
                  {new Date(r.createdAt).toLocaleDateString("fr-FR")}
                </Text>
              </View>
              {r.comment ? <Text style={[styles.comment, { color: colors.heading }]}>{r.comment}</Text> : null}
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
  card: { padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
  title: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1, marginRight: 8 },
  date: { fontSize: 11, fontFamily: "Inter_400Regular" },
  comment: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 8, lineHeight: 20 },
});
