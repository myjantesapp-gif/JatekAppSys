import { Router, type IRouter } from "express";
import { db, menuItemsTable, menuItemSizesTable, menuItemExtrasTable, restaurantsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireRole, requireAuth, type AuthedRequest } from "../middlewares/auth";

const router: IRouter = Router();

async function getRestaurantOwnerIdByMenuItem(menuItemId: number): Promise<number | null> {
  const [row] = await db
    .select({ ownerId: restaurantsTable.ownerId })
    .from(menuItemsTable)
    .innerJoin(restaurantsTable, eq(menuItemsTable.restaurantId, restaurantsTable.id))
    .where(eq(menuItemsTable.id, menuItemId))
    .limit(1);
  return row?.ownerId ?? null;
}

async function getRestaurantOwnerIdBySize(sizeId: number): Promise<number | null> {
  const [row] = await db
    .select({ ownerId: restaurantsTable.ownerId })
    .from(menuItemSizesTable)
    .innerJoin(menuItemsTable, eq(menuItemSizesTable.menuItemId, menuItemsTable.id))
    .innerJoin(restaurantsTable, eq(menuItemsTable.restaurantId, restaurantsTable.id))
    .where(eq(menuItemSizesTable.id, sizeId))
    .limit(1);
  return row?.ownerId ?? null;
}

async function getRestaurantOwnerIdByExtra(extraId: number): Promise<number | null> {
  const [row] = await db
    .select({ ownerId: restaurantsTable.ownerId })
    .from(menuItemExtrasTable)
    .innerJoin(menuItemsTable, eq(menuItemExtrasTable.menuItemId, menuItemsTable.id))
    .innerJoin(restaurantsTable, eq(menuItemsTable.restaurantId, restaurantsTable.id))
    .where(eq(menuItemExtrasTable.id, extraId))
    .limit(1);
  return row?.ownerId ?? null;
}

function checkOwnership(req: AuthedRequest, ownerId: number | null): boolean {
  return req.userRole === "admin" || req.userRole === "super_admin" || (ownerId !== null && ownerId === req.userId);
}

// ---------- Sizes ----------

router.get("/menu/:id/sizes", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const rows = await db.select().from(menuItemSizesTable).where(eq(menuItemSizesTable.menuItemId, id)).orderBy(menuItemSizesTable.sortOrder);
  res.json(rows);
});

router.post("/menu/:id/sizes", requireRole("admin", "super_admin", "restaurant_owner"), async (req: AuthedRequest, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const ownerId = await getRestaurantOwnerIdByMenuItem(id);
  if (!checkOwnership(req, ownerId)) { res.status(403).json({ error: "Forbidden" }); return; }

  const { name, priceAdjustment, sortOrder, isAvailable } = req.body || {};
  if (!name || typeof name !== "string") { res.status(400).json({ error: "name is required" }); return; }
  const [row] = await db.insert(menuItemSizesTable).values({
    menuItemId: id,
    name,
    priceAdjustment: Number(priceAdjustment) || 0,
    sortOrder: Number(sortOrder) || 0,
    isAvailable: isAvailable !== false,
  }).returning();
  res.status(201).json(row);
});

router.patch("/menu/sizes/:id", requireRole("admin", "super_admin", "restaurant_owner"), async (req: AuthedRequest, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const ownerId = await getRestaurantOwnerIdBySize(id);
  if (!checkOwnership(req, ownerId)) { res.status(403).json({ error: "Forbidden" }); return; }

  const allowed = ["name", "priceAdjustment", "sortOrder", "isAvailable"];
  const updates: Record<string, unknown> = {};
  for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];
  const [row] = await db.update(menuItemSizesTable).set(updates).where(eq(menuItemSizesTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.delete("/menu/sizes/:id", requireRole("admin", "super_admin", "restaurant_owner"), async (req: AuthedRequest, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const ownerId = await getRestaurantOwnerIdBySize(id);
  if (!checkOwnership(req, ownerId)) { res.status(403).json({ error: "Forbidden" }); return; }
  await db.delete(menuItemSizesTable).where(eq(menuItemSizesTable.id, id));
  res.sendStatus(204);
});

// ---------- Extras ----------

router.get("/menu/:id/extras", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const rows = await db.select().from(menuItemExtrasTable).where(eq(menuItemExtrasTable.menuItemId, id)).orderBy(menuItemExtrasTable.sortOrder);
  res.json(rows);
});

router.post("/menu/:id/extras", requireRole("admin", "super_admin", "restaurant_owner"), async (req: AuthedRequest, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const ownerId = await getRestaurantOwnerIdByMenuItem(id);
  if (!checkOwnership(req, ownerId)) { res.status(403).json({ error: "Forbidden" }); return; }

  const { name, price, sortOrder, isAvailable } = req.body || {};
  if (!name || typeof name !== "string") { res.status(400).json({ error: "name is required" }); return; }
  const [row] = await db.insert(menuItemExtrasTable).values({
    menuItemId: id,
    name,
    price: Number(price) || 0,
    sortOrder: Number(sortOrder) || 0,
    isAvailable: isAvailable !== false,
  }).returning();
  res.status(201).json(row);
});

router.patch("/menu/extras/:id", requireRole("admin", "super_admin", "restaurant_owner"), async (req: AuthedRequest, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const ownerId = await getRestaurantOwnerIdByExtra(id);
  if (!checkOwnership(req, ownerId)) { res.status(403).json({ error: "Forbidden" }); return; }

  const allowed = ["name", "price", "sortOrder", "isAvailable"];
  const updates: Record<string, unknown> = {};
  for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];
  const [row] = await db.update(menuItemExtrasTable).set(updates).where(eq(menuItemExtrasTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.delete("/menu/extras/:id", requireRole("admin", "super_admin", "restaurant_owner"), async (req: AuthedRequest, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const ownerId = await getRestaurantOwnerIdByExtra(id);
  if (!checkOwnership(req, ownerId)) { res.status(403).json({ error: "Forbidden" }); return; }
  await db.delete(menuItemExtrasTable).where(eq(menuItemExtrasTable.id, id));
  res.sendStatus(204);
});

export default router;
