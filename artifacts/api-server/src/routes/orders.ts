import { Router, type IRouter } from "express";
import {
  db,
  ordersTable,
  orderItemsTable,
  menuItemsTable,
  menuItemSizesTable,
  menuItemExtrasTable,
  restaurantsTable,
  usersTable,
  driversTable,
  notificationPrefsTable,
  generateUniqueOrderReference,
  generateKitchenCode,
  generatePickupCode,
  promoCodesTable,
  promoCodeUsagesTable,
  referralsTable,
} from "@workspace/db";
import { eq, and, inArray, isNull, sql } from "drizzle-orm";
import { requireAuth, attachAuth, type AuthedRequest } from "../middlewares/auth";
import {
  CreateOrderBody,
  GetOrderParams,
  UpdateOrderStatusParams,
  UpdateOrderStatusBody,
  ListOrdersQueryParams,
} from "@workspace/api-zod";
import { publish } from "../lib/sse";
import * as tracking from "../lib/trackingService";
import { pushNotification } from "./notifications";
import { notifyDrivers } from "../lib/expoPush";
import { sendWebPush } from "../lib/vapid";
import { DEFAULT_PLATFORM_SETTINGS, getPlatformSettingNumber } from "../lib/platformSettings";

const router: IRouter = Router();

/** Per-language labels for customer push + DB notifications */
const CUSTOMER_STATUS_LABELS: Record<
  string,
  Record<"fr" | "en" | "ar", (restaurantName: string) => { title: string; body: string }>
> = {
  pending: {
    fr: (_) => ({ title: "Commande reçue ✅",      body: "Votre commande a bien été reçue et est en attente de confirmation." }),
    en: (_) => ({ title: "Order received ✅",       body: "Your order has been received and is awaiting confirmation." }),
    ar: (_) => ({ title: "تم استلام طلبك ✅",      body: "تم استلام طلبك وينتظر التأكيد." }),
  },
  accepted: {
    fr: (r) => ({ title: "Commande acceptée ✅",  body: `${r} a confirmé votre commande.` }),
    en: (r) => ({ title: "Order accepted ✅",      body: `${r} confirmed your order.` }),
    ar: (r) => ({ title: "تم قبول طلبك ✅",       body: `${r} أكّد طلبك.` }),
  },
  preparing: {
    fr: (r) => ({ title: "En préparation 🍳",     body: `${r} prépare votre commande.` }),
    en: (r) => ({ title: "Preparing your order 🍳", body: `${r} is cooking your order.` }),
    ar: (r) => ({ title: "جاري التحضير 🍳",       body: `${r} يحضّر طلبك.` }),
  },
  ready: {
    fr: (_) => ({ title: "Commande prête 🛍️",    body: "Un livreur va bientôt récupérer votre commande." }),
    en: (_) => ({ title: "Order ready 🛍️",        body: "A driver will pick up your order soon." }),
    ar: (_) => ({ title: "الطلب جاهز 🛍️",        body: "سيستلم موصِّل طلبك قريباً." }),
  },
  picked_up: {
    fr: (_) => ({ title: "En route 🛵",            body: "Votre livreur est en chemin vers vous." }),
    en: (_) => ({ title: "On the way 🛵",           body: "Your driver is heading your way." }),
    ar: (_) => ({ title: "في الطريق 🛵",           body: "الموصِّل في طريقه إليك." }),
  },
  delivered: {
    fr: (_) => ({ title: "Commande livrée 🎉",     body: "Bon appétit ! Évaluez votre expérience." }),
    en: (_) => ({ title: "Order delivered 🎉",      body: "Enjoy your meal! Rate your experience." }),
    ar: (_) => ({ title: "تم التوصيل 🎉",         body: "بالهناء والشفاء! قيّم تجربتك." }),
  },
  cancelled: {
    fr: (_) => ({ title: "Commande annulée ❌",    body: "Votre commande a été annulée." }),
    en: (_) => ({ title: "Order cancelled ❌",      body: "Your order has been cancelled." }),
    ar: (_) => ({ title: "تم إلغاء طلبك ❌",      body: "تم إلغاء طلبك." }),
  },
};

/**
 * Notify a customer of an order status change.
 * Looks up the user's stored language preference (fr/en/ar) and uses it for
 * all notification strings — SSE payload, DB record, and Expo push.
 *
 * Fires in the background (fire-and-forget) so it never blocks the response.
 */
async function notifyCustomerStatus(
  userId: number,
  status: string,
  orderId: number,
  restaurantName: string,
): Promise<void> {
  const langMap = CUSTOMER_STATUS_LABELS[status];
  if (!langMap) return;

  // Fetch language preference (non-blocking; defaults to "fr" on failure)
  let lang: "fr" | "en" | "ar" = "fr";
  try {
    const [prefs] = await db
      .select({
        language: notificationPrefsTable.language,
        pushToken: notificationPrefsTable.pushToken,
        pushOrders: notificationPrefsTable.pushOrders,
        webPushSub: notificationPrefsTable.webPushSub,
      })
      .from(notificationPrefsTable)
      .where(eq(notificationPrefsTable.userId, userId))
      .limit(1);

    if (prefs) {
      if (prefs.language === "en" || prefs.language === "ar") lang = prefs.language;
      // Build localized strings
      const { title, body } = langMap[lang](restaurantName);

      // 1 — SSE: instant in-app delivery
      publish(`user:${userId}`, "order_status", { orderId, status, title, body });

      // 2 — DB notification
      pushNotification(userId, "order_status", title, body, { orderId, status }).catch((e) =>
        console.warn("[orders] DB notification failed:", e),
      );

      // 3 — Expo mobile push
      if (prefs.pushToken && prefs.pushOrders !== false) {
        notifyDrivers(
          [prefs.pushToken],
          title,
          body,
          { orderId, status },
          { channelId: "order-status", priority: "high", ttl: 300 },
        ).catch((e) => console.warn("[orders] expo-push-to-customer failed:", e));
      }

      // 4 — Web push (browser)
      if (prefs.webPushSub && prefs.pushOrders !== false) {
        sendWebPush(prefs.webPushSub, { title, body, data: { orderId, status } })
          .catch((e) => console.warn("[orders] web-push-to-customer failed:", e));
      }
      return;
    }
  } catch (err) {
    console.warn("[orders] notifyCustomerStatus prefs fetch failed:", err);
  }

  // Fallback: no prefs row — publish SSE in French, no push
  const { title, body } = langMap.fr(restaurantName);
  publish(`user:${userId}`, "order_status", { orderId, status, title, body });
  pushNotification(userId, "order_status", title, body, { orderId, status }).catch(() => {});
}

