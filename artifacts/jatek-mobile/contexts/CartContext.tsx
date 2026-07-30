import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
import { CouponDef, validateCoupon, computeDiscount } from "@/lib/coupons";

export interface CartItem {
  /** Unique line identifier (combines menuItemId + variant + extras).
   *  Used for client-side de-duplication & quantity updates. */
  cartLineId: string;
  /** REAL menu item id from the database — sent to the API at checkout. */
  menuItemId: number;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string | null;
  /** Selected size label, e.g. "Large" */
  selectedSize?: string;
  /** DB id of selected size (sent to API for server-side price validation). */
  selectedSizeId?: number;
  /** Price adjustment for the selected size (included in `price`). */
  selectedSizePriceAdjustment?: number;
  /** Selected extra labels, e.g. ["Fromage extra"] */
  selectedExtras?: string[];
  /** DB ids of selected extras (sent to API for server-side price validation). */
  selectedExtraIds?: number[];
}

export interface RestaurantPricing {
  deliveryFee?: number | null;
  freeDeliveryThreshold?: number | null;
}

const DEFAULT_DELIVERY_FEE = 15;
const DEFAULT_FREE_DELIVERY_THRESHOLD = 150;

export type CouponApplyResult = { ok: true; label: string } | { ok: false; reason: string };

interface CartContextType {
  items: CartItem[];
  restaurantId: number | null;
  restaurantName: string;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  addItem: (restaurantId: number, restaurantName: string, item: Omit<CartItem, "quantity">, pricing?: RestaurantPricing) => void;
  removeItem: (cartLineId: string) => void;
  updateQuantity: (cartLineId: string, quantity: number) => void;
  clearCart: () => void;
  subtotal: number;
  itemCount: number;
  selectedAddress: string;
  selectedAddressInZone: boolean;
  setSelectedAddress: (a: string, inZone?: boolean) => void;
  /** Currently applied coupon (validated against current subtotal). */
  appliedCoupon: CouponDef | null;
  /** Discount on items (MAD, positive). 0 if no coupon or coupon is shipping-only. */
  itemsDiscount: number;
  /** True when coupon offers free delivery. */
  freeDeliveryCoupon: boolean;
  /** Try to apply a code. Stored on success. */
  applyCoupon: (code: string, opts?: { loyaltyPoints?: number }) => CouponApplyResult;
  /** Remove the currently applied coupon. */
  removeCoupon: () => void;
  /** Free-form note to the restaurant (allergies, cooking prefs, etc.). */
  notes: string;
  setNotes: (n: string) => void;
}

