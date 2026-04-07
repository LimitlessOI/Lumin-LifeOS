/**
 * @ssot docs/projects/AMENDMENT_19_PROJECT_GOVERNANCE.md
 *
 * Runtime route composition for the main Express app.
 * This keeps server.js as a composition root instead of a second implementation file.
 */
import { registerWebsiteAuditRoutes } from "../routes/website-audit-routes.js";
import { registerEnhancedCouncilRoutes } from "../routes/enhanced-council-routes.js";
import { createApiCostSavingsRoutes } from "../routes/api-cost-savings-routes.js";
import { createIdeaQueueRoutes } from "../routes/idea-queue-routes.js";
import { createTwinRoutes } from "../routes/twin-routes.js";
import { createConversationHistoryRoutes } from "../routes/conversation-history-routes.js";
import { createClientCareBillingRoutes } from "../routes/clientcare-billing-routes.js";
import { createWordKeeperRoutes } from "../routes/word-keeper-routes.js";
import { createAutonomyRoutes } from "../routes/autonomy-routes.js";
import { createRailwayManagedEnvRoutes } from "../routes/railway-managed-env-routes.js";
import { createProjectGovernanceRoutes } from "../routes/project-governance-routes.js";
import { createBuilderSupervisorRoutes } from "../routes/builder-supervisor-routes.js";
import { createCapabilityMapRouter } from "../routes/capability-map-routes.js";
import { createModelPerformanceRouter } from "../routes/model-performance-routes.js";
import { createAccountManagerRoutes } from "../routes/account-manager-routes.js";
import { createTCRoutes } from "../routes/tc-routes.js";
import { createMLSRoutes } from "../routes/mls-routes.js";
import { createTCCoordinator } from "../services/tc-coordinator.js";
import { createIntegrityEngine as createWKIntegrityEngine } from "../services/integrity-engine.js";

