/**
 * SYNOPSIS: Founder-builder minimal runtime entrypoint.
 * @authority Legacy production spine — founder-builder minimal lane only.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 *
 * Purpose:
 * - Boot the founder shell and BuilderOS entry routes with the smallest viable import graph.
 * - Keep Railway edge liveness stable while the founder uses Lumin to drive the builder.
 * - Defer the broad legacy/full-runtime product stack entirely.
 */

import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import process from "node:process";
import { fileURLToPath } from "url";
import { createServer } from "http";

import logger from "./services/logger.js";
import { applyMiddleware } from "./middleware/apply-middleware.js";
import { registerPublicRoutes } from "./routes/public-routes.js";
import { createDbPool } from "./services/db.js";
import { initDb } from "./db/index.js";
import { startDbHealthMonitor } from "./services/db-health-monitor.js";
import { requestTracer } from "./middleware/request-tracer.js";
import { createTruthResponseEnforcer } from "./middleware/truth-response-enforcer.js";
import { createSavingsLedger } from "./services/savings-ledger.js";
import { createTokenAccountingService } from "./services/token-accounting-service.js";
import { createBuilderOSControlPlaneService } from "./services/builderos-control-plane-service.js";
import { createCouncilService } from "./services/council-service.js";
import { COUNCIL_ALIAS_MAP, createCouncilMembers } from "./config/council-members.js";
import { createTSOSPlatformKernel } from "./services/tsos-platform-kernel.js";
import { createDeploymentService } from "./services/deployment-service.js";
import { getCachedResponse, cacheResponse } from "./services/response-cache.js";
import { registerFounderRuntimeRoutes } from "./startup/register-founder-runtime-routes.js";
import { registerFounderServerRoutes } from "./startup/routes/founder-server-routes.js";
import { requireKey } from "./src/server/auth/requireKey.js";
import {
  COMMAND_CENTER_KEY,
  ALLOWED_ORIGINS_LIST,
  validatedDatabaseUrl,
  DB_SSL_REJECT_UNAUTHORIZED,
  HOST,
  PORT,
  MAX_DAILY_SPEND,
  COST_SHUTDOWN_THRESHOLD,
  NODE_ENV,
  RAILWAY_ENVIRONMENT,
  COUNCIL_TIMEOUT_MS,
  COUNCIL_PING_TIMEOUT_MS,
  GITHUB_TOKEN,
  GITHUB_REPO,
} from "./startup/environment.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
app.set("trust proxy", 1);

const startupHealthState = {
  phase: "booting",
  ready: false,
  db: "pending",
  runtime_routes: "pending",
  deferred_services: "pending",
  runtime_profile: "founder_builder",
  last_error: null,
};

function getRequestHost(req) {
  const forwarded = (req.headers["x-forwarded-host"] || "").toString().toLowerCase();
  const direct = (req.get("host") || "").toString().toLowerCase();
  return forwarded || direct;
}

function isSameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const originUrl = new URL(origin);
    return originUrl.host.toLowerCase() === getRequestHost(req);
  } catch {
    return false;
  }
}

registerPublicRoutes(app, {
  fs,
  path,
  __dirname,
  COMMAND_CENTER_KEY,
});

applyMiddleware(app, {
  express,
  path,
  __dirname,
  ALLOWED_ORIGINS_LIST,
  isSameOrigin,
});

app.use(requestTracer(logger));
app.use(createTruthResponseEnforcer({ logger }));

export const pool = createDbPool({
  validatedDatabaseUrl,
  DB_SSL_REJECT_UNAUTHORIZED,
});

initDb(pool);
startDbHealthMonitor(pool);

registerFounderServerRoutes(app, {
  pool,
  getStartupHealthState: () => ({ ...startupHealthState }),
});

const savingsLedger = createSavingsLedger(pool);
const tokenAccounting = createTokenAccountingService({ pool, savingsLedger, logger });
const builderOSControlPlane = createBuilderOSControlPlaneService({ pool, tokenAccounting, logger });

const providerCooldowns = new Map();
const compressionMetrics = {
  v2_0_compressions: 0,
  v3_compressions: 0,
  total_bytes_saved: 0,
  total_cost_saved: 0,
  cache_hits: 0,
  cache_misses: 0,
  model_downgrades: 0,
  prompt_optimizations: 0,
  tokens_saved_total: 0,
};
const roiTracker = {
  daily_revenue: 0,
  daily_ai_cost: 0,
  daily_tasks_completed: 0,
  total_tokens_saved: 0,
  micro_compression_saves: 0,
  roi_ratio: 0,
  revenue_per_task: 0,
  last_reset: new Date().toISOString().slice(0, 10),
};
const systemMetrics = {
  selfModificationsAttempted: 0,
  selfModificationsSuccessful: 0,
  deploymentsTrigger: 0,
  improvementCyclesRun: 0,
  lastImprovement: null,
  consensusDecisionsMade: 0,
  blindSpotsDetected: 0,
  rollbacksPerformed: 0,
  dailyIdeasGenerated: 0,
};

