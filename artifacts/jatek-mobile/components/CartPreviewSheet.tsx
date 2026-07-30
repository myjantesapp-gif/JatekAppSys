import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useListMenuItems } from "@workspace/api-client-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";

const ADDON_KEYWORDS = [
  "boisson",
  "drink",
  "soda",
  "jus",
  "juice",
  "eau",
  "water",
  "dessert",
  "sweet",
  "patisserie",
  "pâtisserie",
  "gateau",
  "gâteau",
  "ice",
  "glace",
  "side",
  "accompagnement",
  "accompagnements",
  "entree",
  "entrée",
  "snack",
  "frites",
  "sauce",
  "extra",
  "supplement",
  "supplément",
];

function isAddonCategory(category?: string | null): boolean {
  if (!category) return false;
  const lc = category.toLowerCase();
  return ADDON_KEYWORDS.some((kw) => lc.includes(kw));
}

const PINK = "#E2006A";
const PINK_SOFT = "#FFE0EE";
const NAVY = "#0A1B3D";
const YELLOW = "#FFD400";
const MUTED = "#6B7280";
const BORDER = "#EBEBEB";

const { height: SCREEN_H } = Dimensions.get("window");
const SHEET_MAX_H = Math.min(SCREEN_H * 0.78, 640);

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function CartPreviewSheet({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const {
    items,
    restaurantId,
    restaurantName,
    subtotal,
    itemCount,
    deliveryFee,
    freeDeliveryThreshold,
    updateQuantity,
    clearCart,
    addItem,
    appliedCoupon,
    itemsDiscount,
    freeDeliveryCoupon,
    applyCoupon,
    removeCoupon,
    notes,
    setNotes,
  } = useCart();
  const { user } = useAuth();

  const { data: menuItems } = useListMenuItems(
    restaurantId ?? 0,
    undefined,
    { query: { enabled: !!restaurantId && visible && items.length > 0 } as any },
  );

  const suggestions = React.useMemo(() => {
    if (!menuItems || !Array.isArray(menuItems) || items.length === 0) return [];
    const inCart = new Set(items.map((it) => it.menuItemId));
    const all = (menuItems as any[]).filter((m) => {
      if (!m || typeof m.id !== "number") return false;
      if (inCart.has(m.id)) return false;
      if (m.isAvailable === false) return false;
      return true;
    });
    const addons = all.filter((m) => isAddonCategory(m.category));
    const pool = addons.length >= 3 ? addons : [...addons, ...all.filter((m) => !addons.includes(m))];
    return pool.slice(0, 6);
  }, [menuItems, items]);

  const slideY = useRef(new Animated.Value(SHEET_MAX_H)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoOpen, setPromoOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);

  useEffect(() => {
    if (!visible) {
      setPromoInput("");
      setPromoError(null);
      setPromoOpen(false);
      setNotesOpen(false);
    }
  }, [visible]);

  useEffect(() => {
    if (visible && notes.trim().length > 0) setNotesOpen(true);
  }, [visible, notes]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(slideY, {
          toValue: 0,
          duration: 320,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(slideY, {
          toValue: SHEET_MAX_H,
          duration: 220,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, overlayOpacity, slideY]);

  const baseDeliveryFee =
    subtotal > 0 && subtotal >= freeDeliveryThreshold ? 0 : deliveryFee;
  const effectiveDeliveryFee = freeDeliveryCoupon ? 0 : baseDeliveryFee;
  const discountedSubtotal = Math.max(0, subtotal - itemsDiscount);
  const total =
    subtotal > 0 ? discountedSubtotal + effectiveDeliveryFee : 0;
  const remainingForFree = Math.max(0, freeDeliveryThreshold - subtotal);
  const progressPct =
    subtotal <= 0
      ? 0
      : Math.min(100, Math.round((subtotal / freeDeliveryThreshold) * 100));

  const handleApplyPromo = () => {
    const code = promoInput.trim();
    if (!code) {
      setPromoError("Saisissez un code.");
      return;
    }
    const res = applyCoupon(code, { loyaltyPoints: user?.loyaltyPoints ?? 0 });
    if (!res.ok) {
      setPromoError(res.reason);
      return;
    }
    setPromoError(null);
    setPromoInput("");
    setPromoOpen(false);
  };

  const handleRemovePromo = () => {
    removeCoupon();
    setPromoError(null);
  };

  const handleAddSuggestion = (m: any) => {
    if (!restaurantId) return;
    addItem(
      restaurantId,
      restaurantName || "",
      {
        cartLineId: String(m.id),
        menuItemId: m.id,
        name: m.name,
        price: Number(m.price) || 0,
        imageUrl: m.imageUrl,
      },
    );
  };

  const goToCart = () => {
    onClose();
    setTimeout(() => router.push("/cart"), 150);
  };

  const handleClear = () => {
    clearCart();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              maxHeight: SHEET_MAX_H,
              paddingBottom: insets.bottom + 16,
              transform: [{ translateY: slideY }],
            },
          ]}
        >
          <View style={styles.handleBar} />

          <View style={styles.header}>
            <View style={styles.headerIconWrap}>
              <Ionicons name="bag-handle" size={20} color={PINK} />
              {itemCount > 0 && (
                <View style={styles.headerBadge}>
                  <Text style={styles.headerBadgeTxt}>
                    {itemCount > 9 ? "9+" : itemCount}
                  </Text>
                </View>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Mon panier</Text>
              {restaurantName ? (
                <Text style={styles.subtitle} numberOfLines={1}>
                  {restaurantName}
                </Text>
              ) : (
                <Text style={styles.subtitle}>
                  {items.length === 0 ? "Vide pour le moment" : "Aperçu rapide"}
                </Text>
              )}
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={10}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Fermer"
            >
              <Ionicons name="close" size={22} color={NAVY} />
            </TouchableOpacity>
          </View>

          {items.length === 0 ? (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIcon}>
                <Ionicons name="bag-handle-outline" size={42} color={PINK} />
              </View>
              <Text style={styles.emptyTitle}>Votre panier est vide</Text>
              <Text style={styles.emptyTxt}>
                Parcourez les restaurants et ajoutez vos plats préférés.
              </Text>
              <TouchableOpacity
                style={styles.browseBtn}
                onPress={onClose}
                activeOpacity={0.9}
              >
                <Text style={styles.browseBtnTxt}>Découvrir les offres</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {freeDeliveryThreshold > 0 && (
                <View style={styles.freeWrap}>
                  <View style={styles.freeRow}>
                    <Ionicons
                      name={remainingForFree === 0 ? "checkmark-circle" : "bicycle"}
                      size={16}
                      color={remainingForFree === 0 ? "#16A34A" : PINK}
                    />
                    <Text style={styles.freeTxt}>
                      {remainingForFree === 0
                        ? "Livraison offerte !"
                        : `Plus que ${remainingForFree.toFixed(2)} MAD pour la livraison gratuite`}
                    </Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View
                      style={[styles.progressFill, { width: `${progressPct}%` }]}
                    />
                  </View>
                </View>
              )}

              <ScrollView
                style={styles.list}
                contentContainerStyle={{ paddingVertical: 4 }}
                showsVerticalScrollIndicator={false}
              >
                {items.map((it) => (
                  <View key={it.cartLineId} style={styles.row}>
                    {it.imageUrl ? (
                      <Image source={{ uri: it.imageUrl }} style={styles.thumb} />
                    ) : (
                      <View style={[styles.thumb, styles.thumbFallback]}>
                        <Ionicons name="restaurant" size={20} color={PINK} />
                      </View>
                    )}

                    <View style={styles.rowInfo}>
                      <Text style={styles.rowName} numberOfLines={2}>
                        {it.name}
                      </Text>
                      <Text style={styles.rowPrice}>
                        {(it.price * it.quantity).toFixed(2)} MAD
                      </Text>
                    </View>

                    <View style={styles.qtyWrap}>
                      <TouchableOpacity
                        onPress={() =>
                          updateQuantity(it.cartLineId, it.quantity - 1)
                        }
                        style={styles.qtyBtn}
                        hitSlop={6}
                        activeOpacity={0.6}
                        accessibilityLabel="Diminuer la quantité"
                      >
                        <Ionicons
                          name={it.quantity === 1 ? "trash-outline" : "remove"}
                          size={16}
                          color={PINK}
                        />
                      </TouchableOpacity>
                      <Text style={styles.qtyTxt}>{it.quantity}</Text>
                      <TouchableOpacity
                        onPress={() =>
                          updateQuantity(it.cartLineId, it.quantity + 1)
                        }
                        style={styles.qtyBtn}
                        hitSlop={6}
                        accessibilityLabel="Augmenter la quantité"
                      >
                        <Ionicons name="add" size={16} color={PINK} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>

              {suggestions.length > 0 && (
                <View style={styles.suggestBlock}>
                  <Text style={styles.suggestTitle}>Ajoutez quelque chose ?</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingRight: 4, gap: 10 }}
                  >
                    {suggestions.map((m: any) => (
                      <View key={m.id} style={styles.suggestCard}>
                        {m.imageUrl ? (
                          <Image source={{ uri: m.imageUrl }} style={styles.suggestImg} />
                        ) : (
                          <View style={[styles.suggestImg, styles.suggestImgFallback]}>
                            <Ionicons name="restaurant" size={20} color={PINK} />
                          </View>
                        )}
                        <Text style={styles.suggestName} numberOfLines={2}>
                          {m.name}
                        </Text>
                        <View style={styles.suggestFoot}>
                          <Text style={styles.suggestPrice}>
                            {Number(m.price).toFixed(2)} MAD
                          </Text>
                          <TouchableOpacity
                            onPress={() => handleAddSuggestion(m)}
                            style={styles.suggestAdd}
                            activeOpacity={0.85}
                            accessibilityLabel={`Ajouter ${m.name}`}
                          >
                            <Ionicons name="add" size={16} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              <View style={styles.notesBlock}>
                {notesOpen ? (
                  <View style={styles.notesInputWrap}>
                    <View style={styles.notesHead}>
                      <Ionicons name="chatbubble-ellipses-outline" size={16} color={PINK} />
                      <Text style={styles.notesLabel}>Note pour le restaurant</Text>
                      {notes.length > 0 && (
                        <TouchableOpacity
                          onPress={() => setNotes("")}
                          hitSlop={8}
                          accessibilityLabel="Effacer la note"
                        >
                          <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                        </TouchableOpacity>
                      )}
                    </View>
                    <TextInput
                      value={notes}
                      onChangeText={setNotes}
                      placeholder="Ex. sans oignon, bien cuit, sonnez à l'interphone…"
                      placeholderTextColor="#9CA3AF"
                      multiline
                      maxLength={240}
                      style={styles.notesInput}
                      textAlignVertical="top"
                    />
                    <Text style={styles.notesCounter}>{notes.length}/240</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => setNotesOpen(true)}
                    activeOpacity={0.8}
                    style={styles.notesTriggerRow}
                  >
                    <Ionicons name="chatbubble-ellipses-outline" size={16} color={PINK} />
                    <Text style={styles.notesTriggerTxt}>
                      Ajouter une note (allergies, cuisson…)
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.promoBlock}>
                {appliedCoupon ? (
                  <View style={styles.promoApplied}>
                    <View style={styles.promoAppliedIcon}>
                      <Ionicons name="pricetag" size={14} color="#16A34A" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.promoAppliedCode}>
                        {appliedCoupon.code}
                      </Text>
                      <Text style={styles.promoAppliedLabel} numberOfLines={1}>
                        {appliedCoupon.label}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={handleRemovePromo}
                      hitSlop={8}
                      style={styles.promoRemove}
                      accessibilityLabel="Retirer le code"
                    >
                      <Ionicons name="close" size={16} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                ) : promoOpen ? (
                  <View>
                    <View style={styles.promoInputRow}>
                      <Ionicons
                        name="pricetag-outline"
                        size={16}
                        color={PINK}
                        style={{ marginLeft: 12 }}
                      />
                      <TextInput
                        value={promoInput}
                        onChangeText={(v) => {
                          setPromoInput(v.toUpperCase());
                          if (promoError) setPromoError(null);
                        }}
                        onSubmitEditing={handleApplyPromo}
                        placeholder="Code promo"
                        placeholderTextColor="#9CA3AF"
                        autoCapitalize="characters"
                        autoCorrect={false}
                        returnKeyType="done"
                        style={styles.promoInput}
                      />
                      <TouchableOpacity
                        onPress={handleApplyPromo}
                        style={styles.promoApplyBtn}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.promoApplyTxt}>Appliquer</Text>
                      </TouchableOpacity>
                    </View>
                    {promoError ? (
                      <Text style={styles.promoErrorTxt}>{promoError}</Text>
                    ) : (
                      <Text style={styles.promoHintTxt}>
                        Essayez « WELCOME10 » ou « FREESHIP »
                      </Text>
                    )}
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => setPromoOpen(true)}
                    activeOpacity={0.8}
                    style={styles.promoTriggerRow}
                  >
                    <Ionicons name="pricetag-outline" size={16} color={PINK} />
                    <Text style={styles.promoTriggerTxt}>
                      J'ai un code promo
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.summary}>
                <View style={styles.sumRow}>
                  <Text style={styles.sumLabel}>Sous-total</Text>
                  <Text style={styles.sumVal}>{subtotal.toFixed(2)} MAD</Text>
                </View>
                {itemsDiscount > 0 && (
                  <View style={styles.sumRow}>
                    <Text style={[styles.sumLabel, { color: "#16A34A" }]}>
                      Réduction ({appliedCoupon?.code})
                    </Text>
                    <Text style={[styles.sumVal, { color: "#16A34A" }]}>
                      −{itemsDiscount.toFixed(2)} MAD
                    </Text>
                  </View>
                )}
                <View style={styles.sumRow}>
                  <Text style={styles.sumLabel}>Livraison</Text>
                  <Text
                    style={[
                      styles.sumVal,
                      effectiveDeliveryFee === 0 && { color: "#16A34A" },
                    ]}
                  >
                    {effectiveDeliveryFee === 0
                      ? "Offerte"
                      : `${effectiveDeliveryFee.toFixed(2)} MAD`}
                  </Text>
                </View>
                <View style={[styles.sumRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalVal}>{total.toFixed(2)} MAD</Text>
                </View>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity
                  onPress={handleClear}
                  style={styles.clearBtn}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Vider le panier"
                >
                  <Ionicons name="trash-outline" size={18} color={PINK} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={goToCart}
                  style={styles.checkoutBtn}
                  activeOpacity={0.9}
                  accessibilityRole="button"
                  accessibilityLabel="Aller au panier"
                >
                  <Text style={styles.checkoutTxt}>Voir le panier</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(10,27,61,0.45)" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 8,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -6 },
    elevation: 24,
  },
  handleBar: {
    alignSelf: "center",
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    marginBottom: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  headerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PINK_SOFT,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: YELLOW,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  headerBadgeTxt: {
    color: NAVY,
    fontSize: 10,
    fontFamily: Platform.select({ default: "Inter_700Bold" }),
    fontWeight: "700",
    lineHeight: 12,
  },
  title: {
    color: NAVY,
    fontSize: 16,
    fontFamily: Platform.select({ default: "Inter_700Bold" }),
    fontWeight: "700",
  },
  subtitle: { color: MUTED, fontSize: 12, marginTop: 2 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F5F5",
  },

  emptyWrap: { alignItems: "center", paddingVertical: 36, gap: 10 },
  emptyIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: PINK_SOFT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    color: NAVY,
    fontSize: 16,
    fontFamily: Platform.select({ default: "Inter_700Bold" }),
    fontWeight: "700",
  },
  emptyTxt: {
    color: MUTED,
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  browseBtn: {
    marginTop: 8,
    backgroundColor: PINK,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 24,
  },
  browseBtnTxt: { color: "#fff", fontSize: 14, fontWeight: "700" },

  freeWrap: { paddingVertical: 12, gap: 6 },
  freeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  freeTxt: { color: NAVY, fontSize: 12, fontWeight: "600", flex: 1 },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#F3F4F6",
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: PINK, borderRadius: 3 },

  list: { flexGrow: 0 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  thumb: { width: 52, height: 52, borderRadius: 12, backgroundColor: "#F5F5F5" },
  thumbFallback: { alignItems: "center", justifyContent: "center" },
  rowInfo: { flex: 1, gap: 2 },
  rowName: { color: NAVY, fontSize: 14, fontWeight: "600" },
  rowPrice: { color: PINK, fontSize: 13, fontWeight: "700" },
  qtyWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PINK_SOFT,
    borderRadius: 18,
    paddingHorizontal: 4,
    paddingVertical: 3,
    gap: 4,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyTxt: { color: NAVY, fontSize: 13, fontWeight: "700", minWidth: 16, textAlign: "center" },

  suggestBlock: {
    paddingTop: 12,
    paddingBottom: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER,
  },
  suggestTitle: {
    color: NAVY,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },
  suggestCard: {
    width: 124,
    backgroundColor: "#FAFAFA",
    borderRadius: 14,
    padding: 8,
    borderWidth: 1,
    borderColor: BORDER,
  },
  suggestImg: {
    width: "100%",
    height: 64,
    borderRadius: 10,
    backgroundColor: "#F0F0F0",
  },
  suggestImgFallback: { alignItems: "center", justifyContent: "center" },
  suggestName: {
    color: NAVY,
    fontSize: 11.5,
    fontWeight: "600",
    marginTop: 6,
    minHeight: 30,
  },
  suggestFoot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  suggestPrice: {
    color: PINK,
    fontSize: 12,
    fontWeight: "800",
  },
  suggestAdd: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: PINK,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: PINK,
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  notesBlock: {
    paddingTop: 10,
    paddingBottom: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER,
  },
  notesTriggerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  notesTriggerTxt: {
    flex: 1,
    color: NAVY,
    fontSize: 13,
    fontWeight: "600",
  },
  notesInputWrap: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    borderWidth: 1,
    borderColor: "#EDEDED",
  },
  notesHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingBottom: 4,
  },
  notesLabel: {
    flex: 1,
    color: NAVY,
    fontSize: 12,
    fontWeight: "700",
  },
  notesInput: {
    color: NAVY,
    fontSize: 13,
    minHeight: 48,
    paddingTop: Platform.OS === "ios" ? 4 : 0,
    paddingBottom: 4,
  },
  notesCounter: {
    color: "#9CA3AF",
    fontSize: 10,
    textAlign: "right",
  },

  promoBlock: {
    paddingTop: 10,
    paddingBottom: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER,
  },
  promoTriggerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  promoTriggerTxt: {
    flex: 1,
    color: NAVY,
    fontSize: 13,
    fontWeight: "600",
  },
  promoInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 24,
    paddingRight: 4,
    paddingVertical: 4,
  },
  promoInput: {
    flex: 1,
    color: NAVY,
    fontSize: 14,
    fontWeight: "600",
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
    letterSpacing: 0.5,
  },
  promoApplyBtn: {
    backgroundColor: PINK,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
  },
  promoApplyTxt: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  promoHintTxt: {
    color: MUTED,
    fontSize: 11,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  promoErrorTxt: {
    color: "#DC2626",
    fontSize: 11,
    marginTop: 6,
    paddingHorizontal: 4,
    fontWeight: "600",
  },
  promoApplied: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#E8F8EE",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#BBE5C8",
  },
  promoAppliedIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  promoAppliedCode: {
    color: "#0F5132",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  promoAppliedLabel: {
    color: "#1F7A45",
    fontSize: 11,
    marginTop: 1,
  },
  promoRemove: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },

  summary: {
    paddingVertical: 12,
    gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER,
  },
  sumRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sumLabel: { color: MUTED, fontSize: 13 },
  sumVal: { color: NAVY, fontSize: 13, fontWeight: "600" },
  totalRow: { marginTop: 4 },
  totalLabel: { color: NAVY, fontSize: 15, fontWeight: "700" },
  totalVal: { color: PINK, fontSize: 18, fontWeight: "800" },

  actions: { flexDirection: "row", gap: 10, marginTop: 8 },
  clearBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: PINK_SOFT,
    alignItems: "center",
    justifyContent: "center",
  },
  checkoutBtn: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    backgroundColor: PINK,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    shadowColor: PINK,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  checkoutTxt: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
