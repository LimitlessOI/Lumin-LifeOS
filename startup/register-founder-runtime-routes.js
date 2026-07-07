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
import { createCrmRoutes } from "../routes/crm-routes.js";
import { createCouncilPromptAdapter } from "../services/council-prompt-adapter.js";
import { createRequireLifeOSUserOrKey } from "../middleware/lifeos-auth-middleware.js";
import { getNeverStopProductFactoryStatus } from "../services/never-stop-product-factory-scheduler.js";
import { autoRegisterProductModules, getModuleHealth } from "./auto-register-product-modules.js";

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
  });
  logger.info("✅ [SITE-BUILDER] Founder-builder routes mounted at /api/v1/sites");

  createCrmRoutes(app, { requireKey, logger });
  logger.info("✅ [CRM] Founder-builder routes mounted at /api/v1/crm (provider-agnostic)");

  app.get("/api/v1/lifeos/never-stop/status", requireKey, (_req, res) => {
    res.json(getNeverStopProductFactoryStatus());
  });
  logger.info("✅ [NEVER-STOP] Status route mounted at /api/v1/lifeos/never-stop/status");

  // Convention-based auto-registration: mount every opt-in product module listed
  // in config/auto-registered-product-modules.json, recording per-module boot
  // health. This is what lets the autonomous loop ship a NEW route/UI module and
  // have it go LIVE without editing this protected composition root — and the
  // health manifest is read by the functional-proof completion gate / self-repair.
  try {
    const autoResults = await autoRegisterProductModules(app, {
      pool,
      requireKey: requireUserOrKey,
      callCouncilMember,
      logger,
      baseUrl: siteBaseUrl,
      commitToGitHub,
      commitManyToGitHub,
    }, { logger });
    logger.info(`✅ [AUTO-REGISTER] ${autoResults.filter((r) => r.status === "mounted").length}/${autoResults.length} product module(s) mounted`);
  } catch (autoErr) {
    logger.warn("[AUTO-REGISTER] auto-registration pass failed", { error: autoErr.message });
  }

  app.get("/api/v1/lifeos/builder/module-health", requireKey, (_req, res) => {
    res.json(getModuleHealth());
  });
  logger.info("✅ [MODULE-HEALTH] Route mounted at /api/v1/lifeos/builder/module-health");

  return {
    tcCoordinator: null,
    wkIntegrityEngine: null,
  };
}
