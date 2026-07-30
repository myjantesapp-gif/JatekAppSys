import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, ilike, and } from "drizzle-orm";
import {
  UpdateUserBody,
  UpdateUserParams,
  GetUserParams,
  DeleteUserParams,
  ListUsersQueryParams,
} from "@workspace/api-zod";
import { requireAuth, attachAuth, type AuthedRequest } from "../middlewares/auth";

const router: IRouter = Router();

const USER_SAFE_FIELDS = {
  id: usersTable.id,
  name: usersTable.name,
  email: usersTable.email,
  role: usersTable.role,
  phone: usersTable.phone,
  address: usersTable.address,
  avatarUrl: usersTable.avatarUrl,
  isActive: usersTable.isActive,
  loyaltyPoints: usersTable.loyaltyPoints,
  walletBalance: usersTable.walletBalance,
  createdAt: usersTable.createdAt,
};

// requireAuth: must be logged in; admins can list all, customers only their own record via /users/:id
router.get("/users", requireAuth, async (req: AuthedRequest, res, next): Promise<void> => {
  try {
    if (req.userRole !== "admin" && req.userRole !== "super_admin") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const queryParams = ListUsersQueryParams.safeParse(req.query);
    let conditions: any[] = [];

    if (queryParams.success) {
      const { role, search } = queryParams.data;
      if (role) conditions.push(eq(usersTable.role, role));
      if (search) conditions.push(ilike(usersTable.name, `%${search}%`));
    }

    const users = conditions.length > 0
      ? await db.select(USER_SAFE_FIELDS).from(usersTable).where(and(...conditions))
      : await db.select(USER_SAFE_FIELDS).from(usersTable);

    res.json(users);
  } catch (err) {
    next(err);
  }
});

router.get("/users/:id", attachAuth, async (req: AuthedRequest, res, next): Promise<void> => {
  try {
    const params = GetUserParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    // Anyone can view a public profile, but wallet balance is private
    const [user] = await db
      .select(USER_SAFE_FIELDS)
      .from(usersTable)
      .where(eq(usersTable.id, params.data.id))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Hide wallet balance from non-owners and non-admins
    const isOwn = req.userId === user.id;
    const isAdmin = req.userRole === "admin" || req.userRole === "super_admin";
    if (!isOwn && !isAdmin) {
      const { walletBalance: _, ...pub } = user;
      res.json(pub);
      return;
    }

    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.patch("/users/:id", requireAuth, async (req: AuthedRequest, res, next): Promise<void> => {
  try {
    const params = UpdateUserParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    if (req.userId !== params.data.id && req.userRole !== "admin") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const parsed = UpdateUserBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [user] = await db
      .update(usersTable)
      .set(parsed.data)
      .where(eq(usersTable.id, params.data.id))
      .returning(USER_SAFE_FIELDS);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.delete("/users/:id", requireAuth, async (req: AuthedRequest, res, next): Promise<void> => {
  try {
    const params = DeleteUserParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    if (req.userId !== params.data.id && req.userRole !== "admin") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    await db.delete(usersTable).where(eq(usersTable.id, params.data.id));
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
});

export default router;
