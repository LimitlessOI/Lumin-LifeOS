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

const _BOOT_T0 = Date.now();
const _bootLog = (label) => console.log(`[BOOT] ${label} +${Date.now() - _BOOT_T0}ms`);
_bootLog('module_eval_start');

import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import process from "node:process";
import { fileURLToPath } from "url";
import { createServer } from "http";

_bootLog('stdlib_imports_done');
import logger from "./services/logger.js";
import { applyMiddleware } from "./middleware/apply-middleware.js";
import { registerPublicRoutes } from "./routes/public-routes.js";

// Event loop watchdog — detects if the event loop is blocked for >1.5s
let _watchdogLast = Date.now();
setInterval(() => {
  const now = Date.now();
  const delta = now - _watchdogLast;
  if (delta > 1500) {
    console.error(`[WATCHDOG] Event loop blocked for ${delta}ms! mem=${Math.round(process.memoryUsage().heapUsed/1024/1024)}MB rss=${Math.round(process.memoryUsage().rss/1024/1024)}MB`);
  }
  _watchdogLast = now;
}, 1000).unref();
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
import { startNeverStopProductFactoryScheduler } from "./services/never-stop-product-factory-scheduler.js";
import { startGovernedAutonomousShippingLoop } from "./services/governed-autonomous-shipping-loop.js";
import { startCiHealthWatchdogScheduler } from "./scripts/ci-health-watchdog.mjs";
import { initDatabase } from "./startup/database.js";
import { requireKey } from "./src/server/auth/requireKey.js";
import { NotificationService } from "./core/notification-service.js";
import { buildStartupDegradedReport, formatStartupDegradedLog } from "./services/founder-runtime-boot-report.js";
_bootLog('all_imports_done');
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

let _unhandledRejectionCount = 0;
let _lastUnhandledRejection = null;
process.on('unhandledRejection', (reason) => {
  _unhandledRejectionCount++;
  _lastUnhandledRejection = { at: new Date().toISOString(), error: String(reason?.message || reason).slice(0, 200) };
  logger.error({ err: reason, count: _unhandledRejectionCount }, 'unhandledRejection — swallowed to keep server alive');
  if (startupHealthState) {
    startupHealthState.last_error = `unhandledRejection #${_unhandledRejectionCount}: ${String(reason?.message || reason).slice(0, 120)}`;
  }
});

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
  degraded: false,
  startup_report: null,
};

function serializeStartupHealth() {
  const report = startupHealthState.startup_report;
  const degraded = startupHealthState.degraded === true
    || _unhandledRejectionCount > 0
    || (report && report.degraded === true);
  return {
    ok: true,
    live: true,
    ready: startupHealthState.ready === true,
    degraded,
    status: degraded ? 'degraded' : (startupHealthState.ready === true ? 'healthy' : 'starting'),
    checks: {
      server: "ok",
      db: startupHealthState.db,
      runtime_routes: startupHealthState.runtime_routes,
      deferred_services: startupHealthState.deferred_services,
      runtime_profile: startupHealthState.runtime_profile,
      last_error: startupHealthState.last_error || null,
      route_assert: report?.routes_missing?.length ? 'degraded' : 'ok',
    },
    startup: { ...startupHealthState },
    startup_report: report,
    fault_receipts: {
      unhandled_rejections: _unhandledRejectionCount,
      last_fault: _lastUnhandledRejection,
      health_degraded: degraded,
    },
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  };
}

function resolveDeployCommitSha() {
  const raw =
    process.env.RAILWAY_GIT_COMMIT_SHA ||
    process.env.GITHUB_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    '';
  return typeof raw === 'string' && /^[a-fA-F0-9]{7,40}$/.test(raw.trim())
    ? raw.trim().slice(0, 40)
    : null;
}

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

// Raw request logger — BEFORE any middleware — captures every incoming request
app.use((req, res, next) => {
  const _reqT0 = Date.now();
  console.log(`[REQ-IN] ${req.method} ${req.path} +${_reqT0 - _BOOT_T0}ms`);
  res.on('finish', () => {
    console.log(`[REQ-OUT] ${req.method} ${req.path} ${res.statusCode} +${Date.now() - _reqT0}ms`);
  });
  next();
});

