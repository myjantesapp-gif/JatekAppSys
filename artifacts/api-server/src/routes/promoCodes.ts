import { Router, type IRouter } from "express";
import { db, promoCodesTable, promoCodeUsagesTable, ordersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthedRequest } from "../middlewares/auth";

const router: IRouter = Router();

/** Validate a promo code for the current cart — returns discount details */
router.post("/promo-codes/validate", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const { code, restaurantId, subtotal } = req.body;
  if (!code || typeof code !== "string") {
    res.status(400).json({ error: "Code requis" });
    return;
  }

  const [promo] = await db
    .select()
    .from(promoCodesTable)
    .where(eq(promoCodesTable.code, code.toUpperCase().trim()))
    .limit(1);

  if (!promo || !promo.isActive) {
    res.status(404).json({ error: "Code promo invalide ou expiré", code: "INVALID_CODE" });
    return;
  }

  if (promo.expiresAt && new Date() > promo.expiresAt) {
    res.status(400).json({ error: "Ce code promo est expiré", code: "EXPIRED" });
    return;
  }

  if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
    res.status(400).json({ error: "Ce code promo a atteint son nombre maximum d'utilisations", code: "MAX_USES" });
    return;
  }

  if (promo.restaurantId && promo.restaurantId !== restaurantId) {
    res.status(400).json({ error: "Ce code promo n'est pas valide pour ce restaurant", code: "WRONG_RESTAURANT" });
    return;
  }

  if (subtotal < promo.minOrderAmount) {
    res.status(400).json({
      error: `Commande minimum de ${promo.minOrderAmount} MAD requise`,
      code: "MIN_ORDER",
      minOrderAmount: promo.minOrderAmount,
    });
    return;
  }

  // Per-user usage check
  const userUsages = await db
    .select()
    .from(promoCodeUsagesTable)
    .where(and(eq(promoCodeUsagesTable.promoCodeId, promo.id), eq(promoCodeUsagesTable.userId, req.userId!)));

  if (userUsages.length >= promo.maxUsesPerUser) {
    res.status(400).json({ error: "Vous avez déjà utilisé ce code promo", code: "ALREADY_USED" });
    return;
  }

  // First-order check
  if (promo.firstOrderOnly) {
    const [prevOrder] = await db
      .select({ id: ordersTable.id })
      .from(ordersTable)
      .where(eq(ordersTable.userId, req.userId!))
      .limit(1);
    if (prevOrder) {
      res.status(400).json({ error: "Ce code promo est réservé aux nouvelles commandes", code: "FIRST_ORDER_ONLY" });
      return;
    }
  }

  // Compute discount
  let discountAmount = 0;
  if (promo.type === "percentage") {
    discountAmount = Math.min(subtotal, (subtotal * promo.value) / 100);
  } else if (promo.type === "fixed") {
    discountAmount = Math.min(subtotal, promo.value);
  } else if (promo.type === "free_delivery") {
    discountAmount = 0; // delivery fee zeroed out — handled by caller
  }
  discountAmount = Math.round(discountAmount * 100) / 100;

  res.json({
    valid: true,
    promoCodeId: promo.id,
    type: promo.type,
    value: promo.value,
    discountAmount,
    description: promo.description,
  });
});

/** List all active promo codes (admin only) */
router.get("/promo-codes", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  if (req.userRole !== "admin" && req.userRole !== "super_admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const promos = await db.select().from(promoCodesTable);
  res.json(promos);
});

/** Create a promo code (admin only) */
router.post("/promo-codes", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  if (req.userRole !== "admin" && req.userRole !== "super_admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const { code, description, type, value, minOrderAmount, maxUses, maxUsesPerUser, firstOrderOnly, restaurantId, isActive, expiresAt } = req.body;
  if (!code || !type) {
    res.status(400).json({ error: "code et type requis" });
    return;
  }
  const [promo] = await db.insert(promoCodesTable).values({
    code: code.toUpperCase().trim(),
    description: description ?? null,
    type,
    value: value ?? 0,
    minOrderAmount: minOrderAmount ?? 0,
    maxUses: maxUses ?? null,
    maxUsesPerUser: maxUsesPerUser ?? 1,
    firstOrderOnly: firstOrderOnly ?? false,
    restaurantId: restaurantId ?? null,
    isActive: isActive ?? true,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
  }).returning();
  res.status(201).json(promo);
});

/** Update a promo code (admin only) */
router.patch("/promo-codes/:id", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  if (req.userRole !== "admin" && req.userRole !== "super_admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const allowed = ["code", "description", "type", "value", "minOrderAmount", "maxUses", "maxUsesPerUser", "firstOrderOnly", "isActive", "expiresAt", "restaurantId"];
  const updates: Record<string, unknown> = {};
  for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];
  const [promo] = await db.update(promoCodesTable).set(updates).where(eq(promoCodesTable.id, id)).returning();
  if (!promo) { res.status(404).json({ error: "Not found" }); return; }
  res.json(promo);
});

/** Delete a promo code (admin only) */
router.delete("/promo-codes/:id", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  if (req.userRole !== "admin" && req.userRole !== "super_admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(promoCodesTable).where(eq(promoCodesTable.id, id));
  res.json({ success: true });
});

export default router;
