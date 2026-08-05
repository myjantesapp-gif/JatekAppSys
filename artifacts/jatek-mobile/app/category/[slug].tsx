import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TextInput,
  TouchableOpacity,
  Pressable,
  Image,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { useListRestaurants, useGetFeaturedRestaurants, useListCategories, type Restaurant } from "@workspace/api-client-react";
import { getApiBaseSafe } from "@/lib/apiBase";

function trackBannerClick(restaurantId: number) {
  try {
    fetch(`${getApiBaseSafe()}/api/restaurants/${restaurantId}/track-click`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }).catch(() => {});
  } catch {
    // Fire-and-forget
  }
}

// ─── Brand palette ────────────────────────────────────────────────────────────
const PINK = "#E91E63";
const TEXT_DARK = "#0A1B3D";
const TEXT_MUTED = "#6B7280";
const CARD_BG = "#FFFFFF";
const BG = "#FAFAFA";
const STAR = "#FFB400";
const { width: SCREEN_W } = Dimensions.get("window");

// ─── Sub-category config per slug ─────────────────────────────────────────────
type SubcatConfig = {
  id: string;
  label: string;
  apiCategory?: string;
  icon: string;
};

type SlugConfig = {
  label: string;
  color: string;
  bannerImageUrl: string | null;
  businessType: string;
  subcategories: SubcatConfig[];
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SubcatIcon({
  sub,
  active,
  color,
  onPress,
}: {
  sub: SubcatConfig;
  active: boolean;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.subcatItem,
        pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
      ]}
    >
      <View
        style={[
          styles.subcatCircle,
          { backgroundColor: active ? color : color + "1A", borderColor: active ? color : "transparent" },
        ]}
      >
        <Ionicons name={sub.icon as any} size={26} color={active ? "#fff" : color} />
      </View>
      <Text
        style={[
          styles.subcatLabel,
          active && { color: color, fontFamily: "Inter_700Bold" },
        ]}
        numberOfLines={1}
      >
        {sub.label}
      </Text>
    </Pressable>
  );
}

function PromoBannerCard({
  title,
  subtitle,
  bgColor,
  badge,
  onPress,
}: {
  title: string;
  subtitle: string;
  bgColor: string;
  badge: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.promoCard, { backgroundColor: bgColor }, pressed && { opacity: 0.92 }]}>
      <View style={styles.promoBadge}>
        <Ionicons name="star" size={11} color="#fff" />
        <Text style={styles.promoBadgeTxt}>{badge}</Text>
      </View>
      <Text style={styles.promoTitle} numberOfLines={1}>{title}</Text>
      <Text style={styles.promoSubtitle} numberOfLines={2}>{subtitle}</Text>
    </Pressable>
  );
}

function RestaurantCardGrid({ restaurant, onPress, color }: { restaurant: Restaurant; onPress: () => void; color: string }) {
  const img = restaurant.imageUrl;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.gridCard,
        pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
      ]}
    >
      <View style={styles.gridImgWrap}>
        {img ? (
          <Image source={{ uri: img }} style={styles.gridCardImg} resizeMode="cover" />
        ) : (
          <View style={[styles.gridCardImg, styles.gridCardImgPlaceholder]}>
            <Ionicons name="storefront-outline" size={32} color={TEXT_MUTED} />
          </View>
        )}
        {restaurant.isOpen === false && (
          <View style={styles.closedBadge}>
            <Text style={styles.closedText}>Fermé</Text>
          </View>
        )}
        {restaurant.logoUrl ? (
          <Image source={{ uri: restaurant.logoUrl }} style={styles.gridCardLogo} resizeMode="contain" />
        ) : (
          <View style={[styles.gridCardLogo, { backgroundColor: color, alignItems: "center", justifyContent: "center" }]}>
            <Text style={styles.cardLogoLetter}>{restaurant.name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
      </View>
      <View style={styles.gridCardBody}>
        <Text style={styles.cardName} numberOfLines={1}>{restaurant.name}</Text>
        <View style={styles.cardMeta}>
          {restaurant.rating != null && (
            <>
              <Ionicons name="star" size={12} color={STAR} />
              <Text style={styles.metaTxtBold}>{restaurant.rating.toFixed(1)}</Text>
            </>
          )}
          {restaurant.deliveryTime != null && (
            <>
              <Text style={styles.metaDot}>·</Text>
              <Ionicons name="time-outline" size={11} color={TEXT_MUTED} />
              <Text style={styles.metaTxt}>{restaurant.deliveryTime} min</Text>
            </>
          )}
          {restaurant.deliveryFee != null && (
            <>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.metaTxt}>{restaurant.deliveryFee} MAD</Text>
            </>
          )}
        </View>
      </View>
    </Pressable>
  );
}

