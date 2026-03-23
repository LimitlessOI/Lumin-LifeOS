/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                  ║
 * ║        🎼 LIFEOS v26.1 — CONSENSUS & SELF-HEALING SYSTEM                        ║
 * ║        Railway + Neon PostgreSQL + GitHub + Multi-AI Council + Stripe           ║
 * ║                                                                                  ║
 * ║  ✅ Consensus Protocol         ✅ Blind Spot Detection                          ║
 * ║  ✅ Daily Idea Generation      ✅ AI Rotation & Evaluation                      ║
 * ║  ✅ Sandbox Testing            ✅ Rollback Capabilities                         ║
 * ║  ✅ No-Cache API Calls         ✅ Continuous Memory                             ║
 * ║  ✅ OpenAI / Gemini / DeepSeek / Grok Council                                  ║
 * ║  ✅ Stripe Revenue Sync        ✅ Income Drones / ROI Tracking                  ║
 * ║                                                                                  ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * ⛔  COMPOSITION ROOT — DO NOT ADD FEATURE CODE HERE
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * This file wires the system together. It does NOT implement features.
 * If you are an AI agent, human developer, or automated system about to add
 * new functionality here — STOP and put it in the right place instead:
 *
 *   New route/feature  →  routes/<feature>-routes.js + services/<feature>.js
 *   Boot/startup logic →  startup/boot-domains.js
 *   Cron/schedulers    →  startup/register-schedulers.js
 *   Config values      →  config/<topic>.js
 *   DB changes         →  db/migrations/<date>_<name>.sql
 *
 * Allowed in this file: imports, pool/app/server creation, middleware setup,
 *   registerRoutes(), bootDomains(), app.listen(). Nothing else.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

import "dotenv/config";
import express from "express";
import dayjs from "dayjs";
import fs from "fs";
import { promises as fsPromises } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { runFSAR } from "./audit/fsar/fsar_runner.js";
import { evaluateExecutionGate } from "./audit/gating/execution_gate.js";
import { WebSocketServer } from "ws";
import { createServer } from "http";
import crypto from "crypto";
import process from "node:process";
import { exec } from "child_process";
import { promisify } from "util";
import rateLimit from "express-rate-limit";
import autoBuilder from "./core/auto-builder.js";
import stripeRoutes from "./routes/stripe-routes.js";
import memorySystem from "./core/memory-system.js";
import memoryRoutes from "./routes/memory-routes.js";
import TCOTracker from "./core/tco-tracker.js";
import initTCORoutes from "./routes/tco-routes.js";
import TCOSalesAgent from "./core/tco-sales-agent.js";
import initTCOAgentRoutes from "./routes/tco-agent-routes.js";
import { applyMiddleware } from "./middleware/apply-middleware.js";
import { registerPublicRoutes } from "./routes/public-routes.js";
import { registerWebsiteAuditRoutes } from "./routes/website-audit-routes.js";
import { registerApiV1CoreRoutes } from "./routes/api-v1-core.js";
import { createDbPool } from "./services/db.js";
import resourceGovernor from "./lib/resource-governor.js";
import searchService from "./services/searchService.js";
import { ModuleRouter } from "./core/module-router.js";
import { HealthModule } from "./modules/system/health-module.js";
import { registerModules } from "./modules/module-loader.js";
import { CouncilModule } from "./modules/council/council-module.js";
import { configureAiGuard, aiSafetyGate, detectHallucinations, crossValidateResponses } from "./services/ai-guard.js";
import {
  loadKnowledgeContext,
  injectKnowledgeContext,
} from "./services/knowledge-context.js";
import { createCouncilService } from "./services/council-service.js";
import { createSavingsLedger } from "./services/savings-ledger.js";
import { AdminModule } from "./modules/admin/admin-module.js";
import { ToolsModule } from "./modules/system/tools-module.js";
import { KnowledgeModule } from "./modules/system/knowledge-module.js";
import { IdeaEngine } from "./services/idea-engine.js";
import { createExecutionQueue } from "./services/execution-queue.js";
import { createSelfProgrammingService } from "./services/self-programming.js";
import { SelfProgrammingModule } from "./modules/system/self-programming-module.js";
import { startAutonomySchedulers } from "./services/autonomy-scheduler.js";
import { sandboxTest as runSandboxTest } from "./services/sandbox-service.js";
import {
  createSystemSnapshot as createSystemSnapshotService,
  rollbackToSnapshot as rollbackToSnapshotService,
} from "./services/snapshot-service.js";
import logger from "./services/logger.js";
import { setupWebSocketHandler } from "./services/websocket-handler.js";
import { createSelfImprovementLoop } from "./services/self-improvement-loop.js";
import { addJob, getQueueStats, getAllQueueStats, registerProcessor, shutdownQueues } from "./services/queue.js";
import VideoPipeline from "./services/video-pipeline.js";
import GamePublisher from "./services/game-publisher.js";
import { createSiteBuilderRoutes } from "./routes/site-builder-routes.js";
import { initDb } from "./db/index.js";
import { getAllFlags } from "./lib/flags.js";
import { validateEnv } from './services/env-validator.js';
import { runPreviewExpiry } from './services/preview-expiry-cron.js';
import { requestTracer } from './middleware/request-tracer.js';
import { errorBoundary } from './middleware/error-boundary.js';
import { startDbHealthMonitor } from './services/db-health-monitor.js';

import { createFinancialRoutes } from './routes/financial-routes.js';
import { createBusinessRoutes } from './routes/business-routes.js';
import { createGameRoutes } from './routes/game-routes.js';
import { createVideoRoutes } from './routes/video-routes.js';
import { createAgentRecruitmentRoutes } from './routes/agent-recruitment-routes.js';
import { createBoldTrailRoutes } from './routes/boldtrail-routes.js';
import { createApiCostSavingsRoutes } from './routes/api-cost-savings-routes.js';
import { createWebIntelligenceRoutes } from './routes/web-intelligence-routes.js';
import { createAutoBuilderRoutes } from './routes/auto-builder-routes.js';
import { createLifeCoachingRoutes } from './routes/life-coaching-routes.js';
import { createTwoTierCouncilRoutes } from './routes/two-tier-council-routes.js';
import { createOutreachCrmRoutes } from './routes/outreach-crm-routes.js';
import { createBillingRoutes } from './routes/billing-routes.js';
import { createKnowledgeRoutes } from './routes/knowledge-routes.js';
import { createConversationRoutes } from './routes/conversation-routes.js';
import { createCommandCenterRoutes } from './routes/command-center-routes.js';
import { SelfModificationEngine } from './core/self-modification-engine.js';
import IncomeDroneSystem from './core/income-drone-system.js';
import FinancialDashboard from './core/financial-dashboard.js';
import { createFinancialRevenue } from './core/financial-revenue.js';
import {
  selectOptimalModel,
  getModelSize,
  isCloudflareTunnel,
  callOllamaWithStreaming,
  getModelSizeCategory,
  getSmallerOllamaModel,
  getOllamaFallbackModel,
} from './services/ai-model-selector.js';
import { createCodeEscalation } from './core/code-escalation.js';
import { createConsensusService, createGetCouncilConsensus } from './services/consensus-service.js';
import { createTwilioService } from './services/twilio-service.js';
import { createAIPerformanceTracker } from './services/ai-performance-tracker.js';
import { createDeploymentService } from './services/deployment-service.js';
import { createWebSearchIntegration } from './services/web-search-integration.js';
import {
  hashPrompt,
  getCachedResponse,
  cacheResponse,
  initCache,
  getCacheStats,
  pruneExpiredCache,
  advancedCompress,
  advancedDecompress,
} from './services/response-cache.js';
import { createRailwayManagedEnvService } from "./services/railway-managed-env-service.js";
import { createRailwayManagedEnvRoutes } from "./routes/railway-managed-env-routes.js";
import { createAccountManager } from "./services/account-manager.js";
import { createAccountManagerRoutes } from "./routes/account-manager-routes.js";
import { createTCCoordinator, startTCDeadlineCron } from "./services/tc-coordinator.js";
import { createTCRoutes } from "./routes/tc-routes.js";
import { createMLSRoutes } from "./routes/mls-routes.js";
import { createEventBus } from "./core/event-bus.js";
import { createPodManager } from "./core/pod-manager.js";
import { createTelemetry } from "./services/telemetry.js";

import {
  RUNTIME,
  DISABLE_INCOME_DRONES,
  SMOKE_MODE,
  COUNCIL_TIMEOUT_MS,
  COUNCIL_PING_TIMEOUT_MS,
  SEARCH_ENABLED,
  searchLimiter,
  outreachLimiter,
  ALLOWED_ORIGINS_LIST,
  getStripeClient,
} from "./startup/environment.js";
import { createLatestRunManager } from "./startup/latest-run.js";
import { registerServerRoutes } from "./startup/routes/server-routes.js";
import { createAutonomyScheduler } from "./startup/schedulers.js";
import { initDatabase, ensureTcoAgentTables } from "./startup/database.js";
import { createUserPreferenceGuesser } from "./startup/user-preferences.js";
import { createSandboxTester } from "./startup/sandbox.js";
import { createSnapshotManager } from "./startup/snapshots.js";
import { loadROIFromDatabase, updateROI } from "./startup/roi.js";
import { createMemoryHandlers } from "./startup/memory.js";
import { createLossTracker } from "./startup/loss.js";

// Enhanced Council Features
import { registerEnhancedCouncilRoutes } from "./routes/enhanced-council-routes.js";
import { initializeTwoTierSystem } from "./core/two-tier-system-init.js";
// Idea Queue — human-approval gate for self-building pipeline
import { createIdeaQueueRoutes } from "./routes/idea-queue-routes.js";
// Digital Twin, Outcomes, Continuous Improvement
import { createTwinRoutes } from "./routes/twin-routes.js";
import { createAdamLogger, EVENTS } from "./services/adam-logger.js";
import { createContinuousImprovement } from "./services/continuous-improvement.js";
// Conversation history
import { createConversationHistoryRoutes } from "./routes/conversation-history-routes.js";
import { createConversationStore } from "./services/conversation-store.js";
// Word Keeper & Integrity Engine (Amendment 16)
import { createWordKeeperRoutes } from "./routes/word-keeper-routes.js";
import { startReminderCron } from "./services/reminder-cron.js";
import { createIntegrityEngine as createWKIntegrityEngine } from "./services/integrity-engine.js";
// Autonomy Orchestrator — self-programming without bottlenecks (Amendment 17)
import { createAutonomyOrchestrator } from "./services/autonomy-orchestrator.js";
import { createAutonomyRoutes } from "./routes/autonomy-routes.js";
import { registerTwilioWebhook } from "./services/twilio-webhook-registrar.js";

