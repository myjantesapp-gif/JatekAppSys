import { Router, type IRouter } from "express";
import { db, categoriesTable, menuItemCategoriesTable, adsTable, shortsTable } from "@workspace/db";
import { eq, asc, and, or, sql } from "drizzle-orm";
import { requireAuth, type AuthedRequest } from "../middlewares/auth";

const router: IRouter = Router();

// ─────────────────────────────────────────────────────────────
// Categories (public read)
// ─────────────────────────────────────────────────────────────

router.get("/categories", async (_req, res): Promise<void> => {
  const all = await db.select().from(categoriesTable).where(eq(categoriesTable.isActive, true)).orderBy(asc(categoriesTable.sortOrder));
  const parents = all.filter((c) => !c.parentId);
  const result = parents.map((p) => ({
    ...p,
    subCategories: all.filter((c) => c.parentId === p.id),
  }));
  res.json(result);
});

// ─────────────────────────────────────────────────────────────
// Menu-item categories (public read)
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/menu-categories?restaurantId=X
 * Returns global categories + categories owned by restaurantId (if provided).
 * Used by the client app to populate the category filter.
 */
router.get("/menu-categories", async (req, res): Promise<void> => {
  const rid = req.query.restaurantId ? Number(req.query.restaurantId) : null;
  const condition = rid !== null
    ? and(
        eq(menuItemCategoriesTable.isActive, true),
        or(
          sql`${menuItemCategoriesTable.restaurantId} IS NULL`,
          eq(menuItemCategoriesTable.restaurantId, rid)
        )
      )
    : eq(menuItemCategoriesTable.isActive, true);

  const rows = await db.select().from(menuItemCategoriesTable)
    .where(condition)
    .orderBy(asc(menuItemCategoriesTable.sortOrder), asc(menuItemCategoriesTable.name));
  res.json(rows);
});

// ─────────────────────────────────────────────────────────────
// Ads / Promos (public read)
// ─────────────────────────────────────────────────────────────

router.get("/ads", async (req, res): Promise<void> => {
  const type = req.query.type as string | undefined;
  const conditions = [eq(adsTable.isActive, true)];
  if (type) conditions.push(eq(adsTable.type, type));
  const rows = await db.select().from(adsTable).where(and(...conditions)).orderBy(asc(adsTable.sortOrder));
  res.json(rows);
});

// ─────────────────────────────────────────────────────────────
// Shorts (public read)
// ─────────────────────────────────────────────────────────────

router.get("/shorts", async (_req, res): Promise<void> => {
  const rows = await db.select().from(shortsTable).where(eq(shortsTable.isActive, true)).orderBy(asc(shortsTable.sortOrder));
  res.json(rows);
});

// ─────────────────────────────────────────────────────────────
// ADMIN — Categories CRUD
// ─────────────────────────────────────────────────────────────

async function requireAdmin(req: AuthedRequest, res: any): Promise<boolean> {
  const roles = ["super_admin", "admin", "manager"];
  if (!req.userRole || !roles.includes(req.userRole)) {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }
  return true;
}

router.get("/backend/categories/all", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  if (!await requireAdmin(req, res)) return;
  const all = await db.select().from(categoriesTable).orderBy(asc(categoriesTable.sortOrder));
  const parents = all.filter((c) => !c.parentId);
  const result = parents.map((p) => ({
    ...p,
    subCategories: all.filter((c) => c.parentId === p.id),
  }));
  res.json(result);
});

router.post("/backend/categories", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  if (!await requireAdmin(req, res)) return;
  const { name, slug, icon, accentColor, parentId, businessType, isActive, sortOrder } = req.body ?? {};
  if (!name || !slug) { res.status(400).json({ error: "name and slug required" }); return; }
  const [row] = await db.insert(categoriesTable).values({
    name,
    slug: String(slug).toLowerCase().replace(/\s+/g, "-"),
    icon: icon ?? "storefront",
    accentColor: accentColor ?? "#E91E63",
    parentId: parentId ?? null,
    businessType: businessType ?? "restaurant",
    isActive: isActive !== false,
    sortOrder: sortOrder ?? 0,
  }).returning();
  res.status(201).json(row);
});

