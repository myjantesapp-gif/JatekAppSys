import React, { useRef } from "react";
import { StyleSheet, Text, View, TouchableOpacity, Image, Pressable, Animated, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@/hooks/useColors";

const BTN_FROM = "#FF5FAD";
const BTN_TO = "#C81877";

interface Props {
  item: {
    id: number;
    name: string;
    price: number;
    imageUrl?: string | null;
    isAvailable?: boolean | null;
  };
  quantity: number;
  width: number;
  onPressCard: () => void;
  onAdd: () => void;
  restaurantOpen?: boolean;
}

export function MenuItemGridCard({ item, quantity, width, onPressCard, onAdd, restaurantOpen = true }: Props) {
  const colors = useColors();
  const scale = useRef(new Animated.Value(1)).current;
  const plus = useRef(new Animated.Value(1)).current;

  if (item.isAvailable === false) return null;

  const onIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, friction: 6 }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5 }).start();

  const handleAdd = (e?: any) => {
    e?.stopPropagation?.();
    if (!restaurantOpen) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.spring(plus, { toValue: 1.3, useNativeDriver: true, friction: 3 }),
      Animated.spring(plus, { toValue: 1, useNativeDriver: true, friction: 4 }),
    ]).start();
    onAdd();
  };

  return (
    <Pressable onPress={onPressCard} onPressIn={onIn} onPressOut={onOut}>
      <Animated.View style={[styles.card, { width, backgroundColor: colors.card, transform: [{ scale }], opacity: restaurantOpen ? 1 : 0.6 }]}>
        <View style={styles.imageWrap}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={[styles.image, styles.placeholder, { backgroundColor: colors.muted }]}>
              <Ionicons name="fast-food-outline" size={32} color={colors.mutedForeground} />
            </View>
          )}
          <Animated.View style={[styles.plusWrap, { transform: [{ scale: plus }] }]}>
            {restaurantOpen ? (
              <LinearGradient colors={[BTN_FROM, BTN_TO]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.plusFab}>
                <TouchableOpacity onPress={handleAdd} hitSlop={8} style={styles.plusHit}>
                  {quantity > 0 ? (
                    <Text style={styles.qtyText}>{quantity}</Text>
                  ) : (
                    <Ionicons name="add" size={22} color="#fff" />
                  )}
                </TouchableOpacity>
              </LinearGradient>
            ) : (
              <View style={[styles.plusFab, styles.closedFab]}>
                <Ionicons name="lock-closed" size={16} color="#9CA3AF" />
              </View>
            )}
          </Animated.View>
        </View>
        <View style={styles.body}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={2}>{item.name}</Text>
          <Text style={[styles.price, { color: colors.foreground }]}>
            <Text style={[styles.currency, { color: colors.mutedForeground }]}>MAD </Text>
            {item.price.toFixed(item.price % 1 === 0 ? 0 : 2)}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    overflow: "visible",
    marginBottom: 14,
  },
  imageWrap: { width: "100%", aspectRatio: 1, position: "relative", borderRadius: 14, overflow: "visible" },
  image: { width: "100%", height: "100%", borderRadius: 14, backgroundColor: "#F5F5F5" },
  placeholder: { alignItems: "center", justifyContent: "center" },
  plusWrap: { position: "absolute", bottom: -10, right: 8 },
  plusFab: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2.5, borderColor: "#fff",
    shadowColor: "#C81877", shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 6,
  },
  closedFab: {
    backgroundColor: "#E5E7EB",
    shadowColor: "transparent", shadowOpacity: 0, elevation: 0,
  },
  plusHit: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  qtyText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 13 },
  body: { paddingTop: 14, paddingHorizontal: 4, gap: 4 },
  name: { fontSize: 13, fontFamily: "Inter_600SemiBold", lineHeight: 17 },
  price: { fontSize: 14, fontFamily: "Inter_700Bold" },
  currency: { fontSize: 11, fontFamily: "Inter_500Medium" },
});
