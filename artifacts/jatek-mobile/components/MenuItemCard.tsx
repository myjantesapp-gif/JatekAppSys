import React, { useRef } from "react";
import { StyleSheet, Text, View, TouchableOpacity, Image, Pressable, Animated, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@/hooks/useColors";

const BTN_FROM = "#FF5FAD";
const BTN_TO   = "#C81877";

interface MenuItemCardProps {
  item: {
    id: number;
    name: string;
    description?: string | null;
    price: number;
    imageUrl?: string | null;
    isAvailable?: boolean | null;
  };
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
  onPressCard?: () => void;
}

const INK = "#0A1B3D";

export function MenuItemCard({ item, quantity, onAdd, onRemove, onPressCard }: MenuItemCardProps) {
  const colors = useColors();
  const cardScale = useRef(new Animated.Value(1)).current;
  const plusScale = useRef(new Animated.Value(1)).current;

  const handleAdd = (e?: any) => {
    e?.stopPropagation?.();
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.spring(plusScale, { toValue: 1.35, useNativeDriver: true, friction: 3 }),
      Animated.spring(plusScale, { toValue: 1, useNativeDriver: true, friction: 4 }),
    ]).start();
    onAdd();
  };
  const handleRemove = (e?: any) => {
    e?.stopPropagation?.();
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onRemove();
  };

  if (item.isAvailable === false) return null;

  const onPressIn = () => {
    Animated.spring(cardScale, { toValue: 0.98, useNativeDriver: true, friction: 6 }).start();
  };
  const onPressOut = () => {
    Animated.spring(cardScale, { toValue: 1, useNativeDriver: true, friction: 5 }).start();
  };

  return (
    <Pressable onPress={onPressCard} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View
        style={[
          styles.card,
          { backgroundColor: colors.card, transform: [{ scale: cardScale }] },
        ]}
      >
        <View style={styles.content}>
          <View style={styles.textSection}>
            <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={2}>
              {item.name}
            </Text>
            {item.description ? (
              <Text style={[styles.desc, { color: colors.mutedForeground }]} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}
            <View style={styles.priceRow}>
              <Text style={[styles.price, { color: colors.primary }]}>{item.price.toFixed(0)} MAD</Text>
              {quantity > 0 ? (
                <View style={[styles.qtyPill, { backgroundColor: colors.primary }]}>
                  <Text style={styles.qtyPillText}>×{quantity}</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.imageWrap}>
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />
            ) : (
              <View style={[styles.image, styles.imagePlaceholder, { backgroundColor: colors.muted }]}>
                <Ionicons name="fast-food-outline" size={26} color={colors.mutedForeground} />
              </View>
            )}

            {/* Floating "+" / quantity controls overlapping image bottom-right */}
            {quantity > 0 ? (
              <View style={styles.qtyControls}>
                <TouchableOpacity onPress={handleRemove} style={[styles.qtyBtn, styles.qtyBtnMinus]} hitSlop={6}>
                  <Ionicons name="remove" size={16} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.qtyText, { color: colors.primary }]}>{quantity}</Text>
                <LinearGradient
                  colors={[BTN_FROM, BTN_TO]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.qtyBtnPlus}
                >
                  <TouchableOpacity onPress={handleAdd} hitSlop={6} style={styles.qtyBtnHit}>
                    <Ionicons name="add" size={16} color="#fff" />
                  </TouchableOpacity>
                </LinearGradient>
              </View>
            ) : (
              <Animated.View style={[styles.plusFabWrap, { transform: [{ scale: plusScale }] }]}>
                <LinearGradient
                  colors={[BTN_FROM, BTN_TO]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.plusFab}
                >
                  <TouchableOpacity onPress={handleAdd} hitSlop={10} style={styles.plusFabHit}>
                    <Ionicons name="add" size={24} color="#fff" />
                  </TouchableOpacity>
                </LinearGradient>
              </Animated.View>
            )}
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: "visible",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  content: {
    flexDirection: "row",
    padding: 12,
    gap: 12,
  },
  textSection: {
    flex: 1,
    gap: 4,
    paddingTop: 2,
  },
  name: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  desc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
    marginTop: 2,
  },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  price: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  qtyPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  qtyPillText: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" },

  imageWrap: { width: 96, height: 96, position: "relative" },
  image: {
    width: 96,
    height: 96,
    borderRadius: 14,
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  plusFabWrap: {
    position: "absolute",
    bottom: -10,
    right: -10,
    backgroundColor: "transparent",
  },
  plusFab: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: "#fff",
    overflow: "hidden",
    backgroundColor: BTN_TO,
    shadowColor: "#C81877",
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  plusFabHit: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },

  qtyControls: {
    position: "absolute",
    bottom: -10,
    right: -4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.98)",
    shadowColor: "#C81877",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
    borderWidth: 1,
    borderColor: "#FDD5E8",
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBtnMinus: {
    backgroundColor: "#FDE8F4",
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBtnPlus: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  qtyBtnHit: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  qtyText: { fontSize: 13, fontFamily: "Inter_700Bold", minWidth: 16, textAlign: "center" },
});