router.patch("/backend/categories/:id", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  if (!await requireAdmin(req, res)) return;
  const id = Number(req.params.id);
  const { name, slug, icon, accentColor, parentId, businessType, isActive, sortOrder } = req.body ?? {};
  const updates: Record<string, any> = {};
  if (name !== undefined) updates.name = name;
  if (slug !== undefined) updates.slug = String(slug).toLowerCase().replace(/\s+/g, "-");
  if (icon !== undefined) updates.icon = icon;
  if (accentColor !== undefined) updates.accentColor = accentColor;
  if (parentId !== undefined) updates.parentId = parentId;
  if (businessType !== undefined) updates.businessType = businessType;
  if (isActive !== undefined) updates.isActive = isActive;
  if (sortOrder !== undefined) updates.sortOrder = sortOrder;
  const [row] = await db.update(categoriesTable).set(updates).where(eq(categoriesTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.delete("/backend/categories/:id", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  if (!await requireAdmin(req, res)) return;
  const id = Number(req.params.id);

  // Guard: prevent deleting a parent category that still has subcategories
  const children = await db.select({ id: categoriesTable.id }).from(categoriesTable).where(eq(categoriesTable.parentId, id)).limit(1);
  if (children.length > 0) {
    res.status(409).json({ error: "Impossible de supprimer : cette catégorie a des sous-catégories. Supprimez-les d'abord." });
    return;
  }

  await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
  res.status(204).end();
});

// ─────────────────────────────────────────────────────────────
// ADMIN — Ads CRUD
// ─────────────────────────────────────────────────────────────

router.get("/backend/ads", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  if (!await requireAdmin(req, res)) return;
  const rows = await db.select().from(adsTable).orderBy(asc(adsTable.sortOrder));
  res.json(rows);
});

router.post("/backend/ads", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  if (!await requireAdmin(req, res)) return;
  const { type, title, subtitle, badge, bgColor, accentColor, icon, imageUrl, linkUrl, isActive, sortOrder } = req.body ?? {};
  if (!title) { res.status(400).json({ error: "title required" }); return; }
  const [row] = await db.insert(adsTable).values({
    type: type ?? "vip_banner",
    title,
    subtitle: subtitle ?? null,
    badge: badge ?? null,
    bgColor: bgColor ?? "#E91E63",
    accentColor: accentColor ?? null,
    icon: icon ?? "star",
    imageUrl: imageUrl ?? null,
    linkUrl: linkUrl ?? null,
    isActive: isActive !== false,
    sortOrder: sortOrder ?? 0,
  }).returning();
  res.status(201).json(row);
});

router.patch("/backend/ads/:id", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  if (!await requireAdmin(req, res)) return;
  const id = Number(req.params.id);
  const updates: Record<string, any> = {};
  const fields = ["type", "title", "subtitle", "badge", "bgColor", "accentColor", "icon", "imageUrl", "linkUrl", "isActive", "sortOrder"];
  for (const f of fields) {
    if (req.body?.[f] !== undefined) updates[f] = req.body[f];
  }
  const [row] = await db.update(adsTable).set(updates).where(eq(adsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.delete("/backend/ads/:id", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  if (!await requireAdmin(req, res)) return;
  await db.delete(adsTable).where(eq(adsTable.id, Number(req.params.id)));
  res.status(204).end();
});

// ─────────────────────────────────────────────────────────────
// ADMIN — Shorts CRUD
// ─────────────────────────────────────────────────────────────

router.get("/backend/shorts", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  if (!await requireAdmin(req, res)) return;
  const rows = await db.select().from(shortsTable).orderBy(asc(shortsTable.sortOrder));
  res.json(rows);
});

router.post("/backend/shorts", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  if (!await requireAdmin(req, res)) return;
  const { title, imageUrl, videoUrl, restaurantId, restaurantName, isActive, sortOrder } = req.body ?? {};
  if (!title) { res.status(400).json({ error: "title required" }); return; }
  const [row] = await db.insert(shortsTable).values({
    title,
    imageUrl: imageUrl ?? null,
    videoUrl: videoUrl ?? null,
    restaurantId: restaurantId ?? null,
    restaurantName: restaurantName ?? null,
    isActive: isActive !== false,
    sortOrder: sortOrder ?? 0,
  }).returning();
  res.status(201).json(row);
});

router.patch("/backend/shorts/:id", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  if (!await requireAdmin(req, res)) return;
  const id = Number(req.params.id);
  const updates: Record<string, any> = {};
  const fields = ["title", "imageUrl", "videoUrl", "restaurantId", "restaurantName", "isActive", "sortOrder"];
  for (const f of fields) {
    if (req.body?.[f] !== undefined) updates[f] = req.body[f];
  }
  const [row] = await db.update(shortsTable).set(updates).where(eq(shortsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.delete("/backend/shorts/:id", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  if (!await requireAdmin(req, res)) return;
  await db.delete(shortsTable).where(eq(shortsTable.id, Number(req.params.id)));
  res.status(204).end();
});

export default router;
