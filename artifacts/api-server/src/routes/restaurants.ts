import { Router, type IRouter } from "express";
import { db, restaurantsTable, ordersTable, reviewsTable } from "@workspace/db";
import { eq, ilike, and, or, avg, count, sum, sql } from "drizzle-orm";
import {
  CreateRestaurantBody,
  UpdateRestaurantBody,
  GetRestaurantParams,
  UpdateRestaurantParams,
  DeleteRestaurantParams,
  GetRestaurantStatsParams,
  ListRestaurantsQueryParams,
} from "@workspace/api-zod";
import { requireAuth, requireRole, type AuthedRequest } from "../middlewares/auth";

const router: IRouter = Router();

// Defaults applied when a restaurant row has no explicit value yet.
// Threshold is global for now (no DB column) — the restaurant payload always
// returns it so the apps can stop hard-coding it on their side.
const DEFAULT_DELIVERY_FEE = 15;
const DEFAULT_FREE_DELIVERY_THRESHOLD = 150;

function withDeliveryDefaults<T extends { deliveryFee?: number | null }>(r: T) {
  return {
    ...r,
    deliveryFee: typeof r.deliveryFee === "number" ? r.deliveryFee : DEFAULT_DELIVERY_FEE,
    freeDeliveryThreshold: DEFAULT_FREE_DELIVERY_THRESHOLD,
  };
}

router.post("/restaurants/:id/track-click", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ error: "Invalid restaurant id" });
    return;
  }
  const [row] = await db
    .update(restaurantsTable)
    .set({ clickCount: sql`${restaurantsTable.clickCount} + 1` })
    .where(eq(restaurantsTable.id, id))
    .returning({ clickCount: restaurantsTable.clickCount });
  if (!row) {
    res.status(404).json({ error: "Restaurant not found" });
    return;
  }
  res.json({ id, clickCount: row.clickCount });
});

router.get("/restaurants/featured", async (_req, res): Promise<void> => {
  const restaurants = await db
    .select()
    .from(restaurantsTable)
    .where(and(eq(restaurantsTable.isVerified, true), eq(restaurantsTable.isOpen, true)))
    .limit(6);
  res.json(restaurants.map(withDeliveryDefaults));
});

router.get("/restaurants", async (req, res): Promise<void> => {
  const params = ListRestaurantsQueryParams.safeParse(req.query);
  const query = params.success ? params.data : {};

  let conditions: ReturnType<typeof and>[] = [];

  if (query.isOpen !== undefined) {
    conditions.push(eq(restaurantsTable.isOpen, query.isOpen));
  }
  if (query.isLocal !== undefined) {
    conditions.push(eq(restaurantsTable.isLocal, query.isLocal));
  }
  if (query.category) {
    conditions.push(eq(restaurantsTable.category, query.category));
  }
  if (query.businessType) {
    conditions.push(eq(restaurantsTable.businessType, query.businessType));
  }
  if (query.search) {
    const term = `%${query.search}%`;
    const searchCond = or(
      ilike(restaurantsTable.name, term),
      ilike(restaurantsTable.description, term),
      ilike(restaurantsTable.category, term),
      ilike(restaurantsTable.address, term),
    );
    if (searchCond) conditions.push(searchCond);
  }
  if (query.ownerId !== undefined) {
    conditions.push(eq(restaurantsTable.ownerId, query.ownerId));
  }

  const restaurants = conditions.length > 0
    ? await db.select().from(restaurantsTable).where(and(...conditions))
    : await db.select().from(restaurantsTable);

  res.json(restaurants.map(withDeliveryDefaults));
});

