import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { getPromotions, type Promotion } from "@/lib/api";

export function PromotionsCarousel() {
  const colors = useColors();
  const { data } = useQuery({ queryKey: ["promotions"], queryFn: getPromotions });

  if (!data?.length) return null;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Promotions</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {data.map((p) => <PromoCard key={p.id} p={p} colors={colors} />)}
      </ScrollView>
    </View>
  );
}

function PromoCard({ p, colors }: { p: Promotion; colors: ReturnType<typeof useColors> }) {
  const pct = Math.min(100, Math.round((p.progress / p.required) * 100));
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.bonusPill, { backgroundColor: colors.primary, borderRadius: colors.radius / 2 }]}>
          <Feather name="zap" size={12} color={colors.primaryForeground} />
          <Text style={{ color: colors.primaryForeground, fontFamily: "Inter_700Bold", fontSize: 12 }}>+{p.bonusMad} DH</Text>
        </View>
      </View>
      <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>{p.title}</Text>
      <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 }}>{p.description}</Text>
      <View style={[styles.progressBar, { backgroundColor: colors.muted }]}>
        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: colors.primary }]} />
      </View>
      <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 11, marginTop: 4 }}>
        {p.progress}/{p.required}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 18 },
  title: { fontSize: 14, marginBottom: 10 },
  card: { width: 230, padding: 14, borderWidth: 1, gap: 4, marginRight: 10 },
  cardHeader: { flexDirection: "row", marginBottom: 4 },
  bonusPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4 },
  progressBar: { height: 5, borderRadius: 3, marginTop: 10, overflow: "hidden" },
  progressFill: { height: "100%" },
});
