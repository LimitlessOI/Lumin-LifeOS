/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                  ║
 * ║        🎼 LIFEOS v26.1 (NO CLAUDE) - CONSENSUS & SELF-HEALING SYSTEM             ║
 * ║        Railway + Neon PostgreSQL + GitHub + Multi-AI Council + Stripe           ║
 * ║                                                                                  ║
 * ║  ✅ Consensus Protocol         ✅ Blind Spot Detection                          ║
 * ║  ✅ Daily Idea Generation      ✅ AI Rotation & Evaluation                      ║
 * ║  ✅ Sandbox Testing            ✅ Rollback Capabilities                         ║
 * ║  ✅ No-Cache API Calls         ✅ Continuous Memory                             ║
 * ║  ✅ OpenAI / Gemini / DeepSeek / Grok Council (no Claude)                      ║
 * ║  ✅ Stripe Revenue Sync        ✅ Income Drones / ROI Tracking                  ║
 * ║                                                                                  ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
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
import { loadRuntimeEnv } from "./config/runtime-env.js";
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
import { configureAiGuard, aiSafetyGate } from "./services/ai-guard.js";
import {
  loadKnowledgeContext,
  injectKnowledgeContext,
} from "./services/knowledge-context.js";
import { createCouncilService } from "./services/council-service.js";
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
import { addJob, getQueueStats, getAllQueueStats, registerProcessor, shutdownQueues } from "./services/queue.js";
import VideoPipeline from "./services/video-pipeline.js";
import GamePublisher from "./services/game-publisher.js";
import { createSiteBuilderRoutes } from "./routes/site-builder-routes.js";
import { initDb } from "./db/index.js";
import { getAllFlags } from "./lib/flags.js";

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
import { createConsensusService } from './services/consensus-service.js';
import { createTwilioService } from './services/twilio-service.js';
import { createAIPerformanceTracker } from './services/ai-performance-tracker.js';
import { createDeploymentService } from './services/deployment-service.js';
import { createWebSearchIntegration } from './services/web-search-integration.js';
import {
  hashPrompt,
  getCachedResponse,
  cacheResponse,
  advancedCompress,
  advancedDecompress,
} from './services/response-cache.js';

function getGovernorFunction(name) {
  return (
    (resourceGovernor && typeof resourceGovernor[name] === "function" && resourceGovernor[name]) ||
    (resourceGovernor?.default && typeof resourceGovernor.default[name] === "function" && resourceGovernor.default[name]) ||
    null
  );
}

function acquireGovernorHeavyLease() {
  const fn = getGovernorFunction("acquireHeavyLease");
  if (fn) {
    return fn();
  }
  return { release: () => {} };
}

async function runGovernorOllamaTask(fn) {
  const wrapper = getGovernorFunction("runOllamaTask");
  if (wrapper) {
    return await wrapper(fn);
  }
  return await fn();
}

function isGovernorAutonomyPaused() {
  const fn = getGovernorFunction("isAutonomyPaused");
  if (fn) return !!fn();
  return false;
}


// Enhanced Council Features
import { registerEnhancedCouncilRoutes } from "./routes/enhanced-council-routes.js";

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
const { readFile, writeFile } = fsPromises;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const latestRunRoot = path.join(__dirname, "latest-run.json");
const latestRunDoc = path.join(__dirname, "docs", "THREAD_REALITY", "latest-run.json");

async function ensureLatestRunFile() {
  try {
    await fsPromises.access(latestRunRoot);
    return;
  } catch {}

  try {
    await fsPromises.access(latestRunDoc);
    await fsPromises.copyFile(latestRunDoc, latestRunRoot);
    return;
  } catch {}

  const template = {
    runDir: "",
    result: "UNVERIFIED",
    notes: "",
  };

  try {
    await fsPromises.writeFile(latestRunRoot, JSON.stringify(template, null, 2));
  } catch (error) {
    console.warn("[LATEST-RUN] unable to create placeholder:", error.message);
  }
}

ensureLatestRunFile().catch((error) => {
  console.warn("[LATEST-RUN] initialization error:", error.message);
});

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });
wss.on("error", (error) => {
  console.error("❌ [WS] WebSocket server error:", error.message);
});

const moduleRouter = new ModuleRouter();
const healthModuleInstance = new HealthModule();
moduleRouter.register("system-health", healthModuleInstance);
// ==================== ENVIRONMENT CONFIGURATION ====================
const RUNTIME = loadRuntimeEnv();
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

// Feature flags
const DISABLE_INCOME_DRONES = true; // Set to false to re-enable income drones
const SMOKE_MODE =
  ["1", "true", "yes"].includes(String(process.env.SMOKE_MODE || "").toLowerCase()) ||
  ["1", "true", "yes"].includes(String(process.env.AUTONOMY_SMOKE || "").toLowerCase());
const COUNCIL_TIMEOUT_MS = Number(process.env.COUNCIL_TIMEOUT_MS || "300000");
const COUNCIL_PING_TIMEOUT_MS = Number(process.env.COUNCIL_PING_TIMEOUT_MS || "5000");
const SEARCH_MAX_PER_MINUTE = Number(process.env.SEARCH_RATE_LIMIT_PER_MINUTE || "10");
const SEARCH_MAX_PER_DAY = Number(process.env.SEARCH_DAILY_LIMIT || "100");
const SEARCH_ENABLED = !["0", "false", "no"].includes(
  (process.env.SEARCH_ENABLED || "").toString().toLowerCase()
);

// Derived env values are resolved in config/runtime-env.js

const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: SEARCH_MAX_PER_MINUTE,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "SEARCH_RATE_LIMIT_EXCEEDED",
    message: "Too many search requests, try again in a moment",
  },
});

const OUTREACH_MAX_PER_MINUTE = Number(process.env.OUTREACH_RATE_LIMIT_PER_MINUTE || "20");
const outreachLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: OUTREACH_MAX_PER_MINUTE,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "OUTREACH_RATE_LIMIT_EXCEEDED",
    message: "Too many outreach requests, try again in a moment",
  },
});

// Stripe client (lazy-loaded so the app can still boot if stripe is not installed)
let stripeClient = null;
async function getStripeClient() {
  if (!STRIPE_SECRET_KEY) return null;
  if (stripeClient) return stripeClient;
  try {
    // Dynamic import with error handling - completely optional
    let Stripe;
    try {
      const stripeModule = await import('stripe');
      Stripe = stripeModule.default || stripeModule.Stripe || stripeModule;
    } catch (importError) {
      // Package not installed - this is OK, Stripe is optional
      console.warn('⚠️ Stripe package not installed - Stripe features disabled');
      console.warn('   To enable: npm install stripe');
      return null;
    }
    
    if (!Stripe) {
      return null;
    }
    
    stripeClient = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20",
    });
    console.log("✅ Stripe client initialized");
    return stripeClient;
  } catch (err) {
    // Any other error - log but don't crash
    console.warn("⚠️ Stripe initialization error (non-fatal):", err.message);
    return null;
  }
}

// ==================== SECURITY: CORS WITH ORIGIN PINNING ====================
const ALLOWED_ORIGINS_LIST = ALLOWED_ORIGINS
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
  .concat([
    "http://localhost:8080",
    "http://localhost:3000",
    "http://127.0.0.1:8080",
  ]);

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

let tcoTablesEnsured = false;

async function ensureTcoAgentTables() {
  if (tcoTablesEnsured) return;
  try {
    await pool.query("SELECT 1 FROM tco_agent_interactions LIMIT 1");
    tcoTablesEnsured = true;
    return;
  } catch (error) {
    if (error?.code !== "42P01") {
      console.warn("⚠️ TCO tables check failed:", error.message);
      return;
    }
  }

  console.log("ℹ️ TCO tables missing; creating from migrations/create_tco_agent_tables.sql");
  try {
    const sqlPath = path.join(__dirname, "database", "migrations", "create_tco_agent_tables.sql");
    const sql = await readFile(sqlPath, "utf-8");
    await pool.query(sql);
    tcoTablesEnsured = true;
    console.log("✅ Created TCO agent tables");
  } catch (error) {
    console.error("❌ Failed to create TCO agent tables:", error.message);
  }
}

ensureTcoAgentTables().catch((error) => {
  console.warn("⚠️ ensureTcoAgentTables failed:", error.message);
});

// ==================== GLOBAL STATE ====================
const apiV1DepsRef = { current: {} };
let autonomyDepsRef = { current: {} };
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