router.post("/restaurants", requireRole("admin"), async (req: AuthedRequest, res): Promise<void> => {
  const parsed = CreateRestaurantBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (!req.userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  // Admins can specify a target ownerId in the raw body; all others always own the restaurant themselves
  const adminOwnerId = req.userRole === "admin" && typeof req.body?.ownerId === "number" ? req.body.ownerId : null;
  const ownerId = adminOwnerId ?? req.userId;

  const [restaurant] = await db.insert(restaurantsTable).values({
    ...parsed.data,
    ownerId,
    isVerified: false,
    isOpen: true,
    reviewCount: 0,
  }).returning();

  res.status(201).json(restaurant);
});

router.get("/restaurants/:id", async (req, res): Promise<void> => {
  const params = GetRestaurantParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [restaurant] = await db.select().from(restaurantsTable).where(eq(restaurantsTable.id, params.data.id)).limit(1);
  if (!restaurant) {
    res.status(404).json({ error: "Restaurant not found" });
    return;
  }

  res.json(withDeliveryDefaults(restaurant));
});

router.patch("/restaurants/:id", requireRole("admin", "restaurant_owner"), async (req: AuthedRequest, res): Promise<void> => {
  // Ownership check: non-admin owners may only modify their own restaurant.
  if (req.userRole !== "admin") {
    const idParam = parseInt(String(req.params.id ?? ""), 10);
    if (Number.isNaN(idParam)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const [existing] = await db.select().from(restaurantsTable).where(eq(restaurantsTable.id, idParam)).limit(1);
    if (!existing) {
      res.status(404).json({ error: "Restaurant not found" });
      return;
    }
    if (existing.ownerId !== req.userId) {
      res.status(403).json({ error: "Forbidden: you do not own this restaurant" });
      return;
    }
  }
  const params = UpdateRestaurantParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateRestaurantBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updatePayload: any = { ...parsed.data };
  // Only admins may reassign ownership; strip ownerId for non-admins.
  if (req.userRole !== "admin" && req.userRole !== "super_admin") delete updatePayload.ownerId;
  // Coerce empty string phone to null for schema consistency.
  if (updatePayload.phone === "") updatePayload.phone = null;

  const [restaurant] = await db
    .update(restaurantsTable)
    .set(updatePayload)
    .where(eq(restaurantsTable.id, params.data.id))
    .returning();

  if (!restaurant) {
    res.status(404).json({ error: "Restaurant not found" });
    return;
  }

  res.json(restaurant);
});

/**
 * Complete the restaurant owner's mandatory business profile.
 * Sets `profileCompletedAt` once legalName + ICE are present, which gates
 * the ability to accept incoming orders.
 */
router.post("/restaurants/:id/complete-profile", requireRole("admin", "restaurant_owner"), async (req: AuthedRequest, res): Promise<void> => {
  const id = parseInt(String(req.params.id ?? ""), 10);
  if (Number.isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [existing] = await db.select().from(restaurantsTable).where(eq(restaurantsTable.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "Restaurant not found" }); return; }
  if (req.userRole !== "admin" && existing.ownerId !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const legalName = typeof req.body?.legalName === "string" ? req.body.legalName.trim() : null;
  const ice = typeof req.body?.ice === "string" ? req.body.ice.trim() : null;
  const printerEmail = typeof req.body?.printerEmail === "string" ? req.body.printerEmail.trim() : null;

  if (!legalName || legalName.length < 2) {
    res.status(400).json({ error: "legalName is required" });
    return;
  }
  if (!ice || !/^\d{8,15}$/.test(ice)) {
    res.status(400).json({ error: "ICE must be 8 to 15 digits" });
    return;
  }
  if (printerEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(printerEmail)) {
    res.status(400).json({ error: "printerEmail is not a valid email" });
    return;
  }

  const [updated] = await db
    .update(restaurantsTable)
    .set({
      legalName,
      ice,
      printerEmail: printerEmail || null,
      profileCompletedAt: new Date(),
    })
    .where(eq(restaurantsTable.id, id))
    .returning();

  res.json(updated);
});

router.delete("/restaurants/:id", requireRole("admin"), async (req: AuthedRequest, res): Promise<void> => {
  const params = DeleteRestaurantParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db.delete(restaurantsTable).where(eq(restaurantsTable.id, params.data.id));
  res.sendStatus(204);
});

router.get("/restaurants/:id/stats", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const params = GetRestaurantStatsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const id = params.data.id;

  const [orderStats] = await db
    .select({
      totalOrders: count(),
      completedOrders: count(ordersTable.id),
      totalRevenue: sum(ordersTable.total),
    })
    .from(ordersTable)
    .where(eq(ordersTable.restaurantId, id));

  const [completedStats] = await db
    .select({ completedOrders: count() })
    .from(ordersTable)
    .where(and(eq(ordersTable.restaurantId, id), eq(ordersTable.status, "delivered")));

  const [pendingStats] = await db
    .select({ pendingOrders: count() })
    .from(ordersTable)
    .where(and(eq(ordersTable.restaurantId, id), eq(ordersTable.status, "pending")));

  const [reviewStats] = await db
    .select({ avgRating: avg(reviewsTable.rating), totalReviews: count() })
    .from(reviewsTable)
    .where(eq(reviewsTable.restaurantId, id));

  res.json({
    totalOrders: Number(orderStats?.totalOrders || 0),
    completedOrders: Number(completedStats?.completedOrders || 0),
    totalRevenue: Number(orderStats?.totalRevenue || 0),
    averageRating: reviewStats?.avgRating ? Number(reviewStats.avgRating) : null,
    totalReviews: Number(reviewStats?.totalReviews || 0),
    pendingOrders: Number(pendingStats?.pendingOrders || 0),
  });
});

export default router;
