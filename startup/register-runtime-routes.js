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

export function registerRuntimeRoutes(app, deps) {
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

  app.use("/api/v1/clientcare-billing", createClientCareBillingRoutes({ pool, requireKey, logger, callCouncilMember }));
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