// Mount a minimal health route before public/static middleware so Railway can
// get truthful liveness even if a later route surface regresses.
app.get("/healthz", (_req, res) => {
  res.status(200).json(serializeStartupHealth());
});

app.get("/ready", (_req, res) => {
  const deployCommitSha = resolveDeployCommitSha();
  const localMirrorCommitReady = !(
    process.env.RAILWAY_ENVIRONMENT ||
    process.env.RAILWAY_SERVICE_ID ||
    process.env.RAILWAY_PROJECT_ID ||
    process.env.RAILWAY_ENVIRONMENT_ID
  );
  const commitPathReady = typeof commitToGitHub === "function" && (Boolean(process.env.GITHUB_TOKEN) || localMirrorCommitReady);
  res.status(200).json({
    ok: true,
    runtime_profile: "founder_builder",
    deploy_commit_sha: deployCommitSha,
    codegen: {
      ...(deployCommitSha ? { deploy_commit_sha: deployCommitSha } : {}),
    },
    builder: {
      commitToGitHub: typeof commitToGitHub === "function",
      commit_path_ready: commitPathReady,
      local_mirror_commit: localMirrorCommitReady,
      github_token: Boolean(process.env.GITHUB_TOKEN),
      callCouncilMember: typeof callCouncilMember === "function",
      pool: Boolean(pool?.query),
    },
    startup: { ...startupHealthState, boot_attempt: bootAttempt },
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

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

// Truth-enforcement spine: gate every res.json/res.send on founder + builder
// routes through the truth spine. Mounted after body/CORS middleware and the
// request tracer, but after /healthz, /ready, and public/static routes above so
// liveness and asset serving stay untouched. The gate is fully synchronous
// (benchmarked <70ms on large bodies), so it cannot stall the request path;
// the earlier proxy-timeout hang traced to node-as-PID-1 SIGPIPE (fixed in the
// Dockerfile), not this wrapper.
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
  getRailwayEnvVars,
  setRailwayEnvVar,
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

let bootInFlight = null;
let bootAttempt = 0;
let bootRetryTimer = null;
let founderRoutesRegistered = false;

function scheduleBootRetry(reason) {
  if (startupHealthState.ready || bootRetryTimer) return;
  const attempt = Math.max(1, bootAttempt);
  const delayMs = Math.min(60_000, Math.round(2500 * Math.pow(1.6, Math.min(attempt, 12))));
  startupHealthState.phase = "retry_scheduled";
  startupHealthState.last_error = `${reason} (retry #${attempt + 1} in ${delayMs}ms)`;
  logger.warn(
    { attempt, delayMs, reason },
    "[BOOT] DB/route boot failed — scheduling retry so tip can recover without redeploy",
  );
  bootRetryTimer = setTimeout(() => {
    bootRetryTimer = null;
    bootFounderRuntime().catch((err) => {
      logger.warn({ err: err.message }, "[BOOT] scheduled retry threw");
    });
  }, delayMs);
  bootRetryTimer.unref?.();
}

async function bootFounderRuntime() {
  if (startupHealthState.ready) return { ok: true, already_ready: true };
  if (bootInFlight) return bootInFlight;

  bootInFlight = (async () => {
    bootAttempt += 1;
    _bootLog(`bootFounderRuntime_enter attempt=${bootAttempt}`);
    startupHealthState.phase = "initializing";
    try {
      _bootLog('pre_db_query');
      await pool.query("SELECT 1");
      startupHealthState.db = "ok";
      logger.info("✅ Founder-builder database reachable");
      _bootLog('db_ok');

      _bootLog('pre_migrations');
      const migrationResult = await initDatabase(pool, logger);
      _bootLog('migrations_done');

      let routeRegistration = { moduleHealth: {}, routeAssert: null };
      if (!founderRoutesRegistered) {
        _bootLog('pre_registerRoutes');
        const notificationService = new NotificationService({ pool });
        routeRegistration = await registerFounderRuntimeRoutes(app, {
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
          notificationService,
          getRailwayEnvVars,
          setRailwayEnvVar,
        });
        founderRoutesRegistered = true;
        _bootLog('registerRoutes_done');
      } else {
        _bootLog('registerRoutes_skipped_already_mounted');
      }

      const startupReport = buildStartupDegradedReport({
        migrationFailed: migrationResult?.failed || [],
        moduleHealth: routeRegistration?.moduleHealth || {},
        routeAssert: routeRegistration?.routeAssert || null,
        unhandledRejections: _unhandledRejectionCount,
        lastError: startupHealthState.last_error,
      });
      startupHealthState.startup_report = startupReport;
      startupHealthState.degraded = startupReport.degraded === true;
      startupHealthState.runtime_routes = startupReport.degraded
        && (startupReport.routes_missing?.length || routeRegistration?.routeAssert?.ok === false)
        ? "degraded"
        : "ok";
      startupHealthState.deferred_services = "ok";
      startupHealthState.phase = "ready";
      startupHealthState.ready = true;
      startupHealthState.last_error = null;
      if (startupReport.degraded) {
        logger.error(formatStartupDegradedLog(startupReport), "[STARTUP_DEGRADED] founder-builder boot partial failure");
      } else {
        logger.info("✅ Founder-builder runtime routes mounted");
      }

      // AUTONOMOUS BUILD LOOP: the founder-builder lane is the only runtime that
      // boots on Railway, and it already mounts the `/build` primitive — so the
      // never-stop product factory must start here (self-gated on
      // BUILDEROS_NEVER_STOP / daily budget) or the system never builds on its own.
      try {
        startNeverStopProductFactoryScheduler({ logger });
      } catch (schedErr) {
        logger.warn("[NEVER-STOP-FACTORY] failed to start in founder runtime", { error: schedErr.message });
      }
      // STEP 5g: the governed autonomous shipping loop. Self-gated on
      // GOVERNED_FACTORY_ONLY — it only owns throughput once the fence is ON, so
      // starting it here is a no-op until cutover and never double-ships with the
      // legacy never-stop loop above.
      try {
        startGovernedAutonomousShippingLoop({ logger, pool });
      } catch (govErr) {
        logger.warn("[GOVERNED-AUTONOMOUS-SHIP] failed to start in founder runtime", { error: govErr.message });
      }
      // CI health watchdog: nothing in the system previously watched GitHub
      // Actions/CI status at all (confirmed by repo-wide audit, 2026-07-19) —
      // this is the first thing that does, and it's the trigger for the
      // founder SMS/call escalation (routes/founder-sms-routes.js).
      try {
        startCiHealthWatchdogScheduler({ logger });
      } catch (ciWatchdogErr) {
        logger.warn("[CI-WATCHDOG] failed to start in founder runtime", { error: ciWatchdogErr.message });
      }
      _bootLog('bootFounderRuntime_done');
      return { ok: true, attempt: bootAttempt };
    } catch (error) {
      startupHealthState.phase = "error";
      startupHealthState.db = startupHealthState.db === "ok" ? "ok" : "error";
      startupHealthState.last_error = error.message;
      logger.error("❌ Founder-builder boot error:", { error: error.message, stack: error.stack, attempt: bootAttempt });
      scheduleBootRetry(error.message);
      return { ok: false, attempt: bootAttempt, error: error.message };
    } finally {
      bootInFlight = null;
    }
  })();

  return bootInFlight;
}

// Early surface — available even when DB boot failed and runtime routes are pending.
app.post("/api/v1/lifeos/boot/retry", requireKey, async (_req, res) => {
  if (startupHealthState.ready) {
    return res.json({ ok: true, already_ready: true, attempt: bootAttempt });
  }
  if (bootRetryTimer) {
    clearTimeout(bootRetryTimer);
    bootRetryTimer = null;
  }
  res.status(202).json({ ok: true, accepted: true, attempt: bootAttempt, message: "boot retry started" });
  bootFounderRuntime().catch((err) => {
    logger.warn({ err: err.message }, "[BOOT] manual retry threw");
  });
});

async function start() {
  _bootLog('start_enter');
  const selectedPort = Number(PORT) || 8080;
  const host = HOST || "::";

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(selectedPort, host, () => {
      server.off("error", reject);
      logger.info(`🚀 Founder-builder minimal runtime listening on http://${host}:${selectedPort}`);
      _bootLog('server_listening');
      resolve();
    });
  });

  await bootFounderRuntime();
  _bootLog('start_complete');

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
