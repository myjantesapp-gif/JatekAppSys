import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal, StyleSheet, Text, View, TouchableOpacity, Image,
  ScrollView, Pressable, Platform, Animated, Easing, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import ReAnimated, { FadeIn, SlideInDown } from "react-native-reanimated";
import { useColors } from "@/hooks/useColors";
import { listMenuItemSizes, listMenuItemExtras } from "@/lib/api";

interface MenuItemSize {
  id: number;
  name: string;
  priceAdjustment: number;
  isAvailable: boolean;
}
interface MenuItemExtra {
  id: number;
  name: string;
  price: number;
  isAvailable: boolean;
}

interface MenuItem {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
}

interface Props {
  visible: boolean;
  item: MenuItem | null;
  initialQty?: number;
  restaurantOpen?: boolean;
  onClose: () => void;
  onAdd: (selection: {
    qty: number;
    selectedSize: MenuItemSize | null;
    selectedSizeId: number | null;
    selectedExtras: MenuItemExtra[];
    selectedExtraIds: number[];
    unitPrice: number;
    displayName: string;
    /** Synthetic per-line id (real menuItemId stays = item.id, this is for cart de-dup). */
    cartLineId: string;
  }) => void;
}

// Default rich content (used when no per-item info is provided by the API).
const DEFAULT_INGREDIENTS = ["Pain frais", "Sauce maison", "Légumes croquants", "Fromage fondant"];
const DEFAULT_ALLERGENS = ["Gluten", "Lactose"];
const DEFAULT_TAGS = [
  { label: "Best-seller", color: "#FF4593", emoji: "🔥" },
  { label: "Fait maison", color: "#00BFA6", emoji: "👩‍🍳" },
  { label: "Halal", color: "#7B61FF", emoji: "🥩" },
];

