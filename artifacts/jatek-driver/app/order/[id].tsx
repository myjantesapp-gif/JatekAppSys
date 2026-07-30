import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useNavigation } from "expo-router";
import React, { useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DeliveryCodeModal } from "@/components/DeliveryCodeModal";
import { DeliveryMap } from "@/components/DeliveryMap";
import { useActiveOrder } from "@/context/ActiveOrderContext";
import { useColors } from "@/hooks/useColors";
import { useOrderNotifications } from "@/hooks/useOrderNotifications";
import {
  acceptOrder,
  cancelOrder,
  getOrder,
  markArrivedDropoff,
  markArrivedPickup,
  markDelivered,
  markPickedUp,
  type Order,
  type OrderStatus,
} from "@/lib/api";

// ─────────────────── Status metadata ───────────────────

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; icon: keyof typeof Feather.glyphMap }> = {
  pending: { label: "En attente", color: "#F59E0B", icon: "clock" },
  assigned: { label: "Assignée", color: "#00B4D8", icon: "user-check" },
  accepted: { label: "Acceptée — En route vers le restaurant", color: "#00B4D8", icon: "navigation" },
  arrived_pickup: { label: "Au restaurant", color: "#F59E0B", icon: "shopping-bag" },
  picked_up: { label: "Commande récupérée", color: "#8B5CF6", icon: "package" },
  arrived_dropoff: { label: "À destination", color: "#F59E0B", icon: "map-pin" },
  delivered: { label: "Livrée ✓", color: "#9BA617", icon: "check-circle" },
  cancelled: { label: "Annulée", color: "#EF4444", icon: "x-circle" },
};

type ActionButton = { label: string; icon: keyof typeof Feather.glyphMap; variant: "primary" | "destructive" | "secondary" };
type NextAction =
  | { type: "accept" }
  | { type: "arrived-pickup" }
  | { type: "picked-up" }
  | { type: "arrived-dropoff" }
  | { type: "deliver" }
  | { type: "cancel" }
  | null;

function getActions(status: OrderStatus): { primary: ActionButton & { action: NextAction }; secondary?: ActionButton & { action: NextAction } } | null {
  switch (status) {
    case "assigned":
    case "pending":
      return { primary: { label: "Accepter la course", icon: "check", variant: "primary", action: { type: "accept" } }, secondary: { label: "Refuser", icon: "x", variant: "destructive", action: { type: "cancel" } } };
    case "accepted":
      return { primary: { label: "Je suis au restaurant", icon: "shopping-bag", variant: "primary", action: { type: "arrived-pickup" } } };
    case "arrived_pickup":
      return { primary: { label: "Commande récupérée", icon: "package", variant: "primary", action: { type: "picked-up" } } };
    case "picked_up":
      return { primary: { label: "Je suis à destination", icon: "map-pin", variant: "primary", action: { type: "arrived-dropoff" } } };
    case "arrived_dropoff":
      return { primary: { label: "Confirmer la livraison", icon: "check-circle", variant: "primary", action: { type: "deliver" } } };
    default:
      return null;
  }
}

// ─────────────────── Main screen ───────────────────

