import { Router, type IRouter } from "express";
import { db, menuItemsTable, restaurantsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireRole, type AuthedRequest } from "../middlewares/auth";
import {
  CreateMenuItemBody,
  CreateMenuItemParams,
  UpdateMenuItemBody,
  UpdateMenuItemParams,
  DeleteMenuItemParams,
  GetMenuItemParams,
  ListMenuItemsParams,
  ListMenuItemsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

/** Returns the owner id of the parent restaurant for a menu item, or null if either is missing. */
async function getMenuItemOwnerId(menuItemId: number): Promise<number | null> {
  const [row] = await db
    .select({ ownerId: restaurantsTable.ownerId })
    .from(menuItemsTable)
    .innerJoin(restaurantsTable, eq(menuItemsTable.restaurantId, restaurantsTable.id))
    .where(eq(menuItemsTable.id, menuItemId))
    .limit(1);
  return row?.ownerId ?? null;
}

async function getRestaurantOwnerId(restaurantId: number): Promise<number | null> {
  const [row] = await db
    .select({ ownerId: restaurantsTable.ownerId })
    .from(restaurantsTable)
    .where(eq(restaurantsTable.id, restaurantId))
    .limit(1);
  return row?.ownerId ?? null;
}

router.get("/restaurants/:restaurantId/menu", async (req, res): Promise<void> => {
  const pathParams = ListMenuItemsParams.safeParse(req.params);
  if (!pathParams.success) {
    res.status(400).json({ error: pathParams.error.message });
    return;
  }

  const queryParams = ListMenuItemsQueryParams.safeParse(req.query);
  const restaurantId = pathParams.data.restaurantId;

  let conditions = [eq(menuItemsTable.restaurantId, restaurantId)];

  if (queryParams.success && queryParams.data.category) {
    conditions.push(eq(menuItemsTable.category, queryParams.data.category));
  }

  const items = await db.select().from(menuItemsTable).where(and(...conditions));
  res.json(items);
});

router.post("/restaurants/:restaurantId/menu", requireRole("admin", "restaurant_owner"), async (req: AuthedRequest, res): Promise<void> => {
  const pathParams = CreateMenuItemParams.safeParse(req.params);
  if (!pathParams.success) {
    res.status(400).json({ error: pathParams.error.message });
    return;
  }

  const parsed = CreateMenuItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (req.userRole !== "admin") {
    const ownerId = await getRestaurantOwnerId(pathParams.data.restaurantId);
    if (ownerId == null) {
      res.status(404).json({ error: "Restaurant not found" });
      return;
    }
    if (ownerId !== req.userId) {
      res.status(403).json({ error: "Forbidden: you do not own this restaurant" });
      return;
    }
  }

  const [item] = await db.insert(menuItemsTable).values({
    ...parsed.data,
    restaurantId: pathParams.data.restaurantId,
    isAvailable: parsed.data.isAvailable ?? true,
    isPopular: parsed.data.isPopular ?? false,
  }).returning();

  res.status(201).json(item);
});

router.get("/menu/:id", async (req, res): Promise<void> => {
  const params = GetMenuItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [item] = await db.select().from(menuItemsTable).where(eq(menuItemsTable.id, params.data.id)).limit(1);
  if (!item) {
    res.status(404).json({ error: "Menu item not found" });
    return;
  }

  res.json(item);
});

router.patch("/menu/:id", requireRole("admin", "restaurant_owner"), async (req: AuthedRequest, res): Promise<void> => {
  const params = UpdateMenuItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateMenuItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (req.userRole !== "admin") {
    const ownerId = await getMenuItemOwnerId(params.data.id);
    if (ownerId == null) {
      res.status(404).json({ error: "Menu item not found" });
      return;
    }
    if (ownerId !== req.userId) {
      res.status(403).json({ error: "Forbidden: you do not own this menu item" });
      return;
    }
  }

  const [item] = await db
    .update(menuItemsTable)
    .set(parsed.data)
    .where(eq(menuItemsTable.id, params.data.id))
    .returning();

  if (!item) {
    res.status(404).json({ error: "Menu item not found" });
    return;
  }

  res.json(item);
});

router.delete("/menu/:id", requireRole("admin", "restaurant_owner"), async (req: AuthedRequest, res): Promise<void> => {
  const params = DeleteMenuItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (req.userRole !== "admin") {
    const ownerId = await getMenuItemOwnerId(params.data.id);
    if (ownerId == null) {
      res.status(404).json({ error: "Menu item not found" });
      return;
    }
    if (ownerId !== req.userId) {
      res.status(403).json({ error: "Forbidden: you do not own this menu item" });
      return;
    }
  }

  try {
    await db.delete(menuItemsTable).where(eq(menuItemsTable.id, params.data.id));
    res.sendStatus(204);
  } catch (err: any) {
    // PostgreSQL FK violation: menu item is referenced by order_items
    if (err?.code === "23503") {
      res.status(409).json({ error: "Cannot delete menu item: it is referenced by existing orders. Mark it unavailable instead." });
      return;
    }
    throw err;
  }
});

export default router;