export function MenuItemDetailModal({ visible, item, initialQty = 0, restaurantOpen = true, onClose, onAdd }: Props) {
  const colors = useColors();
  const [qty, setQty] = useState(Math.max(1, initialQty));
  const [sizes, setSizes] = useState<MenuItemSize[]>([]);
  const [extrasList, setExtrasList] = useState<MenuItemExtra[]>([]);
  const [selectedSize, setSelectedSize] = useState<MenuItemSize | null>(null);
  const [selectedExtras, setSelectedExtras] = useState<Record<number, boolean>>({});
  const [loadingOptions, setLoadingOptions] = useState(false);

  const addPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible && item) {
      setQty(Math.max(1, initialQty));
      setSelectedSize(null);
      setSelectedExtras({});
      setLoadingOptions(true);
      Promise.all([listMenuItemSizes(item.id), listMenuItemExtras(item.id)])
        .then(([sz, ex]) => {
          const availableSizes = (sz || []).filter((s) => s.isAvailable !== false);
          const availableExtras = (ex || []).filter((e) => e.isAvailable !== false);
          setSizes(availableSizes);
          setExtrasList(availableExtras);
          if (availableSizes.length > 0) setSelectedSize(availableSizes[0]);
        })
        .catch(() => {
          setSizes([]);
          setExtrasList([]);
        })
        .finally(() => setLoadingOptions(false));
    }
  }, [visible, item?.id, initialQty]);

  // Pseudo-stable variation values per item id so info doesn't jump.
  const meta = useMemo(() => {
    const seed = item?.id ?? 1;
    const rating = (4.2 + ((seed * 13) % 7) * 0.1).toFixed(1);
    const reviews = 80 + ((seed * 17) % 320);
    const calories = 280 + ((seed * 23) % 420);
    const prep = 12 + ((seed * 7) % 18);
    return { rating, reviews, calories, prep };
  }, [item?.id]);

  if (!item) return null;

  const sizeAdjust = selectedSize ? selectedSize.priceAdjustment : 0;
  const extrasTotal = extrasList
    .filter((e) => selectedExtras[e.id])
    .reduce((s, e) => s + e.price, 0);
  const unitPrice = item.price + sizeAdjust + extrasTotal;
  const total = unitPrice * qty;

  const inc = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    setQty((q) => q + 1);
  };
  const dec = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    setQty((q) => Math.max(1, q - 1));
  };
  const handleAdd = () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.sequence([
      Animated.spring(addPulse, { toValue: 0.94, useNativeDriver: true, friction: 4 }),
      Animated.spring(addPulse, { toValue: 1, useNativeDriver: true, friction: 4 }),
    ]).start();
    const chosenExtras = extrasList.filter((e) => selectedExtras[e.id]);
    const selectedExtraIds = chosenExtras.map((e) => e.id).sort((a, b) => a - b);
    const selectedSizeId = selectedSize?.id ?? null;
    const cartLineId = `${item.id}:S${selectedSizeId ?? 0}:E${selectedExtraIds.join(",")}`;
    const sizeLabel = selectedSize ? ` (${selectedSize.name})` : "";
    const extrasLabel = chosenExtras.length ? ` + ${chosenExtras.map((e) => e.name).join(", ")}` : "";
    const displayName = `${item.name}${sizeLabel}${extrasLabel}`;
    onAdd({ qty, selectedSize, selectedSizeId, selectedExtras: chosenExtras, selectedExtraIds, unitPrice, displayName, cartLineId });
    onClose();
  };

  const toggleExtra = (id: number) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    setSelectedExtras((e) => ({ ...e, [id]: !e[id] }));
  };

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={onClose}>
      <ReAnimated.View entering={FadeIn.duration(180)} style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <ReAnimated.View entering={SlideInDown.duration(280)} style={[styles.sheet, { backgroundColor: colors.background }]}>
          <View style={styles.handleWrap}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            {/* Image with floating tags */}
            <View style={styles.imageWrap}>
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />
              ) : (
                <View style={[styles.imagePh, { backgroundColor: colors.muted }]}>
                  <Ionicons name="fast-food-outline" size={56} color={colors.mutedForeground} />
                </View>
              )}
              <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={10}>
                <Ionicons name="close" size={20} color="#0A1B3D" />
              </TouchableOpacity>

              <View style={styles.tagRow}>
                {DEFAULT_TAGS.slice(0, 2).map((t) => (
                  <View key={t.label} style={[styles.tagChip, { backgroundColor: t.color }]}>
                    <Text style={styles.tagEmoji}>{t.emoji}</Text>
                    <Text style={styles.tagText}>{t.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.body}>
              {/* Title row */}
              <View style={styles.titleRow}>
                <Text style={[styles.name, { color: colors.heading }]}>{item.name}</Text>
                <Text style={[styles.price, { color: colors.primary }]}>{item.price.toFixed(0)} MAD</Text>
              </View>

              {/* Meta row: rating · prep · calories */}
              <View style={styles.metaRow}>
                <View style={styles.metaChip}>
                  <Ionicons name="star" size={13} color="#FFC107" />
                  <Text style={[styles.metaText, { color: colors.heading }]}>{meta.rating}</Text>
                  <Text style={[styles.metaSub, { color: colors.mutedForeground }]}>({meta.reviews})</Text>
                </View>
                <View style={[styles.metaChip, { backgroundColor: "#E0F7F4" }]}>
                  <Ionicons name="time-outline" size={13} color="#00897B" />
                  <Text style={[styles.metaText, { color: "#00695C" }]}>{meta.prep} min</Text>
                </View>
                <View style={[styles.metaChip, { backgroundColor: "#FFEFD0" }]}>
                  <Ionicons name="flame-outline" size={13} color="#E65100" />
                  <Text style={[styles.metaText, { color: "#BF360C" }]}>{meta.calories} kcal</Text>
                </View>
              </View>

              {/* Description */}
              <Text style={[styles.desc, { color: colors.mutedForeground }]}>
                {item.description ??
                  "Préparé avec soin dans la cuisine du restaurant, livré chaud chez vous en quelques minutes. Une explosion de saveurs à chaque bouchée."}
              </Text>

              {loadingOptions && (
                <View style={{ alignItems: "center", paddingVertical: 12 }}>
                  <ActivityIndicator color={colors.primary} size="small" />
                </View>
              )}

              {/* Section: Taille */}
              {sizes.length > 0 && (
                <>
                  <SectionTitle label="Choisis ta taille" emoji="📏" colors={colors} />
                  <View style={styles.sizeRow}>
                    {sizes.map((s) => (
                      <Pressable
                        key={s.id}
                        onPress={() => {
                          if (Platform.OS !== "web") Haptics.selectionAsync();
                          setSelectedSize(s);
                        }}
                        style={[
                          styles.sizeChip,
                          { borderColor: colors.border, backgroundColor: colors.card },
                          selectedSize?.id === s.id && { borderColor: colors.primary, backgroundColor: "#FFE0EC" },
                        ]}
                      >
                        <Text style={[styles.sizeLabel, { color: selectedSize?.id === s.id ? colors.primary : colors.heading }]}>{s.name}</Text>
                        <Text style={[styles.sizeAdjust, { color: colors.mutedForeground }]}>
                          {s.priceAdjustment === 0 ? "Standard" : `${s.priceAdjustment > 0 ? "+" : ""}${s.priceAdjustment} MAD`}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}

              {/* Section: Suppléments */}
              {extrasList.length > 0 && (
                <>
                  <SectionTitle label="Suppléments" emoji="✨" colors={colors} />
                  {extrasList.map((ex) => {
                    const on = !!selectedExtras[ex.id];
                    return (
                      <Pressable
                        key={ex.id}
                        onPress={() => toggleExtra(ex.id)}
                        style={[
                          styles.extraRow,
                          { borderColor: colors.border, backgroundColor: colors.card },
                          on && { borderColor: colors.primary, backgroundColor: "#FFF5F8" },
                        ]}
                      >
                        <Text style={styles.extraEmoji}>✨</Text>
                        <Text style={[styles.extraLabel, { color: colors.heading }]}>{ex.name}</Text>
                        <Text style={[styles.extraPrice, { color: colors.mutedForeground }]}>{ex.price > 0 ? `+${ex.price} MAD` : ex.price < 0 ? `${ex.price} MAD` : "Inclus"}</Text>
                        <View style={[styles.checkbox, on && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                          {on ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
                        </View>
                      </Pressable>
                    );
                  })}
                </>
              )}

              {/* Section: Ingrédients */}
              <SectionTitle label="Ingrédients" emoji="🥗" colors={colors} />
              <View style={styles.chipWrap}>
                {DEFAULT_INGREDIENTS.map((ing) => (
                  <View key={ing} style={[styles.softChip, { backgroundColor: colors.muted }]}>
                    <Text style={[styles.softChipText, { color: colors.heading }]}>{ing}</Text>
                  </View>
                ))}
              </View>

              {/* Section: Allergènes */}
              <SectionTitle label="Allergènes" emoji="⚠️" colors={colors} />
              <View style={styles.chipWrap}>
                {DEFAULT_ALLERGENS.map((a) => (
                  <View key={a} style={[styles.allergenChip]}>
                    <Ionicons name="alert-circle" size={12} color="#B45309" />
                    <Text style={styles.allergenText}>{a}</Text>
                  </View>
                ))}
              </View>

              <View style={{ height: 16 }} />
            </View>
          </ScrollView>

          {/* Bottom action bar */}
          <View style={[styles.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
            {restaurantOpen ? (
              <>
                <View style={[styles.qtyBox, { backgroundColor: colors.muted }]}>
                  <TouchableOpacity onPress={dec} hitSlop={6} style={styles.qtyBtn}>
                    <Ionicons name="remove" size={20} color={colors.heading} />
                  </TouchableOpacity>
                  <Text style={[styles.qtyVal, { color: colors.heading }]}>{qty}</Text>
                  <TouchableOpacity onPress={inc} hitSlop={6} style={styles.qtyBtn}>
                    <Ionicons name="add" size={20} color={colors.heading} />
                  </TouchableOpacity>
                </View>

                <Animated.View style={{ flex: 1, transform: [{ scale: addPulse }] }}>
                  <TouchableOpacity
                    onPress={handleAdd}
                    activeOpacity={0.85}
                    style={[styles.addBtn, { backgroundColor: colors.primary }]}
                  >
                    <Text style={styles.addBtnText}>Ajouter au panier</Text>
                    <Text style={styles.addBtnPrice}>{total.toFixed(0)} MAD</Text>
                  </TouchableOpacity>
                </Animated.View>
              </>
            ) : (
              <View style={styles.closedBar}>
                <Ionicons name="lock-closed-outline" size={18} color="#6B7280" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.closedBarTitle}>Restaurant fermé</Text>
                  <Text style={styles.closedBarSub}>Commandes indisponibles pour le moment</Text>
                </View>
              </View>
            )}
          </View>
        </ReAnimated.View>
      </ReAnimated.View>
    </Modal>
  );
}

function SectionTitle({ label, emoji, colors }: { label: string; emoji: string; colors: any }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionEmoji}>{emoji}</Text>
      <Text style={[styles.sectionTitle, { color: colors.heading }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  sheet: {
    maxHeight: "92%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
  },
  handleWrap: { alignItems: "center", paddingTop: 8, paddingBottom: 4 },
  handle: { width: 44, height: 4, borderRadius: 2 },

  imageWrap: { width: "100%", height: 240, position: "relative" },
  image: { width: "100%", height: "100%" },
  imagePh: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  closeBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  tagRow: { position: "absolute", left: 12, bottom: 12, flexDirection: "row", gap: 6 },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#fff",
  },
  tagEmoji: { fontSize: 12 },
  tagText: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.2 },

  body: { paddingHorizontal: 20, paddingTop: 16, gap: 10 },
  titleRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12 },
  name: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.4, lineHeight: 28, flex: 1 },
  price: { fontSize: 20, fontFamily: "Inter_700Bold" },

  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: "#FFF8E1",
  },
  metaText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  metaSub: { fontSize: 11, fontFamily: "Inter_400Regular" },

  desc: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21, marginTop: 8 },

  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 18, marginBottom: 4 },
  sectionEmoji: { fontSize: 16 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold", letterSpacing: -0.2 },

  sizeRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  sizeChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 2,
  },
  sizeLabel: { fontSize: 18, fontFamily: "Inter_700Bold" },
  sizeAdjust: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },

  extraRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    marginTop: 8,
  },
  extraEmoji: { fontSize: 18 },
  extraLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  extraPrice: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },

  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  softChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  softChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  allergenChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  allergenText: { color: "#B45309", fontSize: 12, fontFamily: "Inter_600SemiBold" },

  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 28 : 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  qtyBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 30,
    paddingHorizontal: 6,
    height: 56,
    gap: 4,
  },
  qtyBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  qtyVal: { fontSize: 17, fontFamily: "Inter_700Bold", minWidth: 24, textAlign: "center" },

  addBtn: {
    height: 56,
    borderRadius: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    shadowColor: "#E2006A",
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  addBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  addBtnPrice: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold", opacity: 0.95 },

  closedBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  closedBarTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#374151" },
  closedBarSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#6B7280", marginTop: 1 },
});