const CartContext = createContext<CartContextType | null>(null);
// Bumped to v3 — schema change: items now require `cartLineId` for de-dup
// (real `menuItemId` is preserved separately so the API gets the right DB id).
// Previous carts (v2) may contain items with the old fake variant id stored
// as `menuItemId` and would cause /api/orders to return 404.
const CART_KEY = "jatek_cart_v4";
const ADDR_KEY = "jatek_selected_address_v1";
const COUPON_KEY = "jatek_cart_coupon_v1";
const NOTES_KEY = "jatek_cart_notes_v1";
const OLD_CART_KEYS = ["jatek_cart_v2", "jatek_cart"];

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [restaurantId, setRestaurantId] = useState<number | null>(null);
  const [restaurantName, setRestaurantName] = useState("");
  const [deliveryFee, setDeliveryFee] = useState<number>(DEFAULT_DELIVERY_FEE);
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState<number>(DEFAULT_FREE_DELIVERY_THRESHOLD);
  const [selectedAddress, setSelectedAddressState] = useState<string>("");
  const [selectedAddressInZone, setSelectedAddressInZone] = useState<boolean>(true);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponDef | null>(null);
  const [notes, setNotesState] = useState<string>("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Always set ready=true — even if AsyncStorage is unavailable (rare on
    // older Android Expo Go builds) we still want the app to render with
    // empty defaults instead of being stuck.
    OLD_CART_KEYS.forEach((k) => { AsyncStorage.removeItem(k).catch(() => {}); });
    Promise.all([
      AsyncStorage.getItem(CART_KEY),
      AsyncStorage.getItem(ADDR_KEY),
      AsyncStorage.getItem(COUPON_KEY),
      AsyncStorage.getItem(NOTES_KEY),
    ])
      .then(([raw, addr, couponRaw, notesRaw]) => {
        if (raw) {
          try {
            const s = JSON.parse(raw);
            setItems(Array.isArray(s.items) ? s.items : []);
            setRestaurantId(typeof s.restaurantId === "number" ? s.restaurantId : null);
            setRestaurantName(typeof s.restaurantName === "string" ? s.restaurantName : "");
            if (typeof s.deliveryFee === "number") setDeliveryFee(s.deliveryFee);
            if (typeof s.freeDeliveryThreshold === "number") setFreeDeliveryThreshold(s.freeDeliveryThreshold);
          } catch (err) {
            console.warn("[Cart] failed to parse persisted cart:", err);
          }
        }
        if (addr) {
          try {
            const parsed = JSON.parse(addr);
            if (typeof parsed === "string") { setSelectedAddressState(parsed); setSelectedAddressInZone(true); }
            else { setSelectedAddressState(String(parsed.address ?? "")); setSelectedAddressInZone(parsed.inZone !== false); }
          } catch { setSelectedAddressState(addr); }
        }
        if (couponRaw) {
          try {
            const parsed = JSON.parse(couponRaw);
            if (parsed && typeof parsed.code === "string") setAppliedCoupon(parsed);
          } catch { /* ignore */ }
        }
        if (typeof notesRaw === "string") setNotesState(notesRaw);
      })
      .catch((err) => {
        console.warn("[Cart] AsyncStorage unavailable:", err);
      })
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(CART_KEY, JSON.stringify({ items, restaurantId, restaurantName, deliveryFee, freeDeliveryThreshold })).catch((err) => {
      console.warn("[Cart] failed to persist cart:", err);
    });
  }, [items, restaurantId, restaurantName, deliveryFee, freeDeliveryThreshold, ready]);

  useEffect(() => {
    if (!ready) return;
    if (appliedCoupon) {
      AsyncStorage.setItem(COUPON_KEY, JSON.stringify(appliedCoupon)).catch(() => {});
    } else {
      AsyncStorage.removeItem(COUPON_KEY).catch(() => {});
    }
  }, [appliedCoupon, ready]);

  useEffect(() => {
    if (!ready) return;
    if (notes) {
      AsyncStorage.setItem(NOTES_KEY, notes).catch(() => {});
    } else {
      AsyncStorage.removeItem(NOTES_KEY).catch(() => {});
    }
  }, [notes, ready]);

  // All actions below are wrapped in `useCallback` so consumers passing them
  // to `React.memo`-ised children don't re-render on every parent render.
  const setNotes = useCallback((n: string) => setNotesState(n), []);

  const setSelectedAddress = useCallback((a: string, inZone: boolean = true) => {
    setSelectedAddressState(a);
    setSelectedAddressInZone(inZone);
    AsyncStorage.setItem(ADDR_KEY, JSON.stringify({ address: a, inZone })).catch((err) => {
      console.warn("[Cart] failed to persist address:", err);
    });
  }, []);

  const applyPricing = useCallback((pricing?: RestaurantPricing) => {
    if (!pricing) return;
    if (typeof pricing.deliveryFee === "number") setDeliveryFee(pricing.deliveryFee);
    if (typeof pricing.freeDeliveryThreshold === "number") setFreeDeliveryThreshold(pricing.freeDeliveryThreshold);
  }, []);

  const addItem = useCallback((rId: number, rName: string, item: Omit<CartItem, "quantity">, pricing?: RestaurantPricing) => {
    setRestaurantId((prevId) => {
      if (prevId && prevId !== rId) {
        // Switched restaurant — ask user before wiping the existing cart.
        Alert.alert(
          "Nouveau restaurant",
          "Votre panier contient des articles d'un autre restaurant. Vider le panier et continuer ?",
          [
            { text: "Annuler", style: "cancel" },
            {
              text: "Vider et continuer",
              style: "destructive",
              onPress: () => {
                setItems([{ ...item, quantity: 1 }]);
                setRestaurantName(rName);
                applyPricing(pricing);
                setRestaurantId(rId);
              },
            },
          ],
        );
        return prevId; // keep current until user confirms
      }
      setRestaurantName(rName);
      applyPricing(pricing);
      setItems((prev) => {
        const ex = prev.find((i) => i.cartLineId === item.cartLineId);
        if (ex) return prev.map((i) => i.cartLineId === item.cartLineId ? { ...i, quantity: i.quantity + 1 } : i);
        return [...prev, { ...item, quantity: 1 }];
      });
      return rId;
    });
  }, [applyPricing]);

  const removeItem = useCallback((cartLineId: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.cartLineId !== cartLineId);
      if (next.length === 0) { setRestaurantId(null); setRestaurantName(""); }
      return next;
    });
  }, []);

  const updateQuantity = useCallback((cartLineId: string, quantity: number) => {
    if (quantity <= 0) { removeItem(cartLineId); return; }
    setItems((prev) => prev.map((i) => i.cartLineId === cartLineId ? { ...i, quantity } : i));
  }, [removeItem]);

  const clearCart = useCallback(() => {
    setItems([]); setRestaurantId(null); setRestaurantName("");
    setDeliveryFee(DEFAULT_DELIVERY_FEE);
    setFreeDeliveryThreshold(DEFAULT_FREE_DELIVERY_THRESHOLD);
    setAppliedCoupon(null);
    setNotesState("");
  }, []);

  // Derived values memoized so we don't recompute on every parent re-render
  // and consumers using shallow-compare receive stable references.
  const subtotal = useMemo(() => items.reduce((s, i) => s + i.price * i.quantity, 0), [items]);
  const itemCount = useMemo(() => items.reduce((s, i) => s + i.quantity, 0), [items]);

  // Re-validate coupon whenever subtotal changes (e.g. drops below minSubtotal).
  useEffect(() => {
    if (!appliedCoupon) return;
    const res = validateCoupon(appliedCoupon.code, { subtotal });
    if (!res.ok) setAppliedCoupon(null);
  }, [subtotal, appliedCoupon]);

  const discount = useMemo(
    () => appliedCoupon
      ? computeDiscount(appliedCoupon, subtotal)
      : { itemsDiscount: 0, freeDelivery: false, label: "" },
    [appliedCoupon, subtotal],
  );

  const applyCoupon = useCallback((code: string, opts?: { loyaltyPoints?: number }): CouponApplyResult => {
    const res = validateCoupon(code, { subtotal, loyaltyPoints: opts?.loyaltyPoints });
    if (!res.ok) return { ok: false, reason: res.reason };
    setAppliedCoupon(res.coupon);
    return { ok: true, label: res.coupon.label };
  }, [subtotal]);

  const removeCoupon = useCallback(() => setAppliedCoupon(null), []);

  // Memoize the entire context value so consumers that don't depend on the
  // cart state don't re-render when an unrelated state slice changes.
  const value = useMemo<CartContextType>(() => ({
    items,
    restaurantId,
    restaurantName,
    deliveryFee,
    freeDeliveryThreshold,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    subtotal,
    itemCount,
    selectedAddress,
    selectedAddressInZone,
    setSelectedAddress,
    appliedCoupon,
    itemsDiscount: discount.itemsDiscount,
    freeDeliveryCoupon: discount.freeDelivery,
    applyCoupon,
    removeCoupon,
    notes,
    setNotes,
  }), [
    items, restaurantId, restaurantName, deliveryFee, freeDeliveryThreshold,
    addItem, removeItem, updateQuantity, clearCart,
    subtotal, itemCount,
    selectedAddress, selectedAddressInZone, setSelectedAddress,
    appliedCoupon, discount.itemsDiscount, discount.freeDelivery,
    applyCoupon, removeCoupon, notes, setNotes,
  ]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
