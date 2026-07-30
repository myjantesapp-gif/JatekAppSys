#!/usr/bin/env node
import { spawnSync } from "node:child_process";

if (process.env.NODE_ENV !== "production") {
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.warn("[push-prod-schema] DATABASE_URL not set; skipping push");
  process.exit(0);
}

console.log("[push-prod-schema] Pushing Drizzle schema to production database...");

const result = spawnSync(
  "pnpm",
  ["--filter", "@workspace/db", "run", "push-force"],
  { stdio: "inherit", env: process.env },
);

if (result.status !== 0) {
  console.error("[push-prod-schema] Schema push failed");
  process.exit(result.status ?? 1);
}

console.log("[push-prod-schema] Schema pushed successfully");
