import type { Server as HttpServer } from "node:http";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { db, driversTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";
import { setSocketPublisher } from "./sse";

type DriverIdentity = { id: number; userId: number };

declare module "socket.io" {
  interface SocketData {
    driver: DriverIdentity;
  }
}

const driverRoom = (id: number) => `driver_orders:${id}`;
const isProd = process.env.NODE_ENV === "production";
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function allowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true; // Native clients do not send Origin.
  if (!isProd) return true;
  if (origin === "https://driver.jatek.app") return true;
  if (allowedOrigins.includes(origin)) return true;
  const customHost = (process.env.EXPO_PUBLIC_DOMAIN ?? "").trim();
  try {
    if (customHost && new URL(origin).hostname === customHost) return true;
    const host = new URL(origin).hostname;
    const replitDeployment = process.env.REPLIT_DEPLOYMENT ||
      process.env.REPLIT_DEPLOYMENT_ID || process.env.REPLIT_DEPLOYMENT_DOMAIN;
    return Boolean(replitDeployment && (host.endsWith(".replit.dev") || host.endsWith(".replit.app")));
  } catch {
    return false;
  }
}

/** Attach Engine.IO before Express's SPA fallback can handle /socket.io/. */
export function attachDriverSocket(server: HttpServer): Server {
  if (!process.env.SESSION_SECRET) throw new Error("SESSION_SECRET is required");
  const io = new Server(server, {
    path: "/socket.io/",
    cors: {
      origin(origin, callback) {
        if (allowedOrigin(origin)) callback(null, origin || true);
        else callback(new Error("CORS: origin not allowed"));
      },
      methods: ["GET", "POST"],
    },
  });

  io.use(async (socket, next) => {
    const authToken = socket.handshake.auth?.token;
    const header = socket.handshake.headers.authorization;
    const token = typeof authToken === "string" && authToken
      ? authToken
      : typeof header === "string" && header.startsWith("Bearer ")
        ? header.slice(7)
        : null;
    if (!token) return next(new Error("401 Unauthorized"));

    try {
      const payload = jwt.verify(token, process.env.SESSION_SECRET!) as { userId?: unknown };
      if (!Number.isSafeInteger(payload.userId) || Number(payload.userId) <= 0) {
        return next(new Error("401 Unauthorized"));
      }
      const userId = Number(payload.userId);
      const [user] = await db.select({ role: usersTable.role })
        .from(usersTable).where(eq(usersTable.id, userId)).limit(1);
      if (!user) return next(new Error("401 Unauthorized"));
      if (user.role !== "driver") return next(new Error("403 Driver only"));
      const [driver] = await db.select({ id: driversTable.id, userId: driversTable.userId })
        .from(driversTable).where(eq(driversTable.userId, userId)).limit(1);
      if (!driver) return next(new Error("403 Driver profile missing"));
      // Never use the untrusted handshake.auth.driverId to select a room.
      socket.data.driver = driver;
      next();
    } catch (error) {
      logger.warn({ err: error }, "Socket.IO driver authentication failed");
      next(new Error("401 Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(driverRoom(socket.data.driver.id));
  });

  setSocketPublisher((channel, eventName, data) => {
    if (channel === "available_orders" && eventName === "order_ready") {
      // Eligibility comes from the authoritative driver table, not client channels.
      void db.select({ id: driversTable.id }).from(driversTable)
        .where(eq(driversTable.isAvailable, true))
        .then((drivers) => {
          for (const driver of drivers) io.to(driverRoom(driver.id)).emit(eventName, data);
        })
        .catch((err) => logger.error({ err }, "Socket.IO order_ready delivery failed"));
    } else if (eventName === "order_assigned" && /^driver_orders:[1-9]\d*$/.test(channel)) {
      const driverId = Number(channel.slice("driver_orders:".length));
      io.to(driverRoom(driverId)).emit(eventName, {
        ...(data && typeof data === "object" ? data : {}),
        driverId,
      });
    }
  });

  return io;
}