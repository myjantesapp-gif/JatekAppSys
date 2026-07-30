import { Feather } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, Vibration, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { acceptOrder, type Order } from "@/lib/api";

const COUNTDOWN_SECONDS = 20;

export function IncomingOrderModal({
  order,
  visible,
  onClose,
}: {
  order: Order | null;
  visible: boolean;
  onClose: () => void;
}) {
  const colors = useColors();
  const router = useRouter();
  const qc = useQueryClient();
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const progress = useRef(new Animated.Value(1)).current;

  const accept = useMutation({
    mutationFn: (id: string) => acceptOrder(id),
    onSuccess: (o) => {
      qc.invalidateQueries({ queryKey: ["my-orders"] });
      qc.invalidateQueries({ queryKey: ["available-orders"] });
      onClose();
      router.push(`/order/${o.id}`);
    },
    onError: () => onClose(),
  });

  useEffect(() => {
    if (!visible || !order) return;
    setSecondsLeft(COUNTDOWN_SECONDS);
    progress.setValue(1);
    Vibration.vibrate(400);
    Animated.timing(progress, {
      toValue: 0,
      duration: COUNTDOWN_SECONDS * 1000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) { clearInterval(interval); onClose(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [visible, order, onClose, progress]);

  if (!order) return null;

  const widthPct = progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <View style={[styles.bar, { backgroundColor: colors.border }]}>
            <Animated.View style={[styles.barFill, { backgroundColor: colors.primary, width: widthPct }]} />
          </View>

          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.tag, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>NOUVELLE COURSE</Text>
              <Text style={[styles.price, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                {order.driverEarningsMad + order.tipMad} DH
              </Text>
              {order.tipMad > 0 && (
                <Text style={[styles.tip, { color: colors.warning, fontFamily: "Inter_500Medium" }]}>
                  Inclut {order.tipMad} DH de pourboire
                </Text>
              )}
            </View>
            <View style={[styles.timerCircle, { borderColor: colors.primary, borderRadius: 28 }]}>
              <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 18 }}>{secondsLeft}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Meta icon="map-pin" text={`${order.distanceKm.toFixed(1)} km`} colors={colors} />
            <Meta icon="clock" text={`~${order.etaMinutes} min`} colors={colors} />
            <Meta icon="shopping-bag" text={`${order.items.reduce((s, i) => s + i.quantity, 0)} art.`} colors={colors} />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <Stop icon="shopping-bag" label="RÉCUPÉRER" primary={order.restaurantName} secondary={order.pickupAddress} colors={colors} />
          <View style={styles.dotConnector}>
            {Array.from({ length: 4 }).map((_, i) => (
              <View key={i} style={[styles.dotMini, { backgroundColor: colors.border }]} />
            ))}
          </View>
          <Stop icon="user" label="LIVRER À" primary={order.customerName} secondary={order.dropoffAddress} colors={colors} />

          <View style={styles.buttons}>
            <Pressable onPress={onClose} style={[styles.declineBtn, { borderColor: colors.border, borderRadius: colors.radius }]}>
              <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>Ignorer</Text>
            </Pressable>
            <Pressable
              onPress={() => accept.mutate(order.id)}
              disabled={accept.isPending}
              style={({ pressed }) => [styles.acceptBtn, { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: pressed ? 0.88 : 1 }]}
            >
              <Feather name="check" size={18} color="#fff" />
              <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 15 }}>Accepter</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Meta({ icon, text, colors }: { icon: keyof typeof Feather.glyphMap; text: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.metaItem}>
      <Feather name={icon} size={13} color={colors.mutedForeground} />
      <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 12 }}>{text}</Text>
    </View>
  );
}

function Stop({ icon, label, primary, secondary, colors }: { icon: keyof typeof Feather.glyphMap; label: string; primary: string; secondary: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.stop}>
      <View style={[styles.stopIcon, { backgroundColor: colors.secondary }]}>
        <Feather name={icon} size={14} color={colors.info} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 10, letterSpacing: 0.5 }}>{label}</Text>
        <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 14 }} numberOfLines={1}>{primary}</Text>
        <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12 }} numberOfLines={1}>{secondary}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, borderTopWidth: 1 },
  bar: { height: 4, borderRadius: 2, overflow: "hidden", marginBottom: 20 },
  barFill: { height: "100%", borderRadius: 2 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  tag: { fontSize: 11, letterSpacing: 0.5, marginBottom: 4 },
  price: { fontSize: 28 },
  tip: { fontSize: 12, marginTop: 2 },
  timerCircle: { width: 56, height: 56, borderWidth: 2.5, alignItems: "center", justifyContent: "center" },
  metaRow: { flexDirection: "row", gap: 16, marginBottom: 16 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  divider: { height: 1, marginBottom: 16 },
  stop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  stopIcon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  dotConnector: { flexDirection: "row", gap: 3, paddingLeft: 15, marginBottom: 8 },
  dotMini: { width: 4, height: 4, borderRadius: 2 },
  buttons: { flexDirection: "row", gap: 10, marginTop: 20 },
  declineBtn: { flex: 1, height: 52, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  acceptBtn: { flex: 2, height: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
});
