import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  Pressable,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ProfileScreenLayout from "@/components/ProfileScreenLayout";
import { useColors } from "@/hooks/useColors";
import { useListRestaurants, type Restaurant } from "@workspace/api-client-react";
import { getFavoriteIds, removeFavorite } from "@/lib/favorites";

const STAR_YELLOW = "#FFC107";
const TURQUOISE = "#22D3EE";

function FavoriteCard({
  restaurant,
  onRemove,
}: {
  restaurant: Restaurant;
  onRemove: () => void;
}) {
  const colors = useColors();
  const hasFreeDelivery = restaurant.deliveryFee === 0;

  return (
    <Pressable
      onPress={() => router.push(`/restaurant/${restaurant.id}` as any)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
        pressed && { opacity: 0.88 },
      ]}
    >
      {/* Left: image */}
      <View style={styles.imgWrap}>
        {restaurant.imageUrl ? (
          <Image source={{ uri: restaurant.imageUrl }} style={styles.img} resizeMode="cover" />
        ) : (
          <View style={[styles.img, { backgroundColor: colors.muted, alignItems: "center", justifyContent: "center" }]}>
            <Ionicons name="restaurant-outline" size={28} color={colors.mutedForeground} />
          </View>
        )}
        {/* Logo overlay */}
        <View style={[styles.logoWrap, { backgroundColor: colors.background }]}>
          {restaurant.logoUrl ? (
            <Image source={{ uri: restaurant.logoUrl }} style={styles.logo} resizeMode="cover" />
          ) : (
            <View style={[styles.logo, { backgroundColor: colors.muted, alignItems: "center", justifyContent: "center" }]}>
              <Text style={[styles.logoLetter, { color: colors.primary }]}>
                {restaurant.name?.charAt(0)?.toUpperCase() ?? "?"}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Right: info */}
      <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text style={[styles.name, { color: colors.heading }]} numberOfLines={1}>
            {restaurant.name}
          </Text>
          {restaurant.rating != null && (
            <View style={styles.ratingPill}>
              <Ionicons name="star" size={10} color={STAR_YELLOW} />
              <Text style={styles.ratingText}>{restaurant.rating.toFixed(1)}</Text>
            </View>
          )}
        </View>
        {restaurant.category ? (
          <Text style={[styles.category, { color: colors.mutedForeground }]} numberOfLines={1}>
            {restaurant.category}
          </Text>
        ) : null}
        <View style={styles.metaRow}>
          {restaurant.deliveryTime != null && (
            <View style={styles.metaItem}>
              <Ionicons name="bicycle-outline" size={12} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{restaurant.deliveryTime} min</Text>
            </View>
          )}
          {restaurant.minimumOrder != null && restaurant.minimumOrder > 0 && (
            <View style={styles.metaItem}>
              <Ionicons name="wallet-outline" size={12} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>Min {restaurant.minimumOrder} MAD</Text>
            </View>
          )}
        </View>
        {hasFreeDelivery && (
          <View style={[styles.freeBadge, { backgroundColor: "#ECFEFF" }]}>
            <Ionicons name="rocket-outline" size={10} color={TURQUOISE} />
            <Text style={[styles.freeBadgeText, { color: TURQUOISE }]}>Livraison offerte</Text>
          </View>
        )}
      </View>

      {/* Heart to remove */}
      <TouchableOpacity
        onPress={(e) => { e.stopPropagation?.(); onRemove(); }}
        hitSlop={10}
        style={styles.heartBtn}
      >
        <Ionicons name="heart" size={22} color={colors.primary} />
      </TouchableOpacity>
    </Pressable>
  );
}

export default function FavoritesScreen() {
  const colors = useColors();
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { data: allRestaurants, isLoading: restaurantsLoading } = useListRestaurants({ businessType: "restaurant" });

  const load = useCallback(async () => {
    const ids = await getFavoriteIds();
    setFavoriteIds(ids);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const onRemove = async (restaurantId: number) => {
    setFavoriteIds((prev) => prev.filter((id) => id !== restaurantId));
    await removeFavorite(restaurantId);
  };

  const favoriteRestaurants = allRestaurants?.filter((r) => favoriteIds.includes(r.id)) ?? [];
  const isReady = !loading && !restaurantsLoading;

  return (
    <ProfileScreenLayout title="Mes favoris" scroll={false}>
      {!isReady ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : favoriteRestaurants.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="heart-outline" size={64} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.heading }]}>Aucun favori</Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
            Touchez le ♡ sur un restaurant pour le sauvegarder ici.
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)")}
            style={[styles.cta, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.ctaText}>Découvrir des restaurants</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          {favoriteRestaurants.map((restaurant) => (
            <FavoriteCard
              key={restaurant.id}
              restaurant={restaurant}
              onRemove={() => onRemove(restaurant.id)}
            />
          ))}
        </ScrollView>
      )}
    </ProfileScreenLayout>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 8 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginTop: 12 },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  cta: {
    marginTop: 16,
    paddingHorizontal: 24,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
  },
  imgWrap: { width: 96, height: 96, position: "relative" },
  img: { width: 96, height: 96 },
  logoWrap: {
    position: "absolute",
    bottom: 6,
    left: 6,
    width: 28,
    height: 28,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.8)",
  },
  logo: { width: "100%", height: "100%" },
  logoLetter: { fontSize: 13, fontFamily: "Inter_700Bold" },
  info: { flex: 1, paddingHorizontal: 12, paddingVertical: 10, gap: 3 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#FFF8E1",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
  },
  ratingText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#92400E" },
  category: { fontSize: 12, fontFamily: "Inter_400Regular" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 2 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  metaText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  freeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  freeBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  heartBtn: { padding: 12 },
});
