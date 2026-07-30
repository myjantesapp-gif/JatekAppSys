import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET environment variable is required");
}
const JWT_SECRET = process.env.SESSION_SECRET;

export interface AuthedRequest extends Request {
  userId?: number;
  userName?: string;
  userRole?: string;
  /** Custom permissions when role === 'other'. */
  userPermissions?: { inheritedRoles?: string[]; grants?: string[] } | null;
}

type DecodedUser = {
  id: number;
  name: string;
  role: string;
  permissions: { inheritedRoles?: string[]; grants?: string[] } | null;
};

async function decodeUser(req: Request): Promise<DecodedUser | null> {
  const header = req.headers.authorization;
  let token: string | null = null;
  if (header && header.startsWith("Bearer ")) {
    token = header.slice(7);
  } else if (typeof req.query.token === "string" && req.query.token.length > 0) {
    // ?token= is accepted only for endpoints that browsers must reach without
    // custom headers: the SSE stream (EventSource cannot set Authorization)
    // and order invoice downloads (opened via Linking/window.open).
    // req.path is the sub-path after the "/api" mount, so use req.originalUrl
    // for a reliable full-path check.
    const rawPath = req.originalUrl.split("?")[0];
    const isAllowedQueryTokenPath =
      rawPath === "/api/events" ||
      rawPath.endsWith("/invoice");
    if (isAllowedQueryTokenPath) {
      token = req.query.token;
    }
  }
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number };
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, payload.userId))
      .limit(1);
    if (!user) return null;
    return {
      id: user.id,
      name: user.name,
      role: user.role,
      permissions: (user as { permissions?: unknown }).permissions as DecodedUser["permissions"] ?? null,
    };
  } catch {
    return null;
  }
}

function setAuthOnReq(req: AuthedRequest, user: DecodedUser): void {
  req.userId = user.id;
  req.userName = user.name;
  req.userRole = user.role;
  req.userPermissions = user.permissions;
}

/** Returns true if a user with role='other' inherits ANY of the given roles. */
function otherInherits(user: DecodedUser, roles: string[]): boolean {
  if (user.role !== "other") return false;
  const inherited = user.permissions?.inheritedRoles ?? [];
  if (inherited.includes("super_admin")) return true; // wildcard
  return roles.some((r) => inherited.includes(r));
}

/** Attaches userId/userName/userRole to req when a valid token is present; never blocks. */
export async function attachAuth(req: AuthedRequest, _res: Response, next: NextFunction): Promise<void> {
  const user = await decodeUser(req);
  if (user) setAuthOnReq(req, user);
  next();
}

/** Rejects with 401 when no valid token is present. */
export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  const user = await decodeUser(req);
  if (!user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  setAuthOnReq(req, user);
  next();
}

/**
 * Rejects with 401/403 unless the authenticated user has one of the allowed roles.
 * A user with role='other' is allowed if their `permissions.inheritedRoles`
 * intersects the allowed roles, or includes 'super_admin' (wildcard).
 */
export function requireRole(...roles: string[]) {
  return async function (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
    const user = await decodeUser(req);
    if (!user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const allowed = roles.includes(user.role) || otherInherits(user, roles);
    if (!allowed) {
      res.status(403).json({ error: "Forbidden: insufficient permissions" });
      return;
    }
    setAuthOnReq(req, user);
    next();
  };
}