export default function OrderDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const { beginTracking, endTracking, activeOrderId } = useActiveOrder();

  const [codeModalVisible, setCodeModalVisible] = useState(false);
  const [confirmingDelivery, setConfirmingDelivery] = useState(false);

  const { data: order, isLoading, error } = useQuery({
    queryKey: ["order", id],
    queryFn: () => getOrder(id!),
    enabled: !!id,
    refetchInterval: 15_000,
  });

  useOrderNotifications(order?.status);

  useLayoutEffect(() => {
    navigation.setOptions({ title: order ? `Course ${order.code}` : "Course" });
  }, [navigation, order]);

  const mutate = useMutation({
    onSuccess: (updated: Order) => {
      qc.setQueryData(["order", id], updated);
      qc.invalidateQueries({ queryKey: ["my-orders"] });
      qc.invalidateQueries({ queryKey: ["available-orders"] });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e: unknown) => {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "Erreur réseau";
      Alert.alert("Erreur", msg);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
    mutationFn: async (action: NextAction) => {
      if (!id) throw new Error("ID manquant");
      switch (action?.type) {
        case "accept": {
          const o = await acceptOrder(id);
          await beginTracking(id);
          return o;
        }
        case "arrived-pickup": return markArrivedPickup(id);
        case "picked-up": return markPickedUp(id);
        case "arrived-dropoff": return markArrivedDropoff(id);
        case "deliver": throw new Error("Use code modal");
        case "cancel": {
          const o = await cancelOrder(id);
          if (activeOrderId === id) await endTracking();
          return o;
        }
        default: throw new Error("Unknown action");
      }
    },
  });

  const onActionPress = async (action: NextAction) => {
    if (!action) return;
    if (action.type === "deliver") {
      setCodeModalVisible(true);
      return;
    }
    if (action.type === "cancel") {
      Alert.alert("Annuler la course ?", "Cette action est irréversible.", [
        { text: "Rester", style: "cancel" },
        { text: "Annuler la course", style: "destructive", onPress: () => mutate.mutate(action) },
      ]);
      return;
    }
    mutate.mutate(action);
  };

  const onDeliverConfirm = async (code: string) => {
    if (!id) return;
    setConfirmingDelivery(true);
    try {
      const updated = await markDelivered(id, code);
      qc.setQueryData(["order", id], updated);
      qc.invalidateQueries({ queryKey: ["my-orders"] });
      qc.invalidateQueries({ queryKey: ["earnings"] });
      await endTracking();
      setCodeModalVisible(false);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "Code invalide";
      Alert.alert("Erreur", msg);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setConfirmingDelivery(false);
    }
  };

  const callPhone = (phone: string) => {
    const url = `tel:${phone}`;
    Linking.canOpenURL(url).then((can) => { if (can) Linking.openURL(url); });
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={36} color={colors.destructive} />
        <Text style={[styles.errorText, { color: colors.mutedForeground }]}>Impossible de charger la course.</Text>
      </View>
    );
  }

  const config = STATUS_CONFIG[order.status];
  const actions = getActions(order.status);
  const isDone = order.status === "delivered" || order.status === "cancelled";
  const totalEarning = order.driverEarningsMad + order.tipMad;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 140 }}>

        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: config.color + "18", borderColor: config.color + "40", borderRadius: colors.radius }]}>
          <Feather name={config.icon} size={20} color={config.color} />
          <Text style={[styles.statusText, { color: config.color, fontFamily: "Inter_700Bold" }]}>{config.label}</Text>
        </View>

        {/* Earning */}
        <View style={[styles.earningRow, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <View>
            <Text style={[styles.earningLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Votre gain</Text>
            <Text style={[styles.earningAmount, { color: colors.success, fontFamily: "Inter_700Bold" }]}>{totalEarning} DH</Text>
            {order.tipMad > 0 && <Text style={{ color: colors.warning, fontFamily: "Inter_400Regular", fontSize: 11 }}>Inclut {order.tipMad} DH de pourboire</Text>}
          </View>
          <View style={{ alignItems: "flex-end", gap: 6 }}>
            <MetaBadge icon="clock" text={`~${order.etaMinutes} min`} colors={colors} />
            <MetaBadge icon="navigation" text={`${order.distanceKm.toFixed(1)} km`} colors={colors} />
            <MetaBadge icon={order.paymentMethod === "cash" ? "dollar-sign" : "credit-card"} text={order.paymentMethod === "cash" ? "Espèces" : "Carte"} colors={colors} />
          </View>
        </View>

        {/* Map */}
        {!isDone && (
          <View style={{ marginBottom: 14 }}>
            <DeliveryMap order={order} />
          </View>
        )}

        {/* Pickup stop */}
        <StopCard
          type="pickup"
          name={order.restaurantName}
          address={order.pickupAddress}
          phone={order.restaurantPhone}
          onCall={order.restaurantPhone ? () => callPhone(order.restaurantPhone) : undefined}
          colors={colors}
        />

        {/* Delivery stop */}
        <StopCard
          type="delivery"
          name={order.customerName}
          address={order.dropoffAddress}
          phone={order.customerPhone}
          onCall={order.customerPhone ? () => callPhone(order.customerPhone) : undefined}
          colors={colors}
          note={order.notes ?? undefined}
        />

        {/* Items */}
        {order.items.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <View style={styles.sectionHeader}>
              <Feather name="shopping-bag" size={15} color={colors.mutedForeground} />
              <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Articles ({order.items.reduce((s, i) => s + i.quantity, 0)})</Text>
            </View>
            {order.items.map((item, idx) => (
              <View key={idx} style={[styles.itemRow, { borderTopColor: colors.border }]}>
                <Text style={[styles.itemQty, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>{item.quantity}×</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemName, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>{item.name}</Text>
                  {item.options ? <Text style={[styles.itemOptions, { color: colors.mutedForeground }]}>{item.options}</Text> : null}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Delivery code (if arrived at dropoff) */}
        {order.status === "arrived_dropoff" && (
          <View style={[styles.codeHint, { backgroundColor: colors.accent, borderColor: colors.primary + "30", borderRadius: colors.radius }]}>
            <Feather name="key" size={15} color={colors.primary} />
            <Text style={[styles.codeHintText, { color: colors.accentForeground, fontFamily: "Inter_500Medium" }]}>
              Demandez le code à 4 chiffres au client avant de confirmer la livraison.
            </Text>
          </View>
        )}

        {/* Summary */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <SummaryRow label="Sous-total commande" value={`${order.subtotalMad} DH`} colors={colors} />
          <SummaryRow label="Frais de livraison" value={`${(order.priceMad - order.subtotalMad).toFixed(1)} DH`} colors={colors} />
          <SummaryRow label="Total client" value={`${order.priceMad} DH`} colors={colors} bold />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SummaryRow label="Votre commission (15%)" value={`${order.driverEarningsMad} DH`} colors={colors} accent />
          {order.tipMad > 0 && <SummaryRow label="Pourboire" value={`${order.tipMad} DH`} colors={colors} accent />}
        </View>
      </ScrollView>

      {/* Action buttons */}
      {actions && !mutate.isPending && (
        <View style={[styles.actionsBar, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: insets.bottom + 10 }]}>
          {actions.secondary && (
            <Pressable
              onPress={() => onActionPress(actions.secondary!.action)}
              disabled={mutate.isPending}
              style={({ pressed }) => [styles.secondaryBtn, { borderColor: colors.destructive + "60", borderRadius: colors.radius, opacity: pressed ? 0.8 : 1 }]}
            >
              <Feather name={actions.secondary.icon} size={16} color={colors.destructive} />
              <Text style={[styles.secondaryBtnText, { color: colors.destructive, fontFamily: "Inter_600SemiBold" }]}>{actions.secondary.label}</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => onActionPress(actions.primary.action)}
            disabled={mutate.isPending}
            style={({ pressed }) => [styles.primaryBtn, { backgroundColor: colors.primary, borderRadius: colors.radius, flex: actions.secondary ? 2 : 1, opacity: pressed ? 0.85 : 1 }]}
          >
            {mutate.isPending ? <ActivityIndicator color="#fff" /> : (
              <>
                <Feather name={actions.primary.icon} size={18} color="#fff" />
                <Text style={[styles.primaryBtnText, { fontFamily: "Inter_700Bold" }]}>{actions.primary.label}</Text>
              </>
            )}
          </Pressable>
        </View>
      )}

      {mutate.isPending && (
        <View style={[styles.actionsBar, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: insets.bottom + 10, alignItems: "center" }]}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      )}

      <DeliveryCodeModal
        visible={codeModalVisible}
        loading={confirmingDelivery}
        onCancel={() => setCodeModalVisible(false)}
        onSubmit={onDeliverConfirm}
      />
    </View>
  );
}

// ─────────────────── Sub-components ───────────────────

function StopCard({ type, name, address, phone, onCall, note, colors }: {
  type: "pickup" | "delivery";
  name: string;
  address: string;
  phone?: string;
  onCall?: () => void;
  note?: string;
  colors: ReturnType<typeof useColors>;
}) {
  const dotColor = type === "pickup" ? colors.info : colors.primary;
  return (
    <View style={[styles.stopCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
      <View style={[styles.stopDot, { backgroundColor: dotColor }]} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 10, letterSpacing: 0.5, marginBottom: 2 }}>
          {type === "pickup" ? "RÉCUPÉRER CHEZ" : "LIVRER À"}
        </Text>
        <Text style={[styles.stopName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{name}</Text>
        <Text style={[styles.stopAddress, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{address}</Text>
        {note && (
          <View style={[styles.noteBox, { backgroundColor: colors.warning + "15", borderColor: colors.warning + "40" }]}>
            <Feather name="message-square" size={12} color={colors.warning} />
            <Text style={[styles.noteText, { color: colors.warning, fontFamily: "Inter_400Regular" }]}>{note}</Text>
          </View>
        )}
      </View>
      {onCall && phone && (
        <Pressable onPress={onCall} style={[styles.callBtn, { backgroundColor: colors.info + "15", borderRadius: 20 }]}>
          <Feather name="phone" size={16} color={colors.info} />
        </Pressable>
      )}
    </View>
  );
}

function MetaBadge({ icon, text, colors }: { icon: keyof typeof Feather.glyphMap; text: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.metaBadge, { backgroundColor: colors.muted }]}>
      <Feather name={icon} size={11} color={colors.mutedForeground} />
      <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 11 }}>{text}</Text>
    </View>
  );
}

function SummaryRow({ label, value, colors, bold, accent }: { label: string; value: string; colors: ReturnType<typeof useColors>; bold?: boolean; accent?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, { color: colors.mutedForeground, fontFamily: bold ? "Inter_600SemiBold" : "Inter_400Regular" }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color: accent ? colors.success : bold ? colors.foreground : colors.mutedForeground, fontFamily: bold || accent ? "Inter_700Bold" : "Inter_500Medium" }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorText: { fontSize: 15 },
  statusBanner: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderWidth: 1, marginBottom: 12 },
  statusText: { fontSize: 15, flex: 1 },
  earningRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderWidth: 1, marginBottom: 12 },
  earningLabel: { fontSize: 12, marginBottom: 2 },
  earningAmount: { fontSize: 28 },
  metaBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  stopCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, borderWidth: 1, padding: 14, marginBottom: 12 },
  stopDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4, flexShrink: 0 },
  stopName: { fontSize: 15 },
  stopAddress: { fontSize: 13, marginTop: 2, lineHeight: 19 },
  noteBox: { flexDirection: "row", alignItems: "flex-start", gap: 6, padding: 8, borderRadius: 8, borderWidth: 1, marginTop: 8 },
  noteText: { flex: 1, fontSize: 12, lineHeight: 18 },
  callBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  section: { borderWidth: 1, padding: 14, marginBottom: 12, gap: 10 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  sectionTitle: { fontSize: 14 },
  itemRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingTop: 10, borderTopWidth: 1 },
  itemQty: { fontSize: 13, width: 24 },
  itemName: { fontSize: 14 },
  itemOptions: { fontSize: 11, marginTop: 2 },
  codeHint: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, padding: 14, marginBottom: 12 },
  codeHintText: { flex: 1, fontSize: 13, lineHeight: 20 },
  divider: { height: 1, marginVertical: 4 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryLabel: { fontSize: 13 },
  summaryValue: { fontSize: 13 },
  actionsBar: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", gap: 10, padding: 14, borderTopWidth: 1, paddingHorizontal: 16 },
  primaryBtn: { height: 54, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  primaryBtnText: { color: "#fff", fontSize: 15 },
  secondaryBtn: { flex: 1, height: 54, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1.5 },
  secondaryBtnText: { fontSize: 14 },
});
