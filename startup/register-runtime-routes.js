/**
 * SYNOPSIS: Runtime route composition for the main Express app.
 * @authority Legacy production spine — see routes/AGENTS.md. Not canonical factory runtime.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 * Runtime route composition for the main Express app.
 * This keeps server.js as a composition root instead of a second implementation file.
 */
import { registerWebsiteAuditRoutes } from "../routes/website-audit-routes.js";
import { registerEnhancedCouncilRoutes } from "../routes/enhanced-council-routes.js";
import { createApiCostSavingsRoutes } from "../routes/api-cost-savings-routes.js";
import { createIdeaQueueRoutes } from "../routes/idea-queue-routes.js";
import { createTwinRoutes } from "../routes/twin-routes.js";
import { createAdfRoutes } from "../routes/adf-routes.js";
import { createConversationHistoryRoutes } from "../routes/conversation-history-routes.js";
import { createClientCareBillingRoutes } from "../routes/clientcare-billing-routes.js";
import { createWordKeeperRoutes } from "../routes/word-keeper-routes.js";
import { createAutonomyRoutes } from "../routes/autonomy-routes.js";
import { createRailwayManagedEnvRoutes } from "../routes/railway-managed-env-routes.js";
import { createProjectGovernanceRoutes } from "../routes/project-governance-routes.js";
import { createBuilderSupervisorRoutes } from "../routes/builder-supervisor-routes.js";
// builder-write-lock-routes.js not on main lineage — oil-probe slice mounts without Phase 6 routes
import { createBuilderOilAuditProbeRoutes } from "../routes/builder-oil-audit-probe-routes.js";
import { createCapabilityMapRouter } from "../routes/capability-map-routes.js";
import { createModelPerformanceRouter } from "../routes/model-performance-routes.js";
import { createAccountManagerRoutes } from "../routes/account-manager-routes.js";
import { createTCRoutes } from "../routes/tc-routes.js";
import { createMLSRoutes } from "../routes/mls-routes.js";
import { createLifeOSCoreRoutes } from "../routes/lifeos-core-routes.js";
import { createLifeOSFounderRuntimeRoutes } from "../routes/lifeos-founder-runtime-routes.js";
import { createLifeOSSystemProofRoutes } from "../routes/lifeos-system-proof-routes.js";
import { createLifeOSDirectActionRoutes } from "../routes/lifeos-direct-action-routes.js";
import { createLifeOSGatewayRoutes, createLifeOSEngineRoutes } from "../routes/lifeos-engine-routes.js";
import { createLifeOSHealthRoutes } from "../routes/lifeos-health-routes.js";
import { createLifeOSFamilyRoutes } from "../routes/lifeos-family-routes.js";
import { createLifeOSPurposeRoutes } from "../routes/lifeos-purpose-routes.js";
import { createLifeOSChildrenRoutes } from "../routes/lifeos-children-routes.js";
import { createLifeOSVisionRoutes } from "../routes/lifeos-vision-routes.js";
import { createLifeOSDecisionsRoutes } from "../routes/lifeos-decisions-routes.js";
import { createLifeOSIdentityRoutes } from "../routes/lifeos-identity-routes.js";
import { createAssessmentBatteryRoutes } from "../routes/lifeos-assessment-battery-routes.js";
import { createLifeOSVictoryVaultRoutes } from "../routes/lifeos-victory-vault-routes.js";
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
import { createLifeOSListeningRoutes } from "../routes/lifeos-listening-routes.js";
import { createLifeOSChatRoutes } from "../routes/lifeos-chat-routes.js";
import { createLifeOSVoiceRailRoutes } from "../routes/lifeos-voice-rail-routes.js";
import { createActionInboxRoutes } from "../routes/action-inbox-routes.js";
import { createCapturePipelineRoutes } from "../routes/capture-pipeline-routes.js";
import { createCommitmentRouteRoutes } from "../routes/commitment-route-routes.js";
import { createLifeRERoutes } from "../routes/lifere-os-routes.js";
import { createLifeOSAmbientRoutes } from "../routes/lifeos-ambient-routes.js";
import { createLifeOSHabitsRoutes } from "../routes/lifeos-habits-routes.js";
import { createLifeOSBriefingRoutes } from "../routes/lifeos-briefing-routes.js";
import { createLifeOSCommitmentRoutes } from "../routes/lifeos-commitment-routes.js";
import { createMissionRoutes } from "../routes/mission-routes.js";
import { createLifeOSAmbientIntelligenceRoutes } from "../routes/lifeos-ambient-intelligence-routes.js";
import { createLifeOSCycleRoutes } from "../routes/lifeos-cycle-routes.js";
import { createLifeOSAuthRoutes } from "../routes/lifeos-auth-routes.js";
import { createLifeOSCouncilBuilderRoutes } from "../routes/lifeos-council-builder-routes.js";
import { createGeminiProofRoutes } from "../routes/gemini-proof-routes.js";
import { createOILSecurityReceiptRoutes } from "../routes/oil-security-receipt-routes.js";
import { createCommandCenterAggregateRoutes } from "../routes/lifeos-command-center-routes.js";
import { createLifeOSCommunicationRoutes } from "../routes/lifeos-communication-routes.js";
import { createSelfRepairExecutorRoutes } from "../routes/self-repair-executor-routes.js";
import { createAutonomousTelemetryRoutes } from "../routes/autonomous-telemetry-routes.js";
import { createCanonicalAdminRoutes } from "../routes/canonical-admin-routes.js";
import { createCanonicalExecutionRoutes } from "../routes/canonical-execution-routes.js";
import { createCanonicalBacklogRoutes } from "../routes/canonical-backlog-routes.js";
import { createCanonicalSystemRoutes } from "../routes/canonical-system-routes.js";
import { createTsosEfficiencyRoutes } from "../routes/tsos-efficiency-routes.js";
import { createLifeOSBuilderOSCommandControlRoutes } from "../routes/lifeos-builderos-command-control-routes.js";
import { createLifeOSGateChangeRoutes } from "../routes/lifeos-gate-change-routes.js";
import { createFactoryMountRoutes } from "../routes/factory-mount-routes.js";
import { createDeliberationGovernanceRoutes } from "../routes/deliberation-governance-routes.js";
import rateLimit from "express-rate-limit";
import { createLaneIntelRoutes } from "../routes/lane-intel-routes.js";
import { createLifeOSExtensionRoutes } from "../routes/lifeos-extension-routes.js";
import { createTokenOSRoutes } from "../routes/tokenos-routes.js";
import { createTokenAccountingRoutes } from "../routes/token-accounting-routes.js";
import { createOperatorConsumptionLedgerRoutes } from "../routes/operator-consumption-ledger-routes.js";
import { createBuilderOSControlPlaneRoutes } from "../routes/builderos-control-plane-routes.js";
import { createBuilderOSArcRoutes } from "../routes/builderos-arc-routes.js";
import { createTSOSPlatformKernelRoutes } from "../routes/tsos-platform-kernel-routes.js";
import { getCachedResponse, cacheResponse } from "../services/response-cache.js";
import { createTCCoordinator } from "../services/tc-coordinator.js";
import { createIntegrityEngine as createWKIntegrityEngine } from "../services/integrity-engine.js";
import { createCouncilPromptAdapter } from "../services/council-prompt-adapter.js";
import { createMemoryIntelligenceRoutes } from "../routes/memory-intelligence-routes.js";
import { createMemoryCapsuleRoutes } from "../routes/memory-capsule-routes.js";
import { createMemorySelfRepairRoutes } from "../routes/memory-self-repair-routes.js";
import createMemoryStatusRoutes from "../routes/memory-status-routes.js";
import { createRequireLifeOSUserOrKey } from "../middleware/lifeos-auth-middleware.js";
import { getRuntimeProfile, isFullRuntimeProfile } from "../services/runtime-modes.js";

