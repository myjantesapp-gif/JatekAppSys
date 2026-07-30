import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  StyleSheet, Text, View, FlatList, TouchableOpacity,
  Image, ActivityIndicator, Platform, ScrollView, Animated, Pressable, Dimensions, Modal, Linking,
} from "react-native";
import { WebView } from "react-native-webview";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useGetRestaurant, useListMenuItems } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { MenuItemGridCard } from "@/components/MenuItemGridCard";
import { MenuItemDetailModal } from "@/components/MenuItemDetailModal";
import type { MenuItemSize, MenuItemExtra } from "@/lib/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { listFavorites, addFavorite, removeFavorite, geocodeAddress } from "@/lib/api";
import { useT } from "@/contexts/LanguageContext";

const { width: SCREEN_W } = Dimensions.get("window");
const SIDE = 16;
const COL_GAP = 12;
const COL_W = (SCREEN_W - SIDE * 2 - COL_GAP) / 2;
const HERO_H = 240;
const GOOGLE_KEY = (process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY ?? "").trim();

function buildRestaurantMapHtml(lat: number, lng: number, name: string): string {
  const safeName = name.replace(/'/g, "\\'");
  if (GOOGLE_KEY) {
    return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{margin:0;padding:0}body,html,#map{width:100%;height:100%}</style></head><body><div id="map"></div><script>
function init(){
  var map=new google.maps.Map(document.getElementById('map'),{center:{lat:${lat},lng:${lng}},zoom:16,disableDefaultUI:true});
  new google.maps.Marker({position:{lat:${lat},lng:${lng}},map:map,title:'${safeName}',icon:{url:'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="13" fill="#E2006A" stroke="#fff" stroke-width="2.5"/><text x="16" y="21" text-anchor="middle" font-size="14">🍽️</text></svg>'),scaledSize:new google.maps.Size(32,32),anchor:new google.maps.Point(16,16)}});
}
</script><script src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_KEY}&callback=init" async defer></script></body></html>`;
  }
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/><style>*{margin:0;padding:0}body,html,#map{width:100%;height:100%}</style></head><body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>
var map=L.map('map',{zoomControl:false,attributionControl:false}).setView([${lat},${lng}],16);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
var icon=L.divIcon({html:'<div style="width:28px;height:28px;background:#E2006A;border-radius:50%;border:2.5px solid #fff;display:flex;align-items:center;justify-content:center;font-size:14px">🍽️</div>',iconSize:[28,28],iconAnchor:[14,14],className:''});
L.marker([${lat},${lng}],{icon:icon}).addTo(map).bindPopup('${safeName}');
</script></body></html>`;
}

export default function RestaurantScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const restaurantId = parseInt(id, 10);
  const [activeCategory, setActiveCategory] = useState("Tous");
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const { items: cartItems, addItem, updateQuantity, restaurantId: cartRestaurantId, itemCount } = useCart();
  const { token } = useAuth();
  const [isFav, setIsFav] = useState(false);
  const [restaurantCoords, setRestaurantCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!token || !restaurantId) return;
    listFavorites().then((rows) => setIsFav(rows.some((r) => r.restaurantId === restaurantId))).catch(() => {});
  }, [token, restaurantId]);

  const toggleFav = async () => {
    if (!token) { router.push("/(auth)/login" as any); return; }
    const next = !isFav;
    setIsFav(next);
    try {
      if (next) await addFavorite(restaurantId);
      else await removeFavorite(restaurantId);
    } catch { setIsFav(!next); }
  };

  const { data: restaurant, isLoading: rLoading } = useGetRestaurant(restaurantId);
  const { data: menuItems, isLoading: mLoading } = useListMenuItems(restaurantId);

  useEffect(() => {
    if (!infoModalOpen || restaurantCoords) return;
    const addr = (restaurant as any)?.address as string | undefined;
    if (!addr) return;
    geocodeAddress(addr).then((pos) => { if (pos) setRestaurantCoords(pos); }).catch(() => {});
  }, [infoModalOpen, restaurant, restaurantCoords]);

  const categories = useMemo(
    () => ["Tous", ...Array.from(new Set((menuItems ?? []).map((m: any) => m.category).filter(Boolean) as string[]))],
    [menuItems]
  );
  const filtered = useMemo(
    () => activeCategory === "Tous"
      ? (menuItems ?? [])
      : (menuItems ?? []).filter((m: any) => m.category === activeCategory),
    [menuItems, activeCategory]
  );

  const getQty = (itemId: number) => cartItems.find((i) => i.menuItemId === itemId)?.quantity ?? 0;
  const businessType = (restaurant as any)?.businessType ?? "restaurant";
  const isServices = businessType === "services";

  if (rLoading) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <ActivityIndicator style={styles.center} color={colors.primary} size="large" />
      </View>
    );
  }
  if (!restaurant) {
    return (
      <View style={[styles.flex, styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground }}>Restaurant introuvable</Text>
      </View>
    );
  }

  const heroUri = restaurant.coverImageUrl || restaurant.imageUrl;
  const isOpen = (restaurant as { isOpen?: boolean | null }).isOpen !== false;

  const Header = (
    <View>
      {/* ─── Hero image ─── */}
      <View style={styles.heroWrap}>
        {heroUri ? (
          <Image source={{ uri: heroUri }} style={styles.hero} resizeMode="cover" />
        ) : (
          <View style={[styles.hero, styles.heroPlaceholder, { backgroundColor: colors.muted }]}>
            <Ionicons name="restaurant" size={48} color={colors.mutedForeground} />
          </View>
        )}

        {/* Floating round controls */}
        <View style={[styles.heroTop, { top: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.roundBtn} activeOpacity={0.85}>
            <Ionicons name="arrow-back" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <View style={styles.heroTopRight}>
            <TouchableOpacity onPress={toggleFav} style={styles.roundBtn} activeOpacity={0.85}>
              <Ionicons name={isFav ? "heart" : "heart-outline"} size={20} color={isFav ? colors.primary : colors.foreground} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.roundBtn} activeOpacity={0.85}>
              <Ionicons name="share-outline" size={20} color={colors.foreground} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.roundBtn} activeOpacity={0.85}>
              <Ionicons name="search" size={20} color={colors.foreground} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ─── Overlapping info card ─── */}
      <View style={styles.cardOuter}>
        <View style={[styles.infoCard, { backgroundColor: "#fff" }]}>
          <View style={styles.infoTopRow}>
            <View style={[styles.logoBox, { backgroundColor: "#fff" }]}>
              {restaurant.logoUrl ? (
                <Image source={{ uri: restaurant.logoUrl }} style={styles.logoImg} resizeMode="contain" />
              ) : (
                <Text style={[styles.logoLetter, { color: colors.primary }]}>
                  {restaurant.name.charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
            <View style={styles.infoTextWrap}>
              <Text style={[styles.rName, { color: colors.foreground }]} numberOfLines={1}>{restaurant.name}</Text>
              {restaurant.category ? (
                <Text style={[styles.rTags, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {restaurant.category}
                </Text>
              ) : null}
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={13} color={colors.yellow} />
                <Text style={[styles.ratingTxt, { color: colors.foreground }]}>
                  {restaurant.rating != null ? restaurant.rating.toFixed(1) : "—"}
                </Text>
                {(restaurant as any).reviewCount != null && (
                  <Text style={[styles.ratingCount, { color: colors.mutedForeground }]}>
                    ({(restaurant as any).reviewCount}+)
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity onPress={() => setInfoModalOpen(true)} hitSlop={12} activeOpacity={0.7}>
              <Ionicons name="chevron-forward" size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={15} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.foreground }]}>
                {restaurant.deliveryTime != null ? `${restaurant.deliveryTime}-${restaurant.deliveryTime + 10} min` : "— min"}
              </Text>
            </View>
            <View style={styles.metaDot} />
            <View style={styles.metaItem}>
              <Ionicons name="bicycle-outline" size={15} color={restaurant.deliveryFee === 0 ? colors.turquoise : colors.mutedForeground} />
              <Text style={[styles.metaText, {
                color: restaurant.deliveryFee === 0 ? colors.turquoise : colors.foreground,
                fontFamily: restaurant.deliveryFee === 0 ? "Inter_700Bold" : "Inter_600SemiBold",
              }]}>
                {restaurant.deliveryFee != null
                  ? (restaurant.deliveryFee === 0 ? "Gratuit" : `${restaurant.deliveryFee} MAD`)
                  : "—"}
              </Text>
            </View>
            <View style={styles.metaDot} />
            <View style={styles.metaItem}>
              <View style={[styles.openDot, { backgroundColor: isOpen ? colors.turquoise : "#9CA3AF" }]} />
              <Text style={[styles.metaText, {
                color: isOpen ? colors.turquoise : colors.mutedForeground,
                fontFamily: "Inter_700Bold",
              }]}>
                {isOpen ? "Ouvert" : "Fermé"}
              </Text>
            </View>
          </View>

        </View>
      </View>

      {/* Closed banner */}
      {!isOpen && (
        <View style={[styles.closedBanner]}>
          <View style={styles.closedBannerInner}>
            <Ionicons name="moon-outline" size={20} color="#fff" />
            <View style={styles.closedBannerText}>
              <Text style={styles.closedBannerTitle}>Restaurant fermé</Text>
              <Text style={styles.closedBannerSub}>
                Les commandes ne sont pas disponibles pour le moment. Revenez plus tard !
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Cart-conflict warning */}
      {cartRestaurantId && cartRestaurantId !== restaurantId && (
        <View style={[styles.warningBanner, { backgroundColor: "#FEF3C7", borderColor: "#FDE68A" }]}>
          <Ionicons name="warning-outline" size={16} color="#B45309" />
          <Text style={[styles.warningText, { color: "#B45309" }]}>
            Ajouter des produits videra votre panier actuel
          </Text>
        </View>
      )}

      {/* Category tabs */}
      {categories.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catRow}
        >
          {categories.map((cat) => {
            const active = activeCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setActiveCategory(cat)}
                style={[styles.catChip, active && { borderBottomColor: colors.primary }]}
                activeOpacity={0.85}
              >
                <Text style={[
                  styles.catText,
                  { color: active ? colors.foreground : colors.mutedForeground },
                  active && { fontFamily: "Inter_700Bold" },
                ]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Section title */}
      {filtered.length > 0 && (
        <View style={styles.sectionTitleWrap}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {activeCategory === "Tous" ? "Nos produits" : activeCategory}
          </Text>
          <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
            {filtered.length} {filtered.length > 1 ? "articles" : "article"}
          </Text>
        </View>
      )}

      {mLoading && <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />}
    </View>
  );

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + (itemCount > 0 || isServices ? 110 : 24) + (Platform.OS === "web" ? 34 : 0),
        }}
        columnWrapperStyle={styles.colWrap}
        ListHeaderComponent={Header}
        renderItem={({ item }) => (
          <MenuItemGridCard
            item={item}
            quantity={getQty(item.id)}
            width={COL_W}
            restaurantOpen={isOpen}
            onPressCard={() => setSelectedItem(item)}
            onAdd={() => {
              if (!isOpen) return;
              const pricing = restaurant as { deliveryFee?: number | null; freeDeliveryThreshold?: number | null };
              addItem(restaurantId, restaurant.name, { cartLineId: String(item.id), menuItemId: item.id, name: item.name, price: item.price, imageUrl: item.imageUrl }, { deliveryFee: pricing.deliveryFee, freeDeliveryThreshold: pricing.freeDeliveryThreshold });
            }}
          />
        )}
        ListEmptyComponent={!mLoading ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="basket-outline" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTxt, { color: colors.mutedForeground }]}>
              Aucun produit pour le moment
            </Text>
          </View>
        ) : null}
      />

      {/* Quote CTA — service merchants */}
      {isServices && (
        <View style={[styles.cartBar, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 10) }]}>
          <TouchableOpacity
            style={[styles.cartBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push({ pathname: "/quote/new", params: { restaurantId: String(restaurantId), restaurantName: restaurant.name } })}
            activeOpacity={0.85}
          >
            <Ionicons name="document-text-outline" size={18} color="#fff" />
            <Text style={styles.cartBtnText} numberOfLines={1}>{t("quote_request")}</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Cart pill */}
      {!isServices && itemCount > 0 && (
        <View style={[styles.cartBar, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 10) }]}>
          <CartPillButton
            count={itemCount}
            label={t("view_cart")}
            onPress={() => router.push("/cart")}
            color={colors.primary}
          />
        </View>
      )}

      {/* ─── Info modal : description, adresse, horaires ─── */}
      <Modal
        visible={infoModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setInfoModalOpen(false)}
      >
        <Pressable style={styles.infoModalBackdrop} onPress={() => setInfoModalOpen(false)}>
          <Pressable
            style={[styles.infoModalSheet, { paddingBottom: insets.bottom + 24, backgroundColor: colors.background }]}
            onPress={() => {}}
          >
            {/* Handle bar */}
            <View style={[styles.infoModalHandle, { backgroundColor: colors.border }]} />

            {/* Header */}
            <View style={styles.infoModalHeader}>
              <View style={[styles.infoModalLogoBox, { backgroundColor: colors.muted }]}>
                {restaurant.logoUrl ? (
                  <Image source={{ uri: restaurant.logoUrl }} style={styles.infoModalLogoImg} resizeMode="contain" />
                ) : (
                  <Text style={[styles.infoModalLogoLetter, { color: colors.primary }]}>
                    {restaurant.name.charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoModalName, { color: colors.foreground }]}>{restaurant.name}</Text>
                {restaurant.category ? (
                  <Text style={[styles.infoModalCategory, { color: colors.mutedForeground }]}>{restaurant.category}</Text>
                ) : null}
              </View>
              <TouchableOpacity onPress={() => setInfoModalOpen(false)} hitSlop={12}>
                <Ionicons name="close" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <View style={[styles.infoModalDivider, { backgroundColor: colors.border }]} />

            {/* Status row */}
            <View style={styles.infoModalRow}>
              <View style={[styles.infoModalIconWrap, { backgroundColor: (isOpen ? "#D1FAE5" : "#F3F4F6") }]}>
                <View style={[styles.openDot, { backgroundColor: isOpen ? colors.turquoise : "#9CA3AF" }]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoModalRowLabel, { color: colors.mutedForeground }]}>Statut</Text>
                <Text style={[styles.infoModalRowValue, { color: isOpen ? colors.turquoise : colors.mutedForeground, fontFamily: "Inter_700Bold" }]}>
                  {isOpen ? "Ouvert maintenant" : "Fermé pour le moment"}
                </Text>
              </View>
            </View>

            {/* Description */}
            {restaurant.description ? (
              <View style={styles.infoModalRow}>
                <View style={[styles.infoModalIconWrap, { backgroundColor: "#EDE9FE" }]}>
                  <Ionicons name="document-text-outline" size={16} color="#7C3AED" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.infoModalRowLabel, { color: colors.mutedForeground }]}>Description</Text>
                  <Text style={[styles.infoModalRowValue, { color: colors.foreground }]}>{restaurant.description}</Text>
                </View>
              </View>
            ) : null}

            {/* Address + mini-map */}
            {(restaurant as any).address ? (
              <>
                <View style={styles.infoModalRow}>
                  <View style={[styles.infoModalIconWrap, { backgroundColor: "#FEE2E2" }]}>
                    <Ionicons name="location-outline" size={16} color="#DC2626" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.infoModalRowLabel, { color: colors.mutedForeground }]}>Adresse</Text>
                    <Text style={[styles.infoModalRowValue, { color: colors.foreground }]}>{(restaurant as any).address}</Text>
                  </View>
                </View>
                {restaurantCoords ? (
                  <View style={styles.miniMapWrap}>
                    <WebView
                      style={styles.miniMapWebView}
                      scrollEnabled={false}
                      pointerEvents="none"
                      source={{ html: buildRestaurantMapHtml(restaurantCoords.lat, restaurantCoords.lng, restaurant.name ?? "") }}
                      originWhitelist={["*"]}
                    />
                    <TouchableOpacity
                      style={styles.directionsBtn}
                      activeOpacity={0.8}
                      onPress={() => {
                        const url = Platform.OS === "ios"
                          ? `maps://?ll=${restaurantCoords.lat},${restaurantCoords.lng}&q=${encodeURIComponent(restaurant.name ?? "")}`
                          : `geo:${restaurantCoords.lat},${restaurantCoords.lng}?q=${encodeURIComponent((restaurant as any).address)}`;
                        Linking.openURL(url).catch(() =>
                          Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((restaurant as any).address)}`),
                        );
                      }}
                    >
                      <Ionicons name="navigate-outline" size={14} color="#fff" />
                      <Text style={styles.directionsBtnText}>Itinéraire</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </>
            ) : null}

            {/* Phone */}
            {(restaurant as any).phone ? (
              <View style={styles.infoModalRow}>
                <View style={[styles.infoModalIconWrap, { backgroundColor: "#D1FAE5" }]}>
                  <Ionicons name="call-outline" size={16} color="#059669" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.infoModalRowLabel, { color: colors.mutedForeground }]}>Téléphone</Text>
                  <Text style={[styles.infoModalRowValue, { color: colors.foreground }]}>{(restaurant as any).phone}</Text>
                </View>
              </View>
            ) : null}

            {/* Delivery info */}
            <View style={styles.infoModalRow}>
              <View style={[styles.infoModalIconWrap, { backgroundColor: "#DBEAFE" }]}>
                <Ionicons name="bicycle-outline" size={16} color="#2563EB" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoModalRowLabel, { color: colors.mutedForeground }]}>Livraison</Text>
                <Text style={[styles.infoModalRowValue, { color: colors.foreground }]}>
                  {restaurant.deliveryFee === 0
                    ? "Gratuite"
                    : restaurant.deliveryFee != null
                    ? `${restaurant.deliveryFee} MAD`
                    : "—"
                  }
                  {restaurant.deliveryTime != null ? `  ·  ${restaurant.deliveryTime}–${restaurant.deliveryTime + 10} min` : ""}
                </Text>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Detail modal — keeps existing UX */}
      <MenuItemDetailModal
        visible={!!selectedItem}
        item={selectedItem}
        initialQty={selectedItem ? getQty(selectedItem.id) : 0}
        restaurantOpen={isOpen}
        onClose={() => setSelectedItem(null)}
        onAdd={({ qty, selectedSize, selectedSizeId, selectedExtras, selectedExtraIds, unitPrice, displayName, cartLineId }) => {
          if (!selectedItem || !isOpen) return;
          const pricing = restaurant as { deliveryFee?: number | null; freeDeliveryThreshold?: number | null };
          for (let i = 0; i < qty; i++) {
            addItem(restaurantId, restaurant.name, {
              cartLineId,
              menuItemId: selectedItem.id,
              name: displayName,
              price: unitPrice,
              imageUrl: selectedItem.imageUrl,
              selectedSize: selectedSize?.name,
              selectedSizeId: selectedSizeId ?? undefined,
              selectedSizePriceAdjustment: selectedSize?.priceAdjustment,
              selectedExtras: selectedExtras.map((e) => e.name),
              selectedExtraIds: selectedExtraIds.length ? selectedExtraIds : undefined,
            }, { deliveryFee: pricing.deliveryFee, freeDeliveryThreshold: pricing.freeDeliveryThreshold });
          }
        }}
      />
    </View>
  );
}

function CartPillButton({ count, label, onPress, color }: { count: number; label: string; onPress: () => void; color: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  const bounce = useRef(new Animated.Value(0)).current;
  const prevCount = useRef(count);

  useEffect(() => {
    if (count > prevCount.current) {
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Animated.sequence([
        Animated.spring(bounce, { toValue: 1, useNativeDriver: true, friction: 4, tension: 220 }),
        Animated.spring(bounce, { toValue: 0, useNativeDriver: true, friction: 5, tension: 180 }),
      ]).start();
    }
    prevCount.current = count;
  }, [count, bounce]);

  const onIn = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, friction: 6 }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5 }).start();
  const bumpScale = bounce.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });

  return (
    <Pressable onPress={onPress} onPressIn={onIn} onPressOut={onOut} accessibilityRole="button" accessibilityLabel={label}>
      <Animated.View style={{ transform: [{ scale }, { scale: bumpScale }] }}>
        <View style={[styles.pillCartBtn, { backgroundColor: color }]}>
          <View style={styles.pillCartQty}>
            <Text style={[styles.pillCartQtyText, { color }]}>{count}</Text>
          </View>
          <Text style={styles.pillCartLabel} numberOfLines={1}>{label}</Text>
          <Ionicons name="arrow-forward" size={16} color="#fff" />
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  // Hero
  heroWrap: { position: "relative" },
  hero: { width: "100%", height: HERO_H },
  heroPlaceholder: { alignItems: "center", justifyContent: "center" },
  heroTop: {
    position: "absolute", left: SIDE, right: SIDE,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  heroTopRight: { flexDirection: "row", gap: 10 },
  roundBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },

  // Overlapping info card
  cardOuter: { paddingHorizontal: SIDE, marginTop: -44 },
  infoCard: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
    shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 4,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  infoTopRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoBox: {
    width: 48, height: 48, borderRadius: 10,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
    borderWidth: 1, borderColor: "#F0F0F0",
  },
  logoImg: { width: "100%", height: "100%" },
  logoLetter: { fontSize: 19, fontFamily: "Inter_700Bold" },
  infoTextWrap: { flex: 1, gap: 1 },
  rName: { fontSize: 16, fontFamily: "Inter_700Bold" },
  rTags: { fontSize: 11, fontFamily: "Inter_400Regular" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 1 },
  ratingTxt: { fontSize: 12, fontFamily: "Inter_700Bold" },
  ratingCount: { fontSize: 11, fontFamily: "Inter_400Regular" },
  divider: { height: 1, marginVertical: 1 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: "#D1D5DB" },
  openDot: { width: 6, height: 6, borderRadius: 3 },
  closedBanner: {
    marginHorizontal: SIDE, marginTop: 14, borderRadius: 14, overflow: "hidden",
    backgroundColor: "#1F2937",
    shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  closedBannerInner: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  closedBannerText: { flex: 1 },
  closedBannerTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
  closedBannerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#D1D5DB", marginTop: 2 },

  warningBanner: {
    marginHorizontal: SIDE, marginTop: 14, padding: 10, borderRadius: 10, borderWidth: 1,
    flexDirection: "row", alignItems: "center", gap: 8,
  },
  warningText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },

  // Category tabs (underline)
  catRow: { paddingHorizontal: SIDE, paddingTop: 18, gap: 18, alignItems: "center" },
  catChip: {
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  catText: { fontSize: 14, fontFamily: "Inter_500Medium" },

  sectionTitleWrap: { paddingHorizontal: SIDE, paddingTop: 16, paddingBottom: 6 },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  sectionSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },

  // Grid
  colWrap: { paddingHorizontal: SIDE, gap: COL_GAP },

  emptyWrap: { alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 10 },
  emptyTxt: { fontSize: 14, fontFamily: "Inter_500Medium" },

  // Cart bar
  cartBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingTop: 6, alignItems: "center",
  },
  cartBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    height: 44, borderRadius: 22,
    paddingHorizontal: 18, minWidth: 200, maxWidth: 360, alignSelf: "center",
    shadowColor: "#E2006A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 12, elevation: 8,
  },
  cartBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold", textAlign: "center" },

  pillCartBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    height: 46, borderRadius: 23,
    paddingLeft: 8, paddingRight: 18,
    minWidth: 220, maxWidth: 360, alignSelf: "center",
  },
  pillCartQty: {
    minWidth: 30, height: 30, paddingHorizontal: 9, borderRadius: 15,
    backgroundColor: "#fff", alignItems: "center", justifyContent: "center",
  },
  pillCartQtyText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  pillCartLabel: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold", textAlign: "center", letterSpacing: 0.2 },

  // ─── Info modal ──────────────────────────────────────────────────────────
  infoModalBackdrop: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end",
  },
  infoModalSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12, gap: 0,
  },
  infoModalHandle: {
    width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16,
  },
  infoModalHeader: {
    flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14,
  },
  infoModalLogoBox: {
    width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  infoModalLogoImg: { width: 52, height: 52 },
  infoModalLogoLetter: { fontSize: 22, fontFamily: "Inter_900Black" },
  infoModalName: { fontSize: 17, fontFamily: "Inter_700Bold" },
  infoModalCategory: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  infoModalDivider: { height: 1, marginBottom: 8 },
  infoModalRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 11,
  },
  infoModalIconWrap: {
    width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center",
  },
  infoModalRowLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 2 },
  infoModalRowValue: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },

  miniMapWrap: {
    marginHorizontal: 0, marginTop: 4, marginBottom: 10,
    borderRadius: 12, overflow: "hidden",
    height: 140,
    position: "relative",
  },
  miniMapWebView: { flex: 1 },
  directionsBtn: {
    position: "absolute", bottom: 10, right: 10,
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#E2006A", borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  directionsBtnText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