function scheduleAutonomyLoop(name, intervalMs, task, initialDelayMs = intervalMs) {
  if (isGovernorAutonomyPaused()) {
    console.log(`⏸️ [AUTONOMY] ${name} disabled (PAUSE_AUTONOMY=1)`);
    return;
  }

  const run = async () => {
    if (isGovernorAutonomyPaused()) {
      setTimeout(run, intervalMs);
      return;
    }
    const lease = acquireGovernorHeavyLease();
    if (!lease) {
      setTimeout(run, intervalMs);
      return;
    }
    try {
      await task();
    } catch (error) {
      console.warn(`⚠️ [${name}]`, error.message);
    } finally {
      lease.release();
      setTimeout(run, intervalMs);
    }
  };

  setTimeout(run, initialDelayMs);
}

function scheduleAutonomyOnce(name, delayMs, task) {
  if (isGovernorAutonomyPaused()) {
    return;
  }

  const run = async () => {
    if (isGovernorAutonomyPaused()) return;
    const lease = acquireGovernorHeavyLease();
    if (!lease) {
      setTimeout(run, delayMs);
      return;
    }
    try {
      await task();
    } catch (error) {
      console.warn(`⚠️ [${name}]`, error.message);
    } finally {
      lease.release();
    }
  };

  setTimeout(run, delayMs);
}

// ==================== DATABASE INITIALIZATION ====================
async function initDatabase() {
  const { readFileSync } = await import('fs');
  const sqlPath = new URL('./db/migrations/20260313_core_schema.sql', import.meta.url).pathname;
  const sql = readFileSync(sqlPath, 'utf8');
  // Run each statement individually, tolerating "already exists" errors
  const statements = sql.split(/;\s*\n/).filter(s => s.trim().length > 0 && !s.trim().startsWith('--'));
  for (const stmt of statements) {
    try {
      await pool.query(stmt);
    } catch (e) {
      if (!e.message.includes('already exists')) throw e;
    }
  }
  logger.info('[DB] Schema initialized');
}

// ==================== ENHANCED AI COUNCIL MEMBERS (NO CLAUDE) ====================
// TIER 0: Open Source / Cheap Models (PRIMARY - Do all the work)
// TIER 1: Expensive Models (OVERSIGHT ONLY - Validation when needed)
const COUNCIL_ALIAS_MAP = {
  claude: "ollama_llama_3_3_70b",
  chatgpt: "ollama_llama",
  gemini: "ollama_gemma_2_27b",
  grok: "ollama_phi3",
  deepseek: "ollama_deepseek",
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
  updateROI,
  trackAIPerformance,
  notifyCriticalIssue,
});

// ==================== ENHANCED AI CALLING WITH AGGRESSIVE COST OPTIMIZATION ====================
// resolveCouncilMember, callCouncilMember, callCouncilWithFailover provided by createCouncilService above

// ==================== USER PREFERENCE LEARNING ====================
async function guessUserDecision(context) {
  try {
    const pastDecisions = await pool.query(
      `SELECT context, choice, outcome, riskLevel 
       FROM user_decisions 
       WHERE created_at > NOW() - INTERVAL '30 days'
       ORDER BY created_at DESC 
       LIMIT 20`
    );

    const prompt = `Based on these past user decisions:
    ${JSON.stringify(pastDecisions.rows, null, 2)}
    
    And this current context:
    ${JSON.stringify(context)}
    
    What would the user likely choose? Consider:
    1. Risk tolerance patterns
    2. Decision speed preferences
    3. Common priorities
    4. Past similar situations
    
    Provide your best guess and confidence level (0-100).`;

    const guess = await callCouncilMember("chatgpt", prompt, {
      guessUserPreference: true,
    });

    return {
      prediction: guess,
      confidence: 75,
      basedOn: pastDecisions.rows.length + " past decisions",
    };
  } catch (error) {
    console.error("User preference guess error:", error.message);
    return { prediction: "uncertain", confidence: 0 };
  }
}

// ==================== SANDBOX TESTING ====================
async function sandboxTest(code, testDescription) {
  return runSandboxTest({ code, testDescription, __dirname, pool });
}

// ==================== DRIFT & HALLUCINATION PROTECTION ====================
async function detectHallucinations(aiResponse, context, sourceMember) {
  try {
    // Check for common hallucination patterns
    const hallucinationIndicators = [
      /I don't have access to/i,
      /I cannot/i,
      /I'm not able to/i,
      /as an AI language model/i,
      /I don't have real-time/i,
      /I cannot browse/i,
    ];

    const hasHallucinationPattern = hallucinationIndicators.some(pattern =>
      pattern.test(aiResponse)
    );

    // Check for vague or non-specific responses
    const vaguePatterns = [
      /might work/i,
      /could potentially/i,
      /perhaps/i,
      /maybe/i,
      /I think/i,
      /I believe/i,
    ];

    const vagueCount = vaguePatterns.filter(pattern => pattern.test(aiResponse)).length;
    const isVague = vagueCount >= 3;

    // Check for contradictory statements
    const contradictions = [
      /but.*however/i,
      /although.*but/i,
      /on one hand.*on the other hand/i,
    ];

    const hasContradictions = contradictions.some(pattern => pattern.test(aiResponse));

    return {
      hasHallucinationPattern,
      isVague,
      hasContradictions,
      vagueCount,
      confidence: hasHallucinationPattern || isVague || hasContradictions ? "low" : "medium",
    };
  } catch (error) {
    console.warn(`Hallucination detection error: ${error.message}`);
    return { confidence: "unknown" };
  }
}

async function crossValidateResponses(responses, context) {
  try {
    if (responses.length < 2) {
      return { validated: true, confidence: "low", reason: "Insufficient responses for validation" };
    }

    // Extract key claims/fixes from each response
    const claims = responses.map(r => ({
      member: r.member,
      claims: extractKeyClaims(r.response),
    }));

    // Check for agreement on core solutions
    const solutionPatterns = responses.map(r => extractSolutionPattern(r.response));
    const agreementScore = calculateAgreement(solutionPatterns);

    // Check if responses reference each other or contradict
    const contradictions = findContradictions(claims);

    const validated = agreementScore >= 0.6 && contradictions.length === 0;
    const confidence = agreementScore >= 0.8 ? "high" : agreementScore >= 0.6 ? "medium" : "low";

    return {
      validated,
      confidence,
      agreementScore,
      contradictions,
      reason: validated
        ? `High agreement (${(agreementScore * 100).toFixed(0)}%)`
        : `Low agreement (${(agreementScore * 100).toFixed(0)}%) or contradictions found`,
    };
  } catch (error) {
    console.warn(`Cross-validation error: ${error.message}`);
    return { validated: false, confidence: "unknown", reason: error.message };
  }
}

function extractKeyClaims(response) {
  const claims = [];
  // Extract code blocks
  const codeBlocks = response.match(/```[\s\S]*?```/g) || [];
  claims.push(...codeBlocks);
  // Extract numbered/bulleted solutions
  const solutions = response.match(/(?:^|\n)[\d\-\*]\s+[^\n]+/g) || [];
  claims.push(...solutions);
  return claims;
}

function extractSolutionPattern(response) {
  // Extract the core solution approach
  const patterns = [
    /(?:fix|solution|approach|method):\s*([^\n]+)/i,
    /(?:use|try|implement):\s*([^\n]+)/i,
  ];
  for (const pattern of patterns) {
    const match = response.match(pattern);
    if (match) return match[1].toLowerCase();
  }
  return response.substring(0, 100).toLowerCase();
}

function calculateAgreement(patterns) {
  if (patterns.length < 2) return 0;
  
  // Simple similarity check
  let matches = 0;
  for (let i = 0; i < patterns.length; i++) {
    for (let j = i + 1; j < patterns.length; j++) {
      // Check for keyword overlap
      const words1 = new Set(patterns[i].split(/\s+/));
      const words2 = new Set(patterns[j].split(/\s+/));
      const intersection = new Set([...words1].filter(x => words2.has(x)));
      const union = new Set([...words1, ...words2]);
      const similarity = intersection.size / union.size;
      if (similarity > 0.3) matches++;
    }
  }
  
  const totalPairs = (patterns.length * (patterns.length - 1)) / 2;
  return matches / totalPairs;
}