// Modular two-tier council system (loaded dynamically in startup)
let Tier0Council, Tier1Council, ModelRouter, OutreachAutomation, WhiteLabelConfig, CrmSequenceRunner;

// Knowledge Base System
let KnowledgeBase, FileCleanupAnalyzer;

// Open Source Council Router
let OpenSourceCouncil, openSourceCouncil;

// Sales Coaching Services
let salesTechniqueAnalyzer, callRecorder;

// Goal Tracking & Coaching Services
let goalTracker, activityTracker, coachingProgression, calendarService;

// Motivation & Perfect Day Services
let perfectDaySystem, goalCommitmentSystem, callSimulationSystem, relationshipMediation, meaningfulMoments;

// TCO (TotalCostOptimizer) System
let tcoTracker, tcoRoutes, tcoSalesAgent, tcoAgentRoutes;

const execAsync = promisify(exec);
const { writeFile } = fsPromises;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const latestRunManager = createLatestRunManager(__dirname, logger);
latestRunManager.ensureLatestRunFile().catch((error) => {
  logger.warn("[LATEST-RUN] initialization error:", { error: error.message });
});

const telemetry = createTelemetry({ logger });
const eventBus = createEventBus();
const podManager = createPodManager({ eventBus, telemetry, logger });
const lifecycleSubscriptions = [];

const app = express();
app.set('trust proxy', 1); // Railway sits behind a proxy — needed for rate-limit + IP detection
const server = createServer(app);
const wss = new WebSocketServer({ server });
wss.on("error", (error) => {
  logger.error("❌ [WS] WebSocket server error:", { error: error.message });
});

const { scheduleAutonomyLoop, scheduleAutonomyOnce } = createAutonomyScheduler(logger);

const moduleRouter = new ModuleRouter();
const healthModuleInstance = new HealthModule();
moduleRouter.register("system-health", healthModuleInstance);

const corePod = podManager.createPod({
  name: "platform-core",
  project: "Platform Backbone",
  priority: 1,
  labels: ["core"],
});
const growthPod = podManager.createPod({
  name: "growth-engineering",
  project: "New Product Pods",
  priority: 2,
  labels: ["growth"],
});

const schedulerDrone = podManager.registerDrone({
  label: "scheduler-drone",
  skills: ["self-healing", "monitoring"],
});
const growthDrone = podManager.registerDrone({
  label: "growth-drone",
  skills: ["experiment", "automation"],
});
podManager.assignDroneToPod(schedulerDrone.id, corePod.id);
podManager.assignDroneToPod(growthDrone.id, growthPod.id);

podManager.registerDrone({
  label: "maintenance-drone",
  skills: ["support", "ops"],
});

const followUpTransition = eventBus.subscribe("pod:completed", ({ pod }) => {
  if (!pod || pod.labels?.includes("maintenance")) return;
  if (pod.labels?.includes("followup")) return;
  const trace = telemetry.startTrace("pod.auto-transition", { pod: pod.name });
  const maintenancePod = podManager.ensureMaintenancePod();
  const followUp = podManager.createPod({
    name: `${pod.name}-followup`,
    project: `${pod.project} (continuous improvement)`,
    priority: Math.max(1, pod.priority),
    labels: ["followup"],
  });
  const moved = podManager.moveDronesBetweenPods(maintenancePod.id, followUp.id, 2);
  if (moved.length === 0) {
    const floatDrone = podManager.registerDrone({
      label: `${pod.name}-float`,
      skills: ["adaptive"],
    });
    podManager.assignDroneToPod(floatDrone.id, followUp.id);
  }
  trace.end("ok", { followUp: followUp.name, dronesMoved: moved.length });
});
lifecycleSubscriptions.push(followUpTransition);

// ==================== ENVIRONMENT CONFIGURATION ====================
const {
  DATABASE_URL,
  DATABASE_URL_SANDBOX,
  SANDBOX_MODE,
  COMMAND_CENTER_KEY,
  OPENAI_API_KEY,
  ANTHROPIC_API_KEY,
  GEMINI_API_KEY,
  LIFEOS_ANTHROPIC_KEY,
  LIFEOS_GEMINI_KEY,
  DEEPSEEK_API_KEY,
  GITHUB_TOKEN,
  GITHUB_REPO,
  OLLAMA_ENDPOINT,
  DEEPSEEK_LOCAL_ENDPOINT,
  DEEPSEEK_BRIDGE_ENABLED,
  ALLOWED_ORIGINS,
  HOST,
  PORT,
  MAX_DAILY_SPEND,
  COST_SHUTDOWN_THRESHOLD,
  NODE_ENV,
  RAILWAY_PUBLIC_DOMAIN,
  RAILWAY_ENVIRONMENT,
  DB_SSL_REJECT_UNAUTHORIZED,
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET,
  CURRENT_DEEPSEEK_ENDPOINT,
  validatedDatabaseUrl,
} = RUNTIME;

// Feature flags + derived env values are provided by ./startup/environment.js

// ==================== SECURITY: CORS WITH ORIGIN PINNING ====================

// robust same-origin helper for Railway / proxies
function getRequestHost(req) {
  const forwarded = (req.headers["x-forwarded-host"] || "")
    .toString()
    .toLowerCase();
  const direct = (req.get("host") || "").toString().toLowerCase();
  return forwarded || direct;
}

function isSameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true; // non-browser or curl: treat as same-origin

  try {
    const originUrl = new URL(origin);
    const reqHost = getRequestHost(req);
    return originUrl.host.toLowerCase() === reqHost;
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

// ==================== MIDDLEWARE ====================
applyMiddleware(app, {
  express,
  path,
  __dirname,
  rateLimit,
  ALLOWED_ORIGINS_LIST,
  isSameOrigin,
});

app.use(requestTracer(logger));

app.use((req, res, next) => {
  if (typeof resourceGovernor?.noteRequest === 'function') {
    resourceGovernor.noteRequest(req);
  }
  next();
});

app.use(async (req, res, next) => {
  await moduleRouter.route(req, res, next);
});

registerApiV1CoreRoutes(app, () => apiV1DepsRef.current);

// ==================== DATABASE POOL ====================
export const pool = createDbPool({
  validatedDatabaseUrl,
  DB_SSL_REJECT_UNAUTHORIZED,
});

// Initialize Drizzle ORM (shares the same pool — no second connection)
initDb(pool);

// Start DB pool health monitoring
startDbHealthMonitor(pool);

ensureTcoAgentTables(pool, logger, __dirname).catch((error) => {
  logger.warn("⚠️ ensureTcoAgentTables failed:", { error: error.message });
});

// ==================== GLOBAL STATE ====================
const apiV1DepsRef = { current: {} };
let autonomyDepsRef = { current: {} };
const selfProgrammingDepsRef = { current: {} };
let activeConnections = new Map();

// ==================== UTILITY FUNCTIONS ====================
function broadcastToAll(message) {
  for (const ws of activeConnections.values()) {
    try {
      ws.send(JSON.stringify(message));
    } catch (error) {
      // ignore closed
    }
  }
}
let overlayStates = new Map();
let conversationHistory = new Map();
let aiPerformanceScores = new Map();
let ideaEngine = null;
let systemSnapshots = [];

// === PHASE 0 SAFETY CONTROLS ===
const AI_ENABLED_FLAG = !["0","false","no","off"].includes(
  String(process.env.AI_ENABLED || "").toLowerCase()
);

configureAiGuard({ app, initialAiEnabled: AI_ENABLED_FLAG });

const roiTracker = {
  daily_revenue: 0,
  daily_ai_cost: 0,
  daily_tasks_completed: 0,
  total_tokens_saved: 0,
  micro_compression_saves: 0,
  roi_ratio: 0,
  revenue_per_task: 0,
  last_reset: dayjs().format("YYYY-MM-DD"),
};

const updateROIWithTracker = (...args) => updateROI(roiTracker, ...args);

const compressionMetrics = {
  v2_0_compressions: 0,
  v3_compressions: 0,
  total_bytes_saved: 0,
  total_cost_saved: 0,
  cache_hits: 0,
  cache_misses: 0,
  model_downgrades: 0, // Using cheaper models
  prompt_optimizations: 0,
  tokens_saved_total: 0,
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

const { storeConversationMemory, recallConversationMemory } = createMemoryHandlers({
  pool,
  logger,
});
const sandboxTest = createSandboxTester({
  runSandboxTest,
  rootDir: __dirname,
  pool,
});
let trackLossFunction = null;
const { createSystemSnapshot, rollbackToSnapshot } = createSnapshotManager({
  createSystemSnapshotService,
  rollbackToSnapshotService,
  rootDir: __dirname,
  pool,
  systemMetrics,
  roiTracker,
  activeConnections,
  ideaEngine,
  aiPerformanceScores,
  systemSnapshots,
  getTrackLoss: () => trackLossFunction,
});
const trackLoss = createLossTracker({ pool, logger, createSystemSnapshot });
trackLossFunction = trackLoss;


// ==================== ENHANCED AI COUNCIL MEMBERS (NO CLAUDE) ====================
// TIER 0: Open Source / Cheap Models (PRIMARY - Do all the work)
// TIER 1: Expensive Models (OVERSIGHT ONLY - Validation when needed)
const COUNCIL_ALIAS_MAP = {
  // Map friendly names to real COUNCIL_MEMBERS keys that exist and have API keys
  claude:     "groq_llama",    // fast, free via Groq
  anthropic:  "groq_llama",    // same
  chatgpt:    "groq_llama",    // same
  openai:     "groq_llama",    // same
  gemini:     "gemini_flash",  // free via Google AI
  grok:       "groq_llama",    // grok not configured — use Groq as substitute
  deepseek:   "deepseek",      // cheap cloud deepseek ($0.10/1M tokens)
};

const COUNCIL_MEMBERS = {
  // TIER 0 - PRIMARY WORKERS (Free/Cheap - Run system independently)
  ollama_deepseek: {
    name: "DeepSeek Coder (Local)",
    model: "deepseek-coder:latest",
    provider: "ollama",
    endpoint: OLLAMA_ENDPOINT || "http://localhost:11434",
    role: "Primary Developer & Infrastructure",
    focus: "optimization, performance, safe testing, development, code generation",
    maxTokens: 4096,
    tier: "tier0",
    costPer1M: 0, // FREE (local)
    specialties: ["infrastructure", "testing", "performance", "development", "code"],
    isFree: true,
    isLocal: true,
  },
  ollama_llama: {
    name: "Llama 3.2 (Local)",
    model: "llama3.2:1b",
    provider: "ollama",
    endpoint: OLLAMA_ENDPOINT || "http://localhost:11434",
    role: "General Assistant & Research",
    focus: "general tasks, research, analysis, reasoning",
    maxTokens: 8192,
    tier: "tier0",
    costPer1M: 0, // FREE (local)
    specialties: ["research", "analysis", "general"],
    isFree: true,
    isLocal: true,
  },
  deepseek: {
    name: "DeepSeek Cloud",
    model: "deepseek-coder",
    provider: "deepseek",
    role: "Primary Developer & Infrastructure (Cloud Fallback)",
    focus: "optimization, performance, safe testing, development",
    maxTokens: 4096,
    tier: "tier0", // Open source tier
    costPer1M: 0.1, // $0.10 per million tokens (cheapest cloud)
    specialties: ["infrastructure", "testing", "performance", "development"],
    useLocal: DEEPSEEK_BRIDGE_ENABLED === "true",
    isFree: false,
  },
  groq_llama: {
    name: "Groq Llama (Free)",
    model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
    provider: "groq",
    role: "Fast Cloud Generalist",
    focus: "quick routing, lightweight reasoning, free-tier responses",
    maxTokens: 4096,
    tier: "tier0",
    costPer1M: 0,
    specialties: ["fast", "routing", "general", "reasoning"],
    isFree: true,
    isLocal: false,
  },
  gemini_flash: {
    name: "Gemini Flash (Free)",
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    provider: "gemini",
    role: "Fast Cloud Reasoning",
    focus: "summaries, planning, lightweight analysis, free-tier responses",
    maxTokens: 8192,
    tier: "tier0",
    costPer1M: 0,
    specialties: ["analysis", "planning", "summaries", "reasoning"],
    isFree: true,
    isLocal: false,
  },
  cerebras_llama: {
    name: "Cerebras Llama (Free)",
    model: process.env.CEREBRAS_MODEL || "llama3.1-8b",
    provider: "cerebras",
    role: "High-Speed Cloud Reasoning",
    focus: "fast generation, routing, throughput-heavy tasks",
    maxTokens: 8192,
    tier: "tier0",
    costPer1M: 0,
    specialties: ["speed", "throughput", "reasoning", "general"],
    isFree: true,
    isLocal: false,
  },
  openrouter_free: {
    name: "OpenRouter Free",
    model: process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-8b-instruct:free",
    provider: "openrouter",
    role: "Free Model Aggregator",
    focus: "fallback routing across free hosted models",
    maxTokens: 4096,
    tier: "tier0",
    costPer1M: 0,
    specialties: ["fallback", "general", "routing"],
    isFree: true,
    isLocal: false,
  },
  mistral_free: {
    name: "Mistral Free",
    model: process.env.MISTRAL_MODEL || "open-mistral-7b",
    provider: "mistral",
    role: "Lightweight Cloud Assistant",
    focus: "concise generation, chat, lightweight planning",
    maxTokens: 4096,
    tier: "tier0",
    costPer1M: 0,
    specialties: ["chat", "planning", "lightweight"],
    isFree: true,
    isLocal: false,
  },
  together_free: {
    name: "Together Free",
    model: process.env.TOGETHER_MODEL || "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
    provider: "together",
    role: "Shared Cloud Fallback",
    focus: "free/shared routing, fallback execution, fast responses",
    maxTokens: 4096,
    tier: "tier0",
    costPer1M: 0,
    specialties: ["fallback", "speed", "general"],
    isFree: true,
    isLocal: false,
  },
  // TIER 0 - CODE GENERATION SPECIALISTS (Best for coding tasks)
  ollama_deepseek_coder_v2: {
    name: "DeepSeek Coder V2 (Local)",
    model: "deepseek-coder-v2:latest",
    provider: "ollama",
    endpoint: OLLAMA_ENDPOINT || "http://localhost:11434",
    role: "Code Generation Specialist",
    focus: "code generation, code review, debugging, infrastructure, production code",
    maxTokens: 8192,
    tier: "tier0",
    costPer1M: 0, // FREE (local)
    specialties: ["code", "code_review", "debugging", "infrastructure", "development"],
    isFree: true,
    isLocal: true,
    priority: "high", // Best for code tasks
  },
  ollama_deepseek_coder_33b: {
    name: "DeepSeek Coder 33B (Local)",
    model: "deepseek-coder:33b",
    provider: "ollama",
    endpoint: OLLAMA_ENDPOINT || "http://localhost:11434",
    role: "Code Generation Specialist (Large)",
    focus: "complex code generation, advanced algorithms, production code",
    maxTokens: 8192,
    tier: "tier0",
    costPer1M: 0, // FREE (local)
    specialties: ["code", "complex_algorithms", "production_code"],
    isFree: true,
    isLocal: true,
  },
  ollama_qwen_coder_32b: {
    name: "Qwen2.5-Coder-32B (Local)",
    model: "qwen2.5-coder:32b-instruct",
    provider: "ollama",
    endpoint: OLLAMA_ENDPOINT || "http://localhost:11434",
    role: "Code Generation Specialist",
    focus: "production code generation, complex algorithms, code understanding",
    maxTokens: 8192,
    tier: "tier0",
    costPer1M: 0, // FREE (local)
    specialties: ["code", "code_generation", "algorithms", "production"],
    isFree: true,
    isLocal: true,
  },
  ollama_codestral: {
    name: "Mistral Codestral 25.01 (Local)",
    model: "codestral:latest",
    provider: "ollama",
    endpoint: OLLAMA_ENDPOINT || "http://localhost:11434",
    role: "Fast Code Generation",
    focus: "quick code snippets, IDE integration, FIM tasks, fast responses",
    maxTokens: 4096,
    tier: "tier0",
    costPer1M: 0, // FREE (local)
    specialties: ["code", "fast_code", "snippets", "fim"],
    isFree: true,
    isLocal: true,
  },
  // TIER 0 - REASONING & ANALYSIS SPECIALISTS
  ollama_deepseek_v3: {
    name: "DeepSeek V3 (Local)",
    model: "deepseek-v3:latest",
    provider: "ollama",
    endpoint: OLLAMA_ENDPOINT || "http://localhost:11434",
    role: "Complex Reasoning Specialist",
    focus: "complex reasoning, mathematical tasks, strategic decisions, exceptional reasoning",
    maxTokens: 128000, // 128K context
    tier: "tier0",
    costPer1M: 0, // FREE (local)
    specialties: ["reasoning", "math", "strategic_decisions", "complex_analysis"],
    isFree: true,
    isLocal: true,
    priority: "high", // Best for reasoning
  },
  ollama_llama_3_3_70b: {
    name: "Llama 3.3 70B (Local)",
    model: "llama3.3:70b-instruct-q4_0",
    provider: "ollama",
    endpoint: OLLAMA_ENDPOINT || "http://localhost:11434",
    role: "High-Quality Reasoning",
    focus: "complex reasoning, strategic decisions, general tasks, multilingual",
    maxTokens: 8192,
    tier: "tier0",
    costPer1M: 0, // FREE (local)
    specialties: ["reasoning", "strategic_decisions", "general", "multilingual"],
    isFree: true,
    isLocal: true,
  },
  ollama_qwen_2_5_72b: {
    name: "Qwen 2.5 72B (Local)",
    model: "qwen2.5:72b-q4_0",
    provider: "ollama",
    endpoint: OLLAMA_ENDPOINT || "http://localhost:11434",
    role: "Research & Analysis Specialist",
    focus: "research, analysis, mathematical tasks, multilingual, document understanding",
    maxTokens: 8192,
    tier: "tier0",
    costPer1M: 0, // FREE (local)
    specialties: ["research", "analysis", "math", "multilingual", "documents"],
    isFree: true,
    isLocal: true,
  },
  ollama_gemma_2_27b: {
    name: "Gemma 2 27B (Local)",
    model: "gemma2:27b-it-q4_0",
    provider: "ollama",
    endpoint: OLLAMA_ENDPOINT || "http://localhost:11434",
    role: "Balanced Reasoning",
    focus: "on-device reasoning, balanced performance, general tasks",
    maxTokens: 8192,
    tier: "tier0",
    costPer1M: 0, // FREE (local)
    specialties: ["reasoning", "general", "balanced"],
    isFree: true,
    isLocal: true,
  },
  // TIER 0 - LIGHTWEIGHT & FAST
  ollama_phi3: {
    name: "Phi-3 Mini (Local)",
    model: "phi3:mini",
    provider: "ollama",
    endpoint: OLLAMA_ENDPOINT || "http://localhost:11434",
    role: "Lightweight Assistant",
    focus: "light tasks, monitoring, simple analysis, fast responses",
    maxTokens: 4096,
    tier: "tier0",
    costPer1M: 0, // FREE (local)
    specialties: ["light_tasks", "monitoring", "simple_analysis"],
    isFree: true,
    isLocal: true,
  },
  // TIER 1 - OVERSIGHT ONLY (Expensive - Only for validation)
};

// LCTP v3 helpers are now provided by services/council-service.js via compressPrompt/decompressResponse

// ==================== TWILIO SERVICE INITIALIZATION ====================
const alertState = { inProgress: false };
const {
  getTwilioClient,
  makePhoneCall,
  sendSMS,
  sendAlertSms,
  sendAlertCall,
  notifyCriticalIssue,
} = createTwilioService({
  callCouncilMember: (...args) => callCouncilMember(...args),
  RAILWAY_PUBLIC_DOMAIN: process.env.RAILWAY_PUBLIC_DOMAIN,
  ALERT_PHONE: process.env.ALERT_PHONE || process.env.ADMIN_PHONE || process.env.COMMAND_CENTER_PHONE || null,
  alertState,
});

// ==================== AI PERFORMANCE TRACKER INITIALIZATION ====================
const {
  trackAIPerformance,
  rotateAIsBasedOnPerformance,
} = createAIPerformanceTracker({
  pool,
  aiPerformanceScores,
  COUNCIL_MEMBERS,
});



// Track provider cooldowns when rate-limited or out of quota
// Map<member, timestamp_ms_when_we_can_try_again>
const providerCooldowns = new Map();

// ==================== COUNCIL SERVICE INITIALIZATION ====================
const {
  compressPrompt,
  decompressResponse,
  decodeMicroBody,
  buildMicroResponse,
  getApiKeyForProvider,
  getProviderPingConfig,
  pingCouncilMember,
  calculateCost,
  getDailySpend,
  updateDailySpend,
  resolveCouncilMember,
  callCouncilMember,
  callCouncilWithFailover,
  detectBlindSpots,
  tokenOptimizer,
} = createCouncilService({
  pool,
  COUNCIL_MEMBERS,
  COUNCIL_ALIAS_MAP,
  OLLAMA_ENDPOINT,
  MAX_DAILY_SPEND,
  COST_SHUTDOWN_THRESHOLD,
  NODE_ENV,
  RAILWAY_ENVIRONMENT,
  COUNCIL_TIMEOUT_MS,
  COUNCIL_PING_TIMEOUT_MS,
  compressionMetrics,
  roiTracker,
  systemMetrics,
  getOpenSourceCouncil: () => openSourceCouncil,
  providerCooldowns,
  getSourceOfTruthManager: () => sourceOfTruthManager,
  updateROIWithTracker,
  trackAIPerformance,
  notifyCriticalIssue,
  savingsLedger: createSavingsLedger(pool), // TCO-E01
});

// ==================== ENHANCED AI CALLING WITH AGGRESSIVE COST OPTIMIZATION ====================
// resolveCouncilMember, callCouncilMember, callCouncilWithFailover provided by createCouncilService above

// ==================== USER PREFERENCE LEARNING ====================
const guessUserDecision = createUserPreferenceGuesser({
  pool,
  callCouncilMember,
  logger,
});

// ==================== SANDBOX TESTING ====================
// Provided by startup/sandbox.js.

// detectHallucinations and crossValidateResponses extracted to services/ai-guard.js

// ==================== WEB SEARCH INTEGRATION INITIALIZATION ====================
const {
  validateAgainstWebSearch,
  detectDrift,
  searchWebWithGemini,
} = createWebSearchIntegration({
  callCouncilMember,
});

// Code escalation functions — initialized after all dependencies are available
const {
  proposeEscalationStrategy,
  robustSandboxTest,
  persistentCouncilEscalation,
  councilEscalatedSandboxTest,
  extractCodeFixes,
  applyCodeFix,
} = createCodeEscalation({
  callCouncilWithFailover,
  callCouncilMember,
  sandboxTest,
  pool,
  COUNCIL_MEMBERS,
  getApiKeyForProvider,
  searchWebWithGemini,
  detectHallucinations,
  detectDrift,
  crossValidateResponses,
  validateAgainstWebSearch,
});

// ==================== SYSTEM SNAPSHOT & ROLLBACK ====================
// Provided by startup/snapshots.js.


// ==================== CONTINUOUS SELF-IMPROVEMENT ====================
// Function extracted to services/self-improvement-loop.js
const continuousSelfImprovement = createSelfImprovementLoop(() => ({
  systemMetrics,
  pool,
  createSystemSnapshot,
  detectBlindSpots,
  rotateAIsBasedOnPerformance,
  callCouncilWithFailover,
  sandboxTest,
  executionQueue,
  systemSnapshots,
  rollbackToSnapshot,
}));

// ==================== ROI & FINANCIAL TRACKING ====================
// Functionality now lives under startup/roi.js.

// ==================== MEMORY SYSTEM ====================
// Handlers now provided via startup/memory.js.

// ==================== LOSS TRACKING ====================
// Delegated to startup/loss.js.


// ==================== DEPLOYMENT SERVICE INITIALIZATION ====================
const {
  isFileProtected,
  triggerDeployment,
  commitToGitHub,
  triggerRailwayRedeploy,
  setRailwayEnvVar,
  setRailwayEnvVars,
  getRailwayEnvVars,
} = createDeploymentService({
  pool,
  systemMetrics,
  broadcastToAll,
  GITHUB_TOKEN,
  GITHUB_REPO,
  GITHUB_DEPLOY_BRANCH: process.env.GITHUB_DEPLOY_BRANCH || 'main',
  RAILWAY_TOKEN: process.env.RAILWAY_TOKEN,
  RAILWAY_PROJECT_ID: process.env.RAILWAY_PROJECT_ID,
  RAILWAY_SERVICE_ID: process.env.RAILWAY_SERVICE_ID,
  RAILWAY_ENVIRONMENT_ID: process.env.RAILWAY_ENVIRONMENT_ID,
  __dirname,
});

const railwayManagedEnvService = createRailwayManagedEnvService({
  pool,
  getRailwayEnvVars,
  setRailwayEnvVar,
  logger,
});

const accountManager = createAccountManager({ pool, logger });

// Consensus service — initialized after all dependencies are defined
const { conductEnhancedConsensus, createProposal } = createConsensusService({
  pool,
  detectBlindSpots,
  COUNCIL_MEMBERS,
  callCouncilMember,
  guessUserDecision,
  sandboxTest,
  systemMetrics,
  trackLoss,
  broadcastToAll,
});

// ==================== SELF-MODIFICATION ENGINE ====================
const selfModificationEngine = new SelfModificationEngine({
  pool, systemMetrics, createSystemSnapshot, isFileProtected,
  conductEnhancedConsensus, createProposal, sandboxTest, rollbackToSnapshot,
  trackLoss, broadcastToAll, callCouncilMember, COUNCIL_MEMBERS,
  __dirname,
});

// ==================== TWO-TIER COUNCIL SYSTEM INITIALIZATION ====================
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
// autoBuilder is now imported at top of file

// ==================== SELF-PROGRAMMING SERVICE (stub until initialized) ====================
let executionQueue = null;
let handleSelfProgramming = async (options = {}) => {
  logger.warn("[SELF-PROGRAMMING] Service not yet initialized");
  return { ok: false, error: "Self-programming service not yet initialized" };
};
let implementNextQueuedIdea = async () => {
  return { ok: false, error: "Execution queue not yet initialized" };
};

// Create orchestrator early so it can be passed into initializeTwoTierSystem's routeCtx
// Uses lambda closures so callCouncilMember + createTwilioService are available at call time
const autonomyOrchestrator = createAutonomyOrchestrator({
  pool,
  callAI: async (_task, prompt) => {
    try {
      const result = await callCouncilMember('anthropic', prompt);
      return typeof result === 'string' ? result : result?.content || result?.text || '';
    } catch { return ''; }
  },
  sendSMS: async (to, msg) => {
    try {
      const twilio = createTwilioService({
        callCouncilMember,
        RAILWAY_PUBLIC_DOMAIN: process.env.RAILWAY_PUBLIC_DOMAIN,
        ALERT_PHONE: to,
        alertState: { inProgress: false },
      });
      return twilio.sendSMS(to, msg);
    } catch { return { success: false }; }
  },
  adminPhone: process.env.ALERT_PHONE || process.env.ADMIN_PHONE,
});

async function runInitializeTwoTierSystem() {
  const result = await initializeTwoTierSystem({
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
    requireKeyFn: requireKey,
    scheduleAutonomyOnce,
    healthModuleInstance,
    autoBuilder,
    COUNCIL_MEMBERS,
    __dirname,
    execAsync,
    createSystemSnapshot,
    rollbackToSnapshot,
    sandboxTest,
    GITHUB_TOKEN,
    commitToGitHub,
    dayjs,
    updateROIWithTracker,
    getStripeClient,
    roiTracker,
    financialDashboard,
    incomeDroneSystem,
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
    tokenOptimizer,
  });

  // Apply all returned values to module-scope variables
  ({
    tier0Council,
    tier1Council,
    modelRouter,
    outreachAutomation,
    notificationService,
    crmSequenceRunner,
    whiteLabelConfig,
    openSourceCouncil,
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
    systemHealthChecker,
    selfBuilder,
    ideaToImplementationPipeline,
    sourceOfTruthManager,
    executionQueue,
    handleSelfProgramming,
    implementNextQueuedIdea,
    tcoTracker,
    tcoRoutes,
    tcoSalesAgent,
    tcoAgentRoutes,
    Tier0Council,
    Tier1Council,
    ModelRouter,
    OutreachAutomation,
    WhiteLabelConfig,
    CrmSequenceRunner,
    KnowledgeBase,
    FileCleanupAnalyzer,
    OpenSourceCouncil,
  } = result);
}


// Income drone system - will be replaced by EnhancedIncomeDrone if available
// Class extracted to core/income-drone-system.js
let incomeDroneSystem = new IncomeDroneSystem({
  pool,
  updateROI: updateROIWithTracker,
  broadcastToAll,
});

// ==================== FINANCIAL DASHBOARD ====================
// Class extracted to core/financial-dashboard.js
const financialDashboard = new FinancialDashboard({ pool });

// ==================== REVENUE EVENT HELPER + STRIPE SYNC ====================
// Functions extracted to core/financial-revenue.js
const { recordRevenueEvent, syncStripeRevenue } = createFinancialRevenue({
  financialDashboard,
  incomeDroneSystem,
  updateROI: updateROIWithTracker,
  getStripeClient,
});


// ==================== API MIDDLEWARE ====================
// Auth middleware moved to src/server/auth/requireKey.js
// (TypeScript source: src/server/auth/requireKey.ts)
import { requireKey } from "./src/server/auth/requireKey.js";

// Rate-limit guard stub — passes through, can be wired to a real budget tracker later
const checkHumanAttentionBudget = (req, res, next) => next();




// Extracted to routes/business-routes.js (BUSINESS CENTER ENDPOINTS)
// Extracted to routes/game-routes.js
// ==================== SITE BUILDER + PROSPECT PIPELINE ====================
// Routes in routes/site-builder-routes.js — registered after council is initialized

// Extracted to routes/business-routes.js (BUSINESS DUPLICATION through MARKETING AGENCY)
// Extracted to routes/web-intelligence-routes.js
// Extracted to routes/api-cost-savings-routes.js (part 1)
// Extracted to routes/boldtrail-routes.js
// Extracted to routes/api-cost-savings-routes.js (part 2)
// Extracted to routes/agent-recruitment-routes.js
// Extracted to routes/video-routes.js
// Extracted to routes/auto-builder-routes.js (part 1)
// Extracted to routes/life-coaching-routes.js
// Extracted to routes/auto-builder-routes.js (part 2: SELF-BUILDER, TASK TRACKER, IDEA PIPELINE)
// Extracted to routes/two-tier-council-routes.js
// Extracted to routes/outreach-crm-routes.js
// Extracted to routes/billing-routes.js (part 1: BILLING, WHITE-LABEL)
// Extracted to routes/knowledge-routes.js
// Extracted to routes/billing-routes.js (part 2: TRIAL SYSTEM)
// Extracted to routes/conversation-routes.js
// Extracted to routes/command-center-routes.js
// Extracted to routes/auto-builder-routes.js (part 3: AUTO-BUILDER CONTROL)
registerServerRoutes(app, {
  express,
  memoryRoutes,
  stripeRoutes,
  requireKey,
  getAllFlags,
  OLLAMA_ENDPOINT,
  pool,
  autoBuilder,
  syncStripeRevenue,
  financialDashboard,
  roiTracker,
  logger,
  commitToGitHub,
  getAllQueueStats,
  rootDir: __dirname,
  telemetry,
  podManager,
});

// ==================== AI COUNCIL CONSENSUS MODE ====================
// Functions extracted to services/consensus-service.js (createGetCouncilConsensus, compareResponses, selectBestResponse)
const getCouncilConsensus = createGetCouncilConsensus({ callCouncilMember, COUNCIL_MEMBERS, OLLAMA_ENDPOINT });

// ==================== AUTO-BUILDER: CLOUD AI + PERSISTENCE ====================
// Override routeTask so the builder uses Ollama when available, falls back to the
// council (OpenAI / DeepSeek / Groq) when Ollama is unreachable (e.g. Railway prod).
autoBuilder.overrideBuildHelpers({
  routeTask: async (task, prompt) => {
    const ollamaEndpoint = OLLAMA_ENDPOINT || 'http://localhost:11434';
    const modelName = task === 'code_generation' ? 'deepseek-coder-v2:latest' : 'qwen2.5:32b';

    // Try Ollama first (free, local)
    try {
      const res = await fetch(`${ollamaEndpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          prompt,
          stream: false,
          options: { temperature: 0.2, num_predict: 8192 },
        }),
        signal: AbortSignal.timeout(60000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.response && data.response.length > 50) {
          logger.info(`[AUTO-BUILDER] Ollama OK: ${data.response.length} chars (${modelName})`);
          return data.response;
        }
      }
    } catch (ollamaErr) {
      logger.warn(`[AUTO-BUILDER] Ollama unavailable (${ollamaErr.message}) — falling back to council`);
    }

    // Cloud fallback: pick first free-tier model with an API key
    const fallbackOrder = ['groq_llama', 'gemini_flash', 'cerebras_llama', 'openrouter_free', 'claude'];
    const councilMember = fallbackOrder.find((m) => {
      const cfg = COUNCIL_MEMBERS[m];
      if (!cfg) return false;
      if (cfg.provider === 'groq')       return !!process.env.GROQ_API_KEY;
      if (cfg.provider === 'gemini')     return !!process.env.GEMINI_API_KEY;
      if (cfg.provider === 'cerebras')   return !!process.env.CEREBRAS_API_KEY;
      if (cfg.provider === 'openrouter') return !!process.env.OPENROUTER_API_KEY;
      if (cfg.provider === 'anthropic')  return !!process.env.ANTHROPIC_API_KEY;
      return false;
    }) || 'groq_llama';
    logger.info(`[AUTO-BUILDER] Using council fallback: ${councilMember}`);
    return callCouncilMember(councilMember, prompt, { maxTokens: 4000, useTwoTier: false });
  },
});

registerWebsiteAuditRoutes(app, {
  requireKey,
  callCouncilWithFailover,
});

registerEnhancedCouncilRoutes(app, pool, callCouncilMember, requireKey);

// ==================== API COST SAVINGS ROUTES ====================
// Imported but was never mounted — gap found by TCO audit 2026-03-21
createApiCostSavingsRoutes(app, {
  pool,
  requireKey,
  apiCostSavingsRevenue,
  getStripeClient,
  RAILWAY_PUBLIC_DOMAIN: process.env.RAILWAY_PUBLIC_DOMAIN,
});
logger.info('✅ [API-COST-SAVINGS] Routes mounted at /api/v1/cost-savings + /api/v1/revenue/api-cost-savings');

// ==================== IDEA QUEUE ====================
app.use('/api/v1/ideas', createIdeaQueueRoutes({ pool, requireKey, callCouncilMember }));
logger.info('✅ [IDEA-QUEUE] Routes mounted at /api/v1/ideas');

// ==================== DIGITAL TWIN + OUTCOMES + CI ====================
app.use('/api/v1/twin', createTwinRoutes({ pool, requireKey, callCouncilMember }));
logger.info('✅ [TWIN] Routes mounted at /api/v1/twin');

// ==================== CONVERSATION HISTORY ====================
app.use('/api/v1/history', createConversationHistoryRoutes({ pool, requireKey, callCouncilMember }));
logger.info('✅ [HISTORY] Routes mounted at /api/v1/history');

// ==================== WORD KEEPER & INTEGRITY ENGINE (Amendment 16) ====================
// Thin adapter: word-keeper services call councilService.ask(prompt, opts)
const wordKeeperCouncil = {
  ask: (prompt, opts = {}) => callCouncilMember(opts.model || 'claude', prompt, opts.systemPrompt || '', opts),
};
app.use('/api/v1/word-keeper', createWordKeeperRoutes({ pool, councilService: wordKeeperCouncil, twilioService: null }));
logger.info('✅ [WORD-KEEPER] Routes mounted at /api/v1/word-keeper');

// ── Word Keeper reminder cron — check every 60s, send SMS, weekly coaching ──
const wkIntegrityEngine = createWKIntegrityEngine(pool, wordKeeperCouncil);
startReminderCron(pool, async (to, msg) => {
  // Use Twilio sendSMS if configured, otherwise log
  try {
    const { createTwilioService } = await import('./services/twilio-service.js');
    const twilio = createTwilioService({
      callCouncilMember,
      RAILWAY_PUBLIC_DOMAIN: process.env.RAILWAY_PUBLIC_DOMAIN,
      ALERT_PHONE: to,
      alertState: { inProgress: false },
    });
    return twilio.sendSMS(to, msg);
  } catch { return { success: false }; }
}, {
  userPhone: process.env.ALERT_PHONE || process.env.ADMIN_PHONE,
  integrityEngine: wkIntegrityEngine,
});
logger.info('✅ [WORD-KEEPER] Reminder cron started');

// ==================== AUTONOMY ORCHESTRATOR (Amendment 17) ====================
// Created before initializeTwoTierSystem so routeCtx can include it.
// autonomyOrchestrator is defined earlier in this file (above runInitializeTwoTierSystem).
autonomyOrchestrator.start();
app.use('/api/v1/autonomy', createAutonomyRoutes({ pool, requireKey, orchestrator: autonomyOrchestrator }));
logger.info('✅ [AUTONOMY] Orchestrator started + routes mounted at /api/v1/autonomy');

app.use('/api/v1/railway/managed-env', createRailwayManagedEnvRoutes({
  requireKey,
  managedEnvService: railwayManagedEnvService,
}));
logger.info('✅ [RAILWAY-MANAGED-ENV] Routes mounted at /api/v1/railway/managed-env');

app.use('/api/v1/accounts', createAccountManagerRoutes({ requireKey, accountManager, pool, logger }));
logger.info('✅ [ACCOUNT-MANAGER] Routes mounted at /api/v1/accounts');

const tcCoordinator = createTCCoordinator({ pool, accountManager, notificationService, callCouncilMember, logger });
createTCRoutes(app, { pool, requireKey, coordinator: tcCoordinator, logger });
startTCDeadlineCron(pool, tcCoordinator);
createMLSRoutes(app, { pool, requireKey, callCouncilMember, logger });

// GLVAR dues (monthly) + violations (4× daily email scan)
(async () => {
  try {
    const { createGLVARMonitor } = await import('./services/glvar-monitor.js');
    const { createTCBrowserAgent } = await import('./services/tc-browser-agent.js');
    const tcBrowser = createTCBrowserAgent({ accountManager, logger });
    const glvarMonitor = createGLVARMonitor({ pool, tcBrowser, accountManager, notificationService, logger });
    glvarMonitor.startDuesCron();
    glvarMonitor.startViolationsCron();
  } catch (err) {
    logger.warn?.({ err: err.message }, '[GLVAR-MONITOR] Failed to start');
  }
})();

// Email triage — scans inbox every 30 min, daily digest at 7am
(async () => {
  try {
    const { createEmailTriage } = await import('./services/email-triage.js');
    const emailTriage = createEmailTriage({ pool, notificationService, callCouncilMember, logger });
    emailTriage.startTriageCron();
  } catch (err) {
    logger.warn?.({ err: err.message }, '[EMAIL-TRIAGE] Failed to start');
  }
})();

// Self-register Twilio SMS webhook — no manual Twilio console action needed
// Warm response cache L1 from DB — picks up where last deploy left off
initCache(pool).catch(() => {});
railwayManagedEnvService.ensureSchema()
  .then(() => {
    railwayManagedEnvService.startScheduler();
    return railwayManagedEnvService.syncDesiredVars({ actor: 'boot', syncOnBootOnly: true });
  })
  .then((result) => {
    logger.info({ changed: result.changed, failed: result.failed }, '✅ [RAILWAY-MANAGED-ENV] Boot sync complete');
  })
  .catch((error) => {
    logger.warn({ error: error.message }, '⚠️ [RAILWAY-MANAGED-ENV] Boot sync failed');
  });

accountManager.ensureSchema().catch((err) => {
  logger.warn({ error: err.message }, '⚠️ [ACCOUNT-MANAGER] Schema init failed');
});

registerTwilioWebhook().then(result => {
  if (result.registered) {
    logger.info({ url: result.url, changed: result.changed }, '✅ [TWILIO] SMS webhook confirmed');
  } else {
    logger.warn({ error: result.error }, '⚠️ [TWILIO] SMS webhook registration failed (non-fatal)');
  }
}).catch(() => {});

// Boot seeder — sets every env var the system knows the value for.
// Uses managed-env service so all changes are encrypted, audited, and persist in Neon.
// Only writes a var if it isn't already set in process.env (never overwrites live values).
(async () => {
  try {
    const publicDomain = process.env.RAILWAY_PUBLIC_DOMAIN || '';
    const siteBaseUrl = publicDomain
      ? (publicDomain.startsWith('http') ? publicDomain : `https://${publicDomain}`)
      : '';

    const knownVars = {
      // Email — Postmark is the provider, lifeos@ is the FROM address
      EMAIL_PROVIDER: { value: 'postmark',                   description: 'Email provider — set by boot seeder' },
      EMAIL_FROM:     { value: 'lifeOS@hopkinsgroup.org',    description: 'Outreach FROM address — set by boot seeder' },
      // Site builder — derive from Railway public domain
      ...(siteBaseUrl && { SITE_BASE_URL: { value: siteBaseUrl, description: 'Preview site base URL — derived from RAILWAY_PUBLIC_DOMAIN' } }),
      // Signup agent — system emails for autonomous account creation
      GMAIL_SIGNUP_EMAIL: { value: 'lumea.lifeos@gmail.com', description: 'System signup email (public domain services) — set by boot seeder' },
      WORK_EMAIL:         { value: 'LifeOS@hopkinsgroup.org', description: 'Work email (private domain, for Postmark etc.) — set by boot seeder' },
    };

    const toSet = Object.fromEntries(
      Object.entries(knownVars).filter(([key]) => !process.env[key])
    );

    if (Object.keys(toSet).length > 0) {
      const results = await railwayManagedEnvService.upsertDesiredVars(toSet, 'boot-seeder');
      const ok = results.filter((r) => r.ok).map((r) => r.envName);
      const failed = results.filter((r) => !r.ok).map((r) => `${r.envName}: ${r.error}`);
      if (ok.length)     logger.info({ vars: ok },     '✅ [BOOT-SEEDER] Vars stored in managed-env');
      if (failed.length) logger.warn({ failed },       '⚠️ [BOOT-SEEDER] Some vars failed');
      // Push to Railway immediately so this deploy picks them up
      await railwayManagedEnvService.syncDesiredVars({ actor: 'boot-seeder', names: ok });
      logger.info({ count: ok.length }, '✅ [BOOT-SEEDER] Known vars pushed to Railway');
    } else {
      logger.info('[BOOT-SEEDER] All known vars already set — no action needed');
    }
  } catch (err) {
    logger.warn({ error: err.message }, '⚠️ [BOOT-SEEDER] Non-fatal error');
  }
})();

// Auto-log all council API calls as conversations
const convStore = createConversationStore(pool);
const _origCallCouncil = callCouncilMember;
// Wrap callCouncilMember to capture server-side AI conversations
// (lightweight — fires async after the call completes, never blocks responses)

// Continuous improvement monitor — runs every 6 hours
const adamLoggerGlobal = createAdamLogger(pool);
const ciMonitor = createContinuousImprovement({
  pool,
  callAI: async (prompt) => {
    try {
      const result = await callCouncilMember('anthropic', prompt);
      return typeof result === 'string' ? result : result?.content || result?.text || '';
    } catch {
      return '';
    }
  },
  adamLogger: adamLoggerGlobal,
});

// Run first check after 5 minutes, then every 6 hours
setTimeout(() => {
  ciMonitor.runMonitorCycle().catch(err =>
    logger.warn('[CI] Monitor cycle failed', { error: err.message })
  );
  setInterval(() => {
    ciMonitor.runMonitorCycle().catch(err =>
      logger.warn('[CI] Monitor cycle failed', { error: err.message })
    );
  }, 6 * 60 * 60 * 1000); // every 6 hours
}, 5 * 60 * 1000); // 5 min after startup

// Rebuild Adam's profile every 12 hours
setInterval(() => {
  adamLoggerGlobal.buildProfile(async (prompt) => {
    try {
      const result = await callCouncilMember('anthropic', prompt);
      return typeof result === 'string' ? result : result?.content || '';
    } catch { return ''; }
  }).catch(err => logger.warn('[ADAM-TWIN] Profile rebuild failed', { error: err.message }));
}, 12 * 60 * 60 * 1000); // every 12 hours

// ==================== RAILWAY CONTROL ====================
// GET  /api/v1/railway/env          — list all env vars on Railway
// POST /api/v1/railway/env          — set one: { name, value }
// POST /api/v1/railway/env/bulk     — set many: { vars: { KEY: 'value' } }
// POST /api/v1/railway/deploy       — trigger immediate redeploy
app.get('/api/v1/railway/env', requireKey, async (req, res) => {
  try {
    const vars = await getRailwayEnvVars();
    // Mask values for security — just show key names + first 4 chars
    const masked = Object.fromEntries(
      Object.entries(vars).map(([k, v]) => [k, `${String(v).slice(0, 4)}****`])
    );
    res.json({ ok: true, vars: masked, count: Object.keys(masked).length });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/v1/railway/env', requireKey, async (req, res) => {
  try {
    const { name, value } = req.body;
    if (!name || value === undefined) {
      return res.status(400).json({ ok: false, error: 'name and value are required' });
    }
    await setRailwayEnvVar(name, value);
    res.json({ ok: true, set: name });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/v1/railway/env/bulk', requireKey, async (req, res) => {
  try {
    const { vars } = req.body;
    if (!vars || typeof vars !== 'object') {
      return res.status(400).json({ ok: false, error: 'vars must be an object { KEY: value }' });
    }
    const results = await setRailwayEnvVars(vars);
    res.json({ ok: true, results });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/v1/railway/deploy', requireKey, async (req, res) => {
  try {
    await triggerRailwayRedeploy();
    res.json({ ok: true, message: 'Redeploy triggered on Railway' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ==================== WEBSOCKET ====================
// Handler extracted to services/websocket-handler.js
setupWebSocketHandler(wss, {
  activeConnections,
  conversationHistory,
  logger,
  pool,
  broadcastToAll,
  detectBlindSpots,
  callCouncilWithFailover,
  systemMetrics,
  DEEPSEEK_BRIDGE_ENABLED,
  STRIPE_SECRET_KEY,
});

// ==================== HEALTH CHECK ====================
app.get('/healthz', async (req, res) => {
  const checks = {
    server: 'ok',
    db: 'unknown',
    ai: process.env.ANTHROPIC_API_KEY ? 'configured' : 'missing_key',
    email: process.env.POSTMARK_SERVER_TOKEN ? 'configured' : 'not_configured',
  };

  try {
    await pool.query('SELECT 1');
    checks.db = 'ok';
  } catch (e) {
    checks.db = 'error: ' + e.message;
  }

  const allOk = checks.db === 'ok' && checks.ai === 'configured';
  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'healthy' : 'degraded',
    checks,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// ==================== GLOBAL ERROR BOUNDARY ====================
// Must be registered after all routes
app.use(errorBoundary(logger));

// ==================== STARTUP ====================
async function start() {
  const startupTrace = telemetry.startTrace("system.start");
  let startupFinished = false;
  const finalizeStartup = (status, detail = {}) => {
    if (!startupFinished) {
      startupFinished = true;
      startupTrace.end(status, detail);
    }
  };
  const DEFAULT_PORT = 64266;
  const MAX_PORT_ATTEMPTS = 20;
  const basePort = Number.isFinite(Number(PORT)) ? Number(PORT) : DEFAULT_PORT;
  let selectedPort = null;
  const autonomyPortFile = process.env.AUTONOMY_PORT_FILE
    || path.join(process.cwd(), "scripts", "autonomy", "last-port.txt");

  async function writeAutonomyPortFile(port) {
    try {
      await fsPromises.mkdir(path.dirname(autonomyPortFile), { recursive: true });
      await writeFile(autonomyPortFile, String(port), "utf-8");
    } catch (error) {
      logger.warn("⚠️ Unable to write autonomy port file:", { error: error.message });
    }
  }

  function listenWithRetry(targetServer, host, startPort, maxAttempts) {
    let attempts = 0;
    let currentPort = startPort;

    return new Promise((resolve, reject) => {
      const tryListen = () => {
        const onError = (error) => {
          targetServer.off("listening", onListening);
          const retryable = ["EADDRINUSE", "EACCES", "EPERM"].includes(error.code);
          if (retryable && attempts < maxAttempts - 1) {
            logger.warn(`⚠️ Port ${currentPort} unavailable (${error.code}). Trying ${currentPort + 1}...`);
            attempts += 1;
            currentPort += 1;
            tryListen();
            return;
          }
          reject(error);
        };

        const onListening = () => {
          targetServer.off("error", onError);
          resolve(currentPort);
        };

        targetServer.once("error", onError);
        targetServer.once("listening", onListening);
        targetServer.listen(currentPort, host);
      };

      tryListen();
    });
  }

  async function startListening() {
    if (selectedPort !== null) return selectedPort;
    if (server.listening) {
      const addr = server.address();
      if (addr && typeof addr === "object" && addr.port) {
        selectedPort = addr.port;
        return selectedPort;
      }
    }

    selectedPort = await listenWithRetry(
      server,
      HOST,
      basePort,
      MAX_PORT_ATTEMPTS
    );
    await writeAutonomyPortFile(selectedPort);
    const railwayUrl = RAILWAY_PUBLIC_DOMAIN || "robust-magic-production.up.railway.app";
    console.log(`\n🌐  ONLINE: http://${HOST}:${selectedPort}`);
    console.log(`📊 Health: http://${HOST}:${selectedPort}/healthz`);
    console.log(`🎮 Overlay: http://${HOST}:${selectedPort}/overlay/index.html`);
    console.log(`🔐 Command Center Activation: https://${railwayUrl}/activate`);
    console.log(`🎯 Command Center: https://${railwayUrl}/command-center`);
    console.log(`🏠 BoldTrail CRM: https://${railwayUrl}/boldtrail`);
    console.log(`📞 Recruitment System: POST /api/v1/recruitment/* (outbound calls, webinars, enrollment)`);
    console.log(`🎓 Virtual Class: POST /api/v1/class/enroll (free real estate education)`);
    console.log(`📹 YouTube Automation: POST /api/v1/youtube/* (progressive unlock system)`);
    console.log(`🔨 Auto-Builder: GET /api/v1/auto-builder/status (builds opportunities automatically)`);
    console.log(`🤖 Extract Conversations: https://${railwayUrl}/extract-conversations`);
    console.log(`🤖 Self-Program: POST /api/v1/system/self-program`);
    console.log(`🔄 Replace File: POST /api/v1/system/replace-file`);
    console.log(
      `💳 Stripe Checkout: POST /api/v1/stripe/checkout-session (key required)`
    );
    console.log(
      `🌐 Railway URL: https://${railwayUrl}`
    );
    console.log(`🔌 Selected Port: ${selectedPort}`);
    console.log("\n✅ SYSTEM READY");
    console.log("=".repeat(100) + "\n");
    return selectedPort;
  }

  try {
    console.log("\n" + "=".repeat(100));
    console.log(
      "🚀 LIFEOS v26.1 (NO CLAUDE) - CONSENSUS & SELF-HEALING SYSTEM"
    );
    console.log("=".repeat(100));

    validateEnv(logger);

    // ── Run DB migrations automatically ───────────────────────────────────
    // Scans db/migrations/*.sql and runs any not yet applied. Safe on every restart.
    try {
      const { runMigrations } = await import('./services/migration-runner.js');
      await runMigrations(pool);
    } catch (err) {
      logger.warn('[STARTUP] Migration runner failed (non-blocking)', { error: err.message });
    }

    await startListening();

    // ── Auto-builder persistence + startup recovery ────────────────────────
    // Wire the DB pool so addProductToQueue() persists products across restarts
    autoBuilder.initPersistence(pool);

    // Recover any products that were in-flight before the last restart
    try {
      const recovered = await autoBuilder.loadPersistedQueue(pool);
      if (recovered > 0) {
        logger.info(`[AUTO-BUILDER] Startup recovery: ${recovered} product(s) reloaded from DB`);
      }
    } catch (recoverErr) {
      logger.warn('[AUTO-BUILDER] Startup recovery failed (non-critical):', { error: recoverErr.message });
    }

    // Reset ideas stuck in 'building' state from a previous crash/restart.
    // If a build was triggered > 5 min ago and is still 'building', nothing is working on it.
    try {
      const stuckReset = await pool.query(
        `UPDATE ideas
         SET approval_status = 'approved', build_triggered_at = NULL
         WHERE approval_status = 'building'
           AND build_triggered_at < NOW() - INTERVAL '5 minutes'
         RETURNING id, title`
      );
      if (stuckReset.rows.length > 0) {
        logger.warn(`[STARTUP] Reset ${stuckReset.rows.length} stuck 'building' idea(s) → 'approved'`, {
          ids: stuckReset.rows.map(r => r.id),
        });
      }
    } catch (stuckErr) {
      logger.warn('[STARTUP] Could not reset stuck ideas (non-critical):', { error: stuckErr.message });
    }
    // ──────────────────────────────────────────────────────────────────────

    autoBuilder.startBuildScheduler({
      initialDelay: 60000,          // 1 min initial delay (was 15s)
      interval: 6 * 60 * 60 * 1000, // 6 hours (was 60s) — preserve token quota until TC proven
    });

    // Critical: Database must initialize (but don't fail if tables already exist)
    try {
      await initDatabase();
      logger.info("✅ Database initialized");
    } catch (dbError) {
      logger.error("❌ Database initialization error:", { error: dbError.message });
      // Don't exit - try to continue (might be connection issue that resolves)
      logger.warn("⚠️ Continuing startup despite DB error - will retry connections");
    }

    // Load ROI (non-critical)
    try {
      await loadROIFromDatabase(pool, logger, roiTracker);
    } catch (roiError) {
      logger.warn("⚠️ ROI load error (non-critical):", { error: roiError.message });
    }

    // Load knowledge context from processed dumps
    try {
      const knowledgeContext = await loadKnowledgeContext();
      if (knowledgeContext) {
        logger.info(`📚 [KNOWLEDGE] Context loaded: ${knowledgeContext.totalEntries} entries`);
      }
    } catch (knowledgeError) {
      logger.warn("⚠️ Knowledge load error (non-critical):", { error: knowledgeError.message });
    }

    if (SMOKE_MODE) {
      logger.info("🧪 [SMOKE] SMOKE_MODE enabled - skipping optional startup systems and schedulers");
    }

    // Run dependency audit before initializing systems
    if (!SMOKE_MODE) {
      try {
        const { dependencyAuditor } = await import("./core/dependency-auditor.js");
        const auditResults = await dependencyAuditor.auditAll();
        if (auditResults.npmPackages.missing.length > 0) {
          logger.info(`⚠️ [STARTUP] ${auditResults.npmPackages.missing.length} packages were missing and have been installed`);
        }
        if (auditResults.coreModules.missing.length > 0) {
          logger.error(`❌ [STARTUP] ${auditResults.coreModules.missing.length} core modules are missing!`);
          logger.error(`   Missing: ${auditResults.coreModules.missing.join(', ')}`);
        }
      } catch (error) {
        logger.warn("⚠️ Dependency auditor not available:", { error: error.message });
      }
    }
    
    // Database validation runs at module load time (before this point)
    // If we reach here, database config is valid
    
    if (!SMOKE_MODE) {
      await runInitializeTwoTierSystem();

      // Mount TCO routes after initialization
      if (tcoRoutes) {
        app.use('/api/tco', tcoRoutes);
        logger.info('✅ [TCO] Routes mounted at /api/tco');
      }
      if (tcoAgentRoutes) {
        app.use('/api/tco-agent', tcoAgentRoutes);
        logger.info('✅ [TCO AGENT] Routes mounted at /api/tco-agent');
      }
    }

    if (!SMOKE_MODE) {
      // Initialize Memory System
      try {
        await memorySystem.initMemoryStore();
        logger.info('✅ [MEMORY] Memory System initialized');

        // Load and store Source of Truth document as system fact
        try {
          const sourceOfTruthPath = path.join(__dirname, 'docs', 'SOURCE_OF_TRUTH.md');
          const sourceOfTruthContent = await fsPromises.readFile(sourceOfTruthPath, 'utf-8');

          // Store as system fact with maximum confidence
          await memorySystem.storeMemory('facts', {
            title: 'LifeOS / LimitlessOS Source of Truth (v1.0)',
            content: sourceOfTruthContent,
            type: 'system_foundation',
            last_updated: '2026-01-03'
          }, {
            type: memorySystem.MEMORY_TYPES.SYSTEM_FACT,
            confidence: 1.0,
            userConfirmed: true
          });

          logger.info('✅ [MEMORY] Source of Truth document stored as system fact');
        } catch (sotError) {
          logger.warn('⚠️ [MEMORY] Could not load Source of Truth document:', { error: sotError.message });
        }
      } catch (error) {
        logger.warn('⚠️ [MEMORY] Memory System initialization failed:', { error: error.message });
      }
    }
    
    if (!SMOKE_MODE) {
      // Initialize Stripe products on startup
      try {
        const stripeAutomation = await import('./core/stripe-automation.js');
        await stripeAutomation.ensureProductsExist();
        logger.info('✅ [STRIPE] Products ensured on startup');
      } catch (error) {
        logger.warn('⚠️ [STRIPE] Could not ensure products on startup:', { error: error.message });
        logger.warn('   This is OK if STRIPE_SECRET_KEY is not set');
      }
    }

    if (!SMOKE_MODE) {
      // Initialize Sales Coaching Services
      try {
        const SalesAnalyzerModule = await import("./src/services/sales-technique-analyzer.js");
        const CallRecorderModule = await import("./src/services/call-recorder.js");
        
        salesTechniqueAnalyzer = new SalesAnalyzerModule.SalesTechniqueAnalyzer(pool, callCouncilWithFailover);
        callRecorder = new CallRecorderModule.CallRecorder(pool, salesTechniqueAnalyzer);
        
        logger.info("✅ Sales Coaching Services initialized");
      } catch (error) {
        logger.warn("⚠️ Sales Coaching Services not available:", { error: error.message });
        salesTechniqueAnalyzer = null;
        callRecorder = null;
      }
    }

    if (!SMOKE_MODE) {
      // Initialize Goal Tracking & Coaching Services
      try {
        const GoalTrackerModule = await import("./src/services/goal-tracker.js");
        const ActivityTrackerModule = await import("./src/services/activity-tracker.js");
        const CoachingProgressionModule = await import("./src/services/coaching-progression.js");
        const CalendarServiceModule = await import("./src/services/calendar-service.js");
        
        goalTracker = new GoalTrackerModule.GoalTracker(pool, callCouncilWithFailover);
        activityTracker = new ActivityTrackerModule.ActivityTracker(pool, callRecorder);
        coachingProgression = new CoachingProgressionModule.CoachingProgression(pool, callCouncilWithFailover);
        calendarService = new CalendarServiceModule.CalendarService(pool, callRecorder, activityTracker);
        
        logger.info("✅ Goal Tracking & Coaching Services initialized");
      } catch (error) {
        logger.warn("⚠️ Goal Tracking & Coaching Services not available:", { error: error.message });
        goalTracker = null;
        activityTracker = null;
        coachingProgression = null;
        calendarService = null;
      }
    }

    if (!SMOKE_MODE) {
      // Initialize Motivation & Perfect Day Services
      try {
        const PerfectDayModule = await import("./src/services/perfect-day-system.js");
        const GoalCommitmentModule = await import("./src/services/goal-commitment-system.js");
        const CallSimulationModule = await import("./src/services/call-simulation-system.js");
        const RelationshipMediationModule = await import("./src/services/relationship-mediation.js");
        const MeaningfulMomentsModule = await import("./src/services/meaningful-moments.js");
        
        perfectDaySystem = new PerfectDayModule.PerfectDaySystem(pool, callCouncilWithFailover);
        goalCommitmentSystem = new GoalCommitmentModule.GoalCommitmentSystem(pool, callCouncilWithFailover);
        callSimulationSystem = new CallSimulationModule.CallSimulationSystem(pool, callRecorder, callCouncilWithFailover);
        relationshipMediation = new RelationshipMediationModule.RelationshipMediation(pool, callCouncilWithFailover);
        meaningfulMoments = new MeaningfulMomentsModule.MeaningfulMoments(pool, callRecorder);
        
        logger.info("✅ Motivation & Perfect Day Services initialized");
      } catch (error) {
        logger.warn("⚠️ Motivation & Perfect Day Services not available:", { error: error.message });
        perfectDaySystem = null;
        goalCommitmentSystem = null;
        callSimulationSystem = null;
        relationshipMediation = null;
        meaningfulMoments = null;
      }
    }

    console.log("\n🤖 AI COUNCIL:");
    Object.values(COUNCIL_MEMBERS).forEach((m) =>
      console.log(`  • ${m.name} (${m.model}) - ${m.role}`)
    );

    console.log("\n✅ SYSTEMS:");
    console.log("  ✅ Self-Programming");
    console.log("  ✅ Ollama Bridge for DeepSeek");
    console.log("  ✅ File Operations");
    console.log("  ✅ Overlay Connection (Railway URL)");
    console.log("  ✅ Consensus Protocol");
    console.log("  ✅ Blind Spot Detection");
    console.log("  ✅ Daily Idea Generation (25 ideas)");
    console.log("  ✅ AI Performance Rotation");
    console.log("  ✅ Sandbox Testing");
    console.log("  ✅ Snapshot & Rollback");
    console.log("  ✅ User Preference Learning");
    console.log("  ✅ No-Cache API Calls");
    console.log("  ✅ Self-Healing System");
    console.log("  ✅ Continuous Memory");
    console.log("  ✅ Stripe Revenue Sync (read + ROI logging only)");

    const selfProgrammingHttpService = createSelfProgrammingService(
      () => selfProgrammingDepsRef.current
    );

    registerModules(
      moduleRouter,
      [
        {
          name: "admin",
          factory: (deps) => new AdminModule(deps),
        },
        {
          name: "council",
          factory: (deps) => new CouncilModule(deps),
        },
        {
          name: "tools",
          factory: (deps) => new ToolsModule(deps),
        },
        {
          name: "knowledge",
          factory: (deps) => new KnowledgeModule(deps),
        },
        {
          name: "self-programming",
          factory: (deps) => new SelfProgrammingModule(deps),
        },
      ],
      {
        pool,
        getDailySpend,
        incomeDroneSystem,
        executionQueue,
        autoBuilder,
        ollamaEndpoint: OLLAMA_ENDPOINT || "http://localhost:11434",
        callCouncilMember,
        callCouncilWithFailover,
        pingCouncilMember,
        requireKey,
        detectBlindSpots,
        handleSelfProgramming,
        handleSelfProgramRequest: selfProgrammingHttpService.handleSelfProgramRequest,
        aiSafetyGate,
        decodeMicroBody,
        buildMicroResponse,
        compressPrompt,
        knowledgeBase,
      }
    );

    if (!SMOKE_MODE) {
      // Kick off the execution queue
      executionQueue.executeNext();

    // Deploy income drones (if not disabled)
    if (!DISABLE_INCOME_DRONES) {
      // Note: If EnhancedIncomeDrone is used, drones are already deployed during initialization
      // Only deploy here if using basic IncomeDroneSystem
      if (incomeDroneSystem && incomeDroneSystem.constructor.name === 'IncomeDroneSystem') {
        logger.info('🚀 [STARTUP] Deploying income drones (basic system)...');
        const affiliateDrone = await incomeDroneSystem.deployDrone("affiliate", 500);
        const contentDrone = await incomeDroneSystem.deployDrone("content", 300);
        const outreachDrone = await incomeDroneSystem.deployDrone("outreach", 1000);
        const productDrone = await incomeDroneSystem.deployDrone("product", 200);
        const serviceDrone = await incomeDroneSystem.deployDrone("service", 500);
        logger.info(`✅ [STARTUP] Deployed 5 income drones (affiliate, content, outreach, product, service)`);
      } else {
        logger.info('✅ [STARTUP] Income drones already deployed by EnhancedIncomeDrone system');
      }
    } else {
      logger.info('ℹ️ [STARTUP] Income drones DISABLED (set DISABLE_INCOME_DRONES=false to enable)');
    }

      // Initialize Ollama Installer (auto-install Ollama if needed)
      try {
        const ollamaInstallerModule = await import("./core/ollama-installer.js");
        const ollamaInstaller = new ollamaInstallerModule.OllamaInstaller(pool, callCouncilMember);
        // Auto-configure in background (don't block startup)
        ollamaInstaller.autoConfigure().catch(err => {
          logger.warn('⚠️ Ollama auto-configuration failed:', { error: err.message });
        });
        logger.info("✅ Ollama Installer initialized - will auto-configure Ollama if possible");
      } catch (error) {
        logger.warn("⚠️ Ollama Installer not available:", { error: error.message });
      }

      // Initialize Idea-to-Implementation Pipeline (after taskTracker is available)
      try {
        const pipelineModule = await import("./core/idea-to-implementation-pipeline.js");
        const { TaskCompletionTracker } = await import("./core/task-completion-tracker.js");
        const taskTracker = new TaskCompletionTracker(pool, callCouncilMember);
        ideaToImplementationPipeline = new pipelineModule.IdeaToImplementationPipeline(
          pool,
          callCouncilMember,
          selfBuilder,
          taskTracker
        );
        logger.info("✅ Idea-to-Implementation Pipeline initialized - system can now implement ideas from start to finish");

    } catch (error) {
      logger.warn("⚠️ Idea-to-Implementation Pipeline initialization failed:", { error: error.message });
    }

    if (STRIPE_SECRET_KEY) {
      await syncStripeRevenue();
    }

    // Initialize virtual class modules if they don't exist
    async function initializeVirtualClassModules() {
      try {
        const moduleCheck = await pool.query("SELECT COUNT(*) FROM virtual_class_modules");
        if (parseInt(moduleCheck.rows[0].count) === 0) {
          const modules = [
            {
              name: "Introduction to Real Estate",
              order: 1,
              content: { description: "Basics of real estate, licensing, and getting started" },
            },
            {
              name: "Client Communication",
              order: 2,
              content: { description: "How to communicate effectively with clients" },
            },
            {
              name: "Property Showings",
              order: 3,
              content: { description: "Planning and executing successful property showings" },
            },
            {
              name: "Email & Follow-up",
              order: 4,
              content: { description: "Professional email drafting and follow-up strategies" },
            },
            {
              name: "Building Your Business",
              order: 5,
              content: { description: "Growing your real estate business and client base" },
            },
          ];

          for (const module of modules) {
            await pool.query(
              `INSERT INTO virtual_class_modules (module_name, module_order, content)
               VALUES ($1, $2, $3)`,
              [module.name, module.order, JSON.stringify(module.content)]
            );
          }

          logger.info("✅ Virtual class modules initialized");
        }
      } catch (error) {
        logger.error("Virtual class initialization error:", { error: error.message });
      }
    }

    // Initialize modules on startup
    await initializeVirtualClassModules();

    autonomyDepsRef.current = {
      pool,
      projectRoot: __dirname,
      crmSequenceRunner,
      logMonitor,
      postUpgradeChecker,
      costReExamination,
      ideaToImplementationPipeline,
      ideaEngine,
      callCouncilWithFailover,
      syncStripeRevenue,
      STRIPE_SECRET_KEY,
      continuousSelfImprovement,
      rotateAIsBasedOnPerformance,
      tcoSalesAgent,
      enhancedConversationScraper,
      tokenOptimizer,              // API savings monitor
      pruneCache: pruneExpiredCache, // cache hygiene
    };
    apiV1DepsRef.current = {
      pool,
      requireKey,
      executionQueue,
      ideaEngine,
      taskTracker: null,
      recallConversationMemory,
      createSystemSnapshot,
      rollbackToSnapshot,
      implementNextQueuedIdea,
      incomeDroneSystem,
      callCouncilMember,
      comprehensiveIdeaTracker,
      vapiIntegration,
    };
    startAutonomySchedulers(scheduleAutonomyLoop, scheduleAutonomyOnce, () => autonomyDepsRef.current);

    // Preview site expiry: Amendment 05 — expire previews older than 30 days
    scheduleAutonomyLoop('preview-expiry', 24 * 60 * 60 * 1000, () => runPreviewExpiry(pool), 5 * 60 * 1000);

    // Initial snapshot
    await createSystemSnapshot("System startup");

    await startListening();
    finalizeStartup("ok");
    }
  } catch (error) {
    finalizeStartup("error", { error: error.message });
    logger.error("❌ Startup error:", { error: error.message, stack: error.stack });
    // Try to start HTTP server anyway for health checks
    if (selectedPort !== null || server.listening) {
      logger.warn("⚠️ Startup error after server already started - continuing in degraded mode");
      return;
    }
    try {
      const degradedPort = await listenWithRetry(
        server,
        HOST,
        basePort,
        MAX_PORT_ATTEMPTS
      );
      await writeAutonomyPortFile(degradedPort);
      logger.warn(`⚠️ Server started in degraded mode due to startup error`);
      logger.info(`📊 Health check available at http://${HOST}:${degradedPort}/healthz`);
    } catch (serverError) {
      logger.error("❌ Failed to start HTTP server:", { error: serverError.message });
      process.exit(1);
    }
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  logger.info("Shutting down gracefully...");
  await createSystemSnapshot("System shutdown");
  for (const ws of activeConnections.values()) ws.close();
  await shutdownQueues();
  await pool.end();
  lifecycleSubscriptions.forEach((unsubscribe) => unsubscribe?.());
  lifecycleSubscriptions.length = 0;
  process.exit(0);
});

// Queue status endpoint
app.get("/api/v1/queue/stats", requireKey, async (req, res) => {
  try {
    const stats = await getAllQueueStats();
    res.json({ ok: true, queues: stats });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Start
if (process.env.AUTONOMY_NO_LISTEN === "true") {
  logger.info("⚠️ [STARTUP] AUTONOMY_NO_LISTEN enabled - skipping network bind");
} else {
  start();
}

export default app;