async function getOrderWithItems(orderId: number) {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  if (!order) return null;

  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, orderId));
  return { ...order, items };
}

/** Active orders — for admin/restaurant live ops dashboards. Requires auth. */
router.get("/orders/active", requireAuth, async (req: AuthedRequest, res, next): Promise<void> => {
  const role = req.userRole;
  if (!role || !["admin", "super_admin", "restaurant_owner", "manager"].includes(role)) {
    res.status(403).json({ error: "Forbidden: requires admin or restaurant owner role" });
    return;
  }
  try {
    const activeStatuses = ["pending", "accepted", "confirmed", "preparing", "ready", "picked_up", "driver_at_restaurant", "en_route", "out_for_delivery"];
    const orders = await db.select().from(ordersTable).where(inArray(ordersTable.status, activeStatuses));

    const ordersWithItems = await Promise.all(
      orders.map(async (o) => {
        const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, o.id));
        return { ...o, items };
      })
    );

    res.json(ordersWithItems);
  } catch (err) {
    next(err);
  }
});

/** Orders that are "ready" — available for any driver to pick up. Requires driver or admin auth. */
router.get("/orders/available", requireAuth, async (req: AuthedRequest, res, next): Promise<void> => {
  const role = req.userRole;
  if (!role || !["admin", "super_admin", "driver", "manager"].includes(role)) {
    res.status(403).json({ error: "Forbidden: requires driver or admin role" });
    return;
  }
  try {
    const orders = await db
      .select({
        id: ordersTable.id,
        reference: ordersTable.reference,
        restaurantId: ordersTable.restaurantId,
        restaurantName: ordersTable.restaurantName,
        deliveryAddress: ordersTable.deliveryAddress,
        total: ordersTable.total,
        deliveryFee: ordersTable.deliveryFee,
        estimatedDeliveryTime: ordersTable.estimatedDeliveryTime,
        status: ordersTable.status,
        createdAt: ordersTable.createdAt,
      })
      .from(ordersTable)
      .where(and(eq(ordersTable.status, "ready"), isNull(ordersTable.driverId)));

    res.json(orders);
  } catch (err) {
    next(err);
  }
});

router.get("/orders", requireAuth, async (req: AuthedRequest, res, next): Promise<void> => {
  try {
    const queryParams = ListOrdersQueryParams.safeParse(req.query);

    let conditions: any[] = [];

    if (queryParams.success) {
      const { status, userId, restaurantId, driverId } = queryParams.data;
      if (status) conditions.push(eq(ordersTable.status, status));
      if (userId) conditions.push(eq(ordersTable.userId, userId));
      if (restaurantId) conditions.push(eq(ordersTable.restaurantId, restaurantId));
      if (driverId) conditions.push(eq(ordersTable.driverId, driverId));
    }

    // Customers may only see their own orders unless filtering as restaurant owner/driver.
    const role = req.userRole;
    const filtersRestaurantOrDriver =
      queryParams.success && (queryParams.data.restaurantId || queryParams.data.driverId);
    if (role === "customer" || (!filtersRestaurantOrDriver && role !== "admin")) {
      conditions.push(eq(ordersTable.userId, req.userId!));
    }

    const orders = conditions.length > 0
      ? await db.select().from(ordersTable).where(and(...conditions))
      : await db.select().from(ordersTable);

    const ordersWithItems = await Promise.all(
      orders.map(async (o) => {
        const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, o.id));
        return { ...o, items };
      })
    );

    res.json(ordersWithItems);
  } catch (err) {
    next(err);
  }
});

