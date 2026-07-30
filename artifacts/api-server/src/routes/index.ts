import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import restaurantsRouter from "./restaurants";
import menuRouter from "./menu";
import menuItemOptionsRouter from "./menuItemOptions";
import ordersRouter from "./orders";
import usersRouter from "./users";
import driversRouter from "./drivers";
import reviewsRouter from "./reviews";
import rewardsRouter from "./rewards";
import adminRouter from "./admin";
import storageRouter from "./storage";
import favoritesRouter from "./favorites";
import addressesRouter from "./addresses";
import paymentMethodsRouter from "./paymentMethods";
import supportTicketsRouter from "./supportTickets";
import notificationPrefsRouter from "./notificationPrefs";
import userConsentsRouter from "./userConsents";
import quotesRouter from "./quotes";
import backendRouter from "./backend";
import backendAdminRouter, { startRestaurantAutoCloseScheduler } from "./backendAdmin";
import contentRouter from "./content";
import promoCodesRouter from "./promoCodes";
import chatRouter from "./chat";
import notificationsRouter from "./notifications";
import referralsRouter from "./referrals";
import promotionsRouter from "./promotions";
import { subscribe } from "../lib/sse";
import { requireAuth, type AuthedRequest } from "../middlewares/auth";
import { db, ordersTable, driversTable, restaurantsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

// Start the restaurant auto-close scheduler (runs every 60s)
startRestaurantAutoCloseScheduler();

router.use(healthRouter);
router.use(authRouter);
router.use(restaurantsRouter);
router.use(menuRouter);
router.use(menuItemOptionsRouter);
router.use(ordersRouter);
router.use(usersRouter);
router.use(driversRouter);
router.use(reviewsRouter);
router.use(rewardsRouter);
router.use(adminRouter);
router.use(storageRouter);
router.use(favoritesRouter);
router.use(addressesRouter);
router.use(paymentMethodsRouter);
router.use(supportTicketsRouter);
router.use(notificationPrefsRouter);
router.use(userConsentsRouter);
router.use(quotesRouter);
router.use(backendRouter);
router.use(backendAdminRouter);
router.use(contentRouter);
router.use(promoCodesRouter);
router.use(chatRouter);
router.use(notificationsRouter);
router.use(referralsRouter);
router.use(promotionsRouter);

/**
 * SSE endpoint — clients subscribe to one or more channels:
 *   GET /api/events?channels=order:5,restaurant:2
 * Channels:
 *   user:{id}             → per-user order_status notifications (private — must match auth userId)
 *   order:{id}            → order status + driver location for customer tracking
 *   restaurant:{id}       → new incoming orders (for restaurant dashboard, owners only)
 *   available_orders      → orders ready for pickup (drivers only)
 *   driver:{id}           → driver's own status + location stream (own id or admin)
 *   driver_orders:{id}    → orders newly assigned to a driver (own id or admin)
 *   admin_tracking        → global live ops dashboard (admin role required)
 */
router.get("/events", requireAuth, async (req, res): Promise<void> => {
  const authedReq = req as AuthedRequest;
  const userId = authedReq.userId!;
  const role = authedReq.userRole ?? "customer";
  const isAdmin = ["admin", "super_admin"].includes(role) ||
    (authedReq.userPermissions?.inheritedRoles ?? []).includes("super_admin");
  const isDriver = role === "driver" || isAdmin;
  const isOwner = role === "owner" || role === "restaurant" || role === "restaurant_owner" || isAdmin;

  const raw = (req.query.channels as string) ?? "";
  const channels = raw.split(",").map((c) => c.trim()).filter(Boolean);
  if (channels.length === 0) {
    res.status(400).json({ error: "channels query param required" });
    return;
  }

  // Per-channel authorization — reject the entire subscription if any channel is forbidden.
  for (const channel of channels) {
    if (channel.startsWith("user:")) {
      const targetId = parseInt(channel.slice(5), 10);
      if (!isAdmin && targetId !== userId) {
        res.status(403).json({ error: `Forbidden: cannot subscribe to ${channel}` });
        return;
      }
    } else if (channel === "admin_tracking") {
      if (!isAdmin) {
        res.status(403).json({ error: "Forbidden: admin_tracking requires admin role" });
        return;
      }
    } else if (channel.startsWith("driver:") || channel.startsWith("driver_orders:")) {
      // driverId is drivers.id — must resolve to users.id before comparing
      if (!isAdmin) {
        const driverId = parseInt(channel.split(":")[1] ?? "", 10);
        if (isNaN(driverId)) {
          res.status(400).json({ error: `Invalid channel: ${channel}` });
          return;
        }
        if (!isDriver) {
          res.status(403).json({ error: `Forbidden: cannot subscribe to ${channel}` });
          return;
        }
        const [driverRow] = await db
          .select({ userId: driversTable.userId })
          .from(driversTable)
          .where(eq(driversTable.id, driverId))
          .limit(1);
        if (!driverRow || driverRow.userId !== userId) {
          res.status(403).json({ error: `Forbidden: cannot subscribe to ${channel}` });
          return;
        }
      }
    } else if (channel.startsWith("restaurant:")) {
      // Owners may only subscribe to their own restaurant channel
      if (!isAdmin) {
        if (!isOwner) {
          res.status(403).json({ error: `Forbidden: cannot subscribe to ${channel}` });
          return;
        }
        const restaurantId = parseInt(channel.slice(11), 10);
        if (isNaN(restaurantId)) {
          res.status(400).json({ error: `Invalid channel: ${channel}` });
          return;
        }
        const [restaurant] = await db
          .select({ ownerId: restaurantsTable.ownerId })
          .from(restaurantsTable)
          .where(eq(restaurantsTable.id, restaurantId))
          .limit(1);
        if (!restaurant || restaurant.ownerId !== userId) {
          res.status(403).json({ error: `Forbidden: cannot subscribe to ${channel}` });
          return;
        }
      }
    } else if (channel === "available_orders") {
      if (!isDriver) {
        res.status(403).json({ error: "Forbidden: available_orders requires driver role" });
        return;
      }
    } else if (channel.startsWith("order:")) {
      // IDOR guard: order customer, assigned driver (resolved via driversTable), or restaurant owner
      if (!isAdmin) {
        const orderId = parseInt(channel.slice(6), 10);
        if (isNaN(orderId)) {
          res.status(400).json({ error: `Invalid channel: ${channel}` });
          return;
        }
        const [order] = await db
          .select({ userId: ordersTable.userId, restaurantId: ordersTable.restaurantId, driverId: ordersTable.driverId })
          .from(ordersTable)
          .where(eq(ordersTable.id, orderId))
          .limit(1);
        if (!order) {
          res.status(404).json({ error: "Order not found" });
          return;
        }
        let allowed = order.userId === userId;
        if (!allowed && order.driverId) {
          const [driverRow] = await db
            .select({ userId: driversTable.userId })
            .from(driversTable)
            .where(eq(driversTable.id, order.driverId))
            .limit(1);
          if (driverRow?.userId === userId) allowed = true;
        }
        if (!allowed && isOwner && order.restaurantId) {
          const [restaurant] = await db
            .select({ ownerId: restaurantsTable.ownerId })
            .from(restaurantsTable)
            .where(eq(restaurantsTable.id, order.restaurantId))
            .limit(1);
          if (restaurant?.ownerId === userId) allowed = true;
        }
        if (!allowed) {
          res.status(403).json({ error: `Forbidden: cannot subscribe to ${channel}` });
          return;
        }
      }
    }
  }

  subscribe(req, res, channels);
});

export default router;