import { createSocialmediaosRoutes } from "../routes/socialmediaos-routes.js";
import { createSocialmediaosCoachingRoutes } from "../routes/socialmediaos-coaching-routes.js";
import { createLifeRESalesCoachingRoutes } from "../routes/lifere-sales-coaching-routes.js";
import { createTcAttachmentRoutes } from "../routes/tc-r4r-routes.js";
import { createXxxRoutes } from "../routes/knowledge-base-routes.js";
import { createFaithStudioRoutes } from "../routes/faith-studio-routes.js";
import { createFutureRoutes } from "../routes/future-self-simulator-routes.js";
import { createConfidenceArchitectureRoutes } from "../routes/confidence-architecture-routes.js";
import { createBelongingGuaranteeRoutes } from "../routes/belonging-guarantee-routes.js";
import { createMusicTalentRoutes } from "../routes/music-talent-routes.js";
import { createGamePublisherRoutes } from "../routes/game-publisher-routes.js";
import { createCourseRoutes } from "../routes/course-routes.js";
import { createEaiRoutes } from "../routes/egress-proxy-routes.js";
import { createGoalsRoutes } from "../routes/goals-routes.js";
import { createActivityRoutes } from "../routes/activities-routes.js";
import { createCalendarRoutes } from "../routes/calendar-routes.js";
import { createCoachRoutes } from "../routes/coach-chat-routes.js";
import { createCallSimulationRoutes } from "../routes/call-simulation-routes.js";
import { createPerfectDayRoutes } from "../routes/perfect-day-routes.js";
import { createProgressRoutes } from "../routes/progress-routes.js";
import { createConflictArbitratorRoutes } from "../routes/conflict-arbitrator-routes.js";
import { createReceptionistRoutes } from "../routes/receptionist-routes.js";
import { createFinancialRevenueRoutes } from "../routes/financial-revenue-routes.js";
import { createRecoveryRoutes } from "../routes/recovery-routes.js";
import { createLessonPlanRoutes } from "../routes/lesson-plan-routes.js";
import { createProgressReportRoutes } from "../routes/progress-report-routes.js";
import { createVideoRoutes } from "../routes/video-pipeline-routes.js";
import { createYoutubeRoutes } from "../routes/youtube-routes.js";
import { createWhiteLabelRoutes } from "../routes/white-label-routes.js";
import { createClientcareBillingRecoveryRoutes } from "../routes/clientcare-billing-recovery-routes.js";
import { createDetectRoutes } from "../routes/kingsman-routes.js";
import { createSprintRoutes } from "../routes/sprint-routes.js";
import { createOperatorConsumptionRoutes } from "../routes/operator-consumption-routes.js";
import { createBlueprintRoutes } from "../routes/builderos-routes.js";
import { createUserRoutes } from "../routes/user-routes.js";
import { createAuditRoutes } from "../routes/audit-routes.js";
import { createReplacementPlanRoutes } from "../routes/replacement-plan-routes.js";
import { createAutomationRoutes } from "../routes/automation-routes.js";
import { createTrialRoutes } from "../routes/trial-routes.js";
import { createRealEstateTrainingRoutes } from "../routes/real-estate-training-routes.js";
import { createBusinessCenterRoutes } from "../routes/business-center-routes.js";
import { createSiteBuilderEditorRoutes } from "../routes/site-builder-editor-routes.js";
import { registerLifeosConsentRoutes } from "../routes/lifeos-consent-routes.js";
import { createUiDirectivesService } from "../routes/lifeos-ui-directives-routes.js";
export async function registerRuntimeRoutes(app, deps) {
  const runtimeProfile = getRuntimeProfile();
  const fullRuntimeProfile = isFullRuntimeProfile();
  const optionalProductRoutesEnabled =
    fullRuntimeProfile && process.env.LIFEOS_ENABLE_OPTIONAL_PRODUCT_ROUTES === "true";
  const externalProductRoutesEnabled =
    fullRuntimeProfile && process.env.LIFEOS_ENABLE_EXTERNAL_PRODUCT_ROUTES === "true";
  const fieldOpsRoutesEnabled =
    fullRuntimeProfile && process.env.LIFEOS_ENABLE_FIELD_OPS_ROUTES === "true";
  const extensionRoutesEnabled =
    fullRuntimeProfile && process.env.LIFEOS_ENABLE_EXTENSION_ROUTE === "true";
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
    commitManyToGitHub,
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

  if (!fullRuntimeProfile) {
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
      getCachedResponse,
      cacheResponse,
      commitToGitHub,
      commitManyToGitHub,
      platformKernel: deps.platformKernel,
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

    app.use(createFactoryMountRoutes({ requireKey, logger, pool, callCouncilMember }));

    return {
      tcCoordinator: null,
      wkIntegrityEngine: null,
    };
  }

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

  app.use("/api/v1/adf", createAdfRoutes({ requireKey }));
  logger.info("✅ [ADF] Routes mounted at /api/v1/adf");

  app.use("/api/v1/history", createConversationHistoryRoutes({ pool, requireKey, callCouncilMember }));
  logger.info("✅ [HISTORY] Routes mounted at /api/v1/history");

  if (externalProductRoutesEnabled) {
    app.use("/api/v1/clientcare-billing", createClientCareBillingRoutes({ pool, requireKey, logger, callCouncilMember, callCouncilWithFailover, notificationService, sendSMS }));
    logger.info("✅ [CLIENTCARE-BILLING] Routes mounted at /api/v1/clientcare-billing");
  } else {
    logger.info("🛑 [CLIENTCARE-BILLING] External product route not mounted (set LIFEOS_ENABLE_EXTERNAL_PRODUCT_ROUTES=true to restore)");
  }

  const wordKeeperCouncil = {
    ask: (prompt, opts = {}) => callCouncilMember(opts.model || "claude", prompt, opts.systemPrompt || "", opts),
  };
  const wkIntegrityEngine = createWKIntegrityEngine(pool, wordKeeperCouncil);

  if (externalProductRoutesEnabled) {
    app.use("/api/v1/word-keeper", createWordKeeperRoutes({ pool, councilService: wordKeeperCouncil, twilioService: null }));
    logger.info("✅ [WORD-KEEPER] Routes mounted at /api/v1/word-keeper");
  } else {
    logger.info("🛑 [WORD-KEEPER] External product route not mounted (set LIFEOS_ENABLE_EXTERNAL_PRODUCT_ROUTES=true to restore)");
  }

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
  app.use("/api/v1/builder", createBuilderOilAuditProbeRoutes({ requireKey, pool }));
  logger.info("✅ [BUILDER-SUPERVISOR] Routes mounted at /api/v1/builder/{run,status,queue,pause,resume,locks,oil-probe}");

  app.use("/api/v1/capability-map", requireKey, createCapabilityMapRouter(pool));
  logger.info("✅ [CAPABILITY-MAP] Routes mounted at /api/v1/capability-map/{analyze,list,act}");

  app.use("/api/v1/model-performance", requireKey, createModelPerformanceRouter(pool));
  logger.info("✅ [MODEL-PERFORMANCE] Routes mounted at /api/v1/model-performance/{leaderboard,winners,lens/:lens,score-outcome}");

  // LifeOS Auth — must be mounted before core routes; no requireKey needed (it IS the auth)
  app.use("/api/v1/lifeos/auth", createLifeOSAuthRoutes({ pool, logger, requireKey }));
  logger.info("✅ [LIFEOS-AUTH] Routes mounted at /api/v1/lifeos/auth");

  /** Account JWT (lifeos-login) OR legacy command key — what the app shell uses after sign-in. */
  // Core LifeOS routes are required for the product to function.
  const lifeosOpts = { pool, requireKey: requireUserOrKey, callCouncilMember, logger, notificationService, sendSMS, sendAlertCall, makePhoneCall };

  app.use("/api/v1/lifeos", createLifeOSCoreRoutes(lifeosOpts));
  logger.info("✅ [LIFEOS-CORE] Routes mounted at /api/v1/lifeos");

  app.use("/api/v1/lifeos", createLifeOSSystemProofRoutes({ pool, requireKey: requireUserOrKey }));
  logger.info("✅ [LIFEOS-SYSTEM-PROOF] Routes mounted at /api/v1/lifeos/system-proof-event + /provider-tool-proof");

  app.use("/api/v1/lifeos", createLifeOSDirectActionRoutes({ pool, requireKey: requireUserOrKey }));
  logger.info("✅ [LIFEOS-DIRECT-ACTION] Routes mounted at /api/v1/lifeos/direct-action");

  app.use("/api/v1/lifeos", createLifeOSGatewayRoutes({ pool, sendSMS, callCouncilMember, logger }));
  logger.info("✅ [LIFEOS-GATEWAY] Routes mounted at /api/v1/lifeos");

  app.use("/api/v1/lifeos/engine", createLifeOSEngineRoutes({ pool, requireKey: requireUserOrKey, notificationService, sendSMS, callCouncilMember, logger }));
  logger.info("✅ [LIFEOS-ENGINE] Routes mounted at /api/v1/lifeos/engine");

  app.use(
    "/api/v1/lifeos/health",
    createLifeOSHealthRoutes({ pool, requireKey: requireUserOrKey, callCouncilMember, callAI: councilChatAI, sendSMS, logger })
  );
  logger.info("✅ [LIFEOS-HEALTH] Routes mounted at /api/v1/lifeos/health");

  if (fullRuntimeProfile) {
    app.use("/api/v1/lifeos/family", createLifeOSFamilyRoutes({ pool, requireKey: requireUserOrKey, callCouncilMember }));
    logger.info("✅ [LIFEOS-FAMILY] Routes mounted at /api/v1/lifeos/family");

    app.use("/api/v1/lifeos/purpose", createLifeOSPurposeRoutes({ pool, requireKey: requireUserOrKey, callCouncilMember }));
    logger.info("✅ [LIFEOS-PURPOSE] Routes mounted at /api/v1/lifeos/purpose");

    app.use("/api/v1/lifeos/children", createLifeOSChildrenRoutes({ pool, requireKey: requireUserOrKey, callCouncilMember }));
    logger.info("✅ [LIFEOS-CHILDREN] Routes mounted at /api/v1/lifeos/children");

    app.use("/api/v1/lifeos/vision", createLifeOSVisionRoutes({ pool, requireKey: requireUserOrKey, callCouncilMember, logger }));
    logger.info("✅ [LIFEOS-VISION] Routes mounted at /api/v1/lifeos/vision");

    app.use("/api/v1/lifeos/decisions", createLifeOSDecisionsRoutes({ pool, requireKey: requireUserOrKey, callCouncilMember, logger }));
    logger.info("✅ [LIFEOS-DECISIONS] Routes mounted at /api/v1/lifeos/decisions");

    app.use("/api/v1/lifeos/identity", createLifeOSIdentityRoutes({ pool, requireKey: requireUserOrKey, callCouncilMember, logger }));
    logger.info("✅ [LIFEOS-IDENTITY] Routes mounted at /api/v1/lifeos/identity");
    app.use("/api/v1/lifeos/identity/assessment", createAssessmentBatteryRoutes({ pool }));
    logger.info("✅ [LIFEOS-ASSESSMENT] Routes mounted at /api/v1/lifeos/identity/assessment");
    app.use("/api/v1/lifeos", createLifeOSVictoryVaultRoutes({ pool, requireKey: requireUserOrKey, callCouncilMember, logger }));
    logger.info("✅ [LIFEOS-VICTORY-VAULT] Routes mounted at /api/v1/lifeos/victories");
    app.use("/api/v1/lifeos/growth", createLifeOSGrowthRoutes({ pool, requireKey: requireUserOrKey, callCouncilMember, logger }));
    logger.info("✅ [LIFEOS-GROWTH] Routes mounted at /api/v1/lifeos/growth");

    app.use("/api/v1/lifeos/mediation", createLifeOSMediationRoutes({ pool, requireKey: requireUserOrKey, callCouncilMember, logger }));
    logger.info("✅ [LIFEOS-MEDIATION] Routes mounted at /api/v1/lifeos/mediation");

    app.use("/api/v1/lifeos/healing", createLifeOSHealingRoutes({ pool, requireKey: requireUserOrKey, callCouncilMember, logger }));
    logger.info("✅ [LIFEOS-HEALING] Routes mounted at /api/v1/lifeos/healing");
  } else {
    logger.info(`🛑 [LIFEOS-GROWTH-DOMAINS] Founder-builder runtime profile active (${runtimeProfile}) — family/purpose/children/vision/decisions/identity/growth/healing/mediation routes not mounted`);
  }

  if (process.env.LIFEOS_ENABLE_LEGACY_ROUTES === "true") {
    app.use("/api/v1/lifeos/legacy", createLifeOSLegacyRoutes({ pool, requireKey: requireUserOrKey, callCouncilMember, logger }));
    logger.info("✅ [LIFEOS-LEGACY] Routes mounted at /api/v1/lifeos/legacy");
  } else {
    logger.info("🛑 [LIFEOS-LEGACY] Legacy route tree not mounted (set LIFEOS_ENABLE_LEGACY_ROUTES=true to restore)");
  }

  if (fullRuntimeProfile) {
    app.use("/api/v1/lifeos/emotional", createLifeOSEmotionalRoutes({ pool, requireKey: requireUserOrKey, callCouncilMember }));
    logger.info("✅ [LIFEOS-EMOTIONAL] Routes mounted at /api/v1/lifeos/emotional");

    app.use("/api/v1/lifeos/ethics", createLifeOSEthicsRoutes({ pool, requireKey: requireUserOrKey, callCouncilMember, logger }));
    logger.info("✅ [LIFEOS-ETHICS] Routes mounted at /api/v1/lifeos/ethics");

    app.use("/api/v1/lifeos/conflict", createLifeOSConflictRoutes({ pool, requireKey: requireUserOrKey, callCouncilMember, logger }));
    logger.info("✅ [LIFEOS-CONFLICT] Routes mounted at /api/v1/lifeos/conflict");

    app.use("/api/v1/lifeos/finance", createLifeOSFinanceRoutes({ pool, requireKey: requireUserOrKey, callCouncilMember, logger }));
    logger.info("✅ [LIFEOS-FINANCE] Routes mounted at /api/v1/lifeos/finance");

    app.use("/api/v1/lifeos/backtest", createLifeOSBacktestRoutes({ requireKey: requireUserOrKey }));
    logger.info("✅ [LIFEOS-BACKTEST] Routes mounted at /api/v1/lifeos/backtest");

    app.use(
      "/api/v1/lifeos/weekly-review",
      createLifeOSWeeklyReviewRoutes({ pool, requireKey: requireUserOrKey, callAI: councilChatAI, logger })
    );
    logger.info("✅ [LIFEOS-WEEKLY-REVIEW] Routes mounted at /api/v1/lifeos/weekly-review");

    app.use(
      "/api/v1/lifeos/scorecard",
      createLifeOSScorecardRoutes({ pool, requireKey: requireUserOrKey, callAI: councilChatAI, logger })
    );
    logger.info("✅ [LIFEOS-SCORECARD] Routes mounted at /api/v1/lifeos/scorecard");
  } else {
    logger.info(`🛑 [LIFEOS-SECONDARY-DOMAINS] Founder-builder runtime profile active (${runtimeProfile}) — emotional/ethics/conflict/finance/backtest/weekly-review/scorecard routes not mounted`);
  }

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

  app.use(
    "/api/v1/lifeos/listening",
    createLifeOSListeningRoutes({
      pool,
      requireKey: requireUserOrKey,
      callAI: councilChatAI,
      logger,
    })
  );
  logger.info("✅ [LIFEOS-LISTENING] Routes mounted at /api/v1/lifeos/listening");

  app.use(
    "/api/v1/lifeos/voice-rail",
    createLifeOSVoiceRailRoutes({
      pool,
      requireKey: requireUserOrKey,
      callAI: councilChatAI,
      callCouncilMember,
      councilMembers: deps.COUNCIL_MEMBERS,
      councilAliasMap: deps.COUNCIL_ALIAS_MAP,
      logger,
    })
  );
  logger.info("✅ [LIFEOS-VOICE-RAIL] Routes mounted at /api/v1/lifeos/voice-rail (TTS/STT for Lumin chat)");

  app.use("/api/v1/lifeos/action-inbox", createActionInboxRoutes({ pool, requireKey: requireUserOrKey, logger }));
  logger.info("✅ [ACTION-INBOX] Routes mounted at /api/v1/lifeos/action-inbox");

  app.use("/api/v1/lifeos/capture-pipeline", createCapturePipelineRoutes({ pool, requireKey: requireUserOrKey, logger }));
  logger.info("✅ [CAPTURE-PIPELINE] Routes mounted at /api/v1/lifeos/capture-pipeline");

  app.use("/api/v1/lifeos/commitment-route", createCommitmentRouteRoutes({ pool, requireKey: requireUserOrKey, logger }));
  logger.info("✅ [COMMITMENT-ROUTE] Routes mounted at /api/v1/lifeos/commitment-route");

  app.use("/api/v1/lifere", createLifeRERoutes({
    requireKey: requireUserOrKey,
    pool,
    logger,
    callCouncilMember,
    notificationService,
    sendSMS,
    commitManyToGitHub,
  }));
  logger.info("✅ [LIFERE-OS] Routes mounted at /api/v1/lifere (W1–W6)");

  app.use("/api/v1/lifere/sales-coach", createLifeRESalesCoachingRoutes({ pool, requireKey: requireUserOrKey, callCouncilMember, logger }));
  logger.info("✅ [LIFERE-SALES-COACH] Routes mounted at /api/v1/lifere/sales-coach");

  app.use("/api/v1/lifeos/ambient", createLifeOSAmbientRoutes({ pool, requireKey: requireUserOrKey, logger }));
  logger.info("✅ [LIFEOS-AMBIENT] Routes mounted at /api/v1/lifeos/ambient");

  app.use("/api/v1/lifeos/briefing", createLifeOSBriefingRoutes({ pool, requireKey: requireUserOrKey, callCouncilMember, logger }));
  logger.info("✅ [LIFEOS-BRIEFING] Routes mounted at /api/v1/lifeos/briefing");

  if (fullRuntimeProfile) {
    app.use("/api/v1/lifeos/habits", createLifeOSHabitsRoutes({ pool, requireKey: requireUserOrKey, logger }));
    logger.info("✅ [LIFEOS-HABITS] Routes mounted at /api/v1/lifeos/habits");

    app.use("/api/v1/lifeos/commitments", createLifeOSCommitmentRoutes({ pool, requireKey: requireUserOrKey, logger }));
    logger.info("✅ [LIFEOS-COMMITMENTS] Routes mounted at /api/v1/lifeos/commitments");
    // Mission Runtime — BPB-0001 §§3.1-3.3, 3.5, 8 (AMENDMENT_47)
    app.use("/api/v1/lifeos", createMissionRoutes({ pool, requireKey: requireUserOrKey, logger }));
    logger.info("✅ [MISSIONS] Routes mounted at /api/v1/lifeos/missions/* + /api/v1/lifeos/household/board");

    app.use("/api/v1/lifeos/ambient-intel", createLifeOSAmbientIntelligenceRoutes({ pool, requireKey: requireUserOrKey, callCouncilMember, logger }));
    logger.info("✅ [LIFEOS-AMBIENT-INTEL] Routes mounted at /api/v1/lifeos/ambient-intel");

    createLifeOSCycleRoutes({ pool, requireKey: requireUserOrKey, logger })(app);
    logger.info("✅ [LIFEOS-CYCLE] Cycle routes mounted");
  } else {
    logger.info(`🛑 [LIFEOS-LONG-HORIZON] Founder-builder runtime profile active (${runtimeProfile}) — habits/commitments/missions/ambient-intel/cycle routes not mounted`);
  }

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
    commitManyToGitHub,
    platformKernel: deps.platformKernel,
  })(app);

  app.use(
    "/api/v1/lifeos/gate-change",
    createLifeOSGateChangeRoutes({ pool, requireKey, callCouncilMember, logger })
  );
  logger.info("✅ [LIFEOS-GATE-CHANGE] Routes mounted at /api/v1/lifeos/gate-change");

  const deliberationLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, error: 'Too many deliberation requests' },
  });

  app.use(
    "/api/v1/lifeos/deliberation",
    deliberationLimiter,
    createDeliberationGovernanceRoutes({ pool, requireKey, logger })
  );
  logger.info("✅ [LIFEOS-DELIBERATION] Routes mounted at /api/v1/lifeos/deliberation");

  if (fullRuntimeProfile) {
    app.use(
      "/api/v1/lifeos/intel",
      createLaneIntelRoutes({ pool, requireKey, callCouncilMember, logger })
    );
    logger.info("✅ [LIFEOS-INTEL] Horizon + red-team routes mounted at /api/v1/lifeos/intel");
  } else {
    logger.info(`🛑 [LIFEOS-INTEL] Founder-builder runtime profile active (${runtimeProfile}) — horizon/red-team routes not mounted`);
  }

  if (extensionRoutesEnabled) {
    app.use(
      "/api/v1/extension",
      createLifeOSExtensionRoutes({ pool, requireKey, callCouncilMember, logger })
    );
    logger.info("✅ [EXTENSION] Universal Overlay routes mounted at /api/v1/extension/{status,context,fill-form,chat}");
  } else {
    logger.info("🛑 [EXTENSION] Universal Overlay route not mounted (set LIFEOS_ENABLE_EXTENSION_ROUTE=true to restore)");
  }

  // TokenOS — B2B API token savings product
  if (externalProductRoutesEnabled) {
    createTokenOSRoutes({ pool, requireKey, callCouncilMember, logger })(app);
    logger.info("✅ [TOKENOS] External product routes mounted");
  } else {
    logger.info("🛑 [TOKENOS] External product routes not mounted (set LIFEOS_ENABLE_EXTERNAL_PRODUCT_ROUTES=true to restore)");
  }

  // Token Accounting OS — unified ledger + OCL + health
  if (deps.tokenAccounting) {
    app.use(
      "/api/v1/tokens",
      createTokenAccountingRoutes({ pool, requireKey, tokenAccounting: deps.tokenAccounting, savingsLedger: deps.savingsLedger })
    );
    app.use(
      "/api/v1/tokens",
      createOperatorConsumptionLedgerRoutes({ pool, requireKey, tokenAccounting: deps.tokenAccounting })
    );
    logger.info("✅ [TOKEN-ACCOUNTING] Routes mounted at /api/v1/tokens/{unified,operator,health,verify}");
  } else {
    logger.warn("⚠️ [TOKEN-ACCOUNTING] tokenAccounting service missing — routes not mounted");
  }

  if (deps.builderOSControlPlane) {
    app.use(
      "/api/v1/builderos/control-plane",
      createBuilderOSControlPlaneRoutes({
        pool,
        requireKey,
        controlPlane: deps.builderOSControlPlane,
      })
    );
    logger.info("✅ [BUILDEROS-CONTROL-PLANE] Routes mounted at /api/v1/builderos/control-plane/{health,summary,builds}");
  } else {
    logger.warn("⚠️ [BUILDEROS-CONTROL-PLANE] control plane service missing — routes not mounted");
  }

  if (callCouncilMember) {
    app.use(
      "/api/v1/builderos/arc",
      createBuilderOSArcRoutes({
        requireKey,
        callCouncilMember,
        logger,
      })
    );
    logger.info("✅ [BUILDEROS-ARC] Routes mounted at /api/v1/builderos/arc/{entry-gate,simulate,run-pipeline,translate}");
  } else {
    logger.warn("⚠️ [BUILDEROS-ARC] callCouncilMember missing — ARC routes not mounted");
  }

  if (deps.platformKernel) {
    app.use(
      "/api/v1/kernel",
      createTSOSPlatformKernelRoutes({ requireKey, platformKernel: deps.platformKernel })
    );
    logger.info("✅ [TSOS-KERNEL] Routes mounted at /api/v1/kernel/{health,verify}");
  }

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

  if (optionalProductRoutesEnabled) {
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
  } else {
    logger.info("🛑 [LIFEOS-OPTIONAL] Optional product routes not mounted (set LIFEOS_ENABLE_OPTIONAL_PRODUCT_ROUTES=true to restore)");
  }

  let tcCoordinator = null;
  if (fieldOpsRoutesEnabled) {
    tcCoordinator = createTCCoordinator({ pool, accountManager, notificationService, callCouncilMember, logger });

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
    logger.info("✅ [TC] Field-ops routes mounted");

    createMLSRoutes(app, { pool, requireKey, callCouncilMember, logger, accountManager });
    logger.info("✅ [MLS] Field-ops routes mounted");
  } else {
    logger.info("🛑 [TC] Field-ops routes not mounted (set LIFEOS_ENABLE_FIELD_OPS_ROUTES=true to restore)");
    logger.info("🛑 [MLS] Field-ops routes not mounted (set LIFEOS_ENABLE_FIELD_OPS_ROUTES=true to restore)");
  }

  // Memory Capsule Alpha — governed product memory (AMENDMENT_02)
  if (fullRuntimeProfile) {
    app.use('/api/v1/memory/capsules', createMemoryCapsuleRoutes({ pool, requireKey }));
    logger.info('✅ [MEMORY-CAPSULE] Routes mounted at /api/v1/memory/capsules/{signal,retrieve,health,capsule/:id,correct}');
  } else {
    logger.info(`🛑 [MEMORY-CAPSULE] Founder-builder runtime profile active (${runtimeProfile}) — capsule routes not mounted`);
  }

  if (externalProductRoutesEnabled) {
    app.use("/api/v1/socialmediaos", createSocialmediaosRoutes({ pool, requireKey: requireUserOrKey, logger }));
    logger.info('✅ [SOCIALMEDIAOS] Routes mounted at /api/v1/socialmediaos');

    app.use('/api/v1/socialmediaos/coaching', createSocialmediaosCoachingRoutes({ pool, requireKey: requireUserOrKey, callCouncilMember, logger }));
    logger.info('✅ [SOCIALMEDIAOS-COACHING] Routes mounted at /api/v1/socialmediaos/coaching');
  } else {
    logger.info("🛑 [SOCIALMEDIAOS] External product routes not mounted (set LIFEOS_ENABLE_EXTERNAL_PRODUCT_ROUTES=true to restore)");
  }

  app.use("/api/v1/tc-r4r", createTcAttachmentRoutes({ pool, requireKey: requireUserOrKey, logger }));
  logger.info('✅ [TC_R4R] Routes mounted at /api/v1/tc-r4r');

  app.use("/api/v1/knowledge-base", createXxxRoutes({ pool, requireKey: requireUserOrKey, logger }));
  logger.info('✅ [KNOWLEDGE_BASE] Routes mounted at /api/v1/knowledge-base');

  app.use("/api/v1/faith-studio", createFaithStudioRoutes({ pool, requireKey: requireUserOrKey, logger }));
  logger.info('✅ [FAITH_STUDIO] Routes mounted at /api/v1/faith-studio');

  app.use("/api/v1/kids-os", createFutureRoutes({ pool, requireKey: requireUserOrKey, logger }));
  logger.info('✅ [KIDS_OS] Routes mounted at /api/v1/kids-os');

  app.use("/api/v1/confidence-architecture", createConfidenceArchitectureRoutes({ pool, requireKey: requireUserOrKey, logger }));
  logger.info('✅ [CONFIDENCE_ARCHITECTURE] Routes mounted at /api/v1/confidence-architecture');

  app.use("/api/v1/belonging-guarantee", createBelongingGuaranteeRoutes({ pool, requireKey: requireUserOrKey, logger }));
  logger.info('✅ [BELONGING_GUARANTEE] Routes mounted at /api/v1/belonging-guarantee');

  app.use("/api/v1/music-talent", createMusicTalentRoutes(app, { pool, requireKey: requireUserOrKey, rk: requireUserOrKey, logger }));
  logger.info('✅ [MUSIC_TALENT] Routes mounted at /api/v1/music-talent');

  app.use("/api/v1/game-publisher", createGamePublisherRoutes(app, { pool, requireKey: requireUserOrKey, rk: requireUserOrKey, logger }));
  logger.info('✅ [GAME_PUBLISHER] Routes mounted at /api/v1/game-publisher');

  app.use("/api/v1/course", createCourseRoutes({ pool, requireKey: requireUserOrKey, logger }));
  logger.info('✅ [COURSE] Routes mounted at /api/v1/course');

  app.use("/api/v1/egress-proxy", createEaiRoutes({ pool, requireKey: requireUserOrKey, logger }));
  logger.info('✅ [EGRESS_PROXY] Routes mounted at /api/v1/egress-proxy');

  app.use("/api/v1/goals", createGoalsRoutes({ pool, requireKey: requireUserOrKey, logger }));
  logger.info('✅ [GOALS] Routes mounted at /api/v1/goals');

  app.use("/api/v1/activities", createActivityRoutes({ pool, requireKey: requireUserOrKey, logger }));
  logger.info('✅ [ACTIVITIES] Routes mounted at /api/v1/activities');

  app.use("/api/v1/calendar", createCalendarRoutes({ pool, requireKey: requireUserOrKey, logger }));
  logger.info('✅ [CALENDAR] Routes mounted at /api/v1/calendar');

  app.use("/api/v1/coach-chat", createCoachRoutes({ pool, requireKey: requireUserOrKey, logger }));
  logger.info('✅ [COACH_CHAT] Routes mounted at /api/v1/coach-chat');

  app.use("/api/v1/call-simulation", createCallSimulationRoutes({ pool, requireKey: requireUserOrKey, logger }));
  logger.info('✅ [CALL_SIMULATION] Routes mounted at /api/v1/call-simulation');

  app.use("/api/v1/perfect-day", createPerfectDayRoutes({ pool, requireKey: requireUserOrKey, logger }));
  logger.info('✅ [PERFECT_DAY] Routes mounted at /api/v1/perfect-day');

  app.use("/api/v1/progress", createProgressRoutes({ pool, requireKey: requireUserOrKey, logger }));
  logger.info('✅ [PROGRESS] Routes mounted at /api/v1/progress');

  app.use("/api/v1/conflict-arbitrator", createConflictArbitratorRoutes(app, { pool, requireKey: requireUserOrKey, rk: requireUserOrKey, logger }));
  logger.info('✅ [CONFLICT_ARBITRATOR] Routes mounted at /api/v1/conflict-arbitrator');

  app.use("/api/v1/receptionist", createReceptionistRoutes(app, { pool, requireKey: requireUserOrKey, rk: requireUserOrKey, logger }));
  logger.info('✅ [RECEPTIONIST] Routes mounted at /api/v1/receptionist');

  app.use("/api/v1/financial-revenue", createFinancialRevenueRoutes(app, { pool, requireKey: requireUserOrKey, rk: requireUserOrKey, logger }));
  logger.info('✅ [FINANCIAL_REVENUE] Routes mounted at /api/v1/financial-revenue');

  app.use("/api/v1/recovery", createRecoveryRoutes({ pool, requireKey: requireUserOrKey, logger }));
  logger.info('✅ [RECOVERY] Routes mounted at /api/v1/recovery');

  app.use("/api/v1/lesson-plan", createLessonPlanRoutes({ pool, requireKey: requireUserOrKey, logger }));
  logger.info('✅ [LESSON_PLAN] Routes mounted at /api/v1/lesson-plan');

  app.use("/api/v1/progress-report", createProgressReportRoutes({ pool, requireKey: requireUserOrKey, logger }));
  logger.info('✅ [PROGRESS_REPORT] Routes mounted at /api/v1/progress-report');

  app.use("/api/v1/video-pipeline", createVideoRoutes({ pool, requireKey: requireUserOrKey, logger }));
  logger.info('✅ [VIDEO_PIPELINE] Routes mounted at /api/v1/video-pipeline');

  app.use("/api/v1/youtube", createYoutubeRoutes({ pool, requireKey: requireUserOrKey, logger }));
  logger.info('✅ [YOUTUBE] Routes mounted at /api/v1/youtube');

  app.use("/api/v1/white-label", createWhiteLabelRoutes(app, { pool, requireKey: requireUserOrKey, rk: requireUserOrKey, callCouncilMember, logger }));
  logger.info('✅ [WHITE_LABEL] Routes mounted at /api/v1/white-label');

  app.use("/api/v1/clientcare-billing-recovery", createClientcareBillingRecoveryRoutes(app, { pool, requireKey: requireUserOrKey, rk: requireUserOrKey, logger }));
  logger.info('✅ [CLIENTCARE_BILLING_RECOVERY] Routes mounted at /api/v1/clientcare-billing-recovery');

  app.use("/api/v1/kingsman", createDetectRoutes({ pool, requireKey: requireUserOrKey, logger }));
  logger.info('✅ [KINGSMAN] Routes mounted at /api/v1/kingsman');

  app.use("/api/v1/sprint", createSprintRoutes({ pool, requireKey: requireUserOrKey, logger }));
  logger.info('✅ [SPRINT] Routes mounted at /api/v1/sprint');

  app.use("/api/v1/operator-consumption", createOperatorConsumptionRoutes({ pool, requireKey: requireUserOrKey, logger }));
  logger.info('✅ [OPERATOR_CONSUMPTION] Routes mounted at /api/v1/operator-consumption');

  app.use("/api/v1/builderos", createBlueprintRoutes({ pool, requireKey: requireUserOrKey, logger }));
  logger.info('✅ [BUILDEROS] Routes mounted at /api/v1/builderos');

  app.use("/api/v1/user", createUserRoutes({ pool, requireKey: requireUserOrKey, logger }));
  logger.info('✅ [USER] Routes mounted at /api/v1/user');

  app.use("/api/v1/audit", createAuditRoutes({ pool, requireKey: requireUserOrKey, logger }));
  logger.info('✅ [AUDIT] Routes mounted at /api/v1/audit');

  app.use("/api/v1/replacement-plan", createReplacementPlanRoutes({ pool, requireKey: requireUserOrKey, logger }));
  logger.info('✅ [REPLACEMENT_PLAN] Routes mounted at /api/v1/replacement-plan');

  app.use("/api/v1/automation", createAutomationRoutes({ pool, requireKey: requireUserOrKey, logger }));
  logger.info('✅ [AUTOMATION] Routes mounted at /api/v1/automation');

  app.use("/api/v1/trial", createTrialRoutes({ pool, requireKey: requireUserOrKey, logger }));
  logger.info('✅ [TRIAL] Routes mounted at /api/v1/trial');

  app.use("/api/v1/real-estate-training", createRealEstateTrainingRoutes({ pool, requireKey: requireUserOrKey, logger }));
  logger.info('✅ [REAL_ESTATE_TRAINING] Routes mounted at /api/v1/real-estate-training');

  app.use("/api/v1/business-center", createBusinessCenterRoutes({ pool, requireKey: requireUserOrKey, logger }));
  logger.info('✅ [BUSINESS_CENTER] Routes mounted at /api/v1/business-center');

  app.use("/api/v1/site-builder-editor", createSiteBuilderEditorRoutes({ pool, requireKey: requireUserOrKey, logger }));
  logger.info('✅ [SITE_BUILDER_EDITOR] Routes mounted at /api/v1/site-builder-editor');

  registerLifeosConsentRoutes(app, { pool, requireAuth: requireUserOrKey, logger });
  logger.info('✅ [CONSENT] Routes mounted at /api/v1/lifeos/consent');

  app.use("/api/v1/lifeos/ui-directives", createUiDirectivesService({ pool, requireKey: requireUserOrKey, logger }));
  logger.info('✅ [UI_DIRECTIVES] Routes mounted at /api/v1/lifeos/ui-directives');

  // Memory Intelligence — canonical BuilderOS evidence memory (AMENDMENT_39)
  app.use('/api/v1/memory/evidence', createMemoryIntelligenceRoutes({ pool, logger, requireKey }));
  logger.info('✅ [MEMORY-INTELLIGENCE] Routes mounted at /api/v1/memory/evidence/{facts,debates,lessons,agents,authority,violations,routing,intent-drift,health}');
  // CANONICAL_EVIDENCE compat path — scripts call /api/v1/memory/* (no /evidence prefix).
  // Same handler as /evidence; not a legacy route. do_not_use_for_builderos_proof: false.
  app.use('/api/v1/memory', createMemoryIntelligenceRoutes({ pool, logger, requireKey }));
  logger.info('✅ [MEMORY-INTELLIGENCE-COMPAT] CANONICAL_EVIDENCE alias at /api/v1/memory/* — same handler as /evidence; capsule routes isolated under /capsules');

  // Self-repair memory — read-only diagnostics and latest lessons
  app.use('/api/v1/memory/self-repair', createMemorySelfRepairRoutes({ pool, requireKey }));
  logger.info('✅ [MEMORY-SELF-REPAIR] Routes mounted at /api/v1/memory/self-repair/{health,latest}');

  // OIL Security Alpha — Gemini live proof + security receipts (AMENDMENT_19)
  app.use(createGeminiProofRoutes({ callCouncilMember, requireKey, pool }));
  logger.info('✅ [OIL-GEMINI-PROOF] Routes mounted at /api/v1/gemini/proof');
  app.use(createOILSecurityReceiptRoutes({ requireKey, pool }));
  logger.info('✅ [OIL-RECEIPTS] Routes mounted at /api/v1/oil/receipts');
  app.use(createCommandCenterAggregateRoutes({ requireKey, pool }));
  logger.info('✅ [CMD-CENTER-AGG] Routes mounted at /api/v1/lifeos/command-center/{phase14,mode,security}');
  app.use(createLifeOSCommunicationRoutes({ pool, requireKey, callCouncilMember }));
  logger.info('✅ [LIFEOS-COMM-OS] Routes mounted at /api/v1/lifeos/communication/*');
  app.use(createSelfRepairExecutorRoutes({ requireKey, pool }));
  logger.info('✅ [SELF-REPAIR-EXECUTOR] Routes mounted at /api/v1/lifeos/command-center/self-repair/execute');
  app.use(createAutonomousTelemetryRoutes({ requireKey, pool }));
  logger.info('✅ [AUTONOMOUS-TELEMETRY] Routes mounted at /api/v1/lifeos/autonomous-telemetry/*');
  app.use(
    '/api/v1/lifeos/builderos/command-control',
    createLifeOSBuilderOSCommandControlRoutes({ pool, requireKey, callCouncilMember })
  );
  logger.info('✅ [BUILDEROS-C2] Routes mounted at /api/v1/lifeos/builderos/command-control/{jobs,halt}');
  app.use(createCanonicalAdminRoutes({ pool, requireKey }));
  logger.info('✅ [CANONICAL-ADMIN] Routes mounted at /api/v1/lifeos/admin/ai/{status,effectiveness} + /api/v1/lifeos/system/{snapshot,health}');
  app.use(createCanonicalExecutionRoutes({ pool, requireKey }));
  logger.info('✅ [CANONICAL-EXECUTION] Routes mounted at /api/v1/lifeos/tasks/queue + /api/v1/lifeos/admin/ai/{performance,enable,disable}');
  app.use(createCanonicalBacklogRoutes({ pool, requireKey }));
  logger.info('✅ [CANONICAL-BACKLOG] Routes mounted at /api/v1/lifeos/projects/backlog + /:id/{complete,skip,reactivate} + PATCH /:id');
  app.use(createCanonicalSystemRoutes({ pool, requireKey }));
  logger.info('✅ [CANONICAL-SYSTEM] Routes mounted at /api/v1/lifeos/optimizer/stats + /api/v1/lifeos/system/fix-history + /api/v1/lifeos/user/simulation/accuracy');
  app.use(createTsosEfficiencyRoutes({ pool, requireKey }));
  logger.info('✅ [TSOS-EFFICIENCY] Routes mounted at /api/v1/lifeos/builderos/tsos-efficiency');
  app.use(createMemoryStatusRoutes({ pool, requireKey }));
  logger.info('✅ [MEMORY-STATUS] Routes mounted at /api/v1/lifeos/command-center/memory/status');

  app.use(createFactoryMountRoutes({ requireKey, logger, pool, callCouncilMember }));

  return {
    tcCoordinator,
    wkIntegrityEngine,
  };
}
