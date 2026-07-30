import { Router, type IRouter } from "express";
import { db, paymentMethodsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, type AuthedRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/payment-methods", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const rows = await db
    .select()
    .from(paymentMethodsTable)
    .where(eq(paymentMethodsTable.userId, req.userId!))
    .orderBy(desc(paymentMethodsTable.isDefault), desc(paymentMethodsTable.createdAt));
  res.json(rows);
});

router.post("/payment-methods", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const userId = req.userId!;
  const { type, label, last4, brand, isDefault } = req.body ?? {};
  if (!type || !label) {
    res.status(400).json({ error: "type and label required" });
    return;
  }
  if (isDefault) {
    await db
      .update(paymentMethodsTable)
      .set({ isDefault: false })
      .where(eq(paymentMethodsTable.userId, userId));
  }
  const [row] = await db
    .insert(paymentMethodsTable)
    .values({
      userId,
      type,
      label,
      last4: last4 ?? null,
      brand: brand ?? null,
      isDefault: !!isDefault,
    })
    .returning();
  res.status(201).json(row);
});

router.patch("/payment-methods/:id", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const userId = req.userId!;
  const id = Number(req.params.id);
  const { type, label, last4, brand, isDefault } = req.body ?? {};
  const update: Record<string, unknown> = {};
  if (typeof type === "string") update.type = type;
  if (typeof label === "string") update.label = label;
  if (last4 === null || typeof last4 === "string") update.last4 = last4;
  if (brand === null || typeof brand === "string") update.brand = brand;
  if (typeof isDefault === "boolean") update.isDefault = isDefault;
  if (Object.keys(update).length === 0) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }
  if (isDefault === true) {
    await db
      .update(paymentMethodsTable)
      .set({ isDefault: false })
      .where(eq(paymentMethodsTable.userId, userId));
  }
  const [row] = await db
    .update(paymentMethodsTable)
    .set(update)
    .where(and(eq(paymentMethodsTable.id, id), eq(paymentMethodsTable.userId, userId)))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(row);
});

router.delete("/payment-methods/:id", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const userId = req.userId!;
  const id = Number(req.params.id);
  await db
    .delete(paymentMethodsTable)
    .where(and(eq(paymentMethodsTable.id, id), eq(paymentMethodsTable.userId, userId)));
  res.sendStatus(204);
});

export default router;