router.post("/orders", requireAuth, async (req: AuthedRequest, res, next): Promise<void> => {
  try {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { restaurantId, deliveryAddress, notes, items } = parsed.data;
  const userId = req.userId!;
  const { promoCode, deliveryType, scheduledFor, isContactless, paymentMethod } = req.body as {
    promoCode?: string;
    deliveryType?: string;
    scheduledFor?: string;
    isContactless?: boolean;
    paymentMethod?: "cash" | "card";
  };

  const [restaurant] = await db.select().from(restaurantsTable).where(eq(restaurantsTable.id, restaurantId)).limit(1);
  if (!restaurant) {
    res.status(404).json({ error: "Restaurant not found" });
    return;
  }

  if (!restaurant.isOpen) {
    res.status(400).json({ error: "Ce restaurant est actuellement fermé et n'accepte pas de commandes." });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);

  let subtotal = 0;
  const orderItemsData: {
    menuItemId: number; menuItemName: string; quantity: number; unitPrice: number; totalPrice: number;
    selectedSize: string | null; selectedSizePriceAdjustment: number | null; selectedExtras: string | null;
  }[] = [];

  for (const item of items) {
    const [menuItem] = await db.select().from(menuItemsTable).where(eq(menuItemsTable.id, item.menuItemId)).limit(1);
    if (!menuItem) {
      res.status(404).json({ error: `Menu item ${item.menuItemId} not found` });
      return;
    }
    if (menuItem.restaurantId !== restaurantId) {
      res.status(400).json({ error: `Menu item ${item.menuItemId} does not belong to this restaurant` });
      return;
    }

    let sizeAdjustment = 0;
    let selectedSizeLabel: string | null = null;
    if (typeof item.selectedSizeId === "number") {
      const [size] = await db
        .select()
        .from(menuItemSizesTable)
        .where(and(eq(menuItemSizesTable.id, item.selectedSizeId), eq(menuItemSizesTable.menuItemId, menuItem.id)))
        .limit(1);
      if (!size || !size.isAvailable) {
        res.status(400).json({ error: `Selected size unavailable for menu item ${item.menuItemId}` });
        return;
      }
      sizeAdjustment = size.priceAdjustment;
      selectedSizeLabel = size.name;
    }

    let extrasTotal = 0;
    const selectedExtraLabels: string[] = [];
    if (Array.isArray(item.selectedExtraIds) && item.selectedExtraIds.length > 0) {
      const extras = await db
        .select()
        .from(menuItemExtrasTable)
        .where(and(eq(menuItemExtrasTable.menuItemId, menuItem.id), inArray(menuItemExtrasTable.id, item.selectedExtraIds)));
      if (extras.length !== item.selectedExtraIds.length) {
        res.status(400).json({ error: `Invalid extras selected for menu item ${item.menuItemId}` });
        return;
      }
      for (const ex of extras) {
        if (!ex.isAvailable) {
          res.status(400).json({ error: `Selected extra ${ex.name} is unavailable` });
          return;
        }
        extrasTotal += ex.price;
        selectedExtraLabels.push(ex.name);
      }
    }

    const unitPrice = Math.max(0, menuItem.price + sizeAdjustment + extrasTotal);
    const itemTotal = unitPrice * item.quantity;
    subtotal += itemTotal;
    orderItemsData.push({
      menuItemId: menuItem.id,
      menuItemName: menuItem.name,
      quantity: item.quantity,
      unitPrice,
      totalPrice: itemTotal,
      selectedSize: selectedSizeLabel,
      selectedSizePriceAdjustment: sizeAdjustment,
      selectedExtras: selectedExtraLabels.length ? JSON.stringify(selectedExtraLabels) : null,
    });
  }

  let deliveryFee = restaurant.deliveryFee || 0;
  let discountAmount = 0;
  let appliedPromoId: number | null = null;

  // Apply promo code if provided
  if (promoCode) {
    const [promo] = await db
      .select()
      .from(promoCodesTable)
      .where(eq(promoCodesTable.code, promoCode.toUpperCase().trim()))
      .limit(1);

    if (promo && promo.isActive && (!promo.expiresAt || new Date() <= promo.expiresAt)) {
      if (promo.type === "percentage") {
        discountAmount = Math.min(subtotal, (subtotal * promo.value) / 100);
      } else if (promo.type === "fixed") {
        discountAmount = Math.min(subtotal, promo.value);
      } else if (promo.type === "free_delivery") {
        discountAmount = deliveryFee;
        deliveryFee = 0;
      }
      discountAmount = Math.round(discountAmount * 100) / 100;
      appliedPromoId = promo.id;
    }
  }

  const total = Math.max(0, subtotal + deliveryFee - discountAmount);
  const reference = await generateUniqueOrderReference();

  // Wrap all DB writes in a single transaction so a mid-flight failure
  // (e.g. orderItems insert fails) doesn't leave an orphaned order row or
  // phantom promo-usage counter increments.
  let createdOrderId: number;
  let pointsEarned: number;

  await db.transaction(async (tx) => {
    const [order] = await tx.insert(ordersTable).values({
      reference,
      userId,
      restaurantId,
      restaurantName: restaurant.name,
      userName: user?.name || "Customer",
      status: "pending",
      subtotal,
      deliveryFee,
      discountAmount,
      total,
      deliveryAddress,
      notes: notes ?? null,
      estimatedDeliveryTime: restaurant.deliveryTime || 30,
      deliveryType: deliveryType ?? "asap",
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
      isContactless: isContactless ?? false,
      promoCode: promoCode ? promoCode.toUpperCase().trim() : null,
      paymentMethod: paymentMethod ?? "cash",
    }).returning();

    createdOrderId = order.id;

    await tx.insert(orderItemsTable).values(
      orderItemsData.map((i) => ({ ...i, orderId: order.id }))
    );

    // Persist aggregated item options into the order notes for kitchen readability
    if (orderItemsData.some((i) => i.selectedSize || i.selectedExtras)) {
      const optionsNotes = orderItemsData
        .filter((i) => i.selectedSize || i.selectedExtras)
        .map((i) => {
          const parts = [i.menuItemName, `x${i.quantity}`];
          if (i.selectedSize) parts.push(`Taille: ${i.selectedSize}`);
          if (i.selectedExtras) parts.push(`Extras: ${JSON.parse(i.selectedExtras).join(", ")}`);
          return parts.join(" — ");
        })
        .join("\n");
      const updatedNotes = [notes, "---", "Options :", optionsNotes].filter(Boolean).join("\n");
      await tx.update(ordersTable).set({ notes: updatedNotes }).where(eq(ordersTable.id, order.id));
    }

    // Record promo code usage and increment counter
    if (appliedPromoId) {
      await tx.insert(promoCodeUsagesTable).values({
        promoCodeId: appliedPromoId,
        userId,
        orderId: order.id,
        discountAmount,
      });
      await tx.update(promoCodesTable)
        .set({ usedCount: sql`${promoCodesTable.usedCount} + 1` })
        .where(eq(promoCodesTable.id, appliedPromoId));
    }

    // Award loyalty points (based on amount paid after discount)
    pointsEarned = Math.floor(total / 10);
    if (pointsEarned > 0) {
      await tx.update(usersTable).set({
        loyaltyPoints: (user?.loyaltyPoints || 0) + pointsEarned,
      }).where(eq(usersTable.id, userId));
    }
    // Referral credit is intentionally NOT applied here. It is awarded only
    // once the customer's first order is actually *delivered* so that a
    // placed-then-cancelled order cannot be exploited to farm referral credit.
    // See POST /orders/:id/confirm-delivery for the credit logic.
  });

  const orderWithItems = await getOrderWithItems(createdOrderId!);

  // Push real-time event to restaurant
  publish(`restaurant:${restaurantId}`, "order_new", orderWithItems);

  // Push notification to customer
  notifyCustomerStatus(userId, "pending", createdOrderId!, restaurant.name);

  res.status(201).json(orderWithItems);
  } catch (err) {
    next(err);
  }
});