function findContradictions(claims) {
  const contradictions = [];
  const keywords = ["cannot", "should not", "don't", "never", "avoid"];
  const positiveKeywords = ["can", "should", "do", "always", "use"];

  for (let i = 0; i < claims.length; i++) {
    for (let j = i + 1; j < claims.length; j++) {
      const text1 = claims[i].claims.join(" ").toLowerCase();
      const text2 = claims[j].claims.join(" ").toLowerCase();
      
      // Check for direct contradictions
      for (const neg of keywords) {
        for (const pos of positiveKeywords) {
          if (text1.includes(neg) && text2.includes(pos)) {
            contradictions.push({
              member1: claims[i].member,
              member2: claims[j].member,
              type: "contradiction",
            });
          }
        }
      }
    }
  }
  return contradictions;
}
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
async function createSystemSnapshot(reason = "Manual snapshot", filePaths = []) {
  return createSystemSnapshotService({
    reason,
    filePaths,
    __dirname,
    pool,
    systemMetrics,
    roiTracker,
    activeConnectionsSize: activeConnections.size,
    ideaEngine,
    aiPerformanceScores,
    systemSnapshots,
  });
}

async function rollbackToSnapshot(snapshotId) {
  return rollbackToSnapshotService({
    snapshotId,
    __dirname,
    pool,
    systemMetrics,
    roiTracker,
    aiPerformanceScores,
    trackLoss,
  });
}


// ==================== CONTINUOUS SELF-IMPROVEMENT ====================
async function continuousSelfImprovement() {
  try {
    systemMetrics.improvementCyclesRun++;
    console.log(
      `🔧 [IMPROVEMENT] Running cycle #${systemMetrics.improvementCyclesRun}...`
    );

    await createSystemSnapshot("Before improvement cycle");

    const recentErrors = await pool.query(
      `SELECT what_was_lost, why_lost, COUNT(*) as count 
       FROM loss_log 
       WHERE timestamp > NOW() - INTERVAL '1 hour'
       GROUP BY what_was_lost, why_lost
       ORDER BY count DESC LIMIT 5`
    );

    const slowTasks = await pool.query(
      `SELECT type, AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) * 1000) as avg_duration 
       FROM execution_tasks 
       WHERE created_at > NOW() - INTERVAL '24 hours'
       AND completed_at IS NOT NULL
       GROUP BY type 
       HAVING AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) * 1000) > 5000`
    );

    const recentDecisions = await pool.query(
      `SELECT * FROM user_decisions 
       WHERE created_at > NOW() - INTERVAL '24 hours'
       ORDER BY created_at DESC LIMIT 5`
    );

    for (const decision of recentDecisions.rows) {
      await detectBlindSpots(decision.choice, decision.context);
    }

    await rotateAIsBasedOnPerformance();

    if (recentErrors.rows.length > 0 || slowTasks.rows.length > 0) {
      const improvementPrompt = `Analyze and suggest code/process improvements for these issues:
      
      Recent Errors: ${JSON.stringify(recentErrors.rows.slice(0, 3))}
      Performance Bottlenecks: ${JSON.stringify(slowTasks.rows.slice(0, 3))}
      Blind Spots Detected: ${systemMetrics.blindSpotsDetected}
      
      Focus especially on:
      - Reducing friction in monetization flows
      - Improving ROI visibility
      - Keeping safety and ethics intact.
      
      Suggest specific, actionable improvements.`;

      const improvements = await callCouncilWithFailover(
        improvementPrompt,
        "ollama_deepseek" // Use Tier 0 (free)
      );

      if (improvements && improvements.length > 50) {
        const testResult = await sandboxTest(
          `// Test improvements\nconsole.log("Testing improvements");`,
          "Improvement test"
        );

        if (testResult.success) {
          await executionQueue.addTask("self_improvement", improvements);
          systemMetrics.lastImprovement = new Date().toISOString();
        } else {
          console.log("⚠️ Improvements failed sandbox test, rolling back");
          await rollbackToSnapshot(
            systemSnapshots[systemSnapshots.length - 1].id
          );
        }
      }
    }
  } catch (error) {
    console.error("Self-improvement error:", error.message);
  }
}

// ==================== ROI & FINANCIAL TRACKING ====================
async function loadROIFromDatabase() {
  try {
    const result = await pool.query(
      `SELECT SUM(usd) as total FROM daily_spend WHERE date = $1`,
      [dayjs().format("YYYY-MM-DD")]
    );
    if (result.rows[0]?.total) {
      roiTracker.daily_ai_cost = parseFloat(result.rows[0].total);
    }
  } catch (error) {
    console.error("ROI load error:", error.message);
  }
}

function updateROI(
  revenue = 0,
  cost = 0,
  tasksCompleted = 0,
  tokensSaved = 0
) {
  const today = dayjs().format("YYYY-MM-DD");
  if (roiTracker.last_reset !== today) {
    roiTracker.daily_revenue = 0;
    roiTracker.daily_ai_cost = 0;
    roiTracker.daily_tasks_completed = 0;
    roiTracker.total_tokens_saved = 0;
    roiTracker.micro_compression_saves = 0;
    roiTracker.last_reset = today;
  }
  roiTracker.daily_revenue += revenue;
  roiTracker.daily_ai_cost += cost;
  roiTracker.daily_tasks_completed += tasksCompleted;
  roiTracker.total_tokens_saved += tokensSaved;
  roiTracker.micro_compression_saves += tokensSaved; // Track compression saves
  if (roiTracker.daily_tasks_completed > 0) {
    roiTracker.revenue_per_task =
      roiTracker.daily_revenue / roiTracker.daily_tasks_completed;
  }
  if (roiTracker.daily_ai_cost > 0) {
    roiTracker.roi_ratio =
      roiTracker.daily_revenue / roiTracker.daily_ai_cost;
  }
  return roiTracker;
}

