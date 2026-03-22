/**
 * Two-Tier AI Council System Initialization
 * Initializes the full two-tier (Tier 0 Ollama + Tier 1 Claude) council system,
 * model router, execution queue, self-programming service, and all dependent modules.
 */

import { createSelfProgrammingService } from '../services/self-programming.js';
import { createExecutionQueue } from '../services/execution-queue.js';
import { registerEnhancedCouncilRoutes } from '../routes/enhanced-council-routes.js';
import { createSiteBuilderRoutes } from '../routes/site-builder-routes.js';
import TCOTracker from '../core/tco-tracker.js';
import initTCORoutes from '../routes/tco-routes.js';
import TCOSalesAgent from '../core/tco-sales-agent.js';
import initTCOAgentRoutes from '../routes/tco-agent-routes.js';
import logger from '../services/logger.js';

import { createFinancialRoutes } from '../routes/financial-routes.js';
import { createBusinessRoutes } from '../routes/business-routes.js';
import { createGameRoutes } from '../routes/game-routes.js';
import { createVideoRoutes } from '../routes/video-routes.js';
import { createAgentRecruitmentRoutes } from '../routes/agent-recruitment-routes.js';
import { createBoldTrailRoutes } from '../routes/boldtrail-routes.js';
import { createApiCostSavingsRoutes } from '../routes/api-cost-savings-routes.js';
import { createWebIntelligenceRoutes } from '../routes/web-intelligence-routes.js';
import { createAutoBuilderRoutes } from '../routes/auto-builder-routes.js';
import { createLifeCoachingRoutes } from '../routes/life-coaching-routes.js';
import { createTwoTierCouncilRoutes } from '../routes/two-tier-council-routes.js';
import { createOutreachCrmRoutes } from '../routes/outreach-crm-routes.js';
import { createBillingRoutes } from '../routes/billing-routes.js';
import { createKnowledgeRoutes } from '../routes/knowledge-routes.js';
import { createConversationRoutes } from '../routes/conversation-routes.js';
import { createCommandCenterRoutes } from '../routes/command-center-routes.js';

