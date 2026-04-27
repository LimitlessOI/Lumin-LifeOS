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
import { createLifeOSCoreRoutes } from "../routes/lifeos-core-routes.js";
import { createLifeOSGatewayRoutes, createLifeOSEngineRoutes } from "../routes/lifeos-engine-routes.js";
import { createLifeOSHealthRoutes } from "../routes/lifeos-health-routes.js";
import { createLifeOSFamilyRoutes } from "../routes/lifeos-family-routes.js";
import { createLifeOSPurposeRoutes } from "../routes/lifeos-purpose-routes.js";
import { createLifeOSChildrenRoutes } from "../routes/lifeos-children-routes.js";
import { createLifeOSVisionRoutes } from "../routes/lifeos-vision-routes.js";
import { createLifeOSDecisionsRoutes } from "../routes/lifeos-decisions-routes.js";
import { createLifeOSIdentityRoutes } from "../routes/lifeos-identity-routes.js";
import { createLifeOSGrowthRoutes } from "../routes/lifeos-growth-routes.js";
import { createLifeOSMediationRoutes } from "../routes/lifeos-mediation-routes.js";
import { createLifeOSHealingRoutes } from "../routes/lifeos-healing-routes.js";
import { createLifeOSLegacyRoutes } from "../routes/lifeos-legacy-routes.js";
import { createLifeOSEmotionalRoutes } from "../routes/lifeos-emotional-routes.js";
import { createLifeOSEthicsRoutes } from "../routes/lifeos-ethics-routes.js";
import { createLifeOSConflictRoutes } from "../routes/lifeos-conflict-routes.js";
import { createLifeOSFinanceRoutes } from "../routes/lifeos-finance-routes.js";
import { createLifeOSBacktestRoutes } from "../routes/lifeos-backtest-routes.js";
import { createLifeOSWeeklyReviewRoutes } from "../routes/lifeos-weekly-review-routes.js";
import { createLifeOSScorecardRoutes } from "../routes/lifeos-scorecard-routes.js";
import { createLifeOSChatRoutes } from "../routes/lifeos-chat-routes.js";
import { createLifeOSAmbientRoutes } from "../routes/lifeos-ambient-routes.js";
import { createLifeOSHabitsRoutes } from "../routes/lifeos-habits-routes.js";
import { createLifeOSCycleRoutes } from "../routes/lifeos-cycle-routes.js";
import { createLifeOSAuthRoutes } from "../routes/lifeos-auth-routes.js";
import { createLifeOSCouncilBuilderRoutes } from "../routes/lifeos-council-builder-routes.js";
import { createLifeOSGateChangeRoutes } from "../routes/lifeos-gate-change-routes.js";
import { createLaneIntelRoutes } from "../routes/lane-intel-routes.js";
import { createLifeOSExtensionRoutes } from "../routes/lifeos-extension-routes.js";
import { createTokenOSRoutes } from "../routes/tokenos-routes.js";
import { getCachedResponse, cacheResponse } from "../services/response-cache.js";
import { createTCCoordinator } from "../services/tc-coordinator.js";
import { createIntegrityEngine as createWKIntegrityEngine } from "../services/integrity-engine.js";
import { createCouncilPromptAdapter } from "../services/council-prompt-adapter.js";
import { createMemoryIntelligenceRoutes } from "../routes/memory-intelligence-routes.js";

