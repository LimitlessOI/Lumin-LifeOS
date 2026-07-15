/**
 * SYNOPSIS: Minimal founder-builder runtime route composition.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import { createLifeOSAuthRoutes } from "../routes/lifeos-auth-routes.js";
import { createLifeOSFounderRuntimeRoutes } from "../routes/lifeos-founder-runtime-routes.js";
import { createLifeOSDirectActionRoutes } from "../routes/lifeos-direct-action-routes.js";
import { createLifeOSChatRoutes } from "../routes/lifeos-chat-routes.js";
import { createLifeOSCouncilBuilderRoutes } from "../routes/lifeos-council-builder-routes.js";
import { createLifeOSGateChangeRoutes } from "../routes/lifeos-gate-change-routes.js";
import { createLifeOSBuilderOSCommandControlRoutes } from "../routes/lifeos-builderos-command-control-routes.js";
import { createLifeRERoutes } from "../routes/lifere-os-routes.js";
import { createBlueprintIntakeRoutes } from "../routes/blueprint-intake-routes.js";
import { createSiteBuilderRoutes } from "../routes/site-builder-routes.js";
import createSiteBuilderCheckoutRoutes from "../routes/site-builder-checkout-routes.js";
import registerSmosPackCheckoutRoutes from "../routes/smos-pack-checkout-routes.js";
import createSiteBuilderEditorRoutes from "../routes/site-builder-editor-routes.js";
import { createCrmRoutes } from "../routes/crm-routes.js";
import { createGoVegasOutreachRoutes } from "../routes/go-vegas-outreach-routes.js";
import { startGoVegasOutreachScheduler } from "../services/go-vegas-outreach-scheduler.js";
import { createTCRoutes } from "../routes/tc-routes.js";
import { createTCCoordinator } from "../services/tc-coordinator.js";
import { createAccountManager } from "../services/account-manager.js";
import { createClientCareBillingRoutes } from "../routes/clientcare-billing-routes.js";
import { createCouncilPromptAdapter } from "../services/council-prompt-adapter.js";
import { createRequireLifeOSUserOrKey } from "../middleware/lifeos-auth-middleware.js";
import {
  getNeverStopProductFactoryStatus,
  runNeverStopProductFactoryOnce,
} from "../services/never-stop-product-factory-scheduler.js";
import { checkAllProviders } from "../services/provider-key-health.js";
import { autoRegisterProductModules, getModuleHealth } from "./auto-register-product-modules.js";
import { createFactoryMountRoutes } from "../routes/factory-mount-routes.js";
import { assertFounderRuntimeRoutes } from "../services/founder-runtime-route-assert.js";
import { registerFounderMemoryRoutes } from "../routes/founder-memory-routes.js";
import { createRailwayManagedEnvRoutes } from "../routes/railway-managed-env-routes.js";
import { createRailwayManagedEnvService } from "../services/railway-managed-env-service.js";
import { createLifeOSVoiceRailRoutes } from "../routes/lifeos-voice-rail-routes.js";
import { startPhase2Scheduler } from "../scripts/lifeos-phase2-scheduler.mjs";
import { startPhase3Scheduler } from "../scripts/lifeos-phase3-scheduler.mjs";

export async function registerFounderRuntimeRoutes(app, deps) {
  const {
    pool,
    requireKey,
    logger,
    callCouncilMember,
    lclMonitor,
    commitToGitHub,
    commitManyToGitHub,
    platformKernel,
    notificationService,
    getRailwayEnvVars,
    setRailwayEnvVar,
  } = deps;

  const councilChatAI = callCouncilMember
    ? createCouncilPromptAdapter(callCouncilMember, {
        member:
          process.env.LIFEOS_CHAT_COUNCIL_MEMBER ||
          process.env.LUMIN_COUNCIL_MEMBER ||
          "anthropic",
        taskType: "general",
      })
    : null;

  const requireUserOrKey = createRequireLifeOSUserOrKey(requireKey);

  app.use("/api/v1/lifeos/auth", createLifeOSAuthRoutes({ pool, logger, requireKey }));
  logger.info("✅ [LIFEOS-AUTH] Founder-builder routes mounted at /api/v1/lifeos/auth");

  app.use(
    "/api/v1/lifeos",
    createLifeOSFounderRuntimeRoutes({
      pool,
      requireKey: requireUserOrKey,
      callCouncilMember,
      logger,
    })
  );
  logger.info("✅ [LIFEOS-FOUNDER-RUNTIME] Founder-builder shell routes mounted");

  app.use("/api/v1/lifeos", createLifeOSDirectActionRoutes({ pool, requireKey: requireUserOrKey }));
  logger.info("✅ [LIFEOS-DIRECT-ACTION] Founder-builder route mounted at /api/v1/lifeos/direct-action");

  app.use(
    "/api/v1/lifeos/chat",
    createLifeOSChatRoutes({
      pool,
      requireKey,
      callAI: councilChatAI,
      callCouncilMember,
      logger,
    })
  );
  logger.info("✅ [LIFEOS-CHAT] Founder-builder routes mounted at /api/v1/lifeos/chat");

  createLifeOSCouncilBuilderRoutes({
    pool,
    requireKey,
    callCouncilMember,
    lclMonitor,
    logger,
    getCachedResponse: deps.getCachedResponse,
    cacheResponse: deps.cacheResponse,
    commitToGitHub,
    commitManyToGitHub,
    platformKernel,
  })(app);
  logger.info("✅ [LIFEOS-BUILDER] Founder-builder ready routes mounted");

  app.use(
    "/api/v1/lifeos/gate-change",
    createLifeOSGateChangeRoutes({ pool, requireKey, callCouncilMember, logger })
  );
  logger.info("✅ [LIFEOS-GATE-CHANGE] Founder-builder routes mounted");

  app.use(
    "/api/v1/lifeos/builderos/command-control",
    createLifeOSBuilderOSCommandControlRoutes({ pool, requireKey, callCouncilMember })
  );
  logger.info("✅ [BUILDEROS-C2] Founder-builder routes mounted");

  app.use(
    "/api/v1/lifere",
    createLifeRERoutes({
      pool,
      requireKey: requireUserOrKey,
      logger,
      callCouncilMember,
    })
  );
  logger.info("✅ [LIFERE-OS] Founder-builder routes mounted at /api/v1/lifere");

  createBlueprintIntakeRoutes(app, { pool, requireKey, callCouncilMember });
  logger.info("✅ [BLUEPRINT-INTAKE] Founder-builder routes mounted at /api/v1/blueprint/intake");

  const siteBaseUrl = process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : `http://localhost:${process.env.PORT || 8080}`;
  createSiteBuilderRoutes(app, {
    pool,
    requireKey,
    callCouncilMember,
    baseUrl: siteBaseUrl,
    notificationService,
  });
  logger.info("✅ [SITE-BUILDER] Founder-builder routes mounted at /api/v1/sites");

  createSiteBuilderCheckoutRoutes(app, { pool, baseUrl: siteBaseUrl });
  logger.info("✅ [SITE-BUILDER] Publish checkout mounted at /api/v1/sites/publish/*");

  registerSmosPackCheckoutRoutes(app, { pool, baseUrl: siteBaseUrl, logger });
  logger.info("✅ [SMOS] Pack checkout mounted at /api/v1/marketing/pack/*");

  createSiteBuilderEditorRoutes(app, { callCouncilMember, baseUrl: siteBaseUrl, pool });
  logger.info("✅ [SITE-BUILDER] Live editor mounted at /api/v1/sites/editor");

  createCrmRoutes(app, { requireKey, logger });
  logger.info("✅ [CRM] Founder-builder routes mounted at /api/v1/crm (provider-agnostic)");

  createGoVegasOutreachRoutes(app, { pool, requireKey, notificationService, logger });
  logger.info("✅ [GO-VEGAS] Outreach routes mounted at /api/v1/go-vegas/*");
  try {
    startGoVegasOutreachScheduler({ pool, notificationService, logger });
  } catch (err) {
    logger.warn?.({ err: err.message }, "[GO-VEGAS] outreach scheduler failed to start (non-fatal)");
  }

  // TC portal + assistant APIs must live on founder lane — production boots founder_builder,
  // and public/tc/* UIs call /api/v1/tc/* (not the slim /api/tc/* auto-register shims).
  let tcCoordinator = null;
  try {
    const accountManager = createAccountManager({ pool, logger });
    tcCoordinator = createTCCoordinator({
      pool,
      accountManager,
      notificationService,
      callCouncilMember,
      logger,
    });
    createTCRoutes(app, {
      pool,
      requireKey: requireUserOrKey,
      coordinator: tcCoordinator,
      logger,
      accountManager,
      notificationService,
      callCouncilMember,
      startAlertLoop: false,
    });
    logger.info("✅ [TC] Founder-builder routes mounted at /api/v1/tc");
  } catch (err) {
    logger.warn?.({ err: err.message }, "[TC] founder-lane mount failed (non-fatal)");
  }

  // ClientCare billing rescue must live on founder lane — production boots founder_builder.
  // Overlay at /clientcare-billing was live but /api/v1/clientcare-billing/* 404'd without this.
  try {
    app.use(
      "/api/v1/clientcare-billing",
      createClientCareBillingRoutes({
        pool,
        requireKey: requireUserOrKey,
        logger,
        callCouncilMember,
        callCouncilWithFailover: deps.callCouncilWithFailover || null,
        notificationService,
        sendSMS: deps.sendSMS || null,
      }),
    );
    app.get(["/birthbill", "/midwife-billing", "/clientcare-collections"], (_req, res) => {
      res.redirect(302, "/overlay/clientcare-collections-landing.html");
    });
    app.get(["/birthbill/welcome", "/midwife-billing/welcome"], (req, res) => {
      const qs = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
      res.redirect(302, "/overlay/clientcare-collections-welcome.html" + qs);
    });
    app.get(["/birthbill/for-you", "/birthbill/sherry", "/for-sherry"], (_req, res) => {
      res.redirect(302, "/overlay/clientcare-for-sherry.html");
    });
    app.get(["/marketing/for-you", "/socialmediaos", "/socialmediaos/for-you"], (_req, res) => {
      res.redirect(302, "/overlay/marketing-for-you.html");
    });
    app.get(["/tc/for-you", "/transaction-care"], (_req, res) => {
      res.redirect(302, "/overlay/tc-for-you.html");
    });
    logger.info("✅ [CLIENTCARE-BILLING] Founder-builder routes mounted at /api/v1/clientcare-billing + /birthbill");
  } catch (err) {
    logger.warn?.({ err: err.message }, "[CLIENTCARE-BILLING] founder-lane mount failed (non-fatal)");
  }

  registerFounderMemoryRoutes(app, { pool, requireKey, logger });
  logger.info("✅ [FOUNDER-MEMORY] Canonical founder↔AI memory mounted at /api/v1/founder-memory");

  // Railway managed-env must live in founder lane — production always boots founder_builder.
  // self-redeploy / build-from-latest use vault RAILWAY_* IDs; vault sync needs get/set helpers.
  try {
    const railwayManagedEnvService = createRailwayManagedEnvService({
      pool,
      getRailwayEnvVars:
        typeof getRailwayEnvVars === "function"
          ? getRailwayEnvVars
          : async () => {
              throw new Error("getRailwayEnvVars unavailable in founder lane");
            },
      setRailwayEnvVar:
        typeof setRailwayEnvVar === "function"
          ? setRailwayEnvVar
          : async () => {
              throw new Error("setRailwayEnvVar unavailable in founder lane");
            },
      logger,
      autosync: false,
    });
    app.use(
      "/api/v1/railway/managed-env",
      createRailwayManagedEnvRoutes({ requireKey, managedEnvService: railwayManagedEnvService }),
    );
    logger.info("✅ [RAILWAY-MANAGED-ENV] Founder-builder routes mounted at /api/v1/railway/managed-env");
  } catch (err) {
    logger.warn?.({ err: err.message }, "[RAILWAY-MANAGED-ENV] mount failed (non-fatal)");
  }

  app.use(
    "/api/v1/lifeos/voice-rail",
    createLifeOSVoiceRailRoutes({
      pool,
      requireKey: requireUserOrKey,
      callAI: councilChatAI,
      callCouncilMember,
      logger,
    }),
  );
  logger.info("✅ [LIFEOS-VOICE-RAIL] Founder-builder routes mounted at /api/v1/lifeos/voice-rail");

  try {
    startPhase2Scheduler({ pool, logger, baseUrl: siteBaseUrl });
  } catch (err) {
    logger.warn?.({ err: err.message }, "[PHASE2-SCHEDULER] failed to start (non-fatal)");
  }
  try {
    startPhase3Scheduler({ pool, logger });
  } catch (err) {
    logger.warn?.({ err: err.message }, "[PHASE3-SCHEDULER] failed to start (non-fatal)");
  }

  app.get("/api/v1/lifeos/never-stop/status", requireKey, (_req, res) => {
    const events = Math.min(200, Math.max(1, Number(_req.query.events) || 25));
    res.json(getNeverStopProductFactoryStatus({ events }));
  });
  app.post("/api/v1/lifeos/never-stop/run-once", requireKey, async (_req, res) => {
    try {
      // Return immediately — a full cycle often exceeds Railway's ~30s proxy
      // timeout ("Application failed to respond"), which made the system look
      // dead while work was still running. Scheduler ticks already run async.
      const status = getNeverStopProductFactoryStatus({ events: 5 });
      if (status?.never_stop?.running) {
        return res.status(202).json({ ok: true, accepted: true, skipped: true, reason: "already_running" });
      }
      res.status(202).json({ ok: true, accepted: true, message: "never-stop cycle started in background" });
      runNeverStopProductFactoryOnce({ logger }).catch((err) => {
        logger.warn?.({ err: err.message }, "[NEVER-STOP] background run-once failed");
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });
  logger.info("✅ [NEVER-STOP] Status + run-once mounted at /api/v1/lifeos/never-stop/*");

  // Reports which provider API keys Railway actually has and tests each one live
  // (funded / needs_payment / invalid / absent) with a per-provider billing link.
  // Never returns a key value. Founder ask: "the system should know what keys are
  // in there and which need a card."
  app.get("/api/v1/lifeos/provider-key-health", requireKey, async (req, res) => {
    try {
      const includeAbsent = req.query.includeAbsent !== "false";
      res.json({ ok: true, ...(await checkAllProviders({ includeAbsent })) });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });
  logger.info("✅ [PROVIDER-KEYS] Health route mounted at /api/v1/lifeos/provider-key-health");

  app.use(createFactoryMountRoutes({ requireKey, logger, pool, baseUrl: siteBaseUrl, callCouncilMember }));

  // Convention-based auto-registration: mount every opt-in product module listed
  // in config/auto-registered-product-modules.json, recording per-module boot
  // health. This is what lets the autonomous loop ship a NEW route/UI module and
  // have it go LIVE without editing this protected composition root — and the
  // health manifest is read by the functional-proof completion gate / self-repair.
  let autoResults = [];
  try {
    autoResults = await autoRegisterProductModules(app, {
      pool,
      requireKey: requireUserOrKey,
      callCouncilMember,
      logger,
      baseUrl: siteBaseUrl,
      commitToGitHub,
      commitManyToGitHub,
      setRailwayEnvVar,
    }, { logger });
    logger.info(`✅ [AUTO-REGISTER] ${autoResults.filter((r) => r.status === "mounted").length}/${autoResults.length} product module(s) mounted`);
  } catch (autoErr) {
    logger.warn("[AUTO-REGISTER] auto-registration pass failed", { error: autoErr.message });
  }

  app.get("/api/v1/lifeos/builder/module-health", requireKey, (_req, res) => {
    res.json(getModuleHealth());
  });
  logger.info("✅ [MODULE-HEALTH] Route mounted at /api/v1/lifeos/builder/module-health");

  let routeAssert = { ok: true, missing: [], missing_critical: [], mounted_count: 0, required_count: 0 };
  try {
    routeAssert = assertFounderRuntimeRoutes(app);
    if (!routeAssert.ok) {
      logger.error("[STARTUP_DEGRADED] founder route assert failed", {
        missing_critical: routeAssert.missing_critical,
        missing: routeAssert.missing,
      });
    }
  } catch (assertErr) {
    logger.warn("[ROUTE-ASSERT] failed", { error: assertErr.message });
    routeAssert = {
      ok: false,
      missing: [],
      missing_critical: [`assert_error:${assertErr.message}`],
      mounted_count: 0,
      required_count: 0,
    };
  }

  return {
    tcCoordinator,
    wkIntegrityEngine: null,
    autoResults,
    routeAssert,
    moduleHealth: getModuleHealth(),
  };
}