export async function initializeTwoTierSystem(deps) {
  const {
    pool,
    app,
    selfProgrammingDepsRef,
    callCouncilMember,
    callCouncilWithFailover,
    broadcastToAll,
    detectBlindSpots,
    getCouncilConsensus,
    getTwilioClient,
    providerCooldowns,
    OLLAMA_ENDPOINT,
    PORT,
    RAILWAY_PUBLIC_DOMAIN,
    requireKey,
    requireKeyFn,
    scheduleAutonomyOnce,
    healthModuleInstance,
    autoBuilder,
    // route context extras
    dayjs,
    updateROI,
    getStripeClient,
    roiTracker,
    financialDashboard,
    incomeDroneSystem: incomeDroneSystemIn,
    recordRevenueEvent,
    syncStripeRevenue,
    aiSafetyGate,
    searchLimiter,
    searchService,
    checkHumanAttentionBudget,
    GamePublisher,
    VideoPipeline,
    makePhoneCall,
    outreachLimiter,
    aiPerformanceScores,
    compressionMetrics,
    getDailySpend,
    MAX_DAILY_SPEND,
    systemMetrics,
    systemSnapshots,
    ideaEngine,
    createProposal,
    conductEnhancedConsensus,
    sendSMS,
    path,
    fs,
    express,
    callRecorder,
    salesTechniqueAnalyzer,
    goalTracker,
    activityTracker,
    coachingProgression,
    calendarService,
    perfectDaySystem,
    goalCommitmentSystem,
    callSimulationSystem,
    relationshipMediation,
    meaningfulMoments,
    DISABLE_INCOME_DRONES,
    autonomyOrchestrator,
  } = deps;

  // These will be mutated/built and returned at the end
  let Tier0Council, Tier1Council, ModelRouter, OutreachAutomation, WhiteLabelConfig, CrmSequenceRunner;
  let KnowledgeBase, FileCleanupAnalyzer;
  let OpenSourceCouncil, openSourceCouncil;

  let tier0Council = null;
  let tier1Council = null;
  let modelRouter = null;
  let outreachAutomation = null;
  let notificationService = null;
  let crmSequenceRunner = null;
  let whiteLabelConfig = null;
  let knowledgeBase = null;
  let fileCleanupAnalyzer = null;
  let costReExamination = null;
  let logMonitor = null;
  let autoQueueManager = null;
  let aiAccountBot = null;
  let conversationExtractor = null;
  let taskImprovementReporter = null;
  let userSimulation = null;
  let aiEffectivenessTracker = null;
  let postUpgradeChecker = null;
  let comprehensiveIdeaTracker = null;
  let vapiIntegration = null;
  let businessCenter = null;
  let gameGenerator = null;
  let businessDuplication = null;
  let codeServices = null;
  let makeComGenerator = null;
  let legalChecker = null;
  let selfFundingSystem = null;
  let marketingResearch = null;
  let marketingAgency = null;
  let webScraper = null;
  let enhancedConversationScraper = null;
  let apiCostSavingsRevenue = null;
  let systemHealthChecker = null;
  let selfBuilder = null;
  let ideaToImplementationPipeline = null;
  let sourceOfTruthManager = null;
  let tcoTracker = null;
  let tcoRoutes = null;
  let tcoSalesAgent = null;
  let tcoAgentRoutes = null;
  let incomeDroneSystem = incomeDroneSystemIn;

  let executionQueue = null;
  let handleSelfProgramming = async (options = {}) => {
    logger.warn("[SELF-PROGRAMMING] Service not yet initialized");
    return { ok: false, error: "Self-programming service not yet initialized" };
  };
  let implementNextQueuedIdea = async () => {
    return { ok: false, error: "Execution queue not yet initialized" };
  };

  try {
    // Dynamic import of modules
    const tier0Module = await import("./tier0-council.js");
    const tier1Module = await import("./tier1-council.js");
    const routerModule = await import("./model-router.js");
    const outreachModule = await import("./outreach-automation.js");
    const crmModule = await import("./crm-sequence-runner.js");
    const notificationModule = await import("./notification-service.js");
    const whiteLabelModule = await import("./white-label.js");
    const knowledgeModule = await import("./knowledge-base.js");
    const cleanupModule = await import("./file-cleanup-analyzer.js");
    const openSourceCouncilModule = await import("./open-source-council.js");

    Tier0Council = tier0Module.Tier0Council;
    Tier1Council = tier1Module.Tier1Council;
    ModelRouter = routerModule.ModelRouter;
    OutreachAutomation = outreachModule.OutreachAutomation;
    CrmSequenceRunner = crmModule.CrmSequenceRunner || crmModule.default;
    WhiteLabelConfig = whiteLabelModule.WhiteLabelConfig;
    KnowledgeBase = knowledgeModule.KnowledgeBase;
    FileCleanupAnalyzer = cleanupModule.FileCleanupAnalyzer;
    OpenSourceCouncil = openSourceCouncilModule.OpenSourceCouncil;

    tier0Council = new Tier0Council(pool);
    tier1Council = new Tier1Council(pool, callCouncilMember);
    modelRouter = new ModelRouter(tier0Council, tier1Council, pool);
    openSourceCouncil = new OpenSourceCouncil(callCouncilMember, deps.COUNCIL_MEMBERS, providerCooldowns);

    // ==================== SELF-PROGRAMMING SERVICE INITIALIZATION ====================
    {
      const spService = createSelfProgrammingService(() => selfProgrammingDepsRef.current);
      handleSelfProgramming = spService.handleSelfProgramming;
      selfProgrammingDepsRef.current = {
        pool,
        path,
        fs,
        fsPromises: fs.promises,
        __dirname: deps.__dirname,
        execAsync: deps.execAsync,
        createSystemSnapshot: deps.createSystemSnapshot,
        rollbackToSnapshot: deps.rollbackToSnapshot,
        sandboxTest: deps.sandboxTest,
        callCouncilWithFailover,
        detectBlindSpots,
        getCouncilConsensus: (...args) => getCouncilConsensus(...args),
        GITHUB_TOKEN: deps.GITHUB_TOKEN,
        commitToGitHub: deps.commitToGitHub,
      };
      logger.info("✅ Self-Programming Service initialized");
    }

    // ==================== EXECUTION QUEUE INITIALIZATION ====================
    executionQueue = createExecutionQueue({
      pool,
      modelRouter,
      ideaToImplementationPipeline: null, // set later when pipeline loads
      handleSelfProgramming,
      detectBlindSpots,
      callCouncilWithFailover,
      broadcastToAll,
    });
    implementNextQueuedIdea = async () => {
      if (!executionQueue) return { ok: false, error: "Queue not ready" };
      const status = executionQueue.getStatus();
      return { ok: true, queued: status.queued, active: status.active };
    };
    logger.info("✅ Execution Queue initialized");

    // Initialize TCO (TotalCostOptimizer) system
    tcoTracker = new TCOTracker(pool);
    tcoRoutes = initTCORoutes({
      pool,
      tcoTracker,
      modelRouter,
      callCouncilMember,
    });

    // Initialize TCO AI Sales Agent (TCO-F01)
    tcoSalesAgent = new TCOSalesAgent(pool, callCouncilMember);
    tcoAgentRoutes = initTCOAgentRoutes({
      pool,
      tcoSalesAgent,
    });

    console.log("\n╔══════════════════════════════════════════════════════════════════════════════════╗");
    console.log("║ 🤖 [TCO SALES AGENT] INITIALIZED                                                  ║");
    console.log("║    Status: Autonomous agent ready to detect cost complaints                      ║");
    console.log("║    Mode: TEST MODE (auto_reply=false, requires human approval)                   ║");
    console.log("║    Webhooks: /api/tco-agent/webhook/*                                            ║");
    console.log("╚══════════════════════════════════════════════════════════════════════════════════╝\n");

    // Initialize Enhanced Council Features
    logger.info("🎯 [STARTUP] Registering Enhanced Council routes...");
    registerEnhancedCouncilRoutes(app, pool, callCouncilMember, requireKeyFn);
    logger.info("✅ [STARTUP] Enhanced Council routes registered");

    // Site Builder + Prospect Pipeline
    const siteBaseUrl = RAILWAY_PUBLIC_DOMAIN
      ? `https://${RAILWAY_PUBLIC_DOMAIN}`
      : `http://localhost:${PORT}`;
    createSiteBuilderRoutes(app, {
      pool,
      requireKey: requireKeyFn,
      callCouncilMember,
      baseUrl: siteBaseUrl,
      outreachAutomation: typeof outreachAutomation !== 'undefined' ? outreachAutomation : null,
      notificationService,
    });
    logger.info("✅ [STARTUP] Site Builder routes registered");
    logger.info("   - Dynamic Council Expansion (3→5 agents)");
    logger.info("   - Enhanced Consensus Protocol (5-phase with steel-manning)");
    logger.info("   - Decision Filters (7 wisdom lenses)");
    logger.info("   - FSAR Severity Gate (Likelihood × Damage × Reversibility)");

    const ollamaEndpoint = OLLAMA_ENDPOINT || "http://localhost:11434";
    console.log("\n╔══════════════════════════════════════════════════════════════════════════════════╗");
    console.log("║ ✅ [OPEN SOURCE COUNCIL] INITIALIZED                                              ║");
    console.log("║    Status: Ready to route tasks to local Ollama models                           ║");
    console.log("║    Activation: Cost shutdown OR explicit opt-in (useOpenSourceCouncil: true)    ║");
    console.log(`║    Models: Connected to Ollama at ${ollamaEndpoint.padEnd(47)}║`);
    console.log("╚══════════════════════════════════════════════════════════════════════════════════╝\n");

    // Initialize NotificationService (Email/SMS abstractions)
    const NotificationService = notificationModule.NotificationService || notificationModule.default;
    notificationService = new NotificationService({ pool });

    outreachAutomation = new OutreachAutomation(
      pool,
      modelRouter,
      getTwilioClient,
      callCouncilMember,
      notificationService
    );

    // CRM sequence runner (uses outreachAutomation + governance)
    crmSequenceRunner = new CrmSequenceRunner({ pool, outreachAutomation });

    whiteLabelConfig = new WhiteLabelConfig(pool);
    knowledgeBase = new KnowledgeBase(pool);
    fileCleanupAnalyzer = new FileCleanupAnalyzer();

    // Initialize cost re-examination
    const costModule = await import("./cost-re-examination.js");
    const CostReExamination = costModule.CostReExamination;
    costReExamination = new CostReExamination(pool, compressionMetrics, roiTracker);

    // Initialize log monitoring
    try {
      const logModule = await import("./log-monitor.js");
      const LogMonitor = logModule.LogMonitor;
      logMonitor = new LogMonitor(pool, callCouncilMember);
      if (selfProgrammingDepsRef) selfProgrammingDepsRef.current.logMonitor = logMonitor;
      logger.info("✅ Log Monitoring System initialized");

      // Initialize post-upgrade checker
      try {
        const upgradeModule = await import("./post-upgrade-checker.js");
        const PostUpgradeChecker = upgradeModule.PostUpgradeChecker;
        postUpgradeChecker = new PostUpgradeChecker(logMonitor, callCouncilMember, pool);
        if (selfProgrammingDepsRef) selfProgrammingDepsRef.current.postUpgradeChecker = postUpgradeChecker;
        logger.info("✅ Post-Upgrade Checker initialized");

        // Set up global hook for Cursor/development
        global.postUpgradeCheck = async () => {
          return await postUpgradeChecker.checkAfterUpgrade();
        };

        // Initialize comprehensive idea tracker
        try {
          const trackerModule = await import("./comprehensive-idea-tracker.js");
          comprehensiveIdeaTracker = new trackerModule.ComprehensiveIdeaTracker(pool);
          logger.info("✅ Comprehensive Idea Tracker initialized");
        } catch (error) {
          logger.warn("⚠️ Comprehensive Idea Tracker not available:", { error: error.message });
        }

        // Initialize Vapi integration
        try {
          const vapiModule = await import("./vapi-integration.js");
          vapiIntegration = new vapiModule.VapiIntegration(pool, callCouncilMember);
          await vapiIntegration.initialize();
          logger.info("✅ Vapi Integration initialized");
        } catch (error) {
          logger.warn("⚠️ Vapi Integration not available:", { error: error.message });
        }

        // Replace basic drone system with enhanced version
        try {
          const enhancedDroneModule = await import("./enhanced-income-drone.js");
          const EnhancedIncomeDrone = enhancedDroneModule.EnhancedIncomeDrone;
          incomeDroneSystem = new EnhancedIncomeDrone(pool, callCouncilMember, modelRouter);
          logger.info("✅ Enhanced Income Drone System initialized");

          // Deploy income drones (if not disabled)
          if (!DISABLE_INCOME_DRONES) {
            logger.info('🚀 [INCOME] Deploying income drones immediately...');
            try {
              await incomeDroneSystem.deployDrone("affiliate", 500);
              await incomeDroneSystem.deployDrone("content", 300);
              await incomeDroneSystem.deployDrone("outreach", 1000);
              await incomeDroneSystem.deployDrone("product", 200);
              await incomeDroneSystem.deployDrone("service", 500);
              logger.info('✅ [INCOME] Deployed 5 income drones - they are NOW WORKING!');
            } catch (deployError) {
              logger.error('❌ [INCOME] Error deploying drones:', { error: deployError.message });
            }
          } else {
            logger.info('ℹ️ [INCOME] Income drones DISABLED (set DISABLE_INCOME_DRONES=false to enable)');
          }

          // Initialize Opportunity Executor (actually implements opportunities to generate REAL revenue)
          let opportunityExecutor = null;
          try {
            const executorModule = await import("./opportunity-executor.js");
            opportunityExecutor = new executorModule.OpportunityExecutor(pool, callCouncilMember, incomeDroneSystem);
            await opportunityExecutor.start();
            logger.info("✅ Opportunity Executor initialized - will actually implement opportunities to generate REAL revenue");

            // Connect executor to drone system so drones can use it
            if (incomeDroneSystem && incomeDroneSystem.setOpportunityExecutor) {
              incomeDroneSystem.setOpportunityExecutor(opportunityExecutor);
              logger.info("✅ Connected Opportunity Executor to Income Drone System - drones will implement opportunities when any exist");
            }
          } catch (error) {
            logger.warn("⚠️ Opportunity Executor not available:", { error: error.message });
          }

          // Initialize Auto-Builder (builds opportunities into working products)
          // Auto-builder is imported in server.js at top of file
          logger.info("✅ Auto-Builder available (Anti-Hallucination Edition)");
          logger.info("📊 Auto-Builder: Focused on single product at a time");
          logger.info("🚫 Auto-Builder: phi3:mini is BANNED");
          logger.info("🔍 Auto-Builder: All outputs validated before saving");
        } catch (error) {
          logger.warn("⚠️ Enhanced Drone System not available, using basic:", { error: error.message });
        }

        // Initialize Business Center
        try {
          const businessCenterModule = await import("./business-center.js");
          businessCenter = new businessCenterModule.BusinessCenter(pool, callCouncilMember, modelRouter);
          await businessCenter.initialize();
          logger.info("✅ Business Center initialized");
        } catch (error) {
          logger.warn("⚠️ Business Center not available:", { error: error.message });
        }

        // Initialize Game Generator
        try {
          const gameGeneratorModule = await import("./game-generator.js");
          gameGenerator = new gameGeneratorModule.GameGenerator(pool, callCouncilMember, modelRouter);
          logger.info("✅ Game Generator initialized");
        } catch (error) {
          logger.warn("⚠️ Game Generator not available:", { error: error.message });
        }

        // Initialize Business Duplication
        try {
          const businessDupModule = await import("./business-duplication.js");
          businessDuplication = new businessDupModule.BusinessDuplication(pool, callCouncilMember, modelRouter);
          logger.info("✅ Business Duplication System initialized");
        } catch (error) {
          logger.warn("⚠️ Business Duplication not available:", { error: error.message });
        }

        // Initialize Code Services
        try {
          const codeServicesModule = await import("./code-services.js");
          codeServices = new codeServicesModule.CodeServices(pool, callCouncilMember, modelRouter);
          logger.info("✅ Code Services initialized");
        } catch (error) {
          logger.warn("⚠️ Code Services not available:", { error: error.message });
        }

        // Initialize Make.com Generator
        try {
          const makeComModule = await import("./makecom-generator.js");
          makeComGenerator = new makeComModule.MakeComGenerator(pool, callCouncilMember, modelRouter);
          logger.info("✅ Make.com Generator initialized");
        } catch (error) {
          logger.warn("⚠️ Make.com Generator not available:", { error: error.message });
        }

        // Initialize Legal Checker
        try {
          const legalModule = await import("./legal-checker.js");
          legalChecker = new legalModule.LegalChecker(pool);
          logger.info("✅ Legal Checker initialized");
        } catch (error) {
          logger.warn("⚠️ Legal Checker not available:", { error: error.message });
        }

        // Initialize Self-Funding System
        try {
          const selfFundingModule = await import("./self-funding-system.js");
          selfFundingSystem = new selfFundingModule.SelfFundingSystem(pool, callCouncilMember, modelRouter);
          await selfFundingSystem.initialize();
          logger.info("✅ Self-Funding System initialized");
        } catch (error) {
          logger.warn("⚠️ Self-Funding System not available:", { error: error.message });
        }

        // Initialize Marketing Research System
        try {
          const marketingResearchModule = await import("./marketing-research-system.js");
          marketingResearch = new marketingResearchModule.MarketingResearchSystem(pool, callCouncilMember, modelRouter);
          await marketingResearch.initialize();
          logger.info("✅ Marketing Research System initialized");
        } catch (error) {
          logger.warn("⚠️ Marketing Research System not available:", { error: error.message });
        }

        // Initialize Marketing Agency
        try {
          const marketingAgencyModule = await import("./marketing-agency.js");
          marketingAgency = new marketingAgencyModule.MarketingAgency(pool, callCouncilMember, modelRouter, marketingResearch);
          await marketingAgency.initialize();
          logger.info("✅ Marketing Agency initialized");
        } catch (error) {
          logger.warn("⚠️ Marketing Agency not available:", { error: error.message });
        }

        // Initialize Web Scraper
        try {
          const webScraperModule = await import("./web-scraper.js");
          webScraper = new webScraperModule.WebScraper(pool, callCouncilMember, modelRouter);
          logger.info("✅ Web Scraper initialized");
        } catch (error) {
          logger.warn("⚠️ Web Scraper not available:", { error: error.message });
        }

        // Initialize Enhanced Conversation Scraper (will auto-install Puppeteer if needed)
        try {
          const scraperModule = await import("./enhanced-conversation-scraper.js");
          enhancedConversationScraper = new scraperModule.EnhancedConversationScraper(
            pool,
            knowledgeBase,
            callCouncilMember
          );
          // Initialize Puppeteer (will auto-install if needed)
          await enhancedConversationScraper.initPuppeteer();
          logger.info("✅ Enhanced Conversation Scraper initialized");
        } catch (error) {
          logger.warn("⚠️ Enhanced Conversation Scraper not available:", { error: error.message });
        }

        // Initialize API Cost Savings Revenue System (PRIORITY 1)
        try {
          const costSavingsModule = await import("./api-cost-savings-revenue.js");
          apiCostSavingsRevenue = new costSavingsModule.APICostSavingsRevenue(
            pool,
            callCouncilMember,
            modelRouter
          );
          logger.info("✅ API Cost Savings Revenue System initialized (PRIORITY 1)");
        } catch (error) {
          logger.warn("⚠️ API Cost Savings Revenue System not available:", { error: error.message });
        }

        // Initialize System Health Checker
        try {
          const healthModule = await import("./system-health-checker.js");
          const allSystems = {
            tier0Council,
            tier1Council,
            modelRouter,
            knowledgeBase,
            costReExamination,
            logMonitor,
            autoQueueManager,
            comprehensiveIdeaTracker,
            enhancedIncomeDrone: incomeDroneSystem,
            businessCenter,
            gameGenerator,
            businessDuplication,
            codeServices,
            makeComGenerator,
            legalChecker,
            selfFundingSystem,
            marketingResearch,
            marketingAgency,
            webScraper,
            enhancedConversationScraper,
            apiCostSavingsRevenue,
          };
          // Add selfBuilder to allSystems if it exists
          if (selfBuilder) {
            allSystems.selfBuilder = selfBuilder;
          }
          // Add autoBuilder to allSystems if it exists
          if (autoBuilder) {
            allSystems.autoBuilder = autoBuilder;
          }
          systemHealthChecker = new healthModule.SystemHealthChecker(pool, allSystems);
          logger.info("✅ System Health Checker initialized");
          healthModuleInstance.setHealthChecker(systemHealthChecker);
        } catch (error) {
          logger.warn("⚠️ System Health Checker not available:", { error: error.message });
        }

        // Initialize Self-Builder (system can build itself)
        try {
          const builderModule = await import("./self-builder.js");
          selfBuilder = new builderModule.SelfBuilder(pool, callCouncilMember);
          if (selfProgrammingDepsRef) selfProgrammingDepsRef.current.selfBuilder = selfBuilder;
          logger.info("✅ Self-Builder initialized - system can now build itself");
        } catch (error) {
          logger.warn("⚠️ Self-Builder not available:", { error: error.message });
        }

        // Initialize Idea-to-Implementation Pipeline (complete flow from idea to completion)
        try {
          await import("./idea-to-implementation-pipeline.js");
          // Will initialize after taskTracker is available
          logger.info("✅ Idea-to-Implementation Pipeline module loaded");
        } catch (error) {
          logger.warn("⚠️ Idea-to-Implementation Pipeline not available:", { error: error.message });
        }

        // Initialize Source of Truth Manager
        try {
          const sotModule = await import("./source-of-truth-manager.js");
          sourceOfTruthManager = new sotModule.SourceOfTruthManager(pool);
          logger.info("✅ Source of Truth Manager initialized");

          // Auto-load Source of Truth if it exists (for AI council reference)
          const existingSOT = await sourceOfTruthManager.getDocument('master_vision');
          if (existingSOT.length > 0) {
            logger.info(`📖 [SOURCE OF TRUTH] Loaded ${existingSOT.length} document(s) - AI Council will reference for mission alignment`);
          } else {
            logger.info(`⚠️ [SOURCE OF TRUTH] No documents found. Use POST /api/v1/system/source-of-truth/store to add Source of Truth.`);
          }
        } catch (error) {
          logger.warn("⚠️ Source of Truth Manager not available:", { error: error.message });
        }
      } catch (error) {
        logger.warn("⚠️ Post-upgrade checker not available:", { error: error.message });
      }
    } catch (error) {
      logger.warn("⚠️ Log monitoring not available:", { error: error.message });
    }

    // Initialize auto-queue manager
    try {
      const queueModule = await import("./auto-queue-manager.js");
      const AutoQueueManager = queueModule.AutoQueueManager;
      autoQueueManager = new AutoQueueManager(pool, callCouncilMember, executionQueue, modelRouter);
      scheduleAutonomyOnce("AUTO_QUEUE_START", 30000, async () => {
        autoQueueManager.start();
        logger.info("✅ Auto-Queue Manager initialized");
      });

      // Use enhanced idea generation (each AI gives 25, council debates, votes)
      // Override the daily idea generation
      autoQueueManager.generateDailyIdeas = async () => {
        return await autoQueueManager.generateDailyIdeasEnhanced();
      };

      // Pass user simulation to enhanced idea generator
      if (autoQueueManager.generateDailyIdeasEnhanced) {
        const originalEnhanced = autoQueueManager.generateDailyIdeasEnhanced;
        autoQueueManager.generateDailyIdeasEnhanced = async function() {
          try {
            const { EnhancedIdeaGenerator } = await import('./enhanced-idea-generator.js');
            const generator = new EnhancedIdeaGenerator(
              this.pool,
              this.callCouncilMember,
              this.modelRouter,
              userSimulation // Pass user simulation for filtering
            );
            return await generator.runFullPipeline(this.executionQueue);
          } catch (error) {
            logger.error('Enhanced idea generation failed:', { error: error.message });
            return await this.generateDailyIdeas();
          }
        };
      }
    } catch (error) {
      logger.warn("⚠️ Auto-queue manager not available:", { error: error.message });
    }

    // Initialize AI account bot
    try {
      const botModule = await import("./ai-account-bot.js");
      const AIAccountBot = botModule.AIAccountBot;
      aiAccountBot = new AIAccountBot(pool, knowledgeBase, callCouncilMember);
      logger.info("✅ AI Account Bot initialized");
    } catch (error) {
      logger.warn("⚠️ AI account bot not available:", { error: error.message });
    }

    // Initialize conversation extractor bot
    try {
      const extractorModule = await import("./conversation-extractor-bot.js");
      const ConversationExtractorBot = extractorModule.ConversationExtractorBot;
      conversationExtractor = new ConversationExtractorBot(pool, knowledgeBase, callCouncilMember);
      logger.info("✅ Conversation Extractor Bot initialized");

      // Auto-start text scraping bot (scrapes and organizes text automatically)
      // Check for stored credentials and start scraping if available
      scheduleAutonomyOnce("EXTRACTOR_AUTOSTART", 60000, async () => {
        if (enhancedConversationScraper) {
          const credentials = await enhancedConversationScraper.listStoredCredentials();
          if (credentials && credentials.length > 0) {
            logger.info(`🤖 [EXTRACTOR] Found ${credentials.length} stored credential(s), starting auto-scraping...`);

            // Start scraping for each provider with credentials
            for (const cred of credentials) {
              try {
                logger.info(`🤖 [EXTRACTOR] Starting auto-scrape for ${cred.provider}...`);
                const result = await enhancedConversationScraper.scrapeAllConversations(cred.provider);
                if (result.success) {
                  logger.info(`✅ [EXTRACTOR] Auto-scraped ${result.conversations?.length || 0} conversations from ${cred.provider}`);
                }
              } catch (scrapeError) {
                logger.warn(`⚠️ [EXTRACTOR] Auto-scrape failed for ${cred.provider}:`, { error: scrapeError.message });
              }
            }
          } else {
            logger.info('📋 [EXTRACTOR] No stored credentials found. Use /api/v1/conversations/store-credentials to add credentials for auto-scraping.');
          }
        }
      });

    } catch (error) {
      logger.warn("⚠️ Conversation extractor not available:", { error: error.message });
    }

    // Initialize task improvement reporter (AI employees report improvements)
    try {
      const reporterModule = await import("./task-improvement-reporter.js");
      const TaskImprovementReporter = reporterModule.TaskImprovementReporter;
      taskImprovementReporter = new TaskImprovementReporter(pool, tier0Council, callCouncilMember);
      logger.info("✅ Task Improvement Reporter initialized");
    } catch (error) {
      logger.warn("⚠️ Task improvement reporter not available:", { error: error.message });
    }

    // Initialize user simulation system (learns user's decision style)
    try {
      const simulationModule = await import("./user-simulation.js");
      const UserSimulation = simulationModule.UserSimulation;
      userSimulation = new UserSimulation(pool, callCouncilMember);
      await userSimulation.rebuildStyleProfile();
      const accuracy = await userSimulation.getAccuracyScore();
      logger.info(`✅ User Simulation System initialized (Accuracy: ${(accuracy * 100).toFixed(1)}%)`);
    } catch (error) {
      logger.warn("⚠️ User simulation not available:", { error: error.message });
    }

    // Initialize AI effectiveness tracker
    try {
      const trackerModule = await import("./ai-effectiveness-tracker.js");
      const AIEffectivenessTracker = trackerModule.AIEffectivenessTracker;
      aiEffectivenessTracker = new AIEffectivenessTracker(pool);
      logger.info("✅ AI Effectiveness Tracker initialized");
    } catch (error) {
      logger.warn("⚠️ AI effectiveness tracker not available:", { error: error.message });
    }

    logger.info("✅ Two-Tier Council System initialized");
    logger.info("✅ Knowledge Base System initialized");
    logger.info("✅ Cost Re-Examination System initialized");

    // ==================== MODULAR ROUTE REGISTRATION ====================
    const routeCtx = {
      pool,
      requireKey: requireKeyFn,
      callCouncilMember,
      callCouncilWithFailover,
      broadcastToAll,
      dayjs,
      logger,
      // Financial
      updateROI,
      getStripeClient,
      roiTracker,
      financialDashboard,
      incomeDroneSystem,
      recordRevenueEvent,
      syncStripeRevenue,
      RAILWAY_PUBLIC_DOMAIN,
      // Business
      aiSafetyGate,
      searchLimiter,
      searchService,
      checkHumanAttentionBudget,
      businessCenter,
      businessDuplication,
      codeServices,
      makeComGenerator,
      legalChecker,
      selfFundingSystem,
      marketingResearch,
      marketingAgency,
      // Game
      GamePublisher,
      gameGenerator,
      // Video
      VideoPipeline,
      // Agent Recruitment
      makePhoneCall,
      // BoldTrail / API Cost Savings
      apiCostSavingsRevenue,
      // Web Intelligence
      webScraper,
      enhancedConversationScraper,
      // Auto-Builder
      executionQueue,
      selfBuilder,
      ideaToImplementationPipeline,
      autoBuilder,
      getCouncilConsensus,
      // Life Coaching
      callRecorder,
      salesTechniqueAnalyzer,
      goalTracker,
      activityTracker,
      coachingProgression,
      calendarService,
      perfectDaySystem,
      goalCommitmentSystem,
      callSimulationSystem,
      relationshipMediation,
      meaningfulMoments,
      // Two-Tier Council
      modelRouter,
      whiteLabelConfig,
      // Outreach & CRM
      outreachLimiter,
      outreachAutomation,
      crmSequenceRunner,
      notificationService,
      express,
      // Knowledge Base
      knowledgeBase,
      fileCleanupAnalyzer,
      // Conversation
      conversationExtractor,
      aiAccountBot,
      path,
      fs,
      // Command Center
      aiPerformanceScores,
      logMonitor,
      costReExamination,
      compressionMetrics,
      getDailySpend,
      MAX_DAILY_SPEND,
      systemMetrics,
      systemSnapshots,
      ideaEngine,
      createProposal,
      conductEnhancedConsensus,
      sendSMS,
      sourceOfTruthManager,
      autonomyOrchestrator,
    };

    createFinancialRoutes(app, routeCtx);
    createBusinessRoutes(app, routeCtx);
    createGameRoutes(app, routeCtx);
    createVideoRoutes(app, routeCtx);
    createAgentRecruitmentRoutes(app, routeCtx);
    createBoldTrailRoutes(app, routeCtx);
    createApiCostSavingsRoutes(app, routeCtx);
    createWebIntelligenceRoutes(app, routeCtx);
    createAutoBuilderRoutes(app, routeCtx);
    createLifeCoachingRoutes(app, routeCtx);
    createTwoTierCouncilRoutes(app, routeCtx);
    createOutreachCrmRoutes(app, routeCtx);
    createBillingRoutes(app, routeCtx);
    createKnowledgeRoutes(app, routeCtx);
    createConversationRoutes(app, routeCtx);
    createCommandCenterRoutes(app, routeCtx);
    logger.info('✅ [STARTUP] All modular routes registered');

  } catch (error) {
    logger.error("⚠️ Two-Tier System initialization error:", { error: error.message });
    logger.error("   System will continue with legacy council only");
  }

  return {
    // Council instances
    tier0Council,
    tier1Council,
    modelRouter,
    outreachAutomation,
    notificationService,
    crmSequenceRunner,
    whiteLabelConfig,
    openSourceCouncil,
    // Knowledge / analysis
    knowledgeBase,
    fileCleanupAnalyzer,
    costReExamination,
    logMonitor,
    autoQueueManager,
    aiAccountBot,
    conversationExtractor,
    taskImprovementReporter,
    userSimulation,
    aiEffectivenessTracker,
    postUpgradeChecker,
    comprehensiveIdeaTracker,
    vapiIntegration,
    // Revenue / business
    businessCenter,
    gameGenerator,
    businessDuplication,
    codeServices,
    makeComGenerator,
    legalChecker,
    selfFundingSystem,
    marketingResearch,
    marketingAgency,
    webScraper,
    enhancedConversationScraper,
    apiCostSavingsRevenue,
    incomeDroneSystem,
    // Infrastructure
    systemHealthChecker,
    selfBuilder,
    ideaToImplementationPipeline,
    sourceOfTruthManager,
    executionQueue,
    handleSelfProgramming,
    implementNextQueuedIdea,
    // TCO
    tcoTracker,
    tcoRoutes,
    tcoSalesAgent,
    tcoAgentRoutes,
    // Class constructors (kept for module-level variable updates)
    Tier0Council,
    Tier1Council,
    ModelRouter,
    OutreachAutomation,
    WhiteLabelConfig,
    CrmSequenceRunner,
    KnowledgeBase,
    FileCleanupAnalyzer,
    OpenSourceCouncil,
  };
}