// ==================== MEMORY SYSTEM ====================
async function storeConversationMemory(
  orchestratorMessage,
  aiResponse,
  context = {}
) {
  try {
    const memId = `mem_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    await pool.query(
      `INSERT INTO conversation_memory
       (memory_id, orchestrator_msg, ai_response, context_metadata, memory_type, ai_member, created_at)
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, now())`,
      [
        memId,
        orchestratorMessage,
        aiResponse,
        JSON.stringify(context),
        JSON.stringify({
          type: context.type || "conversation",
          importance: context.importance || "medium",
          source: context.source || "system"
        }),
        context.ai_member || "system",
      ]
    );
    return { memId };
  } catch (error) {
    console.error("❌ Memory store error:", error.message);
    return null;
  }
}

async function recallConversationMemory(query, limit = 50) {
  try {
    const result = await pool.query(
      `SELECT memory_id, orchestrator_msg, ai_response, ai_member, created_at 
       FROM conversation_memory
       WHERE orchestrator_msg ILIKE $1 OR ai_response ILIKE $1
       ORDER BY created_at DESC LIMIT $2`,
      [`%${query}%`, limit]
    );
    return result.rows;
  } catch (error) {
    return [];
  }
}

// ==================== LOSS TRACKING ====================
async function trackLoss(
  severity,
  whatWasLost,
  whyLost,
  context = {},
  prevention = ""
) {
  try {
    await pool.query(
      `INSERT INTO loss_log (severity, what_was_lost, why_lost, context, prevention_strategy, timestamp)
       VALUES ($1, $2, $3, $4, $5, now())`,
      [severity, whatWasLost, whyLost, JSON.stringify(context), prevention]
    );
    if (severity === "critical") {
      console.error(`🚨 [${severity.toUpperCase()}] ${whatWasLost}`);
      await createSystemSnapshot(`Critical loss: ${whatWasLost}`);
    }
  } catch (error) {
    console.error("Loss tracking error:", error.message);
  }
}


// ==================== DEPLOYMENT SERVICE INITIALIZATION ====================
const {
  isFileProtected,
  triggerDeployment,
  commitToGitHub,
} = createDeploymentService({
  pool,
  systemMetrics,
  broadcastToAll,
  GITHUB_TOKEN,
  GITHUB_REPO,
  __dirname,
});

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

async function initializeTwoTierSystem() {
  try {
    // Dynamic import of modules
    const tier0Module = await import("./core/tier0-council.js");
    const tier1Module = await import("./core/tier1-council.js");
    const routerModule = await import("./core/model-router.js");
    const outreachModule = await import("./core/outreach-automation.js");
    const crmModule = await import("./core/crm-sequence-runner.js");
    const notificationModule = await import("./core/notification-service.js");
    const whiteLabelModule = await import("./core/white-label.js");
    const knowledgeModule = await import("./core/knowledge-base.js");
    const cleanupModule = await import("./core/file-cleanup-analyzer.js");
    const openSourceCouncilModule = await import("./core/open-source-council.js");
    
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
    openSourceCouncil = new OpenSourceCouncil(callCouncilMember, COUNCIL_MEMBERS, providerCooldowns);

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
    console.log("🎯 [STARTUP] Registering Enhanced Council routes...");
    registerEnhancedCouncilRoutes(app, pool, callCouncilMember, requireKey);
    console.log("✅ [STARTUP] Enhanced Council routes registered");

    // Site Builder + Prospect Pipeline
    const siteBaseUrl = RAILWAY_PUBLIC_DOMAIN
      ? `https://${RAILWAY_PUBLIC_DOMAIN}`
      : `http://localhost:${PORT}`;
    createSiteBuilderRoutes(app, {
      pool,
      requireKey,
      callCouncilMember,
      baseUrl: siteBaseUrl,
      outreachAutomation: typeof outreachAutomation !== 'undefined' ? outreachAutomation : null,
      notificationService,
    });
    console.log("✅ [STARTUP] Site Builder routes registered");
    console.log("   - Dynamic Council Expansion (3→5 agents)");
    console.log("   - Enhanced Consensus Protocol (5-phase with steel-manning)");
    console.log("   - Decision Filters (7 wisdom lenses)");
    console.log("   - FSAR Severity Gate (Likelihood × Damage × Reversibility)");

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
    const costModule = await import("./core/cost-re-examination.js");
    const CostReExamination = costModule.CostReExamination;
    costReExamination = new CostReExamination(pool, compressionMetrics, roiTracker);
    
    // Initialize log monitoring
    try {
      const logModule = await import("./core/log-monitor.js");
      const LogMonitor = logModule.LogMonitor;
      logMonitor = new LogMonitor(pool, callCouncilMember);
      if (selfProgrammingDepsRef) selfProgrammingDepsRef.current.logMonitor = logMonitor;
      console.log("✅ Log Monitoring System initialized");
      
      // Initialize post-upgrade checker
      try {
        const upgradeModule = await import("./core/post-upgrade-checker.js");
        const PostUpgradeChecker = upgradeModule.PostUpgradeChecker;
        postUpgradeChecker = new PostUpgradeChecker(logMonitor, callCouncilMember, pool);
        if (selfProgrammingDepsRef) selfProgrammingDepsRef.current.postUpgradeChecker = postUpgradeChecker;
        console.log("✅ Post-Upgrade Checker initialized");
        
        // Set up global hook for Cursor/development
        global.postUpgradeCheck = async () => {
          return await postUpgradeChecker.checkAfterUpgrade();
        };
        
      // Initialize comprehensive idea tracker
      try {
        const trackerModule = await import("./core/comprehensive-idea-tracker.js");
        comprehensiveIdeaTracker = new trackerModule.ComprehensiveIdeaTracker(pool);
        console.log("✅ Comprehensive Idea Tracker initialized");
      } catch (error) {
        console.warn("⚠️ Comprehensive Idea Tracker not available:", error.message);
      }
      
      // Initialize Vapi integration
      try {
        const vapiModule = await import("./core/vapi-integration.js");
        vapiIntegration = new vapiModule.VapiIntegration(pool, callCouncilMember);
        await vapiIntegration.initialize();
        console.log("✅ Vapi Integration initialized");
      } catch (error) {
        console.warn("⚠️ Vapi Integration not available:", error.message);
      }
      
      // Replace basic drone system with enhanced version
      try {
        const enhancedDroneModule = await import("./core/enhanced-income-drone.js");
        const EnhancedIncomeDrone = enhancedDroneModule.EnhancedIncomeDrone;
        incomeDroneSystem = new EnhancedIncomeDrone(pool, callCouncilMember, modelRouter);
        console.log("✅ Enhanced Income Drone System initialized");
        
        // Deploy income drones (if not disabled)
        if (!DISABLE_INCOME_DRONES) {
          console.log('🚀 [INCOME] Deploying income drones immediately...');
          try {
            const affiliateDrone = await incomeDroneSystem.deployDrone("affiliate", 500);
            const contentDrone = await incomeDroneSystem.deployDrone("content", 300);
            const outreachDrone = await incomeDroneSystem.deployDrone("outreach", 1000);
            const productDrone = await incomeDroneSystem.deployDrone("product", 200);
            const serviceDrone = await incomeDroneSystem.deployDrone("service", 500);
            console.log(`✅ [INCOME] Deployed 5 income drones - they are NOW WORKING!`);
          } catch (deployError) {
            console.error('❌ [INCOME] Error deploying drones:', deployError.message);
          }
        } else {
          console.log('ℹ️ [INCOME] Income drones DISABLED (set DISABLE_INCOME_DRONES=false to enable)');
        }

        // Initialize Opportunity Executor (actually implements opportunities to generate REAL revenue)
        let opportunityExecutor = null;
        try {
          const executorModule = await import("./core/opportunity-executor.js");
          opportunityExecutor = new executorModule.OpportunityExecutor(pool, callCouncilMember, incomeDroneSystem);
          await opportunityExecutor.start();
          console.log("✅ Opportunity Executor initialized - will actually implement opportunities to generate REAL revenue");

          // Connect executor to drone system so drones can use it
          if (incomeDroneSystem && incomeDroneSystem.setOpportunityExecutor) {
            incomeDroneSystem.setOpportunityExecutor(opportunityExecutor);
            console.log("✅ Connected Opportunity Executor to Income Drone System - drones will implement opportunities when any exist");
          }
        } catch (error) {
          console.warn("⚠️ Opportunity Executor not available:", error.message);
        }

        // Initialize Auto-Builder (builds opportunities into working products)
        // Auto-builder is now imported at top of file
        console.log("✅ Auto-Builder available (Anti-Hallucination Edition)");
        console.log("📊 Auto-Builder: Focused on single product at a time");
        console.log("🚫 Auto-Builder: phi3:mini is BANNED");
        console.log("🔍 Auto-Builder: All outputs validated before saving");
      } catch (error) {
        console.warn("⚠️ Enhanced Drone System not available, using basic:", error.message);
      }
      
      // Initialize Business Center
      try {
        const businessCenterModule = await import("./core/business-center.js");
        businessCenter = new businessCenterModule.BusinessCenter(pool, callCouncilMember, modelRouter);
        await businessCenter.initialize();
        console.log("✅ Business Center initialized");
      } catch (error) {
        console.warn("⚠️ Business Center not available:", error.message);
      }
      
      // Initialize Game Generator
      try {
        const gameGeneratorModule = await import("./core/game-generator.js");
        gameGenerator = new gameGeneratorModule.GameGenerator(pool, callCouncilMember, modelRouter);
        console.log("✅ Game Generator initialized");
      } catch (error) {
        console.warn("⚠️ Game Generator not available:", error.message);
      }
      
      // Initialize Business Duplication
      try {
        const businessDupModule = await import("./core/business-duplication.js");
        businessDuplication = new businessDupModule.BusinessDuplication(pool, callCouncilMember, modelRouter);
        console.log("✅ Business Duplication System initialized");
      } catch (error) {
        console.warn("⚠️ Business Duplication not available:", error.message);
      }
      
      // Initialize Code Services
      try {
        const codeServicesModule = await import("./core/code-services.js");
        codeServices = new codeServicesModule.CodeServices(pool, callCouncilMember, modelRouter);
        console.log("✅ Code Services initialized");
      } catch (error) {
        console.warn("⚠️ Code Services not available:", error.message);
      }
      
      // Initialize Make.com Generator
      try {
        const makeComModule = await import("./core/makecom-generator.js");
        makeComGenerator = new makeComModule.MakeComGenerator(pool, callCouncilMember, modelRouter);
        console.log("✅ Make.com Generator initialized");
      } catch (error) {
        console.warn("⚠️ Make.com Generator not available:", error.message);
      }
      
      // Initialize Legal Checker
      try {
        const legalModule = await import("./core/legal-checker.js");
        legalChecker = new legalModule.LegalChecker(pool);
        console.log("✅ Legal Checker initialized");
      } catch (error) {
        console.warn("⚠️ Legal Checker not available:", error.message);
      }
      
      // Initialize Self-Funding System
      try {
        const selfFundingModule = await import("./core/self-funding-system.js");
        selfFundingSystem = new selfFundingModule.SelfFundingSystem(pool, callCouncilMember, modelRouter);
        await selfFundingSystem.initialize();
        console.log("✅ Self-Funding System initialized");
      } catch (error) {
        console.warn("⚠️ Self-Funding System not available:", error.message);
      }
      
      // Initialize Marketing Research System
      try {
        const marketingResearchModule = await import("./core/marketing-research-system.js");
        marketingResearch = new marketingResearchModule.MarketingResearchSystem(pool, callCouncilMember, modelRouter);
        await marketingResearch.initialize();
        console.log("✅ Marketing Research System initialized");
      } catch (error) {
        console.warn("⚠️ Marketing Research System not available:", error.message);
      }
      
      // Initialize Marketing Agency
      try {
        const marketingAgencyModule = await import("./core/marketing-agency.js");
        marketingAgency = new marketingAgencyModule.MarketingAgency(pool, callCouncilMember, modelRouter, marketingResearch);
        await marketingAgency.initialize();
        console.log("✅ Marketing Agency initialized");
      } catch (error) {
        console.warn("⚠️ Marketing Agency not available:", error.message);
      }
      
      // Initialize Web Scraper
      try {
        const webScraperModule = await import("./core/web-scraper.js");
        webScraper = new webScraperModule.WebScraper(pool, callCouncilMember, modelRouter);
        console.log("✅ Web Scraper initialized");
      } catch (error) {
        console.warn("⚠️ Web Scraper not available:", error.message);
      }
      
      // Initialize Enhanced Conversation Scraper (will auto-install Puppeteer if needed)
      try {
        const scraperModule = await import("./core/enhanced-conversation-scraper.js");
        enhancedConversationScraper = new scraperModule.EnhancedConversationScraper(
          pool,
          knowledgeBase,
          callCouncilMember
        );
        // Initialize Puppeteer (will auto-install if needed)
        await enhancedConversationScraper.initPuppeteer();
        console.log("✅ Enhanced Conversation Scraper initialized");
      } catch (error) {
        console.warn("⚠️ Enhanced Conversation Scraper not available:", error.message);
      }
      
      // Initialize API Cost Savings Revenue System (PRIORITY 1)
      try {
        const costSavingsModule = await import("./core/api-cost-savings-revenue.js");
        apiCostSavingsRevenue = new costSavingsModule.APICostSavingsRevenue(
          pool,
          callCouncilMember,
          modelRouter
        );
        console.log("✅ API Cost Savings Revenue System initialized (PRIORITY 1)");
      } catch (error) {
        console.warn("⚠️ API Cost Savings Revenue System not available:", error.message);
      }
      
      // Initialize System Health Checker
      try {
        const healthModule = await import("./core/system-health-checker.js");
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
        console.log("✅ System Health Checker initialized");
        healthModuleInstance.setHealthChecker(systemHealthChecker);
      } catch (error) {
        console.warn("⚠️ System Health Checker not available:", error.message);
      }

      // Initialize Self-Builder (system can build itself)
      try {
        const builderModule = await import("./core/self-builder.js");
        selfBuilder = new builderModule.SelfBuilder(pool, callCouncilMember);
        if (selfProgrammingDepsRef) selfProgrammingDepsRef.current.selfBuilder = selfBuilder;
        console.log("✅ Self-Builder initialized - system can now build itself");
      } catch (error) {
        console.warn("⚠️ Self-Builder not available:", error.message);
      }

      // Initialize Idea-to-Implementation Pipeline (complete flow from idea to completion)
      try {
        const pipelineModule = await import("./core/idea-to-implementation-pipeline.js");
        // Will initialize after taskTracker is available
        console.log("✅ Idea-to-Implementation Pipeline module loaded");
      } catch (error) {
        console.warn("⚠️ Idea-to-Implementation Pipeline not available:", error.message);
      }

      // Initialize Source of Truth Manager
      try {
        const sotModule = await import("./core/source-of-truth-manager.js");
        sourceOfTruthManager = new sotModule.SourceOfTruthManager(pool);
        console.log("✅ Source of Truth Manager initialized");
        
        // Auto-load Source of Truth if it exists (for AI council reference)
        const existingSOT = await sourceOfTruthManager.getDocument('master_vision');
        if (existingSOT.length > 0) {
          console.log(`📖 [SOURCE OF TRUTH] Loaded ${existingSOT.length} document(s) - AI Council will reference for mission alignment`);
        } else {
          console.log(`⚠️ [SOURCE OF TRUTH] No documents found. Use POST /api/v1/system/source-of-truth/store to add Source of Truth.`);
        }
      } catch (error) {
        console.warn("⚠️ Source of Truth Manager not available:", error.message);
      }
      } catch (error) {
        console.warn("⚠️ Post-upgrade checker not available:", error.message);
      }
    } catch (error) {
      console.warn("⚠️ Log monitoring not available:", error.message);
    }

    // Initialize auto-queue manager
    try {
      const queueModule = await import("./core/auto-queue-manager.js");
      const AutoQueueManager = queueModule.AutoQueueManager;
      autoQueueManager = new AutoQueueManager(pool, callCouncilMember, executionQueue, modelRouter);
      scheduleAutonomyOnce("AUTO_QUEUE_START", 30000, async () => {
        autoQueueManager.start();
        console.log("✅ Auto-Queue Manager initialized");
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
            const { EnhancedIdeaGenerator } = await import('./core/enhanced-idea-generator.js');
            const generator = new EnhancedIdeaGenerator(
              this.pool,
              this.callCouncilMember,
              this.modelRouter,
              userSimulation // Pass user simulation for filtering
            );
            return await generator.runFullPipeline(this.executionQueue);
          } catch (error) {
            console.error('Enhanced idea generation failed:', error.message);
            return await this.generateDailyIdeas();
          }
        };
      }
    } catch (error) {
      console.warn("⚠️ Auto-queue manager not available:", error.message);
    }

    // Initialize AI account bot
    try {
      const botModule = await import("./core/ai-account-bot.js");
      const AIAccountBot = botModule.AIAccountBot;
      aiAccountBot = new AIAccountBot(pool, knowledgeBase, callCouncilMember);
      console.log("✅ AI Account Bot initialized");
    } catch (error) {
      console.warn("⚠️ AI account bot not available:", error.message);
    }

      // Initialize conversation extractor bot
      try {
        const extractorModule = await import("./core/conversation-extractor-bot.js");
        const ConversationExtractorBot = extractorModule.ConversationExtractorBot;
        conversationExtractor = new ConversationExtractorBot(pool, knowledgeBase, callCouncilMember);
        console.log("✅ Conversation Extractor Bot initialized");
        
        // Auto-start text scraping bot (scrapes and organizes text automatically)
        // Check for stored credentials and start scraping if available
        scheduleAutonomyOnce("EXTRACTOR_AUTOSTART", 60000, async () => {
          if (enhancedConversationScraper) {
            const credentials = await enhancedConversationScraper.listStoredCredentials();
            if (credentials && credentials.length > 0) {
              console.log(`🤖 [EXTRACTOR] Found ${credentials.length} stored credential(s), starting auto-scraping...`);
              
              // Start scraping for each provider with credentials
              for (const cred of credentials) {
                try {
                  console.log(`🤖 [EXTRACTOR] Starting auto-scrape for ${cred.provider}...`);
                  const result = await enhancedConversationScraper.scrapeAllConversations(cred.provider);
                  if (result.success) {
                    console.log(`✅ [EXTRACTOR] Auto-scraped ${result.conversations?.length || 0} conversations from ${cred.provider}`);
                  }
                } catch (scrapeError) {
                  console.warn(`⚠️ [EXTRACTOR] Auto-scrape failed for ${cred.provider}:`, scrapeError.message);
                }
              }
            } else {
              console.log('📋 [EXTRACTOR] No stored credentials found. Use /api/v1/conversations/store-credentials to add credentials for auto-scraping.');
            }
          }
        });
        
      } catch (error) {
        console.warn("⚠️ Conversation extractor not available:", error.message);
      }

    // Initialize task improvement reporter (AI employees report improvements)
    try {
      const reporterModule = await import("./core/task-improvement-reporter.js");
      const TaskImprovementReporter = reporterModule.TaskImprovementReporter;
      taskImprovementReporter = new TaskImprovementReporter(pool, tier0Council, callCouncilMember);
      console.log("✅ Task Improvement Reporter initialized");
    } catch (error) {
      console.warn("⚠️ Task improvement reporter not available:", error.message);
    }

    // Initialize user simulation system (learns user's decision style)
    try {
      const simulationModule = await import("./core/user-simulation.js");
      const UserSimulation = simulationModule.UserSimulation;
      userSimulation = new UserSimulation(pool, callCouncilMember);
      await userSimulation.rebuildStyleProfile();
      const accuracy = await userSimulation.getAccuracyScore();
      console.log(`✅ User Simulation System initialized (Accuracy: ${(accuracy * 100).toFixed(1)}%)`);
    } catch (error) {
      console.warn("⚠️ User simulation not available:", error.message);
    }

    // Initialize AI effectiveness tracker
    try {
      const trackerModule = await import("./core/ai-effectiveness-tracker.js");
      const AIEffectivenessTracker = trackerModule.AIEffectivenessTracker;
      aiEffectivenessTracker = new AIEffectivenessTracker(pool);
      console.log("✅ AI Effectiveness Tracker initialized");
    } catch (error) {
      console.warn("⚠️ AI effectiveness tracker not available:", error.message);
    }
    
    console.log("✅ Two-Tier Council System initialized");
    console.log("✅ Knowledge Base System initialized");
    console.log("✅ Cost Re-Examination System initialized");

    // ==================== MODULAR ROUTE REGISTRATION ====================
    const routeCtx = {
      pool,
      requireKey,
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
    console.log('✅ [STARTUP] All modular routes registered');

  } catch (error) {
    console.error("⚠️ Two-Tier System initialization error:", error.message);
    console.error("   System will continue with legacy council only");
  }
}


