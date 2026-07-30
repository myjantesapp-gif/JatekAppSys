import { Router, type IRouter } from "express";
import { db, favoritesTable, restaurantsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthedRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/favorites", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const userId = req.userId!;
  const rows = await db
    .select({
      id: favoritesTable.id,
      restaurantId: favoritesTable.restaurantId,
      createdAt: favoritesTable.createdAt,
      restaurant: restaurantsTable,
    })
    .from(favoritesTable)
    .leftJoin(restaurantsTable, eq(restaurantsTable.id, favoritesTable.restaurantId))
    .where(eq(favoritesTable.userId, userId));
  res.json(rows);
});

router.post("/favorites", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const userId = req.userId!;
  const restaurantId = Number(req.body?.restaurantId);
  if (!restaurantId) {
    res.status(400).json({ error: "restaurantId required" });
    return;
  }
  try {
    const [row] = await db
      .insert(favoritesTable)
      .values({ userId, restaurantId })
      .returning();
    res.status(201).json(row);
  } catch {
    const [row] = await db
      .select()
      .from(favoritesTable)
      .where(and(eq(favoritesTable.userId, userId), eq(favoritesTable.restaurantId, restaurantId)))
      .limit(1);
    res.json(row);
  }
});

router.delete("/favorites/:restaurantId", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const userId = req.userId!;
  const restaurantId = Number(req.params.restaurantId);
  await db
    .delete(favoritesTable)
    .where(and(eq(favoritesTable.userId, userId), eq(favoritesTable.restaurantId, restaurantId)));
  res.sendStatus(204);
});

export default router;