export async function registerRuntimeRoutes(app, deps) {
  const {
    pool,
    requireKey,
    logger,
    callCouncilMember,
    callCouncilWithFailover,
    lclMonitor,
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
    makePhoneCall,
    commitToGitHub,
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
    savingsLedger: deps.savingsLedger,
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

  // LifeOS Auth — must be mounted before core routes; no requireKey needed (it IS the auth)
  app.use("/api/v1/lifeos/auth", createLifeOSAuthRoutes({ pool, logger }));
  logger.info("✅ [LIFEOS-AUTH] Routes mounted at /api/v1/lifeos/auth");

  // Core LifeOS routes are required for the product to function.
  const lifeosOpts = { pool, requireKey, callCouncilMember, logger, notificationService, sendSMS, sendAlertCall, makePhoneCall };
  app.use("/api/v1/lifeos", createLifeOSCoreRoutes(lifeosOpts));
  logger.info("✅ [LIFEOS-CORE] Routes mounted at /api/v1/lifeos");
  app.use("/api/v1/lifeos", createLifeOSGatewayRoutes({ pool, sendSMS, callCouncilMember, logger }));
  logger.info("✅ [LIFEOS-GATEWAY] Routes mounted at /api/v1/lifeos");
  app.use("/api/v1/lifeos/engine", createLifeOSEngineRoutes({ pool, requireKey, notificationService, sendSMS, callCouncilMember, logger }));
  logger.info("✅ [LIFEOS-ENGINE] Routes mounted at /api/v1/lifeos/engine");
  app.use(
    "/api/v1/lifeos/health",
    createLifeOSHealthRoutes({ pool, requireKey, callCouncilMember, callAI: councilChatAI, sendSMS, logger })
  );
  logger.info("✅ [LIFEOS-HEALTH] Routes mounted at /api/v1/lifeos/health");
  app.use("/api/v1/lifeos/family", createLifeOSFamilyRoutes({ pool, requireKey, callCouncilMember }));
  logger.info("✅ [LIFEOS-FAMILY] Routes mounted at /api/v1/lifeos/family");
  app.use("/api/v1/lifeos/purpose", createLifeOSPurposeRoutes({ pool, requireKey, callCouncilMember }));
  logger.info("✅ [LIFEOS-PURPOSE] Routes mounted at /api/v1/lifeos/purpose");
  app.use("/api/v1/lifeos/children", createLifeOSChildrenRoutes({ pool, requireKey, callCouncilMember }));
  logger.info("✅ [LIFEOS-CHILDREN] Routes mounted at /api/v1/lifeos/children");
  app.use("/api/v1/lifeos/vision", createLifeOSVisionRoutes({ pool, requireKey, callCouncilMember, logger }));
  logger.info("✅ [LIFEOS-VISION] Routes mounted at /api/v1/lifeos/vision");
  app.use("/api/v1/lifeos/decisions", createLifeOSDecisionsRoutes({ pool, requireKey, callCouncilMember, logger }));
  logger.info("✅ [LIFEOS-DECISIONS] Routes mounted at /api/v1/lifeos/decisions");
  app.use("/api/v1/lifeos/identity", createLifeOSIdentityRoutes({ pool, requireKey, callCouncilMember, logger }));
  logger.info("✅ [LIFEOS-IDENTITY] Routes mounted at /api/v1/lifeos/identity");
  app.use("/api/v1/lifeos/growth", createLifeOSGrowthRoutes({ pool, requireKey, callCouncilMember, logger }));
  logger.info("✅ [LIFEOS-GROWTH] Routes mounted at /api/v1/lifeos/growth");
  app.use("/api/v1/lifeos/mediation", createLifeOSMediationRoutes({ pool, requireKey, callCouncilMember, logger }));
  logger.info("✅ [LIFEOS-MEDIATION] Routes mounted at /api/v1/lifeos/mediation");
  app.use("/api/v1/lifeos/healing", createLifeOSHealingRoutes({ pool, requireKey, callCouncilMember, logger }));
  logger.info("✅ [LIFEOS-HEALING] Routes mounted at /api/v1/lifeos/healing");
  app.use("/api/v1/lifeos/legacy", createLifeOSLegacyRoutes({ pool, requireKey, callCouncilMember, logger }));
  logger.info("✅ [LIFEOS-LEGACY] Routes mounted at /api/v1/lifeos/legacy");
  app.use("/api/v1/lifeos/emotional", createLifeOSEmotionalRoutes({ pool, requireKey, callCouncilMember }));
  logger.info("✅ [LIFEOS-EMOTIONAL] Routes mounted at /api/v1/lifeos/emotional");
  app.use("/api/v1/lifeos/ethics", createLifeOSEthicsRoutes({ pool, requireKey, callCouncilMember, logger }));
  logger.info("✅ [LIFEOS-ETHICS] Routes mounted at /api/v1/lifeos/ethics");
  app.use("/api/v1/lifeos/conflict", createLifeOSConflictRoutes({ pool, requireKey, callCouncilMember, logger }));
  logger.info("✅ [LIFEOS-CONFLICT] Routes mounted at /api/v1/lifeos/conflict");
  app.use("/api/v1/lifeos/finance", createLifeOSFinanceRoutes({ pool, requireKey, callCouncilMember, logger }));
  logger.info("✅ [LIFEOS-FINANCE] Routes mounted at /api/v1/lifeos/finance");
  app.use("/api/v1/lifeos/backtest", createLifeOSBacktestRoutes({ requireKey }));
  logger.info("✅ [LIFEOS-BACKTEST] Education-only routes mounted at /api/v1/lifeos/backtest");
  app.use(
    "/api/v1/lifeos/weekly-review",
    createLifeOSWeeklyReviewRoutes({ pool, requireKey, callAI: councilChatAI, logger })
  );
  logger.info("✅ [LIFEOS-WEEKLY-REVIEW] Routes mounted at /api/v1/lifeos/weekly-review");
  app.use(
    "/api/v1/lifeos/scorecard",
    createLifeOSScorecardRoutes({ pool, requireKey, callAI: councilChatAI, logger })
  );
  logger.info("✅ [LIFEOS-SCORECARD] Routes mounted at /api/v1/lifeos/scorecard");
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
  logger.info("✅ [LIFEOS-CHAT] Routes mounted at /api/v1/lifeos/chat");
  app.use("/api/v1/lifeos/ambient", createLifeOSAmbientRoutes({ pool, requireKey, logger }));
  logger.info("✅ [LIFEOS-AMBIENT] Routes mounted at /api/v1/lifeos/ambient");
  app.use("/api/v1/lifeos/habits", createLifeOSHabitsRoutes({ pool, requireKey, logger }));
  logger.info("✅ [LIFEOS-HABITS] Routes mounted at /api/v1/lifeos/habits");
  createLifeOSCycleRoutes({ pool, requireKey, logger })(app);


  // Council builder — dispatches tasks to the system; council generates + commits code (§2.11)
  createLifeOSCouncilBuilderRoutes({
    pool,
    requireKey,
    callCouncilMember,
    lclMonitor,
    logger,
    getCachedResponse,
    cacheResponse,
    commitToGitHub,
  })(app);

  app.use(
    "/api/v1/lifeos/gate-change",
    createLifeOSGateChangeRoutes({ pool, requireKey, callCouncilMember, logger })
  );
  logger.info("✅ [LIFEOS-GATE-CHANGE] Routes mounted at /api/v1/lifeos/gate-change");

  app.use(
    "/api/v1/lifeos/intel",
    createLaneIntelRoutes({ pool, requireKey, callCouncilMember, logger })
  );
  logger.info("✅ [LIFEOS-INTEL] Horizon + red-team routes mounted at /api/v1/lifeos/intel");

  app.use(
    "/api/v1/extension",
    createLifeOSExtensionRoutes({ pool, requireKey, callCouncilMember, logger })
  );
  logger.info("✅ [EXTENSION] Universal Overlay routes mounted at /api/v1/extension/{status,context,fill-form,chat}");

  // TokenOS — B2B API token savings product
  createTokenOSRoutes({ pool, requireKey, callCouncilMember, logger })(app);

  // Optional LifeOS / Kids / Teacher modules remain degradable.
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

  const optionalRoutes = [
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

  // Memory Intelligence — epistemic facts, debates, lessons, agent performance, intent drift (AMENDMENT_39)
  app.use('/api/v1/memory', createMemoryIntelligenceRoutes({ pool, logger, requireKey }));
  logger.info('✅ [MEMORY-INTELLIGENCE] Routes mounted at /api/v1/memory/{facts,debates,lessons,agents,authority,violations,routing,intent-drift,health}');

  return {
    tcCoordinator,
    wkIntegrityEngine,
  };
}
