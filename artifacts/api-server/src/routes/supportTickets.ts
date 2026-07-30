import { Router, type IRouter } from "express";
import { db, supportTicketsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, type AuthedRequest } from "../middlewares/auth";

const router: IRouter = Router();

// List tickets — admins see all (with author name/email), others see their own.
router.get("/support-tickets", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  if (["admin", "super_admin", "manager"].includes(req.userRole ?? "")) {
    const rows = await db
      .select({
        id: supportTicketsTable.id,
        userId: supportTicketsTable.userId,
        category: supportTicketsTable.category,
        subject: supportTicketsTable.subject,
        message: supportTicketsTable.message,
        status: supportTicketsTable.status,
        createdAt: supportTicketsTable.createdAt,
        userName: usersTable.name,
        userEmail: usersTable.email,
      })
      .from(supportTicketsTable)
      .leftJoin(usersTable, eq(usersTable.id, supportTicketsTable.userId))
      .orderBy(desc(supportTicketsTable.createdAt));
    res.json(rows);
    return;
  }

  const rows = await db
    .select()
    .from(supportTicketsTable)
    .where(eq(supportTicketsTable.userId, req.userId!))
    .orderBy(desc(supportTicketsTable.createdAt));
  res.json(rows);
});

router.post("/support-tickets", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const userId = req.userId!;
  const { category, subject, message } = req.body ?? {};
  if (!category || !subject || !message) {
    res.status(400).json({ error: "category, subject and message required" });
    return;
  }
  const [row] = await db
    .insert(supportTicketsTable)
    .values({ userId, category, subject, message, status: "open" })
    .returning();
  res.status(201).json(row);
});

// Admin-only: update status of a ticket
router.patch("/support-tickets/:id", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  if (!["admin", "super_admin", "manager"].includes(req.userRole ?? "")) {
    res.status(403).json({ error: "Admin only" });
    return;
  }
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const { status } = req.body ?? {};
  const allowed = ["open", "in_progress", "closed"];
  if (!allowed.includes(status)) {
    res.status(400).json({ error: "status must be one of open|in_progress|closed" });
    return;
  }
  const [updated] = await db
    .update(supportTicketsTable)
    .set({ status })
    .where(eq(supportTicketsTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }
  res.json(updated);
});

// Admin-only: delete a ticket
router.delete("/support-tickets/:id", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  if (!["admin", "super_admin"].includes(req.userRole ?? "")) {
    res.status(403).json({ error: "Admin only" });
    return;
  }
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(supportTicketsTable).where(eq(supportTicketsTable.id, id));
  res.sendStatus(204);
});

export default router;