router.get("/orders/:id", attachAuth, async (req: AuthedRequest, res, next): Promise<void> => {
  try {
    const params = GetOrderParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const order = await getOrderWithItems(params.data.id);
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    // The pickup code is the secret that authorises the driver hand-off.
    // Only the customer who placed the order (and admins) may see it; the
    // assigned driver must request it verbally from the customer.
    const isCustomerOwner = req.userId != null && req.userId === order.userId;
    const isAdmin = req.userRole === "admin";
    const sanitized = (isCustomerOwner || isAdmin) ? order : { ...order, pickupCode: null };

    res.json(sanitized);
  } catch (err) {
    next(err);
  }
});

router.patch("/orders/:id/status", requireAuth, async (req: AuthedRequest, res, next): Promise<void> => {
  try {
  const params = UpdateOrderStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateOrderStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Drivers must use the dedicated /confirm-delivery endpoint to mark an order
  // as delivered — that endpoint validates the customer pickup code.
  if (parsed.data.status === "delivered" && req.userRole === "driver") {
    res.status(400).json({ error: "Drivers must confirm delivery via /orders/:id/confirm-delivery with the customer pickup code." });
    return;
  }

  // Authorise the picked_up → en_route transition: only the assigned driver
  // (or admin) may flip an order to en_route, and only from picked_up.
  if (parsed.data.status === "en_route") {
    const [existing] = await db.select().from(ordersTable).where(eq(ordersTable.id, params.data.id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Order not found" }); return; }
    if (existing.status !== "picked_up") {
      res.status(409).json({ error: "Order must be picked_up before transitioning to en_route" });
      return;
    }
    if (!["admin", "super_admin", "manager"].includes(req.userRole ?? "")) {
      if (!existing.driverId) { res.status(403).json({ error: "Order has no assigned driver" }); return; }
      const [drv] = await db.select().from(driversTable).where(eq(driversTable.id, existing.driverId)).limit(1);
      if (!drv || drv.userId !== req.userId) {
        res.status(403).json({ error: "Only the assigned driver can mark the order as en_route" });
        return;
      }
    }
  }

  const updateData: any = { status: parsed.data.status };
  if (parsed.data.driverId) {
    updateData.driverId = parsed.data.driverId;
  }

  // On acceptance, gate on owner profile completeness and mint the
  // kitchen + customer pickup codes if not already present.
  if (parsed.data.status === "accepted") {
    const [existing] = await db.select().from(ordersTable).where(eq(ordersTable.id, params.data.id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Order not found" }); return; }

    const [restaurant] = await db.select().from(restaurantsTable).where(eq(restaurantsTable.id, existing.restaurantId)).limit(1);
    if (!restaurant) { res.status(404).json({ error: "Restaurant not found" }); return; }

    // Authorization: only the restaurant owner, admin, super_admin or manager may accept.
    const isStaff = ["admin", "super_admin", "manager"].includes(req.userRole ?? "");
    if (!isStaff && restaurant.ownerId !== req.userId) {
      res.status(403).json({ error: "Not authorized to accept orders for this restaurant" });
      return;
    }

    // Staff (admin/super_admin/manager) can accept even if profile is incomplete
    const isStaffAccept = ["admin", "super_admin", "manager"].includes(req.userRole ?? "");
    if (!isStaffAccept && !restaurant.profileCompletedAt) {
      res.status(412).json({
        error: "Complete your business profile (legal name + ICE) before accepting orders.",
        code: "OWNER_PROFILE_INCOMPLETE",
      });
      return;
    }

    if (!existing.kitchenCode) updateData.kitchenCode = generateKitchenCode();
    if (!existing.pickupCode) updateData.pickupCode = generatePickupCode();
  }

  const [order] = await db
    .update(ordersTable)
    .set(updateData)
    .where(eq(ordersTable.id, params.data.id))
    .returning();

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  // NOTE: totalDeliveries is incremented exclusively in
  // POST /orders/:id/confirm-delivery (the canonical delivery hand-off path).
  // We intentionally do NOT bump it here even when status flips to "delivered"
  // via this generic PATCH, otherwise an owner-side correction would
  // double-count the delivery.

  const orderWithItems = await getOrderWithItems(order.id);

  // Push real-time events
  publish(`order:${order.id}`, "order_status", { orderId: order.id, status: order.status, order: orderWithItems });
  publish(`restaurant:${order.restaurantId}`, "order_status", { orderId: order.id, status: order.status });
  // Admin tracking dashboard sees every status change for live ops visibility.
  publish("admin_tracking", "order_status", { orderId: order.id, status: order.status, driverId: order.driverId });

  // Customer push + in-app notification
  notifyCustomerStatus(order.userId, order.status, order.id, order.restaurantName);

  // When order is ready, notify available drivers via SSE + Expo push
  if (parsed.data.status === "ready") {
    publish("available_orders", "order_ready", {
      orderId: order.id,
      restaurantName: order.restaurantName,
      deliveryAddress: order.deliveryAddress,
      total: order.total,
    });
    // Fire-and-forget: push to all online drivers that have registered a token
    (async () => {
      try {
        const onlineDrivers = await db
          .select({ pushToken: driversTable.pushToken })
          .from(driversTable)
          .where(eq(driversTable.isAvailable, true));
        const tokens = onlineDrivers.map((d) => d.pushToken);
        const commissionRate = await getPlatformSettingNumber("driverCommissionRate", Number(DEFAULT_PLATFORM_SETTINGS.driverCommissionRate));
        const earning = Math.round(order.total * commissionRate * 10) / 10;
        await notifyDrivers(
          tokens,
          "🏍️ Nouvelle course disponible !",
          `${order.restaurantName} → ${order.deliveryAddress}\nGain estimé : ${earning} DH`,
          { orderId: order.id, type: "new_order" },
          { channelId: "incoming-order", priority: "high", ttl: 60 },
        );
      } catch (err) {
        console.warn("[orders] push-to-drivers failed:", err);
      }
    })();
  }

  // When order is assigned to a driver, push to that driver's channel
  if (parsed.data.driverId) {
    publish(`driver_orders:${parsed.data.driverId}`, "order_assigned", { orderId: order.id, order: orderWithItems });
  }

  // When the driver hits the road, attach the order to their live tracking
  // channel so subsequent /location pings fan out on this order:{id} channel.
  if (parsed.data.status === "en_route" && order.driverId) {
    tracking.attachOrder(order.driverId, order.id);
  }

  res.json(orderWithItems);
  } catch (err) {
    next(err);
  }
});

/**
 * Live tracking snapshot for an order — combines DB persistence with the
 * in-memory tracking service. Useful for clients that just opened the page
 * and need an initial state before subscribing to the SSE channel.
 */
router.get("/orders/:id/tracking", attachAuth, async (req: AuthedRequest, res, next): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid order id" }); return; }

    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }

    // Public tracking snapshot — usable from a deep link without auth (a la
    // Glovo/Uber Eats) so customers and restaurant staff can see live progress
    // without logging in. attachAuth only provides identity if the caller has
    // a session, but the snapshot itself is intentionally accessible anon.

    const driver = order.driverId
      ? (await db.select().from(driversTable).where(eq(driversTable.id, order.driverId)).limit(1))[0]
      : null;

    const live = order.driverId ? tracking.getState(order.driverId) : null;
    const isOnline = order.driverId ? tracking.isOnline(order.driverId) : false;

    // Prefer the live in-memory position (fresher) over the DB snapshot.
    const driverLat = live?.lat ?? driver?.latitude ?? null;
    const driverLng = live?.lng ?? driver?.longitude ?? null;
    const driverLastSeen = live?.lastSeen ?? (driver?.locationUpdatedAt ? driver.locationUpdatedAt.getTime() : null);

    res.json({
      orderId: order.id,
      status: order.status,
      driverId: order.driverId,
      driverName: driver?.name ?? null,
      driverLat,
      driverLng,
      driverLastSeen,
      driverIsOnline: isOnline,
      eta: live?.eta ?? null,
      deliveryAddress: order.deliveryAddress,
      updatedAt: order.updatedAt instanceof Date ? order.updatedAt.toISOString() : order.updatedAt,
    });
  } catch (err) {
    next(err);
  }
});

/** Driver accepts a "ready" order — assigns themselves to it */
router.post("/orders/:id/accept-delivery", requireAuth, async (req: AuthedRequest, res, next): Promise<void> => {
  try {
  const orderId = parseInt(String(req.params.id), 10);
  if (isNaN(orderId)) { res.status(400).json({ error: "Invalid order id" }); return; }

  const { driverId } = req.body;
  if (!driverId || typeof driverId !== "number") {
    res.status(400).json({ error: "driverId (number) required" });
    return;
  }

  // Validate driver + authorization before touching the order row
  const [driver] = await db.select().from(driversTable).where(eq(driversTable.id, driverId)).limit(1);
  if (!driver) { res.status(404).json({ error: "Driver not found" }); return; }

  // Caller must be the driver themselves, or an admin
  if (driver.userId !== req.userId && req.userRole !== "admin" && req.userRole !== "super_admin") {
    res.status(403).json({ error: "Not authorized to accept on behalf of another driver" });
    return;
  }

  // Profile gate — driver must have completed the mandatory onboarding fields
  // before they can accept any delivery (vehicle plate + national ID).
  if (req.userRole !== "admin" && req.userRole !== "super_admin" && !driver.profileCompletedAt) {
    res.status(412).json({
      error: "Complete your driver profile (vehicle, plate, national ID) before accepting deliveries.",
      code: "DRIVER_PROFILE_INCOMPLETE",
    });
    return;
  }

  // Atomic conditional UPDATE — only succeeds when the order is still "ready"
  // AND has no driver assigned. This eliminates the read-then-write race where
  // two drivers both pass the pre-checks and then both perform the update.
  const [order] = await db
    .update(ordersTable)
    .set({ driverId, status: "picked_up" })
    .where(and(
      eq(ordersTable.id, orderId),
      eq(ordersTable.status, "ready"),
      isNull(ordersTable.driverId),
    ))
    .returning();

  if (!order) {
    // Either the order doesn't exist, is no longer "ready", or was already
    // claimed by another driver between the driver lookup and this update.
    const [check] = await db.select({ id: ordersTable.id }).from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
    if (!check) { res.status(404).json({ error: "Order not found" }); return; }
    res.status(409).json({ error: "Order already taken or no longer available" });
    return;
  }

  const orderWithItems = await getOrderWithItems(order.id);

  // Notify customer + restaurant + admin tracking dashboard.
  publish(`order:${orderId}`, "order_status", { orderId, status: "picked_up", driverName: driver.name, order: orderWithItems });
  publish(`restaurant:${order.restaurantId}`, "order_status", { orderId, status: "picked_up", driverName: driver.name });
  publish("admin_tracking", "order_status", { orderId, status: "picked_up", driverId, driverName: driver.name });

  // Customer push + in-app notification
  notifyCustomerStatus(order.userId, "picked_up", orderId, order.restaurantName);

  // Start tracking the order in the in-memory live state so subsequent driver
  // location pings get fanned out on the order:{id} channel.
  tracking.attachOrder(driverId, orderId);

  res.json(orderWithItems);
  } catch (err) {
    next(err);
  }
});

/**
 * Driver confirms hand-off by entering the 4-digit code shown on the
 * customer's screen. Only the assigned driver (or admin) may call this.
 */
router.post("/orders/:id/confirm-delivery", requireAuth, async (req: AuthedRequest, res, next): Promise<void> => {
  try {
  const orderId = parseInt(String(req.params.id), 10);
  if (isNaN(orderId)) { res.status(400).json({ error: "Invalid order id" }); return; }

  const code = typeof req.body?.pickupCode === "string" ? req.body.pickupCode.trim() : "";
  if (!/^\d{4}$/.test(code)) {
    res.status(400).json({ error: "pickupCode must be a 4-digit string" });
    return;
  }

  const [existing] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  if (!existing) { res.status(404).json({ error: "Order not found" }); return; }
  // Drivers may confirm delivery from any in-transit state:
  //   picked_up           — legacy direct flow
  //   en_route            — alternate lifecycle
  //   out_for_delivery    — current driver-app flow (driver_at_restaurant → picked_up → out_for_delivery)
  if (
    existing.status !== "picked_up" &&
    existing.status !== "en_route" &&
    existing.status !== "out_for_delivery"
  ) {
    res.status(409).json({ error: "Order is not in transit" });
    return;
  }

  // Authorization
  if (req.userRole !== "admin" && req.userRole !== "super_admin") {
    if (!existing.driverId) {
      res.status(403).json({ error: "Order has no assigned driver" });
      return;
    }
    const [driver] = await db.select().from(driversTable).where(eq(driversTable.id, existing.driverId)).limit(1);
    if (!driver || driver.userId !== req.userId) {
      res.status(403).json({ error: "Only the assigned driver can confirm delivery" });
      return;
    }
  }

  if (!existing.pickupCode || existing.pickupCode !== code) {
    res.status(400).json({ error: "Incorrect pickup code", code: "INVALID_PICKUP_CODE" });
    return;
  }

  const [order] = await db
    .update(ordersTable)
    .set({ status: "delivered" })
    .where(eq(ordersTable.id, orderId))
    .returning();

  // Bump the driver's totalDeliveries counter.
  if (order.driverId) {
    const [driver] = await db.select().from(driversTable).where(eq(driversTable.id, order.driverId)).limit(1);
    if (driver) {
      await db.update(driversTable).set({
        totalDeliveries: driver.totalDeliveries + 1,
      }).where(eq(driversTable.id, order.driverId));
    }
  }

  // Credit referrer if this is the customer's first *delivered* order.
  // Doing it here (not at placement) prevents cancelled-order abuse.
  (async () => {
    try {
      const [customer] = await db.select().from(usersTable).where(eq(usersTable.id, order.userId)).limit(1);
      if (customer?.referredBy) {
        const allDelivered = await db
          .select({ id: ordersTable.id })
          .from(ordersTable)
          .where(and(eq(ordersTable.userId, order.userId), eq(ordersTable.status, "delivered")));
        if (allDelivered.length === 1) {
          const [referral] = await db
            .select()
            .from(referralsTable)
            .where(and(
              eq(referralsTable.referrerId, customer.referredBy),
              eq(referralsTable.referredId, order.userId),
            ))
            .limit(1);
          if (referral && referral.status === "pending") {
            const [referrer] = await db.select().from(usersTable).where(eq(usersTable.id, customer.referredBy)).limit(1);
            if (referrer) {
              await db.update(usersTable).set({
                walletBalance: referrer.walletBalance + referral.creditAmount,
              }).where(eq(usersTable.id, referrer.id));
              await db.update(referralsTable).set({
                status: "completed",
                completedAt: new Date(),
              }).where(eq(referralsTable.id, referral.id));
              pushNotification(
                referrer.id,
                "referral",
                "Parrainage réussi ! 🎉",
                `Votre ami ${customer.name ?? "un ami"} a reçu sa première commande. ${referral.creditAmount} MAD ont été ajoutés à votre portefeuille !`,
                { creditAmount: referral.creditAmount },
              ).catch(() => {});
            }
          }
        }
      }
    } catch (err) {
      console.warn("[confirm-delivery] referral credit failed:", err);
    }
  })();

  const orderWithItems = await getOrderWithItems(order.id);
  publish(`order:${order.id}`, "order_status", { orderId: order.id, status: "delivered", order: orderWithItems });
  publish(`restaurant:${order.restaurantId}`, "order_status", { orderId: order.id, status: "delivered" });
  publish("admin_tracking", "order_status", { orderId: order.id, status: "delivered", driverId: order.driverId });

  // Customer push + in-app notification
  notifyCustomerStatus(order.userId, "delivered", order.id, order.restaurantName);

  // Stop fanning out live location updates for this completed order.
  if (order.driverId) tracking.detachOrder(order.driverId, order.id);

  res.json(orderWithItems);
  } catch (err) {
    next(err);
  }
});

/**
 * Printable kitchen ticket. Returns minimal HTML auto-styled for thermal
 * 80mm printers. Accessible to the restaurant owner via a signed token in
 * the query string so a freshly opened browser tab can fetch it.
 */
router.get("/orders/:id/receipt", requireAuth, async (req: AuthedRequest, res, next): Promise<void> => {
  try {
  const orderId = parseInt(String(req.params.id), 10);
  if (isNaN(orderId)) { res.status(400).send("Invalid order id"); return; }

  const order = await getOrderWithItems(orderId);
  if (!order) { res.status(404).send("Order not found"); return; }

  const [restaurant] = await db.select().from(restaurantsTable).where(eq(restaurantsTable.id, order.restaurantId)).limit(1);
  if (!restaurant) { res.status(404).send("Restaurant not found"); return; }

  if (req.userRole !== "admin" && req.userRole !== "super_admin" && restaurant.ownerId !== req.userId) {
    res.status(403).send("Forbidden");
    return;
  }

  const escape = (s: string) => String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  const itemsHtml = order.items.map((it: any) => `
    <tr>
      <td style="text-align:left">${it.quantity}× ${escape(it.menuItemName)}</td>
      <td style="text-align:right">${(it.totalPrice ?? 0).toFixed(2)}</td>
    </tr>`).join("");

  const created = new Date(order.createdAt).toLocaleString("fr-FR");

  const html = `<!doctype html>
<html><head>
<meta charset="utf-8" />
<title>Ticket — ${escape(order.reference || `#${order.id}`)}</title>
<style>
  @page { size: 80mm auto; margin: 4mm; }
  body { font-family: 'Courier New', monospace; max-width: 320px; margin: 0 auto; padding: 12px; color: #000; }
  h1 { font-size: 16px; margin: 0 0 4px; text-align: center; }
  .muted { color: #555; font-size: 11px; }
  .center { text-align: center; }
  .ref { font-size: 13px; font-weight: bold; text-align: center; margin: 8px 0; letter-spacing: 1px; }
  .kc { font-size: 36px; font-weight: bold; text-align: center; padding: 10px 0; border-top: 2px dashed #000; border-bottom: 2px dashed #000; margin: 10px 0; letter-spacing: 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin: 8px 0; }
  td { padding: 2px 0; vertical-align: top; }
  hr { border: none; border-top: 1px dashed #555; margin: 8px 0; }
  .total { font-weight: bold; font-size: 14px; }
  .footer { font-size: 10px; text-align: center; margin-top: 12px; color: #444; }
  @media print { button { display: none; } }
</style>
</head><body onload="setTimeout(()=>window.print(),200)">
  <button style="float:right" onclick="window.print()">Imprimer</button>
  <h1>${escape(restaurant.name)}</h1>
  <div class="center muted">${escape(restaurant.address)}</div>
  ${restaurant.phone ? `<div class="center muted">${escape(restaurant.phone)}</div>` : ""}
  ${restaurant.ice ? `<div class="center muted">ICE ${escape(restaurant.ice)}</div>` : ""}
  <hr/>
  <div class="ref">${escape(order.reference || `#${order.id}`)}</div>
  <div class="muted center">${created}</div>
  <div class="kc">${escape(order.kitchenCode || "—")}</div>
  <div class="muted center">Code cuisine</div>
  <hr/>
  <div><strong>Client:</strong> ${escape(order.userName)}</div>
  <div class="muted">${escape(order.deliveryAddress)}</div>
  ${order.notes ? `<div class="muted"><em>Note: ${escape(order.notes)}</em></div>` : ""}
  <table>${itemsHtml}</table>
  <hr/>
  <table>
    <tr><td>Sous-total</td><td style="text-align:right">${order.subtotal.toFixed(2)}</td></tr>
    <tr><td>Livraison</td><td style="text-align:right">${(order.deliveryFee ?? 0).toFixed(2)}</td></tr>
    <tr class="total"><td>TOTAL MAD</td><td style="text-align:right">${order.total.toFixed(2)}</td></tr>
  </table>
  <hr/>
  <div class="footer">Le client présentera son code à 4 chiffres au livreur lors de la remise.</div>
</body></html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.send(html);
  } catch (err) {
    next(err);
  }
});

/** Customer rates their driver after delivery */
router.post("/orders/:id/rate-driver", requireAuth, async (req: AuthedRequest, res, next): Promise<void> => {
  try {
  const orderId = parseInt(String(req.params.id), 10);
  if (isNaN(orderId)) { res.status(400).json({ error: "Invalid order id" }); return; }

  const { rating, comment } = req.body;
  if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) {
    res.status(400).json({ error: "Rating must be 1-5" });
    return;
  }

  const [order] = await db.select().from(ordersTable).where(and(eq(ordersTable.id, orderId), eq(ordersTable.userId, req.userId!))).limit(1);
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  if (order.status !== "delivered") { res.status(400).json({ error: "Order must be delivered to rate" }); return; }
  if (order.driverRating !== null) { res.status(400).json({ error: "Vous avez déjà évalué ce livreur" }); return; }

  const [updated] = await db.update(ordersTable)
    .set({ driverRating: Math.round(rating), driverRatingComment: comment ?? null })
    .where(eq(ordersTable.id, orderId))
    .returning();

  // Notify driver
  if (order.driverId) {
    const [drv] = await db.select().from(driversTable).where(eq(driversTable.id, order.driverId)).limit(1);
    if (drv?.userId) {
      await pushNotification(
        drv.userId,
        "system",
        "Nouvelle évaluation",
        `Vous avez reçu ${Math.round(rating)}/5 étoiles pour la commande ${order.reference ?? `#${order.id}`}.`,
        { orderId, rating },
      );
    }
  }

  res.json(updated);
  } catch (err) {
    next(err);
  }
});

/** Driver rates customer */
router.post("/orders/:id/rate-customer", requireAuth, async (req: AuthedRequest, res, next): Promise<void> => {
  try {
  const orderId = parseInt(String(req.params.id), 10);
  if (isNaN(orderId)) { res.status(400).json({ error: "Invalid order id" }); return; }

  const { rating } = req.body;
  if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) {
    res.status(400).json({ error: "Rating must be 1-5" });
    return;
  }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  if (order.status !== "delivered") { res.status(400).json({ error: "Order must be delivered to rate" }); return; }

  // Verify caller is the assigned driver
  if (order.driverId) {
    const [drv] = await db.select().from(driversTable).where(eq(driversTable.id, order.driverId)).limit(1);
    if (drv?.userId !== req.userId) { res.status(403).json({ error: "Forbidden" }); return; }
  } else {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  if (order.customerRating !== null) { res.status(400).json({ error: "Vous avez déjà évalué ce client" }); return; }

  const [updated] = await db.update(ordersTable)
    .set({ customerRating: Math.round(rating) })
    .where(eq(ordersTable.id, orderId))
    .returning();

  res.json(updated);
  } catch (err) {
    next(err);
  }
});

/** Reorder — clone items from a previous order into a new pending order */
router.post("/orders/:id/reorder", requireAuth, async (req: AuthedRequest, res, next): Promise<void> => {
  try {
  const orderId = parseInt(String(req.params.id), 10);
  if (isNaN(orderId)) { res.status(400).json({ error: "Invalid order id" }); return; }

  const userId = req.userId!;

  const [order] = await db.select().from(ordersTable).where(and(eq(ordersTable.id, orderId), eq(ordersTable.userId, userId))).limit(1);
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  const [restaurant] = await db.select().from(restaurantsTable).where(eq(restaurantsTable.id, order.restaurantId)).limit(1);
  if (!restaurant) { res.status(404).json({ error: "Restaurant not found" }); return; }
  if (!restaurant.isOpen) { res.status(400).json({ error: "Ce restaurant est actuellement fermé." }); return; }

  const oldItems = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, orderId));
  if (oldItems.length === 0) { res.status(400).json({ error: "No items found in original order" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);

  let subtotal = 0;
  const newOrderItems: { menuItemId: number; menuItemName: string; quantity: number; unitPrice: number; totalPrice: number }[] = [];

  for (const item of oldItems) {
    const [menuItem] = await db.select().from(menuItemsTable).where(eq(menuItemsTable.id, item.menuItemId)).limit(1);
    if (!menuItem || !menuItem.isAvailable) continue;
    const unitPrice = menuItem.price;
    const itemTotal = unitPrice * item.quantity;
    subtotal += itemTotal;
    newOrderItems.push({
      menuItemId: menuItem.id,
      menuItemName: menuItem.name,
      quantity: item.quantity,
      unitPrice,
      totalPrice: itemTotal,
    });
  }

  if (newOrderItems.length === 0) {
    res.status(400).json({ error: "Aucun article disponible dans cette commande" });
    return;
  }

  const deliveryFee = restaurant.deliveryFee || 0;
  const total = subtotal + deliveryFee;
  const reference = await generateUniqueOrderReference();

  const [newOrder] = await db.insert(ordersTable).values({
    reference,
    userId,
    restaurantId: order.restaurantId,
    restaurantName: restaurant.name,
    userName: user?.name || "Customer",
    status: "pending",
    subtotal,
    deliveryFee,
    total,
    deliveryAddress: order.deliveryAddress,
    notes: order.notes,
    estimatedDeliveryTime: restaurant.deliveryTime || 30,
    deliveryType: "asap",
    isContactless: false,
  }).returning();

  await db.insert(orderItemsTable).values(
    newOrderItems.map((i) => ({ ...i, orderId: newOrder.id }))
  );

  const pointsEarned = Math.floor(total / 10);
  if (pointsEarned > 0) {
    await db.update(usersTable).set({
      loyaltyPoints: (user?.loyaltyPoints || 0) + pointsEarned,
    }).where(eq(usersTable.id, userId));
  }

  const newOrderWithItems = await getOrderWithItems(newOrder.id);
  publish(`restaurant:${order.restaurantId}`, "order_new", newOrderWithItems);
  notifyCustomerStatus(userId, "pending", newOrder.id, restaurant.name);

  res.status(201).json(newOrderWithItems);
  } catch (err) {
    next(err);
  }
});

export default router;
