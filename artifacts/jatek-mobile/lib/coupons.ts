export type CouponType = "percent" | "fixed" | "freeShipping";

export interface CouponDef {
  code: string;
  type: CouponType;
  /** percent: 10 = 10%, fixed: amount in MAD, freeShipping: ignored */
  value: number;
  /** Short user-facing label (FR) */
  label: string;
  /** Minimum cart subtotal in MAD */
  minSubtotal?: number;
  /** Loyalty points required (for milestone-style codes) */
  minLoyaltyPoints?: number;
  /** Active only on Saturday/Sunday */
  weekendOnly?: boolean;
}

export const COUPONS: CouponDef[] = [
  { code: "WELCOME10", type: "percent", value: 10, label: "10% sur votre commande" },
  { code: "JATEK10", type: "percent", value: 10, label: "10% — 1ère commande" },
  { code: "FREESHIP", type: "freeShipping", value: 0, label: "Livraison offerte", minSubtotal: 80 },
  { code: "WEEKEND15", type: "percent", value: 15, label: "-15% le week-end", weekendOnly: true },
  { code: "JATEK_BOISSON", type: "fixed", value: 15, label: "Boisson offerte (-15 MAD)", minLoyaltyPoints: 50 },
  { code: "JATEK_LIVRAISON", type: "freeShipping", value: 0, label: "Livraison gratuite", minLoyaltyPoints: 100 },
  { code: "JATEK_VIP25", type: "percent", value: 25, label: "-25% VIP", minLoyaltyPoints: 250 },
  { code: "JATEK_OR", type: "percent", value: 15, label: "Statut Or — -15%", minLoyaltyPoints: 500 },
];

export interface ValidateContext {
  subtotal: number;
  loyaltyPoints?: number;
  /** Override day-of-week for testing (0=Sun .. 6=Sat). Defaults to today. */
  dayOfWeek?: number;
}

export type ValidateResult =
  | { ok: true; coupon: CouponDef }
  | { ok: false; reason: string };

export function validateCoupon(rawCode: string, ctx: ValidateContext): ValidateResult {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, reason: "Saisissez un code." };
  const def = COUPONS.find((c) => c.code === code);
  if (!def) return { ok: false, reason: "Code invalide." };
  if (def.minSubtotal && ctx.subtotal < def.minSubtotal) {
    const left = (def.minSubtotal - ctx.subtotal).toFixed(2);
    return { ok: false, reason: `Ajoutez ${left} MAD pour utiliser ce code.` };
  }
  if (def.minLoyaltyPoints) {
    const pts = ctx.loyaltyPoints ?? 0;
    if (pts < def.minLoyaltyPoints) {
      return {
        ok: false,
        reason: `Code réservé à ${def.minLoyaltyPoints} points (vous en avez ${pts}).`,
      };
    }
  }
  if (def.weekendOnly) {
    const day = ctx.dayOfWeek ?? new Date().getDay();
    if (day !== 0 && day !== 6) {
      return { ok: false, reason: "Code valable uniquement le week-end." };
    }
  }
  return { ok: true, coupon: def };
}

export interface DiscountBreakdown {
  /** Discount applied to the subtotal (MAD, positive number) */
  itemsDiscount: number;
  /** Whether delivery is offered by the coupon */
  freeDelivery: boolean;
  /** User-facing label of the applied coupon */
  label: string;
}

export function computeDiscount(coupon: CouponDef, subtotal: number): DiscountBreakdown {
  if (coupon.type === "percent") {
    const itemsDiscount = Math.min(subtotal, +(subtotal * (coupon.value / 100)).toFixed(2));
    return { itemsDiscount, freeDelivery: false, label: coupon.label };
  }
  if (coupon.type === "fixed") {
    return {
      itemsDiscount: Math.min(subtotal, coupon.value),
      freeDelivery: false,
      label: coupon.label,
    };
  }
  return { itemsDiscount: 0, freeDelivery: true, label: coupon.label };
}
