import React, { useRef, useState } from "react";
import {
  StyleSheet, Text, View, TouchableOpacity, Pressable, Animated,
  TextInput, ActivityIndicator, Platform,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useCreateOrder } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useT } from "@/contexts/LanguageContext";
import { useFriendlyAlert } from "@/components/FriendlyAlert";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { WaveEdge } from "@/components/WaveEdge";

const PINK = "#E91E63";

type PaymentMethodId = "cash" | "card";
interface PaymentMethodOption {
  id: PaymentMethodId;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
}
const PAYMENT_METHODS: PaymentMethodOption[] = [
  { id: "cash", label: "Espèces", icon: "cash-outline" },
  { id: "card", label: "Carte", icon: "card-outline" },
];

export default function CartScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { items, restaurantId, restaurantName, updateQuantity, clearCart, subtotal, itemCount, selectedAddress, selectedAddressInZone, deliveryFee, freeDeliveryThreshold, appliedCoupon, itemsDiscount, freeDeliveryCoupon, removeCoupon, notes, setNotes } = useCart();
  const baseDeliveryFee = subtotal >= freeDeliveryThreshold ? 0 : deliveryFee;
  const effectiveDeliveryFee = freeDeliveryCoupon ? 0 : baseDeliveryFee;
  const discountedSubtotal = Math.max(0, subtotal - itemsDiscount);
  const orderTotal = discountedSubtotal + effectiveDeliveryFee;
  const { token } = useAuth();
  const createOrder = useCreateOrder();
  const friendly = useFriendlyAlert();
  const address = selectedAddress;
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | null>(null);

  const handlePlaceOrder = () => {
    if (!token) {
      friendly.show({
        tone: "info",
        icon: "log-in-outline",
        title: "Vous y êtes presque !",
        message: "Connectez-vous pour valider votre commande et profiter de vos points fidélité.",
        primary: { label: "Se connecter", href: "/(auth)/login" },
        secondary: { label: "Plus tard" },
      });
      return;
    }
    if (!restaurantId) {
      friendly.show({
        tone: "error",
        icon: "alert-circle-outline",
        title: "Panier invalide",
        message: "Votre panier ne contient pas de restaurant valide. Videz le panier et recommencez.",
        primary: { label: "Vider le panier", onPress: () => clearCart() },
        secondary: { label: "Retour" },
      });
      return;
    }
    if (!paymentMethod) {
      friendly.show({
        tone: "warning",
        icon: "card-outline",
        title: "Comment souhaitez-vous payer ?",
        message: "Choisissez « Espèces » ou « Carte » juste au-dessus du bouton, puis revalidez.",
        primary: { label: "Compris" },
        hideSecondary: true,
      });
      return;
    }
    if (!address.trim()) {
      friendly.show({
        tone: "warning",
        icon: "location-outline",
        title: "Où vous livrons-nous ?",
        message: "Ajoutez une adresse pour qu'on puisse vous apporter votre commande à Oujda.",
        primary: { label: "Choisir une adresse", href: "/profile/addresses?select=1" },
        secondary: { label: "Plus tard" },
      });
      return;
    }
    if (!selectedAddressInZone) {
      friendly.show({
        tone: "error",
        icon: "alert-circle-outline",
        title: "Adresse hors zone de livraison",
        message: "Cette adresse est trop loin pour le moment. Sélectionnez-en une à Oujda et on s'occupe du reste.",
        primary: { label: "Changer d'adresse", href: "/profile/addresses?select=1" },
        secondary: { label: "Annuler" },
      });
      return;
    }
    const couponNote = appliedCoupon
      ? `Code promo : ${appliedCoupon.code} (${appliedCoupon.label})`
      : "";
    const combinedNotes = [notes.trim(), couponNote].filter(Boolean).join(" — ");
    createOrder.mutate({
      data: {
        restaurantId: restaurantId!,
        deliveryAddress: address.trim(),
        notes: combinedNotes || undefined,
        paymentMethod: paymentMethod ?? "cash",
        items: items.map((i) => ({
          menuItemId: i.menuItemId,
          quantity: i.quantity,
          selectedSizeId: i.selectedSizeId,
          selectedExtraIds: i.selectedExtraIds,
        })),
      },
    }, {
      onSuccess: (order) => {
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        clearCart();
        router.replace({ pathname: "/order/[id]", params: { id: String(order.id) } });
      },
      onError: (err: any) => {
        const status = err?.status ?? err?.response?.status;
        const apiMsg = err?.data?.error || err?.message || "";
        // Restaurant unavailable / closed
        if (status === 404 && /restaurant/i.test(apiMsg)) {
          friendly.show({
            tone: "warning",
            icon: "restaurant-outline",
            title: "Restaurant indisponible",
            message: "Ce restaurant n'est plus disponible. Découvrez d'autres bonnes adresses près de chez vous.",
            primary: { label: "Voir les restaurants", href: "/(tabs)" },
            secondary: { label: "Retour" },
          });
          return;
        }
        // Menu item missing — usually a stale cart from before a menu change
        if (status === 404 && /menu/i.test(apiMsg)) {
          friendly.show({
            tone: "warning",
            icon: "fast-food-outline",
            title: "Plat momentanément indisponible",
            message: "Un article de votre panier n'est plus au menu. Videz le panier et recommandez en quelques secondes.",
            primary: { label: "Vider le panier", onPress: () => clearCart() },
            secondary: { label: "Plus tard" },
          });
          return;
        }
        // Auth expired
        if (status === 401 || status === 403) {
          friendly.show({
            tone: "info",
            icon: "key-outline",
            title: "Session expirée",
            message: "Pour votre sécurité, reconnectez-vous afin de finaliser votre commande.",
            primary: { label: "Se reconnecter", href: "/(auth)/login" },
            secondary: { label: "Plus tard" },
          });
          return;
        }
        // Validation error
        if (status === 400) {
          friendly.show({
            tone: "warning",
            icon: "document-text-outline",
            title: "Vérifions un détail",
            message: "Une information est incomplète ou incorrecte. Vérifiez votre panier puis réessayez.",
            primary: { label: "OK" },
            hideSecondary: true,
          });
          return;
        }
        // Generic
        friendly.show({
          tone: "error",
          icon: "cloud-offline-outline",
          title: "Oups, on n'a pas pu envoyer la commande",
          message: "Vérifiez votre connexion et réessayez. Si le problème persiste, contactez-nous.",
          primary: { label: "Réessayer", onPress: handlePlaceOrder },
          secondary: { label: "Plus tard" },
        });
      },
    });
  };

  if (itemCount === 0) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <CartHeader title={t("cart_title")} insetsTop={insets.top} onBack={() => router.back()} />
        <View style={styles.center}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.primary + "12" }]}>
            <Ionicons name="bag-outline" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{t("cart_empty_title")}</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{t("cart_empty_text")}</Text>
          <TouchableOpacity
            style={[styles.browseBtn, { backgroundColor: PINK }]}
            onPress={() => router.push("/(tabs)")}
          >
            <Text style={styles.browseBtnText}>{t("cart_browse")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const orderDisabled = createOrder.isPending || (!!address && !selectedAddressInZone);

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <CartHeader title={t("cart_title")} insetsTop={insets.top} onBack={() => router.back()} right={(
        <TouchableOpacity onPress={() => {
          friendly.show({
            tone: "warning",
            icon: "trash-outline",
            title: t("cart_clear_q"),
            message: t("cart_clear_text"),
            primary: { label: t("cart_clear"), onPress: clearCart },
            secondary: { label: t("cancel") },
          });
        }}>
          <Ionicons name="trash-outline" size={22} color="#fff" />
        </TouchableOpacity>
      )} />

      <KeyboardAwareScrollView
        style={styles.flex}
        contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 120 }}
        bottomOffset={120}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Restaurant name */}
        <Text style={[styles.fromText, { color: colors.mutedForeground }]}>{t("cart_from", { name: restaurantName ?? "" })}</Text>

        {/* Promo banner */}
        <View style={[styles.promo, { backgroundColor: colors.yellow }]}>
          <Text style={styles.promoEmoji}>🎉</Text>
          <Text style={[styles.promoText, { color: colors.yellowForeground }]} numberOfLines={2}>
            Code <Text style={{ fontFamily: "Inter_700Bold" }}>JATEK10</Text> — 1ère commande livrée
          </Text>
        </View>

        {/* Items */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {items.map((item, idx) => (
            <View key={item.cartLineId}>
              <View style={styles.cartItem}>
                <View style={styles.cartItemInfo}>
                  <Text style={[styles.cartItemName, { color: colors.foreground }]} numberOfLines={2}>{item.name}</Text>
                  {(item.selectedSize || (item.selectedExtras && item.selectedExtras.length > 0)) && (
                    <Text style={[styles.cartItemOptions, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {[
                        item.selectedSize,
                        ...(item.selectedExtras || []),
                      ].filter(Boolean).join(" · ")}
                    </Text>
                  )}
                  <Text style={[styles.cartItemPrice, { color: colors.primary }]}>{t("cart_each", { price: item.price.toFixed(0) })}</Text>
                </View>
                <View style={styles.qtyRow}>
                  <TouchableOpacity
                    onPress={() => updateQuantity(item.cartLineId, item.quantity - 1)}
                    style={[styles.qtyBtn, styles.qtyBtnSoft]}
                    activeOpacity={0.6}
                  >
                    <Ionicons
                      name={item.quantity === 1 ? "trash-outline" : "remove"}
                      size={16}
                      color={item.quantity === 1 ? colors.destructive : colors.foreground}
                    />
                  </TouchableOpacity>
                  <Text style={[styles.qty, { color: colors.foreground }]}>{item.quantity}</Text>
                  <TouchableOpacity
                    onPress={() => updateQuantity(item.cartLineId, item.quantity + 1)}
                    style={[styles.qtyBtn, { backgroundColor: PINK }]}
                  >
                    <Ionicons name="add" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.cartItemTotal, { color: colors.foreground }]}>
                  {(item.price * item.quantity).toFixed(0)} MAD
                </Text>
              </View>
              {idx < items.length - 1 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
            </View>
          ))}
        </View>

        {/* Delivery address — tap to choose from saved addresses */}
        <Text style={[styles.sectionLabel, { color: colors.foreground }]}>{t("cart_delivery_address")}</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push("/profile/addresses?select=1")}
          style={[styles.addressCard, { backgroundColor: colors.card, borderColor: address ? colors.primary + "40" : colors.border }]}
        >
          <View style={[styles.addressIcon, { backgroundColor: colors.primary + "15" }]}>
            <Ionicons name="location" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.addressTitle, { color: colors.foreground }]}>{address ? t("cart_deliver_to") : t("cart_choose_address")}</Text>
            <Text style={[styles.addressValue, { color: address ? colors.foreground : colors.mutedForeground }]} numberOfLines={3}>
              {address || t("cart_choose_address_hint")}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
        </TouchableOpacity>

        {/* Payment method */}
        <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Méthode de paiement</Text>
        <View style={[styles.paymentRow, { marginHorizontal: 16, marginBottom: 16, gap: 10 }]}>
          {PAYMENT_METHODS.map((method) => {
            const selected = paymentMethod === method.id;
            return (
              <TouchableOpacity
                key={method.id}
                onPress={() => setPaymentMethod(method.id)}
                style={[
                  styles.paymentOption,
                  {
                    backgroundColor: selected ? "#FFE3EF" : colors.card,
                    borderColor: selected ? PINK : colors.border,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Ionicons name={method.icon} size={22} color={selected ? PINK : colors.mutedForeground} />
                <Text style={[styles.paymentLabel, { color: selected ? PINK : colors.foreground }]}>
                  {method.label}
                </Text>
                {selected && <Ionicons name="checkmark-circle" size={18} color={PINK} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Notes */}
        <Text style={[styles.sectionLabel, { color: colors.foreground }]}>{t("cart_notes")}</Text>
        <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="chatbubble-outline" size={18} color={colors.mutedForeground} />
          <TextInput
            style={[styles.notesInput, { color: colors.foreground }]}
            placeholder={t("cart_notes_placeholder")}
            placeholderTextColor={colors.mutedForeground}
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        </View>

        {/* Free-delivery threshold */}
        {(() => {
          const remaining = freeDeliveryThreshold - subtotal;
          const reached = remaining <= 0;
          const progress = Math.min(1, subtotal / freeDeliveryThreshold);
          return (
            <View style={[styles.freeDelivery, { backgroundColor: colors.turquoiseSoft }]}>
              <View style={styles.freeDeliveryRow}>
                <Ionicons name={reached ? "checkmark-circle" : "bicycle"} size={18} color={colors.turquoise} />
                <Text style={[styles.freeDeliveryText, { color: colors.turquoise }]} numberOfLines={2}>
                  {reached
                    ? "Livraison gratuite débloquée 🎉"
                    : `Plus que ${remaining.toFixed(0)} MAD pour la livraison gratuite`}
                </Text>
              </View>
              <View style={[styles.freeDeliveryBarTrack, { backgroundColor: "rgba(0,194,199,0.2)" }]}>
                <View style={[styles.freeDeliveryBarFill, { backgroundColor: colors.turquoise, width: `${progress * 100}%` }]} />
              </View>
            </View>
          );
        })()}

        {/* Summary */}
        <View style={[styles.summary, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.summaryTitle, { color: colors.foreground }]}>{t("cart_summary")}</Text>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{t("cart_subtotal")}</Text>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>{subtotal.toFixed(0)} MAD</Text>
          </View>
          {appliedCoupon && (
            <View style={styles.summaryRow}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
                <Ionicons name="pricetag" size={13} color="#16A34A" />
                <Text
                  style={[styles.summaryLabel, { color: "#16A34A", fontFamily: "Inter_700Bold" }]}
                  numberOfLines={1}
                >
                  Code {appliedCoupon.code}
                </Text>
                <TouchableOpacity onPress={removeCoupon} hitSlop={8}>
                  <Ionicons name="close-circle" size={14} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.summaryValue, { color: "#16A34A", fontFamily: "Inter_700Bold" }]}>
                {itemsDiscount > 0 ? `−${itemsDiscount.toFixed(0)} MAD` : "Livraison offerte"}
              </Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{t("cart_delivery_fee")}</Text>
            <Text style={[styles.summaryValue, { color: colors.turquoise, fontFamily: "Inter_700Bold" }]}>
              {effectiveDeliveryFee === 0 ? "Offerte" : `${effectiveDeliveryFee} MAD`}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryRow}>
            <Text style={[styles.totalLabel, { color: colors.foreground }]}>{t("cart_total")}</Text>
            <Text style={[styles.totalValue, { color: colors.primary }]}>{orderTotal.toFixed(0)} MAD</Text>
          </View>
        </View>
      </KeyboardAwareScrollView>

      {/* Place order button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 16), borderTopColor: colors.border }]}>
        {!!address && !selectedAddressInZone && (
          <View style={styles.zoneBlocker}>
            <Ionicons name="warning" size={14} color="#DC2626" />
            <Text style={styles.zoneBlockerText}>{t("cart_address_out_of_zone_short")}</Text>
          </View>
        )}
        <ComicsCheckoutButton
          disabled={orderDisabled}
          loading={createOrder.isPending}
          label={!!address && !selectedAddressInZone ? t("cart_address_out_zone_btn") : t("cart_place_order")}
          price={`${orderTotal.toFixed(0)} MAD`}
          color={PINK}
          mutedColor={colors.muted}
          mutedFg={colors.mutedForeground}
          onPress={handlePlaceOrder}
        />
      </View>
    </View>
  );
}

function CartHeader({
  title,
  insetsTop,
  onBack,
  right,
}: {
  title: string;
  insetsTop: number;
  onBack: () => void;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.headerWrap}>
      <View style={[styles.header, { paddingTop: insetsTop + (Platform.OS === "web" ? 67 : 16) + 8 }]}>
        <TouchableOpacity onPress={onBack} style={styles.headerIcon}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.headerIcon}>{right ?? null}</View>
      </View>
      <WaveEdge color={PINK} height={28} />
    </View>
  );
}

// Light checkout button matching the Home cards/buttons.
function ComicsCheckoutButton({
  disabled,
  loading,
  label,
  price,
  color,
  mutedColor,
  mutedFg,
  onPress,
}: {
  disabled: boolean;
  loading: boolean;
  label: string;
  price: string;
  color: string;
  mutedColor: string;
  mutedFg: string;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const rot = useRef(new Animated.Value(-1)).current;

  const onIn = () => {
    if (disabled) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.spring(scale, { toValue: 0.93, useNativeDriver: true, friction: 5, tension: 200 }).start();
    Animated.spring(rot, { toValue: 0, useNativeDriver: true, friction: 4 }).start();
  };
  const onOut = () => {
    if (disabled) return;
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 3, tension: 240 }).start();
    Animated.spring(rot, { toValue: -1, useNativeDriver: true, friction: 4 }).start();
  };

  const rotate = rot.interpolate({ inputRange: [-2, 0], outputRange: ["-1.5deg", "0deg"] });
  const bg = disabled ? mutedColor : color;
  const fg = disabled ? mutedFg : "#fff";

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onIn}
      onPressOut={onOut}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
    >
      <View style={[comicsStyles.shadow, disabled && { shadowOpacity: 0 }]}>
        <Animated.View
          style={[
            comicsStyles.btn,
            {
              backgroundColor: bg,
              transform: [
                { scale },
                { rotate },
              ],
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator color={fg} size="small" />
          ) : (
            <>
              <Text style={[comicsStyles.label, { color: fg }]} numberOfLines={1}>{label}</Text>
              {!disabled && (
                <View style={comicsStyles.pricePill}>
                  <Text style={comicsStyles.priceText}>{price}</Text>
                </View>
              )}
            </>
          )}
        </Animated.View>
      </View>
    </Pressable>
  );
}

const comicsStyles = StyleSheet.create({
  shadow: {
    borderRadius: 26,
    shadowColor: PINK,
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 56,
    borderRadius: 26,
    paddingHorizontal: 20,
  },
  label: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.1,
    flex: 1,
    textAlign: "left",
  },
  pricePill: {
    backgroundColor: "rgba(255,255,255,0.28)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  priceText: { color: "#fff", fontSize: 13, fontFamily: "Inter_700Bold" },
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 10 },
  headerWrap: { backgroundColor: PINK, position: "relative", marginBottom: 28 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 26, backgroundColor: PINK,
  },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
  headerIcon: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  fromText: { fontSize: 13, fontFamily: "Inter_500Medium", paddingHorizontal: 16, paddingVertical: 10 },
  section: { marginHorizontal: 16, borderRadius: 14, borderWidth: 1, overflow: "hidden", marginBottom: 16 },
  cartItem: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  cartItemInfo: { flex: 1, gap: 3 },
  cartItemName: { fontSize: 14, fontFamily: "Inter_500Medium", flexShrink: 1 },
  cartItemPrice: { fontSize: 12, fontFamily: "Inter_400Regular" },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  qtyBtn: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  qtyBtnSoft: { backgroundColor: "#FFE3EF", borderWidth: 1, borderColor: "#FFD0E2" },
  qty: { fontSize: 15, fontFamily: "Inter_600SemiBold", minWidth: 20, textAlign: "center" },
  cartItemTotal: { fontSize: 14, fontFamily: "Inter_600SemiBold", minWidth: 56, textAlign: "right" },
  cartItemOptions: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2, marginBottom: 2 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 14 },
  sectionLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", paddingHorizontal: 16, marginBottom: 8 },
  addressCard: { flexDirection: "row", alignItems: "center", gap: 12, marginHorizontal: 16, marginBottom: 16, padding: 14, borderRadius: 14, borderWidth: 1 },
  addressIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  addressTitle: { fontSize: 12, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  addressValue: { fontSize: 14, fontFamily: "Inter_500Medium" },
  inputWrap: {
    marginHorizontal: 16, borderRadius: 12, borderWidth: 1,
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16,
  },
  notesInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", minHeight: 40 },
  summary: { marginHorizontal: 16, borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
  summaryTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  summaryValue: { fontSize: 14, fontFamily: "Inter_500Medium" },
  totalLabel: { fontSize: 16, fontFamily: "Inter_700Bold" },
  totalValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  footer: { paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1 },
  zoneBlocker: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginBottom: 8, paddingHorizontal: 4,
  },
  zoneBlockerText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#DC2626" },
  orderBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    height: 56, borderRadius: 16, paddingHorizontal: 20,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  orderBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  orderBtnPrice: {
    color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold",
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  browseBtn: {
    paddingHorizontal: 28, paddingVertical: 14, borderRadius: 24, marginTop: 8,
    shadowColor: PINK, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 12, elevation: 5,
  },
  browseBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  promo: {
    marginHorizontal: 16, marginBottom: 16, padding: 14, borderRadius: 14,
    flexDirection: "row", alignItems: "center", gap: 10,
  },
  promoEmoji: { fontSize: 22 },
  promoText: { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold", lineHeight: 18 },
  freeDelivery: { marginHorizontal: 16, marginBottom: 16, padding: 12, borderRadius: 14, gap: 8 },
  freeDeliveryRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  freeDeliveryText: { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold" },
  freeDeliveryBarTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  freeDeliveryBarFill: { height: "100%", borderRadius: 3 },
  paymentRow: { flexDirection: "row" },
  paymentOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  paymentLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
});