export async function registerRuntimeRoutes(app, deps) {
  const {
    pool,
    requireKey,
    logger,
    callCouncilMember,
    callCouncilWithFailover,
    apiCostSavingsRevenue,
    getStripeClient,
    publicDomain,
    autonomyOrchestrator,
    railwayManagedEnvService,
    accountManager,
    notificationService,
    sendSMS,
    sendAlertSms,
    sendAlertCall,
  } = deps;

  registerWebsiteAuditRoutes(app, {
    requireKey,
    callCouncilWithFailover,
  });

  registerEnhancedCouncilRoutes(app, pool, callCouncilMember, requireKey);

  createApiCostSavingsRoutes(app, {
    pool,
    requireKey,
    apiCostSavingsRevenue,
    getStripeClient,
    RAILWAY_PUBLIC_DOMAIN: publicDomain,
  });
  logger.info("✅ [API-COST-SAVINGS] Routes mounted at /api/v1/cost-savings + /api/v1/revenue/api-cost-savings");

  app.use("/api/v1/ideas", createIdeaQueueRoutes({ pool, requireKey, callCouncilMember }));
  logger.info("✅ [IDEA-QUEUE] Routes mounted at /api/v1/ideas");

  app.use("/api/v1/twin", createTwinRoutes({ pool, requireKey, callCouncilMember }));
  logger.info("✅ [TWIN] Routes mounted at /api/v1/twin");

  app.use("/api/v1/history", createConversationHistoryRoutes({ pool, requireKey, callCouncilMember }));
  logger.info("✅ [HISTORY] Routes mounted at /api/v1/history");

  app.use("/api/v1/clientcare-billing", createClientCareBillingRoutes({ pool, requireKey, logger, callCouncilMember, callCouncilWithFailover, notificationService, sendSMS }));
  logger.info("✅ [CLIENTCARE-BILLING] Routes mounted at /api/v1/clientcare-billing");

  const wordKeeperCouncil = {
    ask: (prompt, opts = {}) => callCouncilMember(opts.model || "claude", prompt, opts.systemPrompt || "", opts),
  };
  const wkIntegrityEngine = createWKIntegrityEngine(pool, wordKeeperCouncil);
  app.use("/api/v1/word-keeper", createWordKeeperRoutes({ pool, councilService: wordKeeperCouncil, twilioService: null }));
  logger.info("✅ [WORD-KEEPER] Routes mounted at /api/v1/word-keeper");

  if (process.env.LIFEOS_DIRECTED_MODE === "false") {
    autonomyOrchestrator.start();
    logger.info("✅ [AUTONOMY] Orchestrator started + routes mounted at /api/v1/autonomy");
  } else {
    logger.info("🛑 [AUTONOMY] Directed mode active — orchestrator not auto-started");
  }
  app.use("/api/v1/autonomy", createAutonomyRoutes({ pool, requireKey, orchestrator: autonomyOrchestrator }));

  app.use("/api/v1/railway/managed-env", createRailwayManagedEnvRoutes({
    requireKey,
    managedEnvService: railwayManagedEnvService,
  }));
  logger.info("✅ [RAILWAY-MANAGED-ENV] Routes mounted at /api/v1/railway/managed-env");

  app.use("/api/v1/accounts", createAccountManagerRoutes({ requireKey, accountManager, pool, logger }));
  logger.info("✅ [ACCOUNT-MANAGER] Routes mounted at /api/v1/accounts");

  app.use("/api/v1", createProjectGovernanceRoutes({ requireKey, pool }));
  logger.info("✅ [PROJECT-GOVERNANCE] Routes mounted at /api/v1/projects, /api/v1/pending-adam, /api/v1/estimation/accuracy");

  app.use("/api/v1/builder", createBuilderSupervisorRoutes({ requireKey, pool }));
  logger.info("✅ [BUILDER-SUPERVISOR] Routes mounted at /api/v1/builder/{run,status,queue,pause,resume}");

  app.use("/api/v1/capability-map", requireKey, createCapabilityMapRouter(pool));
  logger.info("✅ [CAPABILITY-MAP] Routes mounted at /api/v1/capability-map/{analyze,list,act}");

  app.use("/api/v1/model-performance", requireKey, createModelPerformanceRouter(pool));
  logger.info("✅ [MODEL-PERFORMANCE] Routes mounted at /api/v1/model-performance/{leaderboard,winners,lens/:lens,score-outcome}");

  // Optional LifeOS / Kids / Teacher modules. These must not block billing startup
  // when experimental route files are present locally but not deployed.
  async function importOptionalRoute(modulePath, exportName) {
    try {
      const mod = await import(modulePath);
      const factory = mod?.[exportName];
      if (typeof factory !== "function") {
        throw new Error(`Missing export ${exportName}`);
      }
      return factory;
    } catch (error) {
      logger.warn?.({ modulePath, exportName, err: error.message }, "[RUNTIME-ROUTES] Optional route skipped");
      return null;
    }
  }

  const lifeosOpts = { pool, requireKey, callCouncilMember, logger, notificationService, sendSMS };
  const optionalRoutes = [
    { modulePath: "../routes/lifeos-core-routes.js", exportName: "createLifeOSCoreRoutes", mountPath: "/api/v1/lifeos", args: [lifeosOpts], label: "[LIFEOS-CORE]" },
    { modulePath: "../routes/lifeos-engine-routes.js", exportName: "createLifeOSGatewayRoutes", mountPath: "/api/v1/lifeos", args: [{ pool, sendSMS, callCouncilMember, logger }], label: "[LIFEOS-GATEWAY]" },
    { modulePath: "../routes/lifeos-engine-routes.js", exportName: "createLifeOSEngineRoutes", mountPath: "/api/v1/lifeos/engine", args: [{ pool, requireKey, notificationService, sendSMS, callCouncilMember, logger }], label: "[LIFEOS-ENGINE]" },
    { modulePath: "../routes/lifeos-health-routes.js", exportName: "createLifeOSHealthRoutes", mountPath: "/api/v1/lifeos/health", args: [{ pool, requireKey, callCouncilMember, sendSMS, logger }], label: "[LIFEOS-HEALTH]" },
    { modulePath: "../routes/lifeos-family-routes.js", exportName: "createLifeOSFamilyRoutes", mountPath: "/api/v1/lifeos/family", args: [{ pool, requireKey, callCouncilMember }], label: "[LIFEOS-FAMILY]" },
    { modulePath: "../routes/lifeos-emotional-routes.js", exportName: "createLifeOSEmotionalRoutes", mountPath: "/api/v1/lifeos/emotional", args: [{ pool, requireKey, callCouncilMember }], label: "[LIFEOS-EMOTIONAL]" },
    { modulePath: "../routes/lifeos-purpose-routes.js", exportName: "createLifeOSPurposeRoutes", mountPath: "/api/v1/lifeos/purpose", args: [{ pool, requireKey, callCouncilMember }], label: "[LIFEOS-PURPOSE]" },
    { modulePath: "../routes/lifeos-children-routes.js", exportName: "createLifeOSChildrenRoutes", mountPath: "/api/v1/lifeos/children", args: [{ pool, requireKey, callCouncilMember }], label: "[LIFEOS-CHILDREN]" },
    { modulePath: "../routes/lifeos-ethics-routes.js", exportName: "createLifeOSEthicsRoutes", mountPath: "/api/v1/lifeos/ethics", args: [{ pool, requireKey, callCouncilMember, logger }], label: "[LIFEOS-ETHICS]" },
    { modulePath: "../routes/lifeos-vision-routes.js", exportName: "createLifeOSVisionRoutes", mountPath: "/api/v1/lifeos/vision", args: [{ pool, requireKey, callCouncilMember, logger }], label: "[LIFEOS-VISION]" },
    { modulePath: "../routes/lifeos-decisions-routes.js", exportName: "createLifeOSDecisionsRoutes", mountPath: "/api/v1/lifeos/decisions", args: [{ pool, requireKey, callCouncilMember, logger }], label: "[LIFEOS-DECISIONS]" },
    { modulePath: "../routes/lifeos-identity-routes.js", exportName: "createLifeOSIdentityRoutes", mountPath: "/api/v1/lifeos/identity", args: [{ pool, requireKey, callCouncilMember, logger }], label: "[LIFEOS-IDENTITY]" },
    { modulePath: "../routes/lifeos-growth-routes.js", exportName: "createLifeOSGrowthRoutes", mountPath: "/api/v1/lifeos/growth", args: [{ pool, requireKey, callCouncilMember, logger }], label: "[LIFEOS-GROWTH]" },
    { modulePath: "../routes/lifeos-mediation-routes.js", exportName: "createLifeOSMediationRoutes", mountPath: "/api/v1/lifeos/mediation", args: [{ pool, requireKey, callCouncilMember, logger }], label: "[LIFEOS-MEDIATION]" },
    { modulePath: "../routes/lifeos-conflict-routes.js", exportName: "createLifeOSConflictRoutes", mountPath: "/api/v1/lifeos/conflict", args: [{ pool, requireKey, callCouncilMember, logger }], label: "[LIFEOS-CONFLICT]" },
    { modulePath: "../routes/lifeos-healing-routes.js", exportName: "createLifeOSHealingRoutes", mountPath: "/api/v1/lifeos/healing", args: [{ pool, requireKey, callCouncilMember, logger }], label: "[LIFEOS-HEALING]" },
    { modulePath: "../routes/lifeos-legacy-routes.js", exportName: "createLifeOSLegacyRoutes", mountPath: "/api/v1/lifeos/legacy", args: [{ pool, requireKey, callCouncilMember, logger }], label: "[LIFEOS-LEGACY]" },
    { modulePath: "../routes/lifeos-finance-routes.js", exportName: "createLifeOSFinanceRoutes", mountPath: "/api/v1/lifeos/finance", args: [{ pool, requireKey, logger }], label: "[LIFEOS-FINANCE]" },
    { modulePath: "../routes/lifeos-copilot-routes.js", exportName: "createLifeOSCopilotRoutes", mountPath: "/api/v1/lifeos/copilot", args: [{ pool, requireKey, callCouncilMember }], label: "[LIFEOS-COPILOT]" },
    { modulePath: "../routes/lifeos-simulator-routes.js", exportName: "createLifeOSSimulatorRoutes", mountPath: "/api/v1/lifeos/simulator", args: [{ pool, requireKey, callCouncilMember }], label: "[LIFEOS-SIMULATOR]" },
    { modulePath: "../routes/lifeos-workshop-routes.js", exportName: "createLifeOSWorkshopRoutes", mountPath: "/api/v1/lifeos/workshop", args: [{ pool, requireKey, callCouncilMember }], label: "[LIFEOS-WORKSHOP]" },
    { modulePath: "../routes/kids-os-routes.js", exportName: "createKidsOSRoutes", mountPath: "/api/v1/kids", args: [{ pool, requireKey, callCouncilMember }], label: "[KIDS-OS]" },
    { modulePath: "../routes/teacher-os-routes.js", exportName: "createTeacherOSRoutes", mountPath: "/api/v1/teacher", args: [{ pool, requireKey, callCouncilMember }], label: "[TEACHER-OS]" },
  ];

  let mountedOptionalCount = 0;
  for (const routeDef of optionalRoutes) {
    const factory = await importOptionalRoute(routeDef.modulePath, routeDef.exportName);
    if (!factory) continue;
    app.use(routeDef.mountPath, factory(...routeDef.args));
    mountedOptionalCount += 1;
    logger.info(`✅ ${routeDef.label} Routes mounted at ${routeDef.mountPath}`);
  }
  logger.info(`✅ [LIFEOS-OPTIONAL] Mounted ${mountedOptionalCount}/${optionalRoutes.length} optional routes`);

  const tcCoordinator = createTCCoordinator({ pool, accountManager, notificationService, callCouncilMember, logger });
  createTCRoutes(app, {
    pool,
    requireKey,
    coordinator: tcCoordinator,
    logger,
    accountManager,
    notificationService,
    callCouncilMember,
    sendSMS,
    sendAlertSms,
    sendAlertCall,
    startAlertLoop: true,
    managedEnvService: railwayManagedEnvService,
  });
  createMLSRoutes(app, { pool, requireKey, callCouncilMember, logger, accountManager });

  return {
    tcCoordinator,
    wkIntegrityEngine,
  };
}
