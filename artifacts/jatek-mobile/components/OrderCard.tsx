import React from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: "Pending", color: "#B58900", icon: "time-outline" },
  accepted: { label: "Accepted", color: "#00C2C7", icon: "checkmark-circle-outline" },
  preparing: { label: "Preparing", color: "#00C2C7", icon: "restaurant-outline" },
  ready: { label: "Ready", color: "#00C2C7", icon: "bag-check-outline" },
  picked_up: { label: "On the way", color: "#E2006A", icon: "bicycle-outline" },
  delivered: { label: "Delivered", color: "#0F172A", icon: "checkmark-done-circle-outline" },
  cancelled: { label: "Cancelled", color: "#64748B", icon: "close-circle-outline" },
};

interface OrderCardProps {
  order: {
    id: number;
    status: string;
    restaurantName?: string | null;
    total: number;
    createdAt: string;
    reference?: string | null;
    items?: Array<{ quantity: number; menuItemName?: string | null }>;
  };
  onPress: () => void;
}

export function OrderCard({ order, onPress }: OrderCardProps) {
  const colors = useColors();
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;

  const firstItem = order.items?.[0];
  const extraCount = (order.items?.length ?? 1) - 1;
  const summary = firstItem
    ? `${firstItem.quantity}x ${firstItem.menuItemName}${extraCount > 0 ? ` +${extraCount} more` : ""}`
    : "Order";

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.id, { color: colors.foreground }]}>
            {order.reference || `#${order.id}`}
          </Text>
          <Text style={[styles.restaurant, { color: colors.mutedForeground }]} numberOfLines={1}>
            {order.restaurantName}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: cfg.color + "20" }]}>
          <Ionicons name={cfg.icon as any} size={12} color={cfg.color} />
          <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.footer}>
        <Text style={[styles.summary, { color: colors.mutedForeground }]} numberOfLines={1}>
          {summary}
        </Text>
        <Text style={[styles.total, { color: colors.primary }]}>
          {order.total.toFixed(0)} MAD
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerLeft: {
    flex: 1,
    marginRight: 8,
  },
  id: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  restaurant: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summary: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    flex: 1,
    marginRight: 8,
  },
  total: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
});