// ==================== INCOME DRONE SYSTEM ====================
class IncomeDroneSystem {
  constructor() {
    this.activeDrones = new Map();
  }

  async deployDrone(droneType, expectedRevenue = 500) {
    const droneId = `drone_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    try {
      await pool.query(
        `INSERT INTO income_drones (drone_id, drone_type, status, deployed_at, updated_at)
         VALUES ($1, $2, $3, now(), now())`,
        [droneId, droneType, "active"]
      );

      this.activeDrones.set(droneId, {
        id: droneId,
        type: droneType,
        status: "active",
        revenue: 0,
        tasks: 0,
        expectedRevenue,
        deployed: new Date().toISOString(),
      });

      return droneId;
    } catch (error) {
      console.error(`Drone deployment error: ${error.message}`);
      return null;
    }
  }

  async recordRevenue(droneId, amount, isActual = false) {
    try {
      if (isActual) {
        // ACTUAL revenue - real money received
        await pool.query(
          `UPDATE income_drones
           SET revenue_generated = revenue_generated + $1,
               actual_revenue = actual_revenue + $1,
               tasks_completed = tasks_completed + 1,
               updated_at = now()
           WHERE drone_id = $2`,
          [amount, droneId]
        );
        await updateROI(amount, 0, 0);
        broadcastToAll({ type: "revenue_generated", droneId, amount, isActual: true });
      } else {
        // PROJECTED revenue - estimated, not real money yet
        await pool.query(
          `UPDATE income_drones
           SET projected_revenue = projected_revenue + $1,
               tasks_completed = tasks_completed + 1,
               updated_at = now()
           WHERE drone_id = $2`,
          [amount, droneId]
        );
        broadcastToAll({ type: "revenue_projected", droneId, amount, isActual: false });
      }

      const drone = this.activeDrones.get(droneId);
      if (drone) {
        if (isActual) {
          drone.revenue += amount;
        }
        drone.tasks++;
      }
    } catch (error) {
      console.error(`Revenue update error: ${error.message}`);
    }
  }

  async getStatus() {
    try {
      const result = await pool.query(
        `SELECT drone_id, drone_type, status, revenue_generated, actual_revenue, projected_revenue, tasks_completed
         FROM income_drones WHERE status = 'active' ORDER BY deployed_at DESC`
      );
      const totalActual = result.rows.reduce(
        (sum, d) => sum + parseFloat(d.actual_revenue || 0),
        0
      );
      const totalProjected = result.rows.reduce(
        (sum, d) => sum + parseFloat(d.projected_revenue || 0),
        0
      );
      return {
        active: result.rows.length,
        drones: result.rows,
        total_revenue: totalActual, // Only actual revenue
        actual_revenue: totalActual,
        projected_revenue: totalProjected,
        revenue_generated: totalActual, // Backward compatibility
      };
    } catch (error) {
      return { active: 0, drones: [], total_revenue: 0, actual_revenue: 0, projected_revenue: 0 };
    }
  }
}

// Income drone system - will be replaced by EnhancedIncomeDrone if available
let incomeDroneSystem = new IncomeDroneSystem();

// ==================== FINANCIAL DASHBOARD ====================
class FinancialDashboard {
  async recordTransaction(
    type,
    amount,
    description,
    category = "general",
    externalId = null
  ) {
    try {
      const txId =
        externalId && externalId.trim()
          ? `ext_${externalId.trim()}`
          : `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      if (externalId) {
        const existing = await pool.query(
          `SELECT id FROM financial_ledger WHERE external_id = $1`,
          [externalId]
        );
        if (existing.rows.length > 0) {
          return {
            txId: `ext_${externalId.trim()}`,
            type,
            amount: 0,
            description: `[duplicate ignored] ${description}`,
            category,
            date: new Date().toISOString(),
            duplicate: true,
          };
        }
      }

      await pool.query(
        `INSERT INTO financial_ledger (tx_id, type, amount, description, category, external_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, now())`,
        [txId, type, amount, description, category, externalId]
      );

      return {
        txId,
        type,
        amount,
        description,
        category,
        externalId,
        date: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Financial ledger error:", error.message);
      return null;
    }
  }

