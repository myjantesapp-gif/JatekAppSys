import app from "./app";
import { logger } from "./lib/logger";
import { runSeedIfEmpty } from "./seed";
import { startTrackingWatchdog } from "./lib/trackingService";
import { createServer } from "node:http";
import { attachDriverSocket } from "./lib/driverSocket";

const rawPort = process.env["PORT"] ?? "8080";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = createServer(app);
const sockets = attachDriverSocket(server);
server.listen(port, "0.0.0.0", () => {
  logger.info({ port }, "Server listening on 0.0.0.0");

  runSeedIfEmpty().catch((e) => logger.error({ err: e }, "Seed error"));

  // Start the in-memory driver tracking watchdog (flips silent drivers to
  // offline after 30s, broadcasts driver_offline events on the relevant SSE
  // channels). Idempotent — safe across hot reloads.
  startTrackingWatchdog();
});

server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;
server.requestTimeout = 30_000;

const shutdown = (signal: string) => {
  logger.info({ signal }, "Received shutdown signal, closing server...");
  sockets.close((err?: Error) => {
    if (err) {
      logger.error({ err }, "Error during server close");
      process.exit(1);
    }
    logger.info("Server closed");
    process.exit(0);
  });
  setTimeout(() => {
    logger.warn("Forcing process exit after timeout");
    process.exit(1);
  }, 10_000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled promise rejection");
});

process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception");
});