const councilService = createCouncilService({
  pool,
  COUNCIL_MEMBERS: createCouncilMembers({
    DEEPSEEK_BRIDGE_ENABLED: process.env.DEEPSEEK_BRIDGE_ENABLED,
  }),
  COUNCIL_ALIAS_MAP,
  MAX_DAILY_SPEND,
  COST_SHUTDOWN_THRESHOLD,
  NODE_ENV,
  RAILWAY_ENVIRONMENT,
  COUNCIL_TIMEOUT_MS,
  COUNCIL_PING_TIMEOUT_MS,
  compressionMetrics,
  roiTracker,
  systemMetrics,
  getOpenSourceCouncil: () => null,
  providerCooldowns,
  getSourceOfTruthManager: () => null,
  updateROIWithTracker: () => {},
  trackAIPerformance: async () => {},
  notifyCriticalIssue: async () => {},
  savingsLedger,
  tokenAccounting,
});

const {
  callCouncilMember: rawCallCouncilMember,
  lclMonitor,
} = councilService;

const platformKernel = createTSOSPlatformKernel({
  pool,
  tokenAccounting,
  builderControlPlane: builderOSControlPlane,
  savingsLedger,
  logger,
});

const callCouncilMember = platformKernel.wrapCouncilMember(rawCallCouncilMember);

const {
  commitToGitHub,
  commitManyToGitHub,
} = createDeploymentService({
  pool,
  systemMetrics,
  broadcastToAll: () => {},
  GITHUB_TOKEN,
  GITHUB_REPO,
  GITHUB_DEPLOY_BRANCH: process.env.GITHUB_DEPLOY_BRANCH || "main",
  RAILWAY_TOKEN: process.env.RAILWAY_TOKEN,
  RAILWAY_PROJECT_ID: process.env.RAILWAY_PROJECT_ID,
  RAILWAY_SERVICE_ID: process.env.RAILWAY_SERVICE_ID,
  RAILWAY_ENVIRONMENT_ID: process.env.RAILWAY_ENVIRONMENT_ID,
  __dirname,
});

let shutdownInProgress = false;

async function gracefulShutdown(signal = "SIGINT") {
  if (shutdownInProgress) return;
  shutdownInProgress = true;
  logger.info({ signal }, "Shutting down founder-builder runtime...");
  try {
    await pool.end();
  } catch (error) {
    logger.warn({ signal, err: error.message }, "Founder runtime pool shutdown failed");
  }
  process.exit(0);
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

async function bootFounderRuntime() {
  startupHealthState.phase = "initializing";
  try {
    await pool.query("SELECT 1");
    startupHealthState.db = "ok";
    logger.info("✅ Founder-builder database reachable");

    await registerFounderRuntimeRoutes(app, {
      pool,
      requireKey,
      logger,
      callCouncilMember,
      lclMonitor,
      getCachedResponse,
      cacheResponse,
      commitToGitHub,
      commitManyToGitHub,
      platformKernel,
    });
    startupHealthState.runtime_routes = "ok";
    startupHealthState.deferred_services = "ok";
    startupHealthState.phase = "ready";
    startupHealthState.ready = true;
    logger.info("✅ Founder-builder runtime routes mounted");
  } catch (error) {
    startupHealthState.phase = "error";
    startupHealthState.db = startupHealthState.db === "pending" ? "error" : startupHealthState.db;
    startupHealthState.last_error = error.message;
    logger.error("❌ Founder-builder boot error:", { error: error.message, stack: error.stack });
  }
}

async function start() {
  const selectedPort = Number(PORT) || 8080;
  const host = HOST || "0.0.0.0";

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(selectedPort, host, () => {
      server.off("error", reject);
      logger.info(`🚀 Founder-builder minimal runtime listening on http://${host}:${selectedPort}`);
      resolve();
    });
  });

  await bootFounderRuntime();
}

if (process.env.AUTONOMY_NO_LISTEN === "true") {
  logger.info("⚠️ [STARTUP] AUTONOMY_NO_LISTEN enabled - founder runtime not binding");
} else {
  start().catch((error) => {
    startupHealthState.phase = "error";
    startupHealthState.last_error = error.message;
    logger.error("❌ Founder-builder start failure:", { error: error.message, stack: error.stack });
    process.exit(1);
  });
}

export default app;
