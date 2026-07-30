import React, { useRef, useEffect } from "react";
import { View, Text, StyleSheet, Animated, Easing, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const PINK = "#E91E63";
const NAVY = "#0A1B3D";
const GOLD = "#FFD700";
const ORANGE = "#FF6B00";
const { width: SCREEN_W } = Dimensions.get("window");

const ITEMS = [
  { label: "JATEK PRO", icon: "rocket" as const, color: PINK },
  { label: "JATEK VIP", icon: "star" as const, color: NAVY },
  { label: "JATEK PREMIUM", icon: "sparkles" as const, color: "#8B1A6B" },
  { label: "JATEK FAST", icon: "flash" as const, color: ORANGE },
  { label: "JATEK PRO", icon: "rocket" as const, color: PINK },
  { label: "JATEK VIP", icon: "star" as const, color: NAVY },
  { label: "JATEK PREMIUM", icon: "sparkles" as const, color: "#8B1A6B" },
  { label: "JATEK FAST", icon: "flash" as const, color: ORANGE },
];

const ITEM_W = 160;
const TOTAL_W = ITEMS.length * (ITEM_W + 10);

export function JatekScrollingBanner() {
  const scrollX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const halfTotal = TOTAL_W / 2;
    Animated.loop(
      Animated.timing(scrollX, {
        toValue: -halfTotal,
        duration: halfTotal * 22,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [scrollX]);

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.row, { transform: [{ translateX: scrollX }] }]}>
        {ITEMS.map((item, i) => (
          <View key={i} style={[styles.pill, { borderColor: item.color + "33", backgroundColor: item.color + "0D" }]}>
            <Ionicons name={item.icon} size={13} color={item.color} />
            <Text style={[styles.pillTxt, { color: item.color }]}>{item.label}</Text>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 38,
    overflow: "hidden",
    marginTop: 14,
    marginBottom: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    height: 38,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.2,
    width: ITEM_W,
    justifyContent: "center",
  },
  pillTxt: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.6,
  },
});
