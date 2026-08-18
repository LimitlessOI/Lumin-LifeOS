/**
 * SYNOPSIS: Public runtime heartbeat for deployment liveness and credential-presence observability.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const STARTED_AT_MS = Date.now();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const RECEIPT_PATH = path.join(ROOT, "products/receipts/RUNTIME_HEARTBEAT_ABBOTT.json");

function present(name) {
  return Boolean(String(process.env[name] || "").trim());
}

function resolveGitSha() {
  const railwaySha = String(process.env.RAILWAY_GIT_COMMIT_SHA || "").trim();
  if (railwaySha) return railwaySha;
  try {
    return String(execSync("git rev-parse HEAD", {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 2000,
    })).trim() || null;
  } catch {
    return null;
  }
}

export function buildRuntimeHeartbeat() {
  return {
    system: "abbott",
    alive: true,
    model_keys_present:
      present("ANTHROPIC_API_KEY") ||
      present("OPENAI_API_KEY") ||
      present("GOOGLE_API_KEY") ||
      present("GEMINI_API_KEY"),
    git_sha: resolveGitSha(),
    started_at: new Date(STARTED_AT_MS).toISOString(),
    at: new Date().toISOString(),
    railway_service_id: process.env.RAILWAY_SERVICE_ID || null,
    railway_environment_id: process.env.RAILWAY_ENVIRONMENT_ID || null,
  };
}

function writeBootReceipt(logger = console) {
  const heartbeat = buildRuntimeHeartbeat();
  try {
    fs.mkdirSync(path.dirname(RECEIPT_PATH), { recursive: true });
    fs.writeFileSync(RECEIPT_PATH, `${JSON.stringify(heartbeat, null, 2)}\n`, "utf8");
    logger.info?.("[RUNTIME-HEARTBEAT] Abbott boot receipt written", {
      path: "products/receipts/RUNTIME_HEARTBEAT_ABBOTT.json",
      git_sha: heartbeat.git_sha,
    });
  } catch (error) {
    logger.warn?.("[RUNTIME-HEARTBEAT] Abbott boot receipt write failed", {
      error: error.message,
    });
  }
  return heartbeat;
}

export function registerRuntimeHeartbeatRoutes(app, deps = {}) {
  const { logger = console } = deps;
  const router = express.Router();

  writeBootReceipt(logger);

  router.get("/", (_req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    return res.status(200).json(buildRuntimeHeartbeat());
  });

  app.use("/api/v1/runtime/heartbeat", router);
  logger.info?.("✅ [RUNTIME-HEARTBEAT] Abbott heartbeat mounted at /api/v1/runtime/heartbeat");
}

export default registerRuntimeHeartbeatRoutes;