  async getDashboard() {
    try {
      const todayStart = dayjs().startOf("day").toDate();
      const todayEnd = dayjs().endOf("day").toDate();

      const dailyResult = await pool.query(
        `SELECT SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as total_income,
                SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as total_expenses
         FROM financial_ledger
         WHERE created_at >= $1 AND created_at <= $2`,
        [todayStart, todayEnd]
      );

      const dailyRow = dailyResult.rows[0];
      return {
        daily: {
          income: parseFloat(dailyRow.total_income) || 0,
          expenses: parseFloat(dailyRow.total_expenses) || 0,
          net:
            (parseFloat(dailyRow.total_income) || 0) -
            (parseFloat(dailyRow.total_expenses) || 0),
        },
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      return {
        daily: { income: 0, expenses: 0, net: 0 },
        lastUpdated: new Date().toISOString(),
      };
    }
  }
}

const financialDashboard = new FinancialDashboard();

// ==================== REVENUE EVENT HELPER (LEDGER + DRONES + ROI) ====================
async function recordRevenueEvent({
  source = "unknown",
  eventId = null,
  amount,
  currency = "USD",
  droneId = null,
  description = "",
  category = "general",
}) {
  const cleanAmount = Number(amount);
  if (!Number.isFinite(cleanAmount) || cleanAmount <= 0) {
    throw new Error("Invalid amount for revenue event");
  }

  const desc =
    description ||
    `Revenue from ${source}${eventId ? ` (event ${eventId})` : ""}`;

  const tx = await financialDashboard.recordTransaction(
    "income",
    cleanAmount,
    desc,
    category || source,
    eventId
  );

  if (droneId) {
    await incomeDroneSystem.recordRevenue(droneId, cleanAmount, true); // ACTUAL revenue - real money
  } else {
    updateROI(cleanAmount, 0, 0);
  }

  return { tx, amount: cleanAmount, currency, source, droneId };
}

// ==================== STRIPE REVENUE SYNC (SAFE: READ + LOG ONLY) ====================
async function syncStripeRevenue() {
  try {
    const stripe = await getStripeClient();
    if (!stripe) {
      return;
    }

    console.log("💳 Syncing Stripe revenue into financial_ledger...");

    const paymentIntents = await stripe.paymentIntents.list({
      limit: 50,
    });

    for (const pi of paymentIntents.data || []) {
      if (pi.status !== "succeeded") continue;
      const amount = (pi.amount_received || pi.amount || 0) / 100;
      if (!amount) continue;

      await recordRevenueEvent({
        source: "stripe",
        eventId: pi.id,
        amount,
        currency: pi.currency || "usd",
        description: pi.description || "Stripe payment",
        category: "stripe_income",
      });
    }

    console.log("✅ Stripe revenue sync complete");
  } catch (err) {
    console.error("Stripe revenue sync error:", err.message);
  }
}


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
// ==================== MEMORY SYSTEM ROUTES ====================
app.use('/api', memoryRoutes);

// ==================== STRIPE AUTOMATION ROUTES ====================
// Stripe webhook route (needs raw body - must be before JSON parser)
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  if (!sig) {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }
  
