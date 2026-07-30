import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import type { Order } from "@/lib/api";

interface Props {
  order: Pick<Order, "restaurantName" | "pickupAddress" | "dropoffAddress" | "customerName" | "status">;
  style?: object;
}

export function DeliveryMap({ order, style }: Props) {
  const colors = useColors();
  return (
    <View style={[styles.container, { backgroundColor: colors.muted, borderColor: colors.border }, style]}>
      <View style={styles.row}>
        <View style={[styles.dot, { backgroundColor: colors.info }]} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>COMMERÇANT</Text>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>{order.restaurantName}</Text>
          <Text style={[styles.address, { color: colors.mutedForeground }]} numberOfLines={1}>{order.pickupAddress}</Text>
        </View>
      </View>
      <View style={[styles.sep, { backgroundColor: colors.border }]} />
      <View style={styles.row}>
        <View style={[styles.dot, { backgroundColor: colors.primary }]} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>CLIENT</Text>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>{order.customerName}</Text>
          <Text style={[styles.address, { color: colors.mutedForeground }]} numberOfLines={1}>{order.dropoffAddress}</Text>
        </View>
      </View>
      <View style={[styles.badge, { backgroundColor: colors.primary + "18" }]}>
        <Feather name="map-pin" size={12} color={colors.primary} />
        <Text style={[styles.badgeText, { color: colors.primary }]}>Carte disponible sur l'application mobile</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 8 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 3 },
  label: { fontSize: 9, fontFamily: "Inter_500Medium", letterSpacing: 1 },
  name: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginTop: 1 },
  address: { fontSize: 12, fontFamily: "Inter_400Regular" },
  sep: { height: 1, marginLeft: 24, marginVertical: 2 },
  badge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, alignSelf: "flex-start", marginTop: 4 },
  badgeText: { fontSize: 11, fontFamily: "Inter_500Medium" },
});
