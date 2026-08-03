import { Router, type IRouter } from "express";
import { db, categoriesTable, menuItemCategoriesTable, adsTable, shortsTable } from "@workspace/db";
import { eq, asc, and, or, sql } from "drizzle-orm";
import { requireAuth, type AuthedRequest } from "../middlewares/auth";

const router: IRouter = Router();

// ─────────────────────────────────────────────────────────────
// Categories (public read)
// ─────────────────────────────────────────────────────────────

router.get("/categories", async (req, res): Promise<void> => {
  // Support optional filters: ?type=service_shortcut|category, ?businessType=restaurant, ?parentId=123, ?isActive=true|false
  const { type: typeFilter, businessType: btFilter, parentId: parentIdFilter } = req.query as Record<string, string | undefined>;

  const all = await db.select().from(categoriesTable)
    .where(eq(categoriesTable.isActive, true))
    .orderBy(asc(categoriesTable.sortOrder));

  // Apply type / businessType filters
  let filtered = all;
  if (typeFilter) filtered = filtered.filter((c) => c.type === typeFilter);
  if (btFilter)   filtered = filtered.filter((c) => c.businessType === btFilter);

  if (parentIdFilter !== undefined) {
    // Explicit parentId filter: return matching rows directly (flat list).
    // parentId=null or "" → top-level parents; parentId=<N> → children of that parent.
    const pid = parentIdFilter === "null" || parentIdFilter === "" ? null : Number(parentIdFilter);
    const rows = filtered.filter((c) => c.parentId === pid);
    if (pid === null) {
      // Return top-level parents with nested subCategories from the full set
      res.json(rows.map((p) => ({
        ...p,
        subCategories: all.filter((c) => c.parentId === p.id && c.isActive),
      })));
    } else {
      // Return children flat (no further nesting)
      res.json(rows);
    }
    return;
  }

  // Default (no parentId filter): return full hierarchy — parents with nested subCategories[]
  const parents = filtered.filter((c) => !c.parentId);
  const result = parents.map((p) => ({
    ...p,
    subCategories: all.filter((c) => c.parentId === p.id && c.isActive),
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
// ADMIN — Categories (read-all, including inactive)
// Note: POST/PATCH/DELETE for categories are handled by backend.ts.
//       POST/PATCH/DELETE for ads are handled by backendAdmin.ts.
// ─────────────────────────────────────────────────────────────

async function requireAdmin(req: AuthedRequest, res: any): Promise<boolean> {
  const roles = ["super_admin", "admin", "manager"];
  if (!req.userRole || !roles.includes(req.userRole)) {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }
  return true;
}

/** GET /backend/categories/all — returns ALL categories (including inactive) for the admin UI. */
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