  try {
    const stripeAutomation = await import('./core/stripe-automation.js');
    await stripeAutomation.handleWebhook(req.body, sig, { pool });
    res.json({ received: true });
  } catch (error) {
    console.error('❌ [STRIPE] Webhook error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Other Stripe routes (use JSON parser)
app.use('/api/stripe', stripeRoutes);

// TCO routes will be mounted after initialization
// See initializeTwoTierSystem() call below

// Enhanced health check
// Feature flags status endpoint
app.get('/api/v1/flags', requireKey, (req, res) => {
  res.json({ ok: true, flags: getAllFlags() });
});

app.get('/api/health', async (req, res) => {
  const health = {
    server: 'ok',
    timestamp: new Date().toISOString()
  };
  
  try {
    const ollamaEndpoint = OLLAMA_ENDPOINT || 'http://localhost:11434';
    const ollamaRes = await fetch(`${ollamaEndpoint}/api/tags`);
    if (ollamaRes.ok) {
      const data = await ollamaRes.json();
      health.ollama = { 
        status: 'ok', 
        endpoint: ollamaEndpoint,
        models: data.models?.map(m => m.name) || [] 
      };
    } else {
      health.ollama = { status: 'error', message: `HTTP ${ollamaRes.status}` };
    }
  } catch (e) {
    health.ollama = { status: 'error', message: e.message };
  }
  
  // Database check
  try {
    await pool.query('SELECT 1');
    health.database = { status: 'ok' };
  } catch (e) {
    health.database = { status: 'error', message: e.message };
  }
  
  // Build status
  try {
    health.build = autoBuilder.getStatus();
  } catch (e) {
    health.build = { status: 'error', message: e.message };
  }
  
  res.json(health);
});

app.post("/api/v1/stripe/sync-revenue", requireKey, async (req, res) => {
  try {
    await syncStripeRevenue();
    const dashboard = await financialDashboard.getDashboard();
    res.json({ ok: true, dashboard, roi: roiTracker });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Overlay
app.get("/overlay", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "overlay", "index.html"));
});

app.get("/overlay/index.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "overlay", "index.html"));
});

// ==================== AI COUNCIL CONSENSUS MODE ====================
/**
 * Get consensus from multiple AI models before making code decisions
 * Requires 2+ models to agree before proceeding
 */
async function getCouncilConsensus(prompt, taskType = 'code') {
  console.log('🤝 [COUNCIL CONSENSUS] Getting multiple opinions for code decision...');
  
  // Use available Ollama code models
  const models = ['ollama_deepseek_coder', 'ollama_qwen_coder_32b', 'ollama_llama', 'ollama_deepseek'];
  const availableModels = models.filter(m => COUNCIL_MEMBERS[m] && (OLLAMA_ENDPOINT || COUNCIL_MEMBERS[m].provider === 'groq'));
  
  if (availableModels.length < 2) {
    console.warn('⚠️ [CONSENSUS] Not enough models available, using single model');
    if (availableModels.length > 0) {
      return await callCouncilMember(availableModels[0], prompt);
    }
    // Fallback to any available model
    return await callCouncilMember('ollama_deepseek', prompt);
  }
  
  const responses = [];
  
  // Get 2 opinions minimum
  for (const model of availableModels.slice(0, 2)) {
    try {
      console.log(`🔄 [CONSENSUS] Getting opinion from ${model}...`);
      const response = await callCouncilMember(model, prompt, {
        useOpenSourceCouncil: true,
        maxTokens: 8000,
        temperature: 0.3,
      });
      if (response) {
        responses.push({ model, response });
        console.log(`✅ [CONSENSUS] ${model} responded (${response.length} chars)`);
      }
    } catch (e) {
      console.warn(`⚠️ [CONSENSUS] ${model} failed: ${e.message}`);
    }
  }
  
  if (responses.length < 2) {
    console.warn('⚠️ [CONSENSUS] Not enough responses, using single model result');
    return responses[0]?.response || null;
  }
  
  // Check if responses agree (simple similarity check)
  const similarity = compareResponses(responses[0].response, responses[1].response);
  console.log(`📊 [CONSENSUS] Similarity: ${(similarity * 100).toFixed(0)}%`);
  
  if (similarity > 0.7) {
    console.log(`✅ [CONSENSUS] Models agree (similarity: ${(similarity * 100).toFixed(0)}%)`);
    return responses[0].response; // Use first response
  }
  
  // Get tiebreaker
  console.log('🔄 [CONSENSUS] Models disagree, getting 3rd opinion...');
  try {
    const tiebreakerModel = availableModels[2] || availableModels[0];
    const tiebreaker = await callCouncilMember(tiebreakerModel, prompt, {
      useOpenSourceCouncil: true,
      maxTokens: 8000,
      temperature: 0.3,
    });
    responses.push({ model: tiebreakerModel, response: tiebreaker });
    
    // Vote on best response (use the one with highest similarity to others)
    const bestResponse = selectBestResponse(responses);
    console.log(`✅ [CONSENSUS] Selected best response after tiebreaker`);
    return bestResponse;
  } catch (e) {
    console.warn(`⚠️ [CONSENSUS] Tiebreaker failed: ${e.message}, using first response`);
    return responses[0].response;
  }
}

/**
 * Compare two responses for similarity (word overlap)
 */
function compareResponses(a, b) {
  if (!a || !b) return 0;
  
  // Simple word overlap comparison
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const intersection = [...wordsA].filter(w => wordsB.has(w));
  const union = new Set([...wordsA, ...wordsB]);
  
  return intersection.length / Math.max(union.size, 1);
}

/**
 * Select best response from multiple responses (highest average similarity)
 */
function selectBestResponse(responses) {
  if (responses.length === 0) return null;
  if (responses.length === 1) return responses[0].response;
  
  // Calculate average similarity for each response
  const scores = responses.map((r1, i) => {
    let totalSimilarity = 0;
    let count = 0;
    for (let j = 0; j < responses.length; j++) {
      if (i !== j) {
        totalSimilarity += compareResponses(r1.response, responses[j].response);
        count++;
      }
    }
    return {
      response: r1.response,
      model: r1.model,
      avgSimilarity: count > 0 ? totalSimilarity / count : 0,
    };
  });
  
  // Return response with highest average similarity
  scores.sort((a, b) => b.avgSimilarity - a.avgSimilarity);
  console.log(`📊 [CONSENSUS] Best response from ${scores[0].model} (avg similarity: ${(scores[0].avgSimilarity * 100).toFixed(0)}%)`);
  return scores[0].response;
}

registerWebsiteAuditRoutes(app, {
  requireKey,
  callCouncilWithFailover,
});

// Self-programming endpoint: handled by SelfProgrammingModule via moduleRouter

// Dev commit endpoint
app.post("/api/v1/dev/commit", requireKey, async (req, res) => {
  try {
    const { path: filePath, content, message } = req.body;

    if (!filePath || !content) {
      return res.status(400).json({ error: "Path and content required" });
    }

    await commitToGitHub(filePath, content, message || `Update ${filePath}`);

    res.json({
      ok: true,
      committed: filePath,
      message: message || `Update ${filePath}`,
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Full file replacement
app.post("/api/v1/system/replace-file", requireKey, async (req, res) => {
  try {
    const { filePath, fullContent, backup = true } = req.body;

    if (!filePath || !fullContent) {
      return res
        .status(400)
        .json({ error: "filePath and fullContent required" });
    }

    const allowedFiles = [
      ".js",
      "public/overlay/command-center.js",
      "public/overlay/command-center.html",
      "package.json",
    ];

    if (!allowedFiles.includes(filePath)) {
      return res
        .status(403)
        .json({ error: "File not allowed for replacement" });
    }

    const fullPath = path.join(__dirname, filePath);

    if (backup && fs.existsSync(fullPath)) {
      const backupPath = `${fullPath}.backup.${Date.now()}`;
      await fsPromises.copyFile(fullPath, backupPath);
      console.log(`📦 Backed up to: ${backupPath}`);
    }

    await fsPromises.writeFile(fullPath, fullContent, "utf-8");

    console.log(`✅ Completely replaced: ${filePath}`);

    res.json({
      ok: true,
      message: `File ${filePath} completely replaced`,
      backup: backup ? `Created backup with timestamp` : "No backup",
      size: fullContent.length,
    });
  } catch (error) {
    console.error("File replacement error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== WEBSOCKET ====================
wss.on("connection", (ws) => {
  const clientId = `ws_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  activeConnections.set(clientId, ws);
  conversationHistory.set(clientId, []);

  console.log(`✅ [WS] ${clientId} connected`);

  ws.send(
    JSON.stringify({
      type: "connection",
      status: "connected",
      clientId,
      message: "🎼 LifeOS v26.1 (no Claude) - Consensus Protocol Ready",
      systemMetrics,
      features: {
        consensusProtocol: true,
        blindSpotDetection: true,
        dailyIdeas: true,
        aiRotation: true,
        sandboxTesting: true,
        rollbackCapability: true,
        ollamaBridge: DEEPSEEK_BRIDGE_ENABLED === "true",
        stripeRevenueSync: Boolean(STRIPE_SECRET_KEY),
      },
    })
  );

  ws.on("message", async (data) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === "chat") {
        const text = msg.text || msg.message;
        const member = msg.member || "chatgpt";

        if (!text) return;

        try {
          const blindSpots = await detectBlindSpots(text, {
            source: "websocket",
          });

          const response = await callCouncilWithFailover(text, member);
          ws.send(
            JSON.stringify({
              type: "response",
              response,
              member,
              blindSpotsDetected: blindSpots.length,
              timestamp: new Date().toISOString(),
            })
          );
        } catch (error) {
          ws.send(
            JSON.stringify({
              type: "error",
              error: error.message,
            })
          );
        }
      }
    } catch (error) {
      ws.send(JSON.stringify({ type: "error", error: error.message }));
    }
  });

  ws.on("close", () => {
    activeConnections.delete(clientId);
    conversationHistory.delete(clientId);
    console.log(`👋 [WS] ${clientId} disconnected`);
  });
});

// ==================== STARTUP ====================
async function start() {
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
      console.warn("⚠️ Unable to write autonomy port file:", error.message);
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
            console.warn(
              `⚠️ Port ${currentPort} unavailable (${error.code}). Trying ${currentPort + 1}...`
            );
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

    await startListening();
    autoBuilder.startBuildScheduler({
      initialDelay: 15000,
      interval: 60000,
    });

    // Critical: Database must initialize (but don't fail if tables already exist)
    try {
      await initDatabase();
      console.log("✅ Database initialized");
    } catch (dbError) {
      console.error("❌ Database initialization error:", dbError.message);
      // Don't exit - try to continue (might be connection issue that resolves)
      console.warn("⚠️ Continuing startup despite DB error - will retry connections");
    }

    // Load ROI (non-critical)
    try {
      await loadROIFromDatabase();
    } catch (roiError) {
      console.warn("⚠️ ROI load error (non-critical):", roiError.message);
    }
    
    // Load knowledge context from processed dumps
    try {
      const knowledgeContext = await loadKnowledgeContext();
      if (knowledgeContext) {
        console.log(`📚 [KNOWLEDGE] Context loaded: ${knowledgeContext.totalEntries} entries`);
      }
    } catch (knowledgeError) {
      console.warn("⚠️ Knowledge load error (non-critical):", knowledgeError.message);
    }
    
    if (SMOKE_MODE) {
      console.log("🧪 [SMOKE] SMOKE_MODE enabled - skipping optional startup systems and schedulers");
    }

    // Run dependency audit before initializing systems
    if (!SMOKE_MODE) {
      try {
        const { dependencyAuditor } = await import("./core/dependency-auditor.js");
        const auditResults = await dependencyAuditor.auditAll();
        if (auditResults.npmPackages.missing.length > 0) {
          console.log(`⚠️ [STARTUP] ${auditResults.npmPackages.missing.length} packages were missing and have been installed`);
        }
        if (auditResults.coreModules.missing.length > 0) {
          console.error(`❌ [STARTUP] ${auditResults.coreModules.missing.length} core modules are missing!`);
          console.error(`   Missing: ${auditResults.coreModules.missing.join(', ')}`);
        }
      } catch (error) {
        console.warn("⚠️ Dependency auditor not available:", error.message);
      }
    }
    
    // Database validation runs at module load time (before this point)
    // If we reach here, database config is valid
    
    if (!SMOKE_MODE) {
      await initializeTwoTierSystem();

      // Mount TCO routes after initialization
      if (tcoRoutes) {
        app.use('/api/tco', tcoRoutes);
        console.log('✅ [TCO] Routes mounted at /api/tco');
      }
      if (tcoAgentRoutes) {
        app.use('/api/tco-agent', tcoAgentRoutes);
        console.log('✅ [TCO AGENT] Routes mounted at /api/tco-agent');
      }
    }

    if (!SMOKE_MODE) {
      // Initialize Memory System
      try {
        await memorySystem.initMemoryStore();
        console.log('✅ [MEMORY] Memory System initialized');
        
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
          
          console.log('✅ [MEMORY] Source of Truth document stored as system fact');
        } catch (sotError) {
          console.warn('⚠️ [MEMORY] Could not load Source of Truth document:', sotError.message);
        }
      } catch (error) {
        console.warn('⚠️ [MEMORY] Memory System initialization failed:', error.message);
      }
    }
    
    if (!SMOKE_MODE) {
      // Initialize Stripe products on startup
      try {
        const stripeAutomation = await import('./core/stripe-automation.js');
        await stripeAutomation.ensureProductsExist();
        console.log('✅ [STRIPE] Products ensured on startup');
      } catch (error) {
        console.warn('⚠️ [STRIPE] Could not ensure products on startup:', error.message);
        console.warn('   This is OK if STRIPE_SECRET_KEY is not set');
      }
    }

    if (!SMOKE_MODE) {
      // Initialize Sales Coaching Services
      try {
        const SalesAnalyzerModule = await import("./src/services/sales-technique-analyzer.js");
        const CallRecorderModule = await import("./src/services/call-recorder.js");
        
        salesTechniqueAnalyzer = new SalesAnalyzerModule.SalesTechniqueAnalyzer(pool, callCouncilWithFailover);
        callRecorder = new CallRecorderModule.CallRecorder(pool, salesTechniqueAnalyzer);
        
        console.log("✅ Sales Coaching Services initialized");
      } catch (error) {
        console.warn("⚠️ Sales Coaching Services not available:", error.message);
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
        
        console.log("✅ Goal Tracking & Coaching Services initialized");
      } catch (error) {
        console.warn("⚠️ Goal Tracking & Coaching Services not available:", error.message);
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
        
        console.log("✅ Motivation & Perfect Day Services initialized");
      } catch (error) {
        console.warn("⚠️ Motivation & Perfect Day Services not available:", error.message);
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
        detectBlindSpots,
        handleSelfProgramming,
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
        console.log('🚀 [STARTUP] Deploying income drones (basic system)...');
        const affiliateDrone = await incomeDroneSystem.deployDrone("affiliate", 500);
        const contentDrone = await incomeDroneSystem.deployDrone("content", 300);
        const outreachDrone = await incomeDroneSystem.deployDrone("outreach", 1000);
        const productDrone = await incomeDroneSystem.deployDrone("product", 200);
        const serviceDrone = await incomeDroneSystem.deployDrone("service", 500);
        console.log(`✅ [STARTUP] Deployed 5 income drones (affiliate, content, outreach, product, service)`);
      } else {
        console.log('✅ [STARTUP] Income drones already deployed by EnhancedIncomeDrone system');
      }
    } else {
      console.log('ℹ️ [STARTUP] Income drones DISABLED (set DISABLE_INCOME_DRONES=false to enable)');
    }

      // Initialize Ollama Installer (auto-install Ollama if needed)
      try {
        const ollamaInstallerModule = await import("./core/ollama-installer.js");
        const ollamaInstaller = new ollamaInstallerModule.OllamaInstaller(pool, callCouncilMember);
        // Auto-configure in background (don't block startup)
        ollamaInstaller.autoConfigure().catch(err => {
          console.warn('⚠️ Ollama auto-configuration failed:', err.message);
        });
        console.log("✅ Ollama Installer initialized - will auto-configure Ollama if possible");
      } catch (error) {
        console.warn("⚠️ Ollama Installer not available:", error.message);
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
        console.log("✅ Idea-to-Implementation Pipeline initialized - system can now implement ideas from start to finish");
      
    } catch (error) {
      console.warn("⚠️ Idea-to-Implementation Pipeline initialization failed:", error.message);
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

          console.log("✅ Virtual class modules initialized");
        }
      } catch (error) {
        console.error("Virtual class initialization error:", error.message);
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

    // Initial snapshot
    await createSystemSnapshot("System startup");

    await startListening();
    }
  } catch (error) {
    console.error("❌ Startup error:", error);
    console.error("Stack:", error.stack);
    
    // Try to start HTTP server anyway for health checks
    if (selectedPort !== null || server.listening) {
      console.warn("⚠️ Startup error after server already started - continuing in degraded mode");
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
      console.log(`⚠️ Server started in degraded mode due to startup error`);
      console.log(`📊 Health check available at http://${HOST}:${degradedPort}/healthz`);
    } catch (serverError) {
      console.error("❌ Failed to start HTTP server:", serverError.message);
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
  console.log("⚠️ [STARTUP] AUTONOMY_NO_LISTEN enabled - skipping network bind");
} else {
  start();
}

export default app;
