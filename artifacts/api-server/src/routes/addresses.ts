import { Router, type IRouter } from "express";
import { db, addressesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, type AuthedRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/addresses", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const rows = await db
    .select()
    .from(addressesTable)
    .where(eq(addressesTable.userId, req.userId!))
    .orderBy(desc(addressesTable.isDefault), desc(addressesTable.createdAt));
  res.json(rows);
});

router.post("/addresses", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const userId = req.userId!;
  const { label, fullAddress, details, isDefault } = req.body ?? {};
  if (!label || !fullAddress) {
    res.status(400).json({ error: "label and fullAddress required" });
    return;
  }
  if (isDefault) {
    await db.update(addressesTable).set({ isDefault: false }).where(eq(addressesTable.userId, userId));
  }
  const [row] = await db
    .insert(addressesTable)
    .values({ userId, label, fullAddress, details: details ?? null, isDefault: !!isDefault })
    .returning();
  res.status(201).json(row);
});

router.patch("/addresses/:id", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const userId = req.userId!;
  const id = Number(req.params.id);
  const { label, fullAddress, details, isDefault } = req.body ?? {};
  if (isDefault) {
    await db.update(addressesTable).set({ isDefault: false }).where(eq(addressesTable.userId, userId));
  }
  const [row] = await db
    .update(addressesTable)
    .set({
      ...(label !== undefined ? { label } : {}),
      ...(fullAddress !== undefined ? { fullAddress } : {}),
      ...(details !== undefined ? { details } : {}),
      ...(isDefault !== undefined ? { isDefault: !!isDefault } : {}),
    })
    .where(and(eq(addressesTable.id, id), eq(addressesTable.userId, userId)))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(row);
});

router.delete("/addresses/:id", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const userId = req.userId!;
  const id = Number(req.params.id);
  await db
    .delete(addressesTable)
    .where(and(eq(addressesTable.id, id), eq(addressesTable.userId, userId)));
  res.sendStatus(204);
});

export default router;
