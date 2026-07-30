import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { getEarnings } from "@/lib/api";

export default function EarningsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data, isRefetching, refetch } = useQuery({ queryKey: ["earnings"], queryFn: getEarnings });

  const cards = [
    { period: "Aujourd'hui", amount: data?.todayMad ?? 0, deliveries: data?.todayDeliveries ?? 0, tips: data?.todayTipsMad ?? 0, icon: "sun" as const },
    { period: "Cette semaine", amount: data?.weekMad ?? 0, deliveries: data?.weekDeliveries ?? 0, tips: data?.weekTipsMad ?? 0, icon: "calendar" as const },
    { period: "Ce mois", amount: data?.monthMad ?? 0, deliveries: 0, tips: 0, icon: "bar-chart-2" as const },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: insets.bottom + 100 }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
    >
      <Text style={[styles.header, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Tableau des gains</Text>

      <View style={[styles.hero, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30", borderRadius: colors.radius }]}>
        <Text style={[styles.heroLabel, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>Gains du jour</Text>
        <Text style={[styles.heroAmount, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          {data?.todayMad ?? 0} <Text style={{ fontSize: 20 }}>DH</Text>
        </Text>
        <View style={styles.heroMeta}>
          <View style={styles.heroMetaItem}>
            <Feather name="package" size={14} color={colors.mutedForeground} />
            <Text style={[styles.heroMetaText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>{data?.todayDeliveries ?? 0} livraisons</Text>
          </View>
          {(data?.todayTipsMad ?? 0) > 0 && (
            <View style={styles.heroMetaItem}>
              <Feather name="heart" size={14} color={colors.warning} />
              <Text style={[styles.heroMetaText, { color: colors.warning, fontFamily: "Inter_500Medium" }]}>{data?.todayTipsMad ?? 0} DH pourboires</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.grid}>
        {cards.map((c) => (
          <View key={c.period} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <View style={[styles.cardIcon, { backgroundColor: colors.muted }]}>
              <Feather name={c.icon} size={16} color={colors.primary} />
            </View>
            <Text style={[styles.cardPeriod, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>{c.period}</Text>
            <Text style={[styles.cardAmount, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{c.amount} <Text style={{ fontSize: 13 }}>DH</Text></Text>
            {c.deliveries > 0 && <Text style={[styles.cardMeta, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{c.deliveries} courses</Text>}
            {c.tips > 0 && <Text style={[styles.cardMeta, { color: colors.warning, fontFamily: "Inter_400Regular" }]}>+{c.tips} DH tips</Text>}
          </View>
        ))}
      </View>

      <View style={[styles.infoBox, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <Feather name="info" size={16} color={colors.info} />
        <Text style={[styles.infoText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Les gains correspondent à votre commission (15%) sur chaque livraison, plus les pourboires clients.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 22, marginBottom: 20 },
  hero: { borderWidth: 1, padding: 22, marginBottom: 20, alignItems: "center" },
  heroLabel: { fontSize: 13, letterSpacing: 0.5, marginBottom: 8 },
  heroAmount: { fontSize: 48, marginBottom: 12 },
  heroMeta: { flexDirection: "row", gap: 16 },
  heroMetaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  heroMetaText: { fontSize: 13 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  card: { flex: 1, minWidth: "45%", padding: 16, borderWidth: 1, gap: 4 },
  cardIcon: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 17, marginBottom: 6 },
  cardPeriod: { fontSize: 12, letterSpacing: 0.3 },
  cardAmount: { fontSize: 22, marginTop: 2 },
  cardMeta: { fontSize: 11, marginTop: 2 },
  infoBox: { flexDirection: "row", gap: 10, padding: 14, borderWidth: 1, alignItems: "flex-start" },
  infoText: { flex: 1, fontSize: 13, lineHeight: 20 },
});