function EmptyCategorySection({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.emptyWrap}>
      <View style={[styles.emptyIcon, { backgroundColor: color + "1A" }]}>
        <Ionicons name="storefront-outline" size={42} color={color} />
      </View>
      <Text style={styles.emptyTitle}>Aucun établissement disponible</Text>
      <Text style={styles.emptySub}>
        Les commerces de la catégorie {label} seront bientôt disponibles dans votre zone.
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CategoryScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [activeSubId, setActiveSubId] = useState("all");

  // Reset subcategory selection when navigating between categories.
  React.useEffect(() => {
    setActiveSubId("all");
  }, [slug]);

  // Categories are 100% managed from the admin dashboard (ma.jatek.app/admin).
  // The API returns parents with their subCategories nested.
  const { data: apiCategories, isLoading: categoriesLoading } = useListCategories();
  const parent = useMemo(
    () =>
      (apiCategories ?? []).find(
        (c: any) => c.slug === slug && !c.parentId && c.isActive !== false,
      ) as any,
    [apiCategories, slug],
  );
  const config = useMemo<SlugConfig>(() => {
    if (!parent) {
      return {
        label: slug ?? "Catégorie",
        color: PINK,
        bannerImageUrl: null,
        businessType: "",
        subcategories: [{ id: "all", label: "Tout", icon: "grid" }],
      };
    }
    // Children may arrive nested (subCategories) or flat (parentId) depending
    // on the endpoint shape — support both.
    const nested = (parent.subCategories ?? []) as any[];
    const flat = (apiCategories ?? []).filter((c: any) => c.parentId === parent.id);
    const children = (nested.length > 0 ? nested : flat).filter(
      (c: any) => c.isActive !== false,
    );
    return {
      label: parent.name,
      color: parent.accentColor || PINK,
      bannerImageUrl: parent.bannerImageUrl ?? null,
      businessType: parent.businessType || "restaurant",
      subcategories: [
        { id: "all", label: "Tout", icon: "grid" },
        ...children.map((c: any) => ({
          id: String(c.id),
          label: c.name,
          icon: c.icon || "grid",
          apiCategory: c.name,
        })),
      ],
    };
  }, [apiCategories, slug, parent]);

  const activeSub = config.subcategories.find((s) => s.id === activeSubId) ?? config.subcategories[0];
  const apiCategory = activeSub.id === "all" ? undefined : activeSub.apiCategory;

  // Only query restaurants once the backend category is resolved — never with
  // a guessed/fallback business type.
  const categoryResolved = !!parent;
  const { data: restaurants, isLoading: restaurantsLoading } = useListRestaurants(
    {
      businessType: config.businessType,
      category: apiCategory,
      search: search.trim() || undefined,
    },
    { query: { enabled: categoryResolved } as any },
  );
  const isLoading = categoriesLoading || (categoryResolved && restaurantsLoading);

  const filtered = useMemo(() => {
    if (!restaurants) return [];
    if (!search.trim()) return restaurants;
    const q = search.toLowerCase();
    return restaurants.filter((r: Restaurant) =>
      r.name.toLowerCase().includes(q) || (r.category ?? "").toLowerCase().includes(q),
    );
  }, [restaurants, search]);

  // VIP / promo partners — featured restaurants matching current category's businessType
  const { data: featuredAll } = useGetFeaturedRestaurants();
  const vipPartners = useMemo(() => {
    const all = featuredAll ?? [];
    const matching = all.filter((r) => r.businessType === config.businessType);
    return (matching.length > 0 ? matching : all).slice(0, 5);
  }, [featuredAll, config.businessType]);

  const goRestaurant = (id: number) =>
    router.push({ pathname: "/restaurant/[id]", params: { id: String(id) } });

  return (
    <View style={[styles.root]}>
      {/* ─── Banner header — image served from backend bannerImageUrl ─── */}
      <View style={[styles.bannerWrap, { paddingTop: insets.top + 6 }]}>
        {config.bannerImageUrl ? (
          <Image source={{ uri: config.bannerImageUrl }} style={styles.bannerImg} resizeMode="cover" />
        ) : null}
        <View style={styles.bannerOverlay} />
        <View style={styles.bannerTopRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={22} color={TEXT_DARK} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
        </View>
        <View style={styles.bannerTitleWrap}>
          <Text style={[styles.bannerTitle, { color: TEXT_DARK }]}>{config.label}</Text>
          <Text style={[styles.bannerSub, { color: TEXT_DARK }]}>
            Découvrez les meilleurs partenaires
          </Text>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(r) => String(r.id)}
        numColumns={2}
        contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 24 }]}
        columnWrapperStyle={{ gap: 12 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* ─── Search bar ─── */}
            <Animated.View entering={FadeInDown.delay(80).duration(450).springify()} style={styles.searchWrap}>
              <Ionicons name="search" size={16} color={TEXT_MUTED} />
              <TextInput
                style={styles.searchInput}
                placeholder={`Rechercher dans ${config.label}…`}
                placeholderTextColor={TEXT_MUTED}
                value={search}
                onChangeText={setSearch}
                returnKeyType="search"
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color={TEXT_MUTED} />
                </TouchableOpacity>
              )}
            </Animated.View>

            {/* ─── Sub-categories as icon slider ─── */}
            <Animated.ScrollView
              entering={FadeInDown.delay(160).duration(500).springify()}
              horizontal
              showsHorizontalScrollIndicator={false}
              nestedScrollEnabled
              style={styles.subcatScroll}
              contentContainerStyle={styles.subcatContent}
            >
              {config.subcategories.map((sub) => (
                <SubcatIcon
                  key={sub.id}
                  sub={sub}
                  active={sub.id === activeSubId}
                  color={config.color}
                  onPress={() => setActiveSubId(sub.id)}
                />
              ))}
            </Animated.ScrollView>

            {/* ─── VIP / Promo partners — only at parent-category level, hidden in subcategory view ─── */}
            {vipPartners.length > 0 && activeSubId === "all" && (
              <Animated.View entering={FadeInDown.delay(260).duration(550).springify()} style={styles.vipSection}>
                <View style={styles.vipHeader}>
                  <Text style={styles.vipTitle}>Partenaires VIP & Promotions</Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  nestedScrollEnabled
                  contentContainerStyle={styles.vipRow}
                >
                  {vipPartners.map((p, i) => (
                    <PromoBannerCard
                      key={p.id}
                      title={p.name}
                      subtitle={i % 2 === 0 ? "-20% sur votre première commande" : "Livraison gratuite aujourd'hui"}
                      bgColor={i % 2 === 0 ? config.color : "#0A1B3D"}
                      badge={i % 2 === 0 ? "VIP" : "PROMO"}
                      onPress={() => {
                        trackBannerClick(p.id);
                        goRestaurant(p.id);
                      }}
                    />
                  ))}
                </ScrollView>
              </Animated.View>
            )}

            {/* ─── Results count ─── */}
            {!isLoading && filtered.length > 0 && (
              <Animated.Text entering={FadeIn.delay(340).duration(400)} style={styles.resultsCount}>
                {filtered.length} établissement{filtered.length > 1 ? "s" : ""}
              </Animated.Text>
            )}

            {isLoading && (
              <View style={styles.loaderWrap}>
                <ActivityIndicator size="large" color={config.color} />
                <Text style={styles.loaderTxt}>Chargement…</Text>
              </View>
            )}
          </>
        }
        renderItem={({ item, index }) => (
          <Animated.View
            entering={FadeInDown.delay(380 + index * 60).duration(420).springify()}
            style={{ flex: 1 }}
          >
            <RestaurantCardGrid restaurant={item} onPress={() => goRestaurant(item.id)} color={config.color} />
          </Animated.View>
        )}
        ListEmptyComponent={
          !isLoading ? (
            categoryResolved ? (
              <EmptyCategorySection color={config.color} label={config.label} />
            ) : (
              <View style={styles.emptyWrap}>
                <View style={[styles.emptyIcon, { backgroundColor: PINK + "1A" }]}>
                  <Ionicons name="alert-circle-outline" size={42} color={PINK} />
                </View>
                <Text style={styles.emptyTitle}>Catégorie indisponible</Text>
                <Text style={styles.emptySub}>
                  Cette catégorie n'existe pas ou n'est plus active. Retournez à l'accueil pour voir les catégories disponibles.
                </Text>
              </View>
            )
          ) : null
        }
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const SIDE = 16;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // ── Banner header ──
  bannerWrap: {
    width: "100%",
    height: 160,
    paddingHorizontal: SIDE,
    paddingBottom: 16,
    justifyContent: "space-between",
    overflow: "hidden",
    backgroundColor: "#FFF",
  },
  bannerImg: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    opacity: 0.2, // image at 80% transparency (20% opacity)
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  bannerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  bannerTitleWrap: { gap: 4 },
  bannerTitle: { fontSize: 26, fontFamily: "Inter_900Black", letterSpacing: -0.5 },
  bannerSub: { fontSize: 13, fontFamily: "Inter_500Medium", opacity: 0.75 },

  // ── Search ──
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD_BG,
    marginHorizontal: SIDE,
    marginTop: 14,
    marginBottom: 4,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: TEXT_DARK,
    padding: 0,
  },

  // ── Sub-category icons slider ──
  subcatScroll: { marginTop: 14, flexGrow: 0 },
  subcatContent: { paddingHorizontal: SIDE, gap: 14, paddingVertical: 4 },
  subcatItem: { alignItems: "center", gap: 6, width: 70 },
  subcatCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  subcatLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: TEXT_DARK,
    textAlign: "center",
  },

  // ── VIP / promo banners ──
  vipSection: { marginTop: 18 },
  vipHeader: {
    paddingHorizontal: SIDE,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  vipTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: TEXT_DARK, letterSpacing: -0.2 },
  vipRow: { paddingHorizontal: SIDE, gap: 12, paddingVertical: 2 },
  promoCard: {
    width: SCREEN_W * 0.78,
    height: 110,
    borderRadius: 16,
    padding: 16,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  promoBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  promoBadgeTxt: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.4 },
  promoTitle: { color: "#fff", fontSize: 17, fontFamily: "Inter_900Black", letterSpacing: -0.3 },
  promoSubtitle: { color: "#fff", fontSize: 12, fontFamily: "Inter_500Medium", opacity: 0.95, marginTop: 2 },

  // ── Loader / empty ──
  loaderWrap: { alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: 12 },
  loaderTxt: { fontSize: 14, fontFamily: "Inter_400Regular", color: TEXT_MUTED },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingVertical: 60,
    gap: 14,
  },
  emptyIcon: { width: 88, height: 88, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: TEXT_DARK, textAlign: "center" },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", color: TEXT_MUTED, textAlign: "center", lineHeight: 20 },

  // ── Results & grid ──
  resultsCount: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: TEXT_MUTED,
    marginTop: 18,
    marginBottom: 10,
    paddingHorizontal: SIDE,
  },
  grid: { paddingHorizontal: SIDE, paddingTop: 0, gap: 12 },
  gridCard: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
    position: "relative",
    marginBottom: 12,
  },
  gridImgWrap: { width: "100%", height: 110, position: "relative" },
  gridCardImg: { width: "100%", height: "100%" },
  gridCardImgPlaceholder: { alignItems: "center", justifyContent: "center", backgroundColor: "#F3F4F6" },
  gridCardLogo: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  gridCardBody: { padding: 10, gap: 4 },
  cardLogoLetter: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 14 },
  closedBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  closedText: { color: "#fff", fontSize: 10, fontFamily: "Inter_600SemiBold" },
  cardName: { fontSize: 14, fontFamily: "Inter_700Bold", color: TEXT_DARK },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaTxt: { fontSize: 11, fontFamily: "Inter_400Regular", color: TEXT_MUTED },
  metaTxtBold: { fontSize: 11, fontFamily: "Inter_700Bold", color: TEXT_DARK },
  metaDot: { fontSize: 11, color: TEXT_MUTED, marginHorizontal: 1 },
});
