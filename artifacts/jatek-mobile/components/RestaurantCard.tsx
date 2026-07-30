import React, { useRef, useCallback, memo } from "react";
import { StyleSheet, Text, View, Pressable, Animated } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface RestaurantCardProps {
  restaurant: {
    id: number;
    name: string;
    description?: string | null;
    category?: string | null;
    rating?: number | null;
    deliveryTime?: number | null;
    isOpen?: boolean | null;
    imageUrl?: string | null;
    logoUrl?: string | null;
    minOrderAmount?: number | null;
  };
  onPress: () => void;
  horizontal?: boolean;
}

// Shared low-res placeholder ([blurhash]-compatible). Keeps perceived load fast
// without requiring per-restaurant blurhashes from the API.
const BLURHASH = "L9AdAVRP00Rj~oay00ay~ofQa#fQ";

function RestaurantCardInner({ restaurant, onPress, horizontal }: RestaurantCardProps) {
  const colors = useColors();
  const scale = useRef(new Animated.Value(1)).current;

  const onIn = useCallback(
    () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, friction: 6, tension: 220 }).start(),
    [scale],
  );
  const onOut = useCallback(
    () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 4, tension: 240 }).start(),
    [scale],
  );

  return (
    <Pressable onPress={onPress} onPressIn={onIn} onPressOut={onOut} style={{ width: horizontal ? 220 : undefined }}>
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            transform: [{ scale }],
          },
        ]}
      >
        <View style={styles.imageContainer}>
          {restaurant.imageUrl ? (
            <Image
              source={{ uri: restaurant.imageUrl }}
              style={styles.image}
              contentFit="cover"
              transition={200}
              placeholder={BLURHASH}
              cachePolicy="memory-disk"
              recyclingKey={String(restaurant.id)}
            />
          ) : (
            <View style={[styles.imagePlaceholder, { backgroundColor: colors.muted }]}>
              <Ionicons name="restaurant" size={32} color={colors.mutedForeground} />
            </View>
          )}

          {/* Merchant logo overlay (top-right) */}
          <View style={styles.logoWrap}>
            {restaurant.logoUrl ? (
              <Image
                source={{ uri: restaurant.logoUrl }}
                style={styles.logoImg}
                contentFit="contain"
                transition={150}
                cachePolicy="memory-disk"
                recyclingKey={`logo-${restaurant.id}`}
              />
            ) : (
              <View style={[styles.logoImg, styles.logoFallback, { backgroundColor: colors.primary }]}>
                <Text style={styles.logoLetter}>
                  {restaurant.name?.charAt(0)?.toUpperCase() ?? "?"}
                </Text>
              </View>
            )}
          </View>

          {restaurant.isOpen === false && (
            <View style={styles.closedBadge}>
              <Text style={styles.closedText}>Fermé</Text>
            </View>
          )}
        </View>

        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
            {restaurant.name}
          </Text>
          {restaurant.category && (
            <Text style={[styles.category, { color: colors.mutedForeground }]} numberOfLines={1}>
              {restaurant.category}
            </Text>
          )}
          <View style={styles.meta}>
            {restaurant.rating != null && (
              <View style={styles.metaItem}>
                <Ionicons name="star" size={12} color={colors.yellow} />
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                  {" "}{restaurant.rating.toFixed(1)}
                </Text>
              </View>
            )}
            {restaurant.deliveryTime != null && (
              <View style={[styles.deliveryPill, { backgroundColor: colors.primary }]}>
                <Ionicons name="flash" size={11} color={colors.primaryForeground} />
                <Text style={[styles.deliveryPillText, { color: colors.primaryForeground }]}>
                  {restaurant.deliveryTime} min
                </Text>
              </View>
            )}
            {restaurant.minOrderAmount != null && restaurant.minOrderAmount > 0 && (
              <View style={styles.metaItem}>
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                  Min {restaurant.minOrderAmount} MAD
                </Text>
              </View>
            )}
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

// Memoised so list rerenders don't rebuild every card. We rely on referential
// equality of `restaurant` and `onPress` — callers should pass `useCallback`-d
// handlers (the home screen does after the recent refactor).
export const RestaurantCard = memo(RestaurantCardInner, (prev, next) => {
  if (prev.horizontal !== next.horizontal) return false;
  if (prev.onPress !== next.onPress) return false;
  const a = prev.restaurant, b = next.restaurant;
  return (
    a.id === b.id &&
    a.name === b.name &&
    a.imageUrl === b.imageUrl &&
    a.logoUrl === b.logoUrl &&
    a.isOpen === b.isOpen &&
    a.rating === b.rating &&
    a.deliveryTime === b.deliveryTime &&
    a.minOrderAmount === b.minOrderAmount &&
    a.category === b.category
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  imageContainer: {
    width: "100%",
    height: 140,
    position: "relative",
  },
  image: { width: "100%", height: "100%" },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  logoWrap: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  logoImg: { width: "100%", height: "100%", borderRadius: 9, backgroundColor: "transparent" },
  logoFallback: { alignItems: "center", justifyContent: "center" },
  logoLetter: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 },
  closedBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  closedText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#fff" },
  info: { padding: 12, gap: 3 },
  name: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  category: { fontSize: 12, fontFamily: "Inter_400Regular" },
  meta: { flexDirection: "row", gap: 10, marginTop: 4, flexWrap: "wrap", alignItems: "center" },
  metaItem: { flexDirection: "row", alignItems: "center" },
  metaText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  deliveryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  deliveryPillText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.2,
  },
});
