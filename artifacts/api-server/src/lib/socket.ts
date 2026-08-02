import type { Server as HttpServer } from "node:http";
import jwt from "jsonwebtoken";
import { Server as SocketIOServer, type Socket } from "socket.io";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

type JwtPayload = {
  userId?: number;
  id?: number;
  role?: string;
};

export type SocketUser = {
  id: number;
  name: string;
  role: string;
};

export type JatekSocket = Socket & {
  data: {
    user?: SocketUser;
  };
};

let io: SocketIOServer | null = null;

function allowedSocketOrigins(): true | string[] {
  if (process.env.NODE_ENV !== "production") return true;

  const configured = (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const customDomain = (process.env.EXPO_PUBLIC_DOMAIN ?? "").trim();
  if (customDomain) {
    configured.push(`https://${customDomain}`);
  }
  return [...new Set(configured)];
}

function getHandshakeToken(socket: Socket): string | null {
  const authToken = socket.handshake.auth?.token;
  if (typeof authToken === "string" && authToken.trim()) return authToken.trim();

  const authorization = socket.handshake.headers.authorization;
  if (typeof authorization === "string" && authorization.startsWith("Bearer ")) {
    return authorization.slice(7).trim() || null;
  }

  return null;
}

async function authenticateSocket(socket: JatekSocket): Promise<void> {
  const token = getHandshakeToken(socket);
  if (!token) throw new Error("Authentication required");

  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET environment variable is required");

  const payload = jwt.verify(token, secret) as JwtPayload;
  const userId = Number(payload.userId ?? payload.id);
  if (!Number.isInteger(userId) || userId <= 0) throw new Error("Invalid token");

  const [user] = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      role: usersTable.role,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  if (!user) throw new Error("User not found");

  socket.data.user = user;
}

export function attachSocketServer(httpServer: HttpServer): SocketIOServer {
  if (io) return io;

  io = new SocketIOServer(httpServer, {
    path: "/socket.io/",
    cors: {
      origin: allowedSocketOrigins(),
      credentials: true,
      methods: ["GET", "POST"],
    },
    transports: ["polling", "websocket"],
  });

  io.use(async (socket, next) => {
    // Keep the Engine.IO handshake reachable for health checks and clients
    // that authenticate immediately after connecting. When a token is
    // supplied, it must be valid; unauthenticated sockets simply cannot join
    // protected rooms or receive order events.
    if (!getHandshakeToken(socket)) {
      next();
      return;
    }
    try {
      await authenticateSocket(socket as JatekSocket);
      next();
    } catch (error) {
      logger.warn({ err: error, socketId: socket.id }, "Socket.IO authentication failed");
      next(new Error("Authentication required"));
    }
  });

  io.on("connection", (socket) => {
    const authenticatedSocket = socket as JatekSocket;
    const user = authenticatedSocket.data.user;
    if (!user) {
      logger.info({ socketId: socket.id }, "Socket.IO handshake connected without authentication");
      return;
    }

    socket.join(`user:${user.id}`);
    socket.join(`role:${user.role}`);
    if (["admin", "super_admin", "manager"].includes(user.role)) {
      socket.join("admin");
    }
    if (user.role === "driver") {
      socket.join("drivers");
      socket.join(`driver:${user.id}`);
      socket.join(`driver_orders:${user.id}`);
    }

    logger.info({ socketId: socket.id, userId: user.id, role: user.role }, "Socket.IO client connected");
    socket.on("disconnect", (reason) => {
      logger.info({ socketId: socket.id, userId: user.id, reason }, "Socket.IO client disconnected");
    });
  });

  return io;
}

export function getSocketServer(): SocketIOServer | null {
  return io;
}

export function emitOrderCreated(order: {
  id: number;
  restaurantId: number;
  driverId?: number | null;
  status: string;
  [key: string]: unknown;
}): void {
  if (!io) return;
  const payload = { orderId: order.id, order };
  io.to("admin").emit("order:created", payload);
  io.to(`restaurant:${order.restaurantId}`).emit("order:created", payload);

  if (order.driverId) {
    io.to(`driver:${order.driverId}`).emit("order:created", payload);
    io.to(`driver_orders:${order.driverId}`).emit("order:created", payload);
  } else if (order.status === "pending") {
    // New pending orders have no assigned driver yet: notify the driver pool.
    io.to("drivers").emit("order:created", payload);
  }
}

export function emitOrderUpdated(order: {
  id: number;
  userId?: number | null;
  restaurantId: number;
  driverId?: number | null;
  status: string;
  [key: string]: unknown;
}): void {
  if (!io) return;
  const payload = { orderId: order.id, status: order.status, order };
  io.to(`order:${order.id}`).emit("order:updated", payload);
  if (order.userId) {
    io.to(`user:${order.userId}`).emit("order:updated", payload);
  }
  io.to(`restaurant:${order.restaurantId}`).emit("order:updated", payload);
  io.to("admin").emit("order:updated", payload);
  if (order.driverId) {
    io.to(`driver:${order.driverId}`).emit("order:updated", payload);
    io.to(`driver_orders:${order.driverId}`).emit("order:updated", payload);
  }
}