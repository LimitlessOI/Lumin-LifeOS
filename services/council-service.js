/**
 * SYNOPSIS: Council routing, token/LCL/savings, and model failover for platform AI calls.
 * Council routing, token/LCL/savings, and model failover for platform AI calls.
 * @authority Legacy production spine — see services/AGENTS.md. Not canonical factory runtime.
 * @ssot docs/products/ai-council/PRODUCT_HOME.md
 */
import dayjs from "dayjs";
import { injectKnowledgeContext, buildSystemContext } from "./knowledge-context.js";
import { createFreeTierGovernor } from "./free-tier-governor.js";
import { compress as optimizePrompt, compressCodeSafe, estimateTokens, createTokenOptimizer } from "./token-optimizer.js";
import { compressJSONInPrompt } from "./toon-formatter.js";
import { injectChainOfDraft, compressPrompt as irCompressPrompt } from "./prompt-ir.js";
import { createSavingsLedger } from "./savings-ledger.js";
import { addTurn, getDelta, startSession } from "./delta-context.js";
import { createRulesEngine } from "./rules-engine.js";
import { createPromptTranslator } from "./prompt-translator.js";
import { createLCLMonitor } from "./lcl-monitor.js";
import { CODE_SYMBOLS } from "../config/codebook-v1.js";
import { kingsmanAudit } from "./kingsman-gate.js";
import { sanitizeJsonResponse } from "../core/json-sanitizer.js";
import { envelopeCouncilMemberOutput } from "./ai-prose-truth-envelope.js";
import {
  getCachedResponse as _rcGet,
  cacheResponse as _rcSet,
  initCache as _rcInit,
  hashPrompt as hashCachePrompt,
} from "./response-cache.js";

// tokenOptimizer and freeTierGovernor are initialized inside createCouncilService with pool
const ZERO_COST_PROVIDERS = new Set([
  "groq",
  "gemini",
  "cerebras",
  "openrouter",
  "mistral",
  "together",
]);
const OPENAI_COMPATIBLE_PROVIDERS = new Set([
  "openai",
  "groq",
  "cerebras",
  "openrouter",
  "mistral",
  "together",
  "github_models",  // GitHub Models — uses GITHUB_TOKEN, free daily quota
  "fireworks",      // Fireworks AI — $1 free credit on signup
]);

/**
 * Council service encapsulates all AI council helper logic:
 * - model routing and failover
 * - cost tracking and rate limiting
 * - MICRO protocol helpers (compression, decode/encode)
 * - blind spot detection and basic safety helpers
 *
 * All environment/config/state is passed in via the factory to keep server.js
 * as a thin bootstrapper.
 */
export function createCouncilService({
  pool,
  COUNCIL_MEMBERS,
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
  getOpenSourceCouncil,
  providerCooldowns,
  getSourceOfTruthManager,
  updateROI,
  trackAIPerformance,
  notifyCriticalIssue,
  savingsLedger,  // TCO-E01 — injected from server.js
  tokenAccounting, // Token Accounting OS — metered enforcement layer
}) {
  // Both backed by Neon — stats survive Railway deploys
  const tokenOptimizer = createTokenOptimizer(pool);
  const freeTierGovernor = createFreeTierGovernor({
    pool,
  });
  // LCL prompt translator — applies codebook symbol compression before every API call.
  // Works with all free stateless providers (Groq, Gemini) by injecting a tiny inline
  // key containing only the symbols that fired in this specific prompt (~8-15 tokens
  // overhead vs 20-200+ tokens saved in the body for LifeOS coding prompts).
  const promptTranslator = createPromptTranslator({ logger: console });
  // LCL drift monitor — watches every response for symbol leakage and quality regression.
  // Auto-disables LCL for a (member, taskType) pair if drift rate exceeds 5%.
  const lclMonitor = createLCLMonitor({ pool, logger: console });
  const rulesEngine = createRulesEngine({
    COUNCIL_MEMBERS,
    timeZone: process.env.TZ || "America/Los_Angeles",
  });

  async function recordMetered(payload = {}) {
    const base = {
      sessionId: payload.sessionId,
      requestId: payload.requestId,
      clientId: payload.clientId,
      provider: payload.provider,
      model: payload.model,
      taskType: payload.taskType,
      originalTokens: payload.originalTokens,
      compressedTokens: payload.compressedTokens,
      outputTokens: payload.outputTokens,
      savedTokens: payload.savedTokens,
      savedOutputPct: payload.savedOutputPct,
      cacheHit: payload.cacheHit,
      qualityScore: payload.qualityScore,
      qualityMethod: payload.qualityMethod || "token-accounting-os",
      compressionLayers: payload.compressionLayers,
      fallbackTriggered: payload.fallbackTriggered,
      driftDetected: payload.driftDetected,
      costUSD: payload.costUSD,
      product_lane: payload.product_lane,
      blueprint_id: payload.blueprint_id,
      oil_result: payload.oil_result,
      ccl_used: payload.ccl_used,
      ccl_packet_id: payload.ccl_packet_id,
      ccl_authority_level: payload.ccl_authority_level,
      ccl_round_trip_status: payload.ccl_round_trip_status,
      ccl_estimated_savings_tokens: payload.ccl_estimated_savings_tokens,
      ccl_quality_result: payload.ccl_quality_result,
      startedAt: payload.startedAt,
      durationMs: payload.durationMs,
      requestId: payload.requestId || payload.task_id || payload.sessionId,
    };
    if (tokenAccounting?.recordMeteredCall) {
      return tokenAccounting.recordMeteredCall({ source: "council", ...base });
    }
    if (savingsLedger) {
      try {
        const id = await savingsLedger.record(base);
        return { ok: Boolean(id), ledger_id: id };
      } catch (err) {
        console.warn("[COUNCIL] ledger record failed:", err.message);
        return { ok: false, error: err.message };
      }
    }
    return { ok: false, error: "no_ledger" };
  }

  const ollamaCouncilOff = true;
  const ollamaDisabled = true;

  const _exhaustedProviders = new Set();
  _exhaustedProviders.add("ollama");

  // ==================== LCTP v3 COMPRESSION HELPERS ====================

  function advancedCompress(text) {
    try {
      const base64 = Buffer.from(text, "utf-8").toString("base64");
      const replacements = {
        "the": "†",
        "and": "§",
        "ion": "∞",
        "ing": "∫",
      };
      let compressed = base64;
      for (const [full, short] of Object.entries(replacements)) {
        compressed = compressed.replace(new RegExp(full, "g"), short);
      }
      return { compressed, method: "advanced" };
    } catch {
      const fallback = Buffer.from(text, "utf-8").toString("base64");
      return { compressed: fallback, method: "base64" };
    }
  }

  function advancedDecompress(compressed, _method = "advanced") {
    try {
      const decoded = Buffer.from(compressed, "base64").toString("utf-8");
      const replacements = {
        "†": "the",
        "§": "and",
        "∞": "ion",
        "∫": "ing",
      };
      let decompressed = decoded;
      for (const [short, full] of Object.entries(replacements)) {
        decompressed = decompressed.replace(new RegExp(short, "g"), full);
      }
      return decompressed;
    } catch {
      return compressed;
    }
  }

  function lctpEncode(text, meta = {}) {
    try {
      const advanced = advancedCompress(text);
      const header = JSON.stringify({
        v: 3,
        t: Date.now(),
        m: advanced.method,
        ...meta,
      });
      return `LCTPv3|HDR:${header}|BDY:${advanced.compressed}`;
    } catch (error) {
      console.warn(`LCTP encode error: ${error.message}`);
      return text;
    }
  }

  function lctpDecode(lctpString) {
    try {
      if (!lctpString || !lctpString.includes("|")) {
        return { text: lctpString || "", meta: {} };
      }

      const parts = lctpString.split("|");
      const headerPart = parts.find((p) => p.startsWith("HDR:"));
      const bodyPart = parts.find((p) => p.startsWith("BDY:"));

      if (!bodyPart) return { text: lctpString, meta: {} };

      const compressed = bodyPart.replace("BDY:", "");

      let meta = {};
      let method = "base64";
      if (headerPart) {
        try {
          meta = JSON.parse(headerPart.replace("HDR:", ""));
          method = meta.m || "base64";
        } catch {
          // ignore header parse errors
        }
      }

      const text =
        method === "advanced"
          ? advancedDecompress(compressed, method)
          : Buffer.from(compressed, "base64").toString("utf-8");

      return { text, meta };
    } catch (error) {
      console.warn(`LCTP decode error: ${error.message}`);
      return { text: lctpString || "", meta: {} };
    }
  }

  // Legacy simple cleaner — used only by compressPrompt/LCTP path below.
  // Renamed from optimizePrompt to stop it shadowing the real token-optimizer import.
  function _legacySimpleClean(prompt) {
    let optimized = prompt
      .replace(/\n{3,}/g, "\n\n")
      .replace(/\s{2,}/g, " ")
      .replace(/Please\s+/gi, "")
      .replace(/I would like to\s+/gi, "")
      .replace(/Can you\s+/gi, "")
      .replace(/Could you\s+/gi, "")
      .trim();

    if (optimized.length < prompt.length * 0.9) {
      if (compressionMetrics) {
        compressionMetrics.prompt_optimizations =
          (compressionMetrics.prompt_optimizations || 0) + 1;
        const saved = prompt.length - optimized.length;
        compressionMetrics.tokens_saved_total =
          (compressionMetrics.tokens_saved_total || 0) +
          Math.floor(saved / 4);
      }
    }

    return optimized;
  }

  function compressPrompt(prompt, useCompression = true) {
    const optimized = _legacySimpleClean(prompt);

    if (!useCompression || optimized.length < 100) {
      return {
        compressed: optimized,
        originalLength: prompt.length,
        compressedLength: optimized.length,
        ratio: prompt.length / optimized.length,
        optimized: true,
      };
    }

    const lctp = lctpEncode(optimized);
    const originalLength = prompt.length;
    const compressedLength = lctp.length;
    const ratio = originalLength / compressedLength;

    if (ratio > 1.1) {
      if (compressionMetrics) {
        compressionMetrics.v3_compressions =
          (compressionMetrics.v3_compressions || 0) + 1;
        compressionMetrics.total_bytes_saved =
          (compressionMetrics.total_bytes_saved || 0) +
          (originalLength - compressedLength);
        const tokensSaved = Math.floor(
          (originalLength - compressedLength) / 4
        );
        compressionMetrics.tokens_saved_total =
          (compressionMetrics.tokens_saved_total || 0) + tokensSaved;
      }
      return {
        compressed: lctp,
        originalLength,
        compressedLength,
        ratio,
        format: "LCTPv3",
        optimized: true,
      };
    }

    return {
      compressed: optimized,
      originalLength,
      compressedLength: optimized.length,
      ratio: prompt.length / optimized.length,
      optimized: true,
    };
  }

  function decompressResponse(response, isCompressed = false) {
    if (!isCompressed || !response.includes("LCTPv3")) {
      return response;
    }
    const decoded = lctpDecode(response);
    return decoded.text;
  }

  // ==================== MICRO PROTOCOL HELPERS ====================

  function decodeMicroBody(body = {}) {
    const packet = body.micro || body;

    if (
      !packet ||
      typeof packet !== "object" ||
      (!packet.t && !packet.message && !packet.text)
    ) {
      const legacyText = body.message || body.text || "";
      return {
        text: String(legacyText || "").trim(),
        channel: "chat",
        meta: {},
        packet: null,
      };
    }

    const text = String(
      packet.t || packet.text || packet.message || ""
    ).trim();
    const channel = packet.c || "chat";
    const meta = packet.m || {};

    if (packet.lctp) {
      const decoded = lctpDecode(packet.lctp);
      return {
        text: decoded.text || text,
        channel,
        meta: { ...meta, ...decoded.meta },
        packet,
      };
    }

    return { text, channel, meta, packet };
  }

  function buildMicroResponse({
    text,
    channel = "chat",
    role = "a",
    meta = {},
    compress = false,
  }) {
    let responseText = text;
    let lctp = null;

    if (compress && text.length > 100) {
      const compressed = compressPrompt(text, true);
      if (compressed.format === "LCTPv3") {
        lctp = compressed.compressed;
        responseText = text;
      }
    }

    const packet = {
      v: "mp1",
      r: role,
      c: channel,
      t: responseText,
      lctp,
      m: { ...meta, compressed: !!lctp },
      ts: Date.now(),
    };

    return { micro: packet };
  }

  // ==================== PROVIDER HELPERS ====================

  function getApiKeyForProvider(provider) {
    switch (provider) {
      case "anthropic":
        return (
          process.env.LIFEOS_ANTHROPIC_KEY?.trim() ||
          process.env.ANTHROPIC_API_KEY?.trim()
        );
      case "gemini":
      case "google":
        return (
          process.env.LIFEOS_GEMINI_KEY?.trim() ||
          process.env.GEMINI_API_KEY?.trim() ||
          process.env.GOOGLE_API_KEY?.trim() ||
          process.env.GOOGLE_AI_KEY?.trim()
        );
      case "groq":
        return process.env.GROQ_API_KEY?.trim();
      case "mistral":
        return process.env.MISTRAL_API_KEY?.trim();
      case "openrouter":
        return process.env.OPENROUTER_API_KEY?.trim();
      case "together":
        return process.env.TOGETHER_API_KEY?.trim();
      case "cerebras":
        return process.env.CEREBRAS_API_KEY?.trim();
      case "deepseek":
        return (
          process.env.DEEPSEEK_API_KEY?.trim() ||
          process.env.Deepseek_API_KEY?.trim()
        );
      case "openai":
        return process.env.OPENAI_API_KEY?.trim();
      case "github_models":
        return process.env.GITHUB_TOKEN?.trim();
      case "fireworks":
        return process.env.FIREWORKS_API_KEY?.trim();
      default:
        return null;
    }
  }

  function getProviderPingConfig(provider, apiKey) {
    switch (provider) {
      case "openai":
        return {
          url: "https://api.openai.com/v1/models",
          headers: { Authorization: `Bearer ${apiKey}` },
        };
      case "gemini":
      case "google":
        return {
          url: `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
          headers: {},
        };
      case "deepseek":
        return {
          url: "https://api.deepseek.com/v1/models",
          headers: { Authorization: `Bearer ${apiKey}` },
        };
      case "xai":
        return {
          url: "https://api.x.ai/v1/models",
          headers: { Authorization: `Bearer ${apiKey}` },
        };
      case "groq":
        return {
          url: "https://api.groq.com/openai/v1/models",
          headers: { Authorization: `Bearer ${apiKey}` },
        };
      case "cerebras":
        return {
          url: "https://api.cerebras.ai/v1/models",
          headers: { Authorization: `Bearer ${apiKey}` },
        };
      case "openrouter":
        return {
          url: "https://openrouter.ai/api/v1/models",
          headers: { Authorization: `Bearer ${apiKey}` },
        };
      case "mistral":
        return {
          url: "https://api.mistral.ai/v1/models",
          headers: { Authorization: `Bearer ${apiKey}` },
        };
      case "together":
        return {
          url: "https://api.together.xyz/v1/models",
          headers: { Authorization: `Bearer ${apiKey}` },
        };
      default:
        return null;
    }
  }

  function isBuilderLaneRequest(member, options = {}) {
    const sourceRoute = String(options?.source_route || "");
    const taskType = String(options?.taskType || "");
    const productLane = String(options?.product_lane || "");
    return (
      options?.builderExecution === true ||
      sourceRoute.startsWith("/api/v1/lifeos/builder") ||
      sourceRoute.startsWith("/api/v1/lifeos/direct-action") ||
      taskType.startsWith("builder") ||
      productLane === "builderos" ||
      String(member || "").startsWith("openai_builder_")
    );
  }

  function getBuilderLaneSpendCap() {
    const raw = process.env.BUILDEROS_MAX_DAILY_SPEND;
    if (raw == null || String(raw).trim() === "") return null;
    const value = Number.parseFloat(String(raw));
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  async function pingCouncilMember(memberKey) {
    const targetMember = resolveCouncilMember(memberKey);
    const memberConfig = COUNCIL_MEMBERS[targetMember];
    if (!memberConfig) {
      return { ok: false, error: "unknown_member" };
    }

    if (memberConfig.provider === "ollama") {
      const endpoint = memberConfig.endpoint || "http://localhost:11434";
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        COUNCIL_PING_TIMEOUT_MS
      );
      try {
        const response = await fetch(`${endpoint}/api/tags`, {
          method: "GET",
          signal: controller.signal,
        });
        return {
          ok: response.ok,
          provider: memberConfig.provider,
          endpoint,
          statusCode: response.status,
        };
      } catch (error) {
        return {
          ok: false,
          error: error.message,
          provider: memberConfig.provider,
          endpoint,
        };
      } finally {
        clearTimeout(timeoutId);
      }
    }

    const apiKey = getApiKeyForProvider(memberConfig.provider);
    if (!apiKey) {
      return {
        ok: false,
        error: "api_key_missing",
        provider: memberConfig.provider,
      };
    }

    const pingConfig = getProviderPingConfig(memberConfig.provider, apiKey);
    if (!pingConfig) {
      return {
        ok: false,
        error: "ping_not_supported",
        provider: memberConfig.provider,
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      COUNCIL_PING_TIMEOUT_MS
    );
    try {
      const response = await fetch(pingConfig.url, {
        method: "GET",
        headers: pingConfig.headers,
        signal: controller.signal,
      });
      return {
        ok: response.ok,
        provider: memberConfig.provider,
        statusCode: response.status,
      };
    } catch (error) {
      return {
        ok: false,
        error: error.message,
        provider: memberConfig.provider,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ==================== SPEND & ROI HELPERS ====================

  function calculateCost(usage, model = "gpt-4o-mini", memberKey = null) {
    const promptTokens =
      usage?.prompt_tokens || usage?.input_tokens || usage?.total_tokens || 0;
    const completionTokens = usage?.completion_tokens || usage?.output_tokens || 0;

    const cfg = memberKey && COUNCIL_MEMBERS[memberKey];
    if (cfg && cfg.costPer1M > 0) {
      const inputCostPer1M = cfg.costPer1M;
      const outputCostPer1M = cfg.costPer1M * 4;
      return (
        (promptTokens * inputCostPer1M) / 1_000_000 +
        (completionTokens * outputCostPer1M) / 1_000_000
      );
    }

    const prices = {
      "claude-3-5-sonnet-latest": { input: 0.003, output: 0.015 },
      "claude-sonnet-4-6": { input: 0.003, output: 0.015 },
      "claude-sonnet-4-20250514": { input: 0.003, output: 0.015 },
      "gpt-4o": { input: 0.0025, output: 0.01 },
      "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
      "gemini-2.5-flash": { input: 0.0001, output: 0.0004 },
      "deepseek-coder": { input: 0.0001, output: 0.0003 },
      "deepseek-v4-flash": { input: 0.0001, output: 0.0003 },
      "deepseek-chat": { input: 0.0001, output: 0.0003 },
      "grok-2-1212": { input: 0.005, output: 0.015 },
    };
    const price = prices[model] || prices["gpt-4o-mini"];

    return (
      (promptTokens * price.input) / 1000 +
      (completionTokens * price.output) / 1000
    );
  }

  async function getDailySpend(date = dayjs().format("YYYY-MM-DD")) {
    try {
      const result = await pool.query(
        `SELECT usd FROM daily_spend WHERE date = $1`,
        [date]
      );
      return result.rows.length > 0 ? parseFloat(result.rows[0].usd) : 0;
    } catch {
      return 0;
    }
  }

  async function updateDailySpend(amount, date = dayjs().format("YYYY-MM-DD")) {
    try {
      const current = await getDailySpend(date);
      const newSpend = current + amount;
      await pool.query(
        `INSERT INTO daily_spend (date, usd, updated_at) VALUES ($1, $2, now())
         ON CONFLICT (date) DO UPDATE SET usd = $2, updated_at = now()`,
        [date, newSpend]
      );
      return newSpend;
    } catch {
      return 0;
    }
  }

  // ==================== COUNCIL CORE HELPERS ====================

  function resolveCouncilMember(member) {
    return COUNCIL_ALIAS_MAP[member] || member;
  }

  function getApiKey(provider) {
    return getApiKeyForProvider(provider);
  }

  // Delegate to response-cache.js — L1 in-memory + L2 Neon DB, with
  // semantic (Jaccard) fuzzy matching and post-deploy L1 warm-up.
  async function getCachedResponse(prompt, member) {
    return _rcGet(prompt, member, compressionMetrics);
  }

  async function cacheResponse(prompt, member, responseText, taskType) {
    return _rcSet(prompt, member, responseText, taskType || '');
  }

  function getChatCompletionUrl(provider) {
    switch (provider) {
      case "openai":
        return "https://api.openai.com/v1/chat/completions";
      case "groq":
        return "https://api.groq.com/openai/v1/chat/completions";
      case "cerebras":
        return "https://api.cerebras.ai/v1/chat/completions";
      case "openrouter":
        return "https://openrouter.ai/api/v1/chat/completions";
      case "mistral":
        return "https://api.mistral.ai/v1/chat/completions";
      case "together":
        return "https://api.together.xyz/v1/chat/completions";
      case "github_models":
        return "https://models.inference.ai.azure.com/chat/completions";
      case "fireworks":
        return "https://api.fireworks.ai/inference/v1/chat/completions";
      default:
        return null;
    }
  }

  function buildOpenAICompatibleHeaders(provider, apiKey, noCacheHeaders) {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...noCacheHeaders,
    };

    if (provider === "openrouter") {
      headers["HTTP-Referer"] =
        process.env.RAILWAY_PUBLIC_DOMAIN ||
        process.env.PUBLIC_BASE_URL ||
        "http://localhost:8080";
      headers["X-Title"] = "LifeOS Command Center";
    }

    return headers;
  }

  function buildGeminiContents(systemPrompt, finalPrompt, deltaMessages) {
    const contents = [];

    for (const msg of deltaMessages || [{ role: "user", content: finalPrompt }]) {
      if (!msg?.content || msg.role === "system") continue;
      contents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      });
    }

    if (contents.length === 0) {
      contents.push({ role: "user", parts: [{ text: finalPrompt }] });
    }

    return {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
    };
  }

  function recordSessionTurns(sessionId, userText, assistantText) {
    if (!sessionId || !assistantText) return;
    addTurn(sessionId, { role: "user", content: userText });
    addTurn(sessionId, { role: "assistant", content: assistantText });
  }

  function deriveDeltaSessionId({ options = {}, member, taskType, prompt, isCritical }) {
    if (options.sessionId) return options.sessionId;

    const explicitScopedKey = options.conversationId
      || options.chatId
      || options.sessionKey
      || options.contextKey
      || options.workflowId;
    if (explicitScopedKey) {
      return `ctx:${explicitScopedKey}`;
    }

    if (isCritical || options.autoSession === false) {
      return null;
    }

    // Conservative auto-sessioning:
    // scope by normalized prompt signature so unrelated requests no longer share
    // one member/task bucket. This keeps delta useful for repeated workflow prompts
    // without causing broad cross-request drift.
    const signature = hashCachePrompt(String(prompt || "")).slice(0, 10);
    return `auto:${member}:${taskType}:${signature}`;
  }

  function buildRecordedCompressionLayers(baseLayers, outputTokens = 0, savedOutputPct = 0) {
    if (!baseLayers || Object.keys(baseLayers).length === 0) return null;
    const layers = JSON.parse(JSON.stringify(baseLayers));
    if (layers.chain_of_draft && savedOutputPct > 0 && outputTokens > 0) {
      layers.chain_of_draft.savedTokens = Math.round(outputTokens * (savedOutputPct / 100));
    }
    return layers;
  }

  // _exhaustedProviders declared at factory top (line ~74) — pre-seeded by startup ping

  function selectOptimalModel(prompt, complexity) {
    const length = prompt.length;
    const isComplex =
      length > 2000 ||
      complexity === "complex" ||
      complexity === "critical";

    // Only consider tier0 models that are actually reachable right now:
    //  - exclude providers already rate-limited this session (_exhaustedProviders)
    const candidates = Object.entries(COUNCIL_MEMBERS).filter(
      ([, cfg]) => {
        if (!cfg || cfg.tier !== "tier0") return false;
        if (_exhaustedProviders.has(cfg.provider)) return false;
        return true;
      }
    );

    if (candidates.length === 0) return null; // all free-tier exhausted — skip optimization

    if (isComplex) {
      const reasoningModel = candidates.find(
        ([, cfg]) => cfg.specialties && cfg.specialties.includes("reasoning")
      );
      if (reasoningModel) {
        return { member: reasoningModel[0], reason: "complex reasoning task" };
      }
    }

    const codeModel = candidates.find(
      ([, cfg]) => cfg.specialties && cfg.specialties.includes("code")
    );
    if (codeModel) {
      return { member: codeModel[0], reason: "code-focused task" };
    }

    return { member: candidates[0][0], reason: "default tier0 model" };
  }

  function modelMatchesProvider(modelId, provider) {
    const m = String(modelId || '').toLowerCase();
    const p = String(provider || '').toLowerCase();
    if (!m || !p) return true;
    if (p === 'anthropic') return m.includes('claude');
    if (p === 'deepseek') return m.includes('deepseek');
    if (p === 'openai') return m.includes('gpt') || /^o[0-9]/.test(m);
    if (p === 'gemini') return m.includes('gemini');
    if (p === 'groq') return m.includes('llama') || m.includes('mixtral') || m.includes('groq');
    if (p === 'cerebras') return m.includes('llama') || m.includes('cerebras');
    return true;
  }

  function applyModelOverride(config, member, options) {
    if (!options?.model) return config;
    if (modelMatchesProvider(options.model, config.provider)) {
      return { ...config, model: options.model };
    }
    console.warn(
      `⚠️ [COUNCIL] Dropping model override ${options.model} — incompatible with ${config.provider} (${member})`,
    );
    return config;
  }

  // Called by the 429 handler so selectOptimalModel stops picking exhausted providers
  function _markProviderExhausted(providerKey) {
    _exhaustedProviders.add(providerKey);
    // Auto-clear at midnight UTC so tomorrow's limit is fresh
    const msUntilMidnight = new Date().setUTCHours(24, 0, 0, 0) - Date.now();
    setTimeout(() => _exhaustedProviders.delete(providerKey), msUntilMidnight);
  }

  // Provider-diverse failover for any provider-level failure (credit dry, auth,
  // 5xx, timeout, DNS). Never lets one dead provider account silence the chair,
  // codegen, or autonomous loop (SO-003).
  function getProviderFailoverMembers(failedMember, triedMembers = new Set()) {
    const raw = process.env.COUNCIL_FAILOVER_CASCADE
      || process.env.CHAIR_DIRECT_AGENT_CASCADE
      || 'openai_gpt,deepseek,gemini_flash,claude_sonnet';
    const candidates = raw.split(',').map((s) => s.trim()).filter(Boolean);
    const members = [];
    for (const m of candidates) {
      const resolved = resolveCouncilMember(m);
      if (resolved === failedMember) continue;
      if (triedMembers.has(resolved)) continue;
      const cfg = COUNCIL_MEMBERS[resolved];
      if (!cfg) continue;
      if (!getApiKeyForProvider(cfg.provider)) continue;
      members.push(resolved);
    }
    return members;
  }

  async function callCouncilMember(member, prompt, options = {}) {
    const callStartedAt = Date.now();
    const meterTiming = () => ({
      startedAt: new Date(callStartedAt).toISOString(),
      durationMs: Date.now() - callStartedAt,
      requestId: options.requestId || options.task_id || options.sessionId || null,
    });
    const requestedMember = member;
    const resolvedMember = resolveCouncilMember(member);
    if (resolvedMember !== requestedMember) {
      console.log(`🔁 [ALIAS] ${requestedMember} → ${resolvedMember}`);
    }
    member = resolvedMember;

    // Track every member attempted in this call chain to avoid infinite recursion.
    const triedMembers = options._triedMembers || new Set();
    triedMembers.add(member);

    const founderComms = options.founderComms === true || options.taskType === 'voice_rail_department';
    const builderLane = isBuilderLaneRequest(member, options);
    const builderLaneSpendCap = builderLane ? getBuilderLaneSpendCap() : null;

    function finalizeResponse(rawText, taskTypeForEnvelope = options.taskType || 'general', usage = null, cost = 0) {
      const { text, envelope } = envelopeCouncilMemberOutput(rawText, options, taskTypeForEnvelope, member);
      if (envelope.theater_blocked || envelope.voice_lie_blocked) {
        console.warn(`🛡️ [TRUTH-ENVELOPE] blocked deception (${envelope.hits.slice(0, 2).join('; ')}) member=${member} task=${taskTypeForEnvelope}`);
      }
      if (options.returnObject) {
        const promptTokens = usage?.prompt_tokens ?? usage?.input_tokens ?? 0;
        const completionTokens = usage?.completion_tokens ?? usage?.output_tokens ?? 0;
        return {
          content: text,
          text,
          member,
          model: config?.model,
          provider: config?.provider,
          taskType: taskTypeForEnvelope,
          usage: {
            prompt_tokens: promptTokens,
            completion_tokens: completionTokens,
            total_tokens: usage?.total_tokens || (promptTokens + completionTokens),
            estimated_usd: cost,
          },
          estimated_usd: cost,
        };
      }
      return text;
    }
    // config is declared later, after selectOptimalModel may rewrite member
    if (!COUNCIL_MEMBERS[member]) {
      throw new Error(`Unknown member: ${member}`);
    }

    const today = dayjs().format("YYYY-MM-DD");
    const spend = await getDailySpend(today);

    const isPaid =
      !COUNCIL_MEMBERS[member]?.isFree &&
      (COUNCIL_MEMBERS[member]?.costPer1M > 0 || COUNCIL_MEMBERS[member]?.tier === "tier1");

    // ── Free-tier cascade (Groq → Gemini → Cerebras → OpenRouter → Mistral → Fireworks) ──
    // Founder Voice Rail comms always use configured paid council member (no silent downgrade).
    if (!founderComms && !builderLane && MAX_DAILY_SPEND === 0 && isPaid) {
      const nextProvider = await freeTierGovernor.getNextAvailable();
      if (!nextProvider) {
        throw new Error(
          `💰 [COST SHUTDOWN] Blocked ${member} — no free providers available.`
        );
      }
      const fallbackMembers = freeTierGovernor.PROVIDER_LIMITS[nextProvider]?.councilMembers || ['cerebras_llama'];
      for (const fallbackMember of fallbackMembers) {
        if (COUNCIL_MEMBERS[fallbackMember]) {
          console.log(`💰 [COST SHUTDOWN] Blocked ${member} → cascading to ${fallbackMember} (${nextProvider})`);
          return await callCouncilMember(fallbackMember, prompt, options);
        }
      }
      throw new Error(`💰 [COST SHUTDOWN] Blocked ${member} — no free providers available right now.`);
    }

    const effectiveShutdownThreshold = COST_SHUTDOWN_THRESHOLD > 0 ? COST_SHUTDOWN_THRESHOLD : MAX_DAILY_SPEND;
    if (!founderComms && !builderLane && spend >= effectiveShutdownThreshold && isPaid) {
      const nextProvider = await freeTierGovernor.getNextAvailable();
      if (!nextProvider) {
        throw new Error(
          `💰 [SPEND LIMIT] $${spend.toFixed(2)}/$${effectiveShutdownThreshold} — no free providers available.`
        );
      }
      const fallbackMembers = freeTierGovernor.PROVIDER_LIMITS[nextProvider]?.councilMembers || ['cerebras_llama'];
      for (const fallbackMember of fallbackMembers) {
        if (COUNCIL_MEMBERS[fallbackMember]) {
          console.log(`💰 [SPEND LIMIT] $${spend.toFixed(2)}/$${effectiveShutdownThreshold} → cascading to ${fallbackMember} (${nextProvider})`);
          return await callCouncilMember(fallbackMember, prompt, options);
        }
      }
      throw new Error(`💰 [SPEND LIMIT] $${spend.toFixed(2)}/$${effectiveShutdownThreshold} — no free providers available.`);
    }

    const effectiveSpendCap = builderLane ? (builderLaneSpendCap ?? MAX_DAILY_SPEND) : MAX_DAILY_SPEND;
    if (Number.isFinite(effectiveSpendCap) && effectiveSpendCap > 0 && spend > effectiveSpendCap * 0.1) {
      console.log(
        `💰 [SPEND CHECK] Today (${today}): $${spend.toFixed(
          4
        )} / $${effectiveSpendCap}${builderLane ? ' [builder lane]' : ''}`
      );
    }

    const isFreeModel = COUNCIL_MEMBERS[member]?.isFree === true;

    if (!isFreeModel && Number.isFinite(effectiveSpendCap) && effectiveSpendCap > 0 && spend >= effectiveSpendCap) {
      throw new Error(
        builderLane
          ? `BuilderOS spend limit ($${effectiveSpendCap}) reached at $${spend.toFixed(
              4
            )} for ${today}. Raise BUILDEROS_MAX_DAILY_SPEND or lower builder activity.`
          : `Daily spend limit ($${effectiveSpendCap}) reached at $${spend.toFixed(
              4
            )} for ${today}. Resets at midnight UTC.`
      );
    }

    if (tokenAccounting) {
      const gate = await tokenAccounting.checkBudgetGate();
      if (!gate.allowed && tokenAccounting.strict) {
        throw new Error(
          `Token Accounting hard limit: ${gate.reason} (spend=$${gate.spend.toFixed(4)})`
        );
      }
      if (gate.warning) {
        console.warn(`⚠️ [TOKEN-ACCT] ${gate.warning} — spend=$${gate.spend.toFixed(4)}`);
      }
    }

    // SOT context is now injected into the system prompt via buildSystemContext().
    // Removed: duplicate SOT injection into user prompt that caused double-billing.

    if (!options.useOpenSourceCouncil && !founderComms && !builderLane) {
      const optimalModel = selectOptimalModel(prompt, options.complexity);
      if (optimalModel && options.allowModelDowngrade === true) {
        const optimalConfig = COUNCIL_MEMBERS[optimalModel.member];
        if (optimalConfig) {
          const optimalKey = getApiKeyForProvider(optimalConfig.provider);
          if (optimalKey) {
            member = optimalModel.member;
            console.log(
              `💰 [MODEL OPTIMIZATION] Using ${member} instead (${optimalModel.reason})`
            );
          } else {
            console.log(
              `⚠️  [MODEL OPTIMIZATION] Skipped ${optimalModel.member} - API key not available`
            );
          }
        }
      }
    }

    // Recompute config after selectOptimalModel may have rewritten member
    let config = COUNCIL_MEMBERS[member];
    if (!config) throw new Error(`Unknown member after routing: ${member}`);
    config = applyModelOverride(config, member, options);

    // ── Auto-detect taskType from prompt content if not provided ─────────────
    // Enables Layers 2-4 for far more calls without callers needing to set options.
    let taskType = options.taskType || '';
    if (!taskType) {
      const pl = prompt.toLowerCase();
      if (/\bgenerate code\b|write a (function|class|route|service|component|script)|\bimplement\b/.test(pl)) taskType = 'codegen';
      else if (/\banalyze\b|\breview\b|\baudit\b|\bevaluate\b/.test(pl)) taskType = 'analysis';
      else if (/\bclassify\b|\broute\b|\bis this\b|\bdetect\b|\bvalidate\b/.test(pl)) taskType = 'routing';
      else if (/\bsummarize\b|\bsummary\b|\btldr\b/.test(pl)) taskType = 'analysis';
      else if (/\bplan\b|\bstrategy\b|\bproposal\b|\bdesign\b/.test(pl)) taskType = 'planning';
      else taskType = 'general';
    }
    // Code generation must be byte-exact: the lossy compression layers (markdown
    // strip, phrase-sub, LCL codebook, IR) mangle injected/echoed source — e.g.
    // `24 * 60 * 60` parsed as markdown emphasis and stripped to `24 60 60`,
    // which breaks node --check and surgical edit-patch anchors. Treat any code
    // task as critical so those layers are skipped and source passes through raw.
    const isCritical = options.critical === true || taskType === 'code' || taskType === 'codegen';

    kingsmanAudit({ pool, member, taskType, prompt }).catch(() => {});

    // ── Rules engine pre-flight — deterministic no-AI answers + lightweight routing ──
    // Voice Rail / founder comms / builder lane: never reroute member or force model mismatch.
    // Builder lane callers set allowModelDowngrade=false and specific taskType explicitly;
    // rules engine pattern matching (e.g. /\bjson\b/) would override those to free-tier models.
    const ruleDecision = (founderComms || builderLane)
      ? {
          matched: false,
          action: 'continue',
          receipt: {
            engine: 'rules-engine-v1',
            ruleId: founderComms ? 'skip.founder_comms' : 'skip.builder_lane',
            category: 'routing',
            confidence: 0,
            reason: founderComms ? 'founder comms bypass' : 'builder lane bypass — caller controls model/taskType',
          },
        }
      : rulesEngine.evaluate({
          prompt,
          requestedMember,
          member,
          taskType,
          options,
        });

    if (ruleDecision.action === "respond" && ruleDecision.responseText) {
      const text = ruleDecision.responseText;
      const estimatedBaseline = ruleDecision.receipt?.estimatedSavedTokens
        || (estimateTokens(prompt) + estimateTokens(text));
      console.log(`🧠 [RULES] ${ruleDecision.receipt?.ruleId || "direct"} → answered without AI`);

      tokenOptimizer.trackUsage({
        provider: "logic",
        model: "rules-engine-v1",
        taskType,
        inputTokens: 0,
        outputTokens: 0,
        savedTokens: estimatedBaseline,
        cacheHit: false,
        costUSD: 0,
        savedCostUSD: estimatedBaseline * 0.000003,
      }).catch(() => {});

      recordMetered({
          ...meterTiming(),
          provider: "logic",
          model: "rules-engine-v1",
          taskType,
          originalTokens: estimatedBaseline,
          compressedTokens: 0,
          outputTokens: 0,
          savedTokens: estimatedBaseline,
          costUSD: 0,
          cacheHit: false,
          compressionLayers: {
            rules_engine: {
              savedTokens: estimatedBaseline,
              ruleId: ruleDecision.receipt?.ruleId || "direct",
              category: ruleDecision.receipt?.category || "direct",
              confidence: ruleDecision.receipt?.confidence || 1,
            },
          },
          qualityMethod: "rules-engine",
        }).catch(() => {});

      return finalizeResponse(text, taskType, { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, estimated_usd: 0 }, 0);
    }

    if (ruleDecision.action === "override") {
      if (ruleDecision.member && COUNCIL_MEMBERS[ruleDecision.member]) {
        member = ruleDecision.member;
      }
      if (ruleDecision.taskType) {
        taskType = ruleDecision.taskType;
      }
      if (ruleDecision.optionsPatch) {
        options = { ...options, ...ruleDecision.optionsPatch };
      }
      config = COUNCIL_MEMBERS[member];
      config = applyModelOverride(config, member, options);
      console.log(`🧠 [RULES] ${ruleDecision.receipt?.ruleId || "override"} → ${member}/${taskType}`);
    }

    // Cache lookup happens AFTER member rewrite so the resolved member/model is the key
    if (options.useCache !== false) {
      const cached = await getCachedResponse(prompt, member, compressionMetrics);
      if (cached) {
        console.log(`💰 [CACHE HIT] Saved API call for ${member}`);
        const estimatedTokens = Math.ceil(prompt.length / 4);
        tokenOptimizer.trackUsage({
          provider: COUNCIL_MEMBERS[member]?.provider || member,
          model: COUNCIL_MEMBERS[member]?.model || member,
          taskType,
          inputTokens: 0,
          outputTokens: 0,
          savedTokens: estimatedTokens,
          cacheHit: true,
          costUSD: 0,
          savedCostUSD: estimatedTokens * 0.000003,
        }).catch(() => {});
        recordMetered({
            ...meterTiming(),
            provider: COUNCIL_MEMBERS[member]?.provider || member,
            model: COUNCIL_MEMBERS[member]?.model || member,
            taskType,
            originalTokens: estimatedTokens,
            compressedTokens: 0,
            outputTokens: 0,
            savedTokens: estimatedTokens,
            cacheHit: true,
            costUSD: 0,
          }).catch(() => {});
        return finalizeResponse(cached, taskType, { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, estimated_usd: 0 }, 0);
      }
    }

    const apiKey = getApiKey(config.provider);

    if (config.provider === "ollama") {
      throw new Error("ollama retired by founder directive");
    } else if (!apiKey) {
      if (config.provider === "openai") {
        throw new Error(`${member.toUpperCase()}_API_KEY not set`);
      } else {
        console.log(
          `⚠️ ${member} API key not found, skipping...`
        );
        throw new Error(`${member} unavailable (no API key)`);
      }
    }

    // ── Gate knowledge context injection — only for calls that need it ────────
    // Knowledge context now goes into system prompt (cached by providers),
    // not prepended to user turn. Saves 800-1,350 tokens per eligible call.
    const needsKnowledgeContext = !isCritical
      && !['routing', 'codegen', 'validation'].includes(taskType)
      && options.skipKnowledge !== true;
    const knowledgeSection = needsKnowledgeContext
      ? await buildSystemContext(prompt, { taskType, maxIdeas: 2 })
      : '';

    // User prompt stays clean — only the actual request.
    const enhancedPrompt = prompt;

    // ── Compact system prompt — knowledge context baked in for cacheability ───
    // Voice Rail / ChC and other callers may supply a full system persona (overrides builder label).
    const systemPromptBase = options.systemPromptOverride || `You are ${config.name} (${config.role}) in LifeOS AI Council on Railway.
Specialties: ${config.specialties.join(', ')}.${options.checkBlindSpots ? ' Check blind spots.' : ''}${options.guessUserPreference ? ' Use user preferences.' : ''}${options.webSearch ? '\nWEB SEARCH: Include links, code, actionable solutions.' : ''}
Core framing: never moralize or judge. The only question is "does this work for the user, or does it not?" Frame everything in terms of outcomes and fit — never "right/wrong", never "should/shouldn't". The user is the authority on their own life.
Be concise.${knowledgeSection ? `\n\n${knowledgeSection}` : ''}`;

    // ── Token optimization — 5-layer compression stack ───────────────────────
    // Layer 1: noise strip + phrase substitution (token-optimizer)
    // Layer 2: TOON — compact JSON blocks in prompt
    // Layer 3: Prompt IR compiler — T:/C:/I:/O:/R:/V: structure
    // Layer 4: Chain of Draft — shorthand reasoning instruction
    // Layer 5: savings ledger — record every call's before/after
    // CPU cost: all layers combined ~0.5ms (pure string ops, no AI calls)
    const compressionLayers = {};
    if (ruleDecision.action === "override") {
      compressionLayers.rules_engine = {
        applied: true,
        ruleId: ruleDecision.receipt?.ruleId || "override",
        category: ruleDecision.receipt?.category || "routing",
        confidence: ruleDecision.receipt?.confidence || 0.9,
      };
    }

    // Layer 1 — noise strip + phrase sub (or code-safe whitespace strip for code/codegen)
    // Code/codegen prompts carry large file-context blocks and edit anchors. We can
    // compress the surrounding instructions aggressively while protecting fenced code
    // and old_string/new_string edit-anchor blocks, so the build still passes node --check
    // and byte-exact patches stay exact.
    const useCodeSafe = isCritical && (taskType === 'codegen' || taskType === 'code');
    let optimized;
    if (useCodeSafe) {
      optimized = compressCodeSafe(enhancedPrompt);
      if (optimized.savedTokens > 0) {
        compressionLayers.code_safe = { savedTokens: optimized.savedTokens, savedPct: optimized.savingsPct };
      }
    } else {
      optimized = optimizePrompt(enhancedPrompt, {
        stripMd: !isCritical,
        phraseSub: !isCritical,
        critical: isCritical,
      });
      if (optimized.savedTokens > 0) {
        compressionLayers.noise_phrase = { savedTokens: optimized.savedTokens, savedPct: optimized.savingsPct };
      }
    }
    let finalPrompt = optimized.text;

    // Layer 1.5 — LCL codebook symbol compression (instruction aliases + code patterns)
    // Replaces LifeOS-specific long strings with short symbols, then prepends a tiny
    // inline key listing only the symbols that actually fired in this prompt.
    // Works with all free stateless providers — no KV cache required.
    // Example savings: "CREATE TABLE IF NOT EXISTS" (6 tokens) → "*ct" (1 token).
    // The drift monitor gates this layer — auto-skips if drift was detected for this pair.
    let lclWasActive = false;
    let lclSymbolsFired = [];   // raw symbol strings e.g. ['*pq', '*uid'] — used by drift monitor
    if (!isCritical && !lclMonitor.shouldSkipLCL(member, taskType)) {
      const lclResult = promptTranslator.translate(finalPrompt, {
        taskType,
        stripMd: false,
        critical: false,
        domain: options.lclDomain || undefined,
      });
      if (lclResult.savedTokens > 0) {
        // Identify the exact symbols that appear in the compressed text
        const firedEntries = CODE_SYMBOLS.filter(([, sym]) => lclResult.prompt.includes(sym));
        lclSymbolsFired = firedEntries.map(([, sym]) => sym);  // e.g. ['*pq', '*uid']
        const keyLine = firedEntries.map(([full, sym]) => `${sym}=${full}`).join(', ');
        finalPrompt = keyLine
          ? `[KEY:${keyLine}]\n${lclResult.prompt}`
          : lclResult.prompt;
        lclWasActive = true;
        compressionLayers.lcl_codebook = {
          savedTokens: lclResult.savedTokens,
          savedPct: lclResult.savingsPct,
          symbolsFired: lclSymbolsFired,
          codebookVersion: lclResult.codebookVersion,
        };
      }
    } else if (!isCritical && lclMonitor.shouldSkipLCL(member, taskType)) {
      console.log(`🛑 [LCL-MONITOR] Skipping LCL for ${member}:${taskType} — drift rollback active`);
    }

    // Layer 2 — TOON: compact any JSON blocks in the prompt
    let toonSavedTokens = 0;
    if (!isCritical) {
      const toonResult = compressJSONInPrompt(finalPrompt);
      if (toonResult.replacements > 0) {
        finalPrompt = toonResult.text;
        toonSavedTokens = Math.ceil(toonResult.savedChars / 4);
        compressionLayers.toon = { savedTokens: toonSavedTokens, savedPct: toonResult.savedPct };
      }
    }

    // Layer 3 + 4 — IR compiler + Chain of Draft
    // IR restructuring skipped for codegen (breaks code prompts), but CoD applies to all.
    let irSavedTokens = 0;
    let codSavedOutputPct = 0;
    if (!isCritical) {
      const isCode = taskType === 'codegen' || taskType === 'code';
      const irResult = irCompressPrompt(finalPrompt, isCode ? 'general' : taskType);
      finalPrompt = irResult.text;
      if (irResult.savedTokens > 0 && !isCode) {
        irSavedTokens = irResult.savedTokens;
        compressionLayers.prompt_ir = { savedTokens: irResult.savedTokens, savedPct: irResult.savingsPct };
      }
      if (irResult.layers?.chain_of_draft) {
        codSavedOutputPct = 92; // published benchmark: arXiv 2502.18600
        compressionLayers.chain_of_draft = { applied: true, savedOutputPct: codSavedOutputPct };
      }
    }

    // Layer 5b — Output constraint for routing/classification (≤5 words)
    if (!isCritical && (taskType === 'routing' || taskType === 'classification')) {
      if (!finalPrompt.includes('≤5 words')) {
        finalPrompt += '\nAnswer in ≤5 words.';
      }
    }

    // System prompt — layer 1 only (always safe)
    const optimizedSystemPrompt = optimizePrompt(systemPromptBase, {
      stripMd: true,
      phraseSub: true,
      critical: false,
    });

    const useCompression = false; // legacy LCTP disabled — replaced by layer stack above
    const systemPrompt = optimizedSystemPrompt.text;

    // TCO-A04: Delta context — prefer explicit conversation/workflow keys.
    // Auto-session fallback is now scoped by normalized prompt signature to
    // avoid unrelated traffic sharing one member/task bucket.
    let deltaMessages = null;
    let deltaContextSaved = 0;
    const effectiveSessionId = deriveDeltaSessionId({
      options,
      member,
      taskType,
      prompt,
      isCritical,
    });
    if (effectiveSessionId) {
      startSession(effectiveSessionId, systemPrompt);
      const delta = getDelta(effectiveSessionId, finalPrompt);
      deltaMessages = delta.messages;
      deltaContextSaved = delta.savedChars;
      if (delta.savedPct > 0) {
        compressionLayers.delta_context = { savedChars: delta.savedChars, savedPct: delta.savedPct };
      }
      // User + assistant turns recorded after the response via recordSessionTurns.
    }

    const deltaSavedTokens = Math.ceil(deltaContextSaved / 4);
    const lclSavedTokens = compressionLayers.lcl_codebook?.savedTokens || 0;

    // Accumulate savings from ALL layers (input tokens only; output handled separately)
    const totalSavedInputTokens = optimized.savedTokens
      + (optimizedSystemPrompt.savedTokens || 0)
      + toonSavedTokens
      + irSavedTokens
      + deltaSavedTokens
      + lclSavedTokens;

    if (totalSavedInputTokens > 0 || Object.keys(compressionLayers).length > 0) {
      console.log(`🗜️  [TOKEN-OPT] ${member}: ${totalSavedInputTokens} input tokens saved | layers: ${Object.keys(compressionLayers).join(', ')}`);
    }

    // ── max_tokens scoped to taskType — hard caps prevent runaway verbose output ──
    // Callers may set options.maxOutputTokens (e.g. council builder full-file HTML) to override
    // the task-type default; still clamped to MAX_OUTPUT_TOKENS_CAP for safety.
    const MAX_OUTPUT_TOKENS_CAP = 128_000;
    const baseScopedMaxTokens = (() => {
      if (taskType === 'routing' || taskType === 'classification') return 50;
      if (taskType === 'validation') return 100;
      if (taskType === 'health' || taskType === 'status') return 150;
      if (taskType === 'summary') return 300;
      if (taskType === 'extraction' || taskType === 'json') return 400;
      if (taskType === 'voice_rail_department') return 1200;
      if (taskType === 'analysis' || taskType === 'review') return 600;
      if (taskType === 'planning') return 700;
      if (taskType === 'builder_lane' || taskType === 'codegen' || taskType === 'code') return 8000;
      return Math.min(config.maxTokens || 800, 800); // default cap: 800 (was 1000)
    })();
    const scopedMaxTokens = (() => {
      const n = options.maxOutputTokens;
      if (typeof n === 'number' && Number.isFinite(n) && n > 0) {
        return Math.min(Math.max(Math.floor(n), 1), MAX_OUTPUT_TOKENS_CAP);
      }
      return baseScopedMaxTokens;
    })();

    const startTime = Date.now();

    try {
      let response;

      // Deterministic tasks get temp=0 (shorter, no rambling) + stop sequences
      const isDeterministic = ['routing','classification','validation','extraction','json','health','status'].includes(taskType);
      const temperature = isDeterministic ? 0 : 0.7;
      const stopSequences = isDeterministic ? ['\n\n\n'] : undefined;

      // Strip markdown fencing from any response before caching — prevents
      // callers receiving ```json ... ``` and failing on JSON.parse
      const cleanForCache = (t) => t
        .replace(/^```(?:json|js|javascript|text)?\s*/i, '')
        .replace(/\s*```\s*$/i, '')
        .trim();

      if (OPENAI_COMPATIBLE_PROVIDERS.has(config.provider)) {
        // OpenAI-native models (gpt-5.x) require `max_completion_tokens` and reject `max_tokens`
        // and `stop`. Other OpenAI-compatible providers (groq, cerebras, xai, …) still use the
        // legacy `max_tokens` + `stop` shape.
        const isOpenAiNative = config.provider === "openai";
        // OpenAI reasoning models (o-series, gpt-5.x/6.x) reject any temperature
        // other than the default (1) with a 400. Omit it for those so
        // deterministic (temp=0) codegen/json tasks don't hard-fail the build.
        const reasoningModel = isOpenAiNative && /^(o\d|gpt-[56])/i.test(String(config.model || ''));
        const tokenLimitParam = isOpenAiNative
          ? { max_completion_tokens: scopedMaxTokens }
          : { max_tokens: scopedMaxTokens };
        response = await fetch(getChatCompletionUrl(config.provider), {
          method: "POST",
          headers: buildOpenAICompatibleHeaders(config.provider, apiKey),
          body: JSON.stringify({
            model: config.model,
            ...tokenLimitParam,
            ...(reasoningModel ? {} : { temperature }),
            ...(stopSequences && !isOpenAiNative && { stop: stopSequences }),
            ...(options.responseFormat === 'json' && isOpenAiNative ? { response_format: { type: 'json_object' } } : {}),
            messages: deltaMessages
              ? [{ role: "system", content: systemPrompt }, ...deltaMessages]
              : [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: finalPrompt },
                ],
          }),
          signal: AbortSignal.timeout(COUNCIL_TIMEOUT_MS),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(
            `OpenAI API error: ${response.status} - ${errorText}`
          );
          const err = new Error(`HTTP ${response.status}: ${errorText.slice(0, 300)}`);
          if (response.status === 413) err.nonRetryable = true;
          throw err;
        }

        const json = await response.json();
        if (json.error) throw new Error(json.error.message);

        let text = json.choices?.[0]?.message?.content || "";
        if (!text) throw new Error("Empty response");

        text = decompressResponse(text, useCompression);

        const cost = ZERO_COST_PROVIDERS.has(config.provider)
          ? 0
          : calculateCost(json.usage, config.model, member);
        if (cost > 0) {
          await updateDailySpend(cost);
        }

        // Track real token savings (compression + free provider = $0 cost)
        const realTokensSaved = totalSavedInputTokens;
        const provider = config.provider || member.split('_')[0];
        const inputTokens = json.usage?.prompt_tokens || estimateTokens(finalPrompt);
        const outputTokens = json.usage?.completion_tokens || estimateTokens(text);
        const originalTokens = inputTokens + realTokensSaved;

        tokenOptimizer.trackUsage({
          provider,
          model: config.model || member,
          taskType,
          inputTokens,
          outputTokens,
          savedTokens: realTokensSaved,
          cacheHit: false,
          costUSD: cost,
          savedCostUSD: realTokensSaved * 0.000003,
        }).catch(() => {});

        // TCO-E01: Token Accounting OS — metered ledger receipt
        recordMetered({
            ...meterTiming(),
            provider,
            model: config.model || member,
            taskType,
            originalTokens,
            compressedTokens: inputTokens,
            outputTokens,
            savedTokens: realTokensSaved,
            savedOutputPct: codSavedOutputPct,
            costUSD: cost,
            cacheHit: false,
            compressionLayers: buildRecordedCompressionLayers(compressionLayers, outputTokens, codSavedOutputPct),
          }).catch(() => {});

        if (updateROI) {
          await updateROI(0, cost, 0, realTokensSaved);
        }

        const duration = Date.now() - startTime;
        if (trackAIPerformance) {
          await trackAIPerformance(
            member,
            "chat",
            duration,
            json.usage?.total_tokens || 0,
            cost,
            true
          );
        }

        if (options.useCache !== false) {
          await cacheResponse(prompt, member, cleanForCache(text), taskType);
        }

        await freeTierGovernor.record(provider, inputTokens + outputTokens).catch(() => {});
        recordSessionTurns(effectiveSessionId, finalPrompt, text);

        // LCL drift inspection — fire-and-forget, never blocks response
        lclMonitor.inspect(text, { member, taskType, symbolsFired: lclSymbolsFired, lclWasActive });

        return finalizeResponse(text, taskType, { prompt_tokens: inputTokens, completion_tokens: outputTokens, total_tokens: inputTokens + outputTokens, estimated_usd: cost }, cost);
      }

      if (config.provider === "gemini" || config.provider === "google") {
        const geminiBody = buildGeminiContents(
          systemPrompt,
          finalPrompt,
          deltaMessages
        );

        const generationConfig = {
          temperature,
          maxOutputTokens: scopedMaxTokens,
        };
        // Gemini 2.5 flash enables "thinking" by default, which adds ~7-40s of
        // latency (and billed thinking tokens) per call. The free flash lane is
        // for fast, lightweight reasoning, so disable thinking by default and let
        // callers opt back in for deeper analysis.
        const thinkingBudget = Number(
          options.thinkingBudget ?? process.env.GEMINI_THINKING_BUDGET ?? 0
        );
        if (
          /gemini-2\.5-flash/i.test(config.model || "") &&
          Number.isFinite(thinkingBudget) &&
          thinkingBudget >= 0
        ) {
          generationConfig.thinkingConfig = { thinkingBudget };
        }

        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              ...geminiBody,
              generationConfig,
            }),
            signal: AbortSignal.timeout(COUNCIL_TIMEOUT_MS),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          if (response.status === 413) {
            const err = new Error(`PROMPT_TOO_LARGE: Gemini rejected prompt (413) — reduce files[] injection or spec length before retrying. Detail: ${errorText.slice(0, 200)}`);
            err.code = 'PROMPT_TOO_LARGE';
            err.nonRetryable = true;
            throw err;
          }
          throw new Error(`Gemini HTTP ${response.status}: ${errorText.slice(0, 200)}`);
        }

        const json = await response.json();
        let text =
          json.candidates?.[0]?.content?.parts
            ?.map((part) => part?.text || "")
            .join("") || "";
        if (!text) throw new Error("Empty response from Gemini");

        text = decompressResponse(text, useCompression);

        const inputTokens =
          json.usageMetadata?.promptTokenCount ||
          estimateTokens(systemPrompt) +
            estimateTokens(finalPrompt) -
            Math.ceil(deltaContextSaved / 4);
        const outputTokens =
          json.usageMetadata?.candidatesTokenCount || estimateTokens(text);

        tokenOptimizer.trackUsage({
          provider: "gemini",
          model: config.model || member,
          taskType,
          inputTokens,
          outputTokens,
          savedTokens: totalSavedInputTokens,
          cacheHit: false,
          costUSD: 0,
          savedCostUSD: totalSavedInputTokens * 0.000003,
        }).catch(() => {});

        recordMetered({
            ...meterTiming(),
            provider: "gemini",
            model: config.model || member,
            taskType,
            originalTokens: inputTokens + totalSavedInputTokens,
            compressedTokens: inputTokens,
            outputTokens,
            savedTokens: totalSavedInputTokens,
            savedOutputPct: codSavedOutputPct,
            costUSD: 0,
            cacheHit: false,
            compressionLayers: buildRecordedCompressionLayers(compressionLayers, outputTokens, codSavedOutputPct),
          }).catch(() => {});

        if (options.useCache !== false) {
          await cacheResponse(prompt, member, cleanForCache(text), taskType);
        }

        await freeTierGovernor.record("gemini", inputTokens + outputTokens).catch(() => {});
        recordSessionTurns(effectiveSessionId, finalPrompt, text);

        // LCL drift inspection — fire-and-forget, never blocks response
        lclMonitor.inspect(text, { member, taskType, symbolsFired: lclSymbolsFired, lclWasActive });

        return finalizeResponse(text, taskType, { prompt_tokens: inputTokens, completion_tokens: outputTokens, total_tokens: inputTokens + outputTokens, estimated_usd: 0 }, 0);
      }

      if (config.provider === "ollama" || member.startsWith("ollama_")) {
        throw new Error("ollama retired by founder directive");
      }

      if (config.provider === "deepseek") {
        const dsApiKey = getApiKey("deepseek");
        if (!dsApiKey) throw new Error("DEEPSEEK_API_KEY not set");

        response = await fetch("https://api.deepseek.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${dsApiKey}`,
          },
          body: JSON.stringify({
            model: config.model,
            max_tokens: scopedMaxTokens,
            temperature: 0.7,
            messages: deltaMessages
              ? [{ role: "system", content: systemPrompt }, ...deltaMessages]
              : [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: finalPrompt },
                ],
          }),
          signal: AbortSignal.timeout(COUNCIL_TIMEOUT_MS),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`DeepSeek HTTP ${response.status}: ${errorText.slice(0, 200)}`);
        }

        const json = await response.json();
        if (json.error) throw new Error(json.error.message);

        let text = json.choices?.[0]?.message?.content || "";
        if (!text) throw new Error("Empty response from DeepSeek");

        text = decompressResponse(text, useCompression);

        const cost = calculateCost(json.usage, config.model, member);
        await updateDailySpend(cost);

        if (options.useCache !== false) {
          await cacheResponse(prompt, member, cleanForCache(text), taskType);
        }

        // TCO-E01: ledger for DeepSeek
        {
          const dsIn = json.usage?.prompt_tokens || estimateTokens(finalPrompt);
          const dsOut = json.usage?.completion_tokens || estimateTokens(text);
          recordMetered({
            ...meterTiming(),
            provider: 'deepseek',
            model: config.model || member,
            taskType,
            originalTokens: dsIn + totalSavedInputTokens,
            compressedTokens: dsIn,
            outputTokens: dsOut,
            savedTokens: totalSavedInputTokens,
            savedOutputPct: codSavedOutputPct,
            costUSD: cost,
            cacheHit: false,
            compressionLayers: buildRecordedCompressionLayers(compressionLayers, dsOut, codSavedOutputPct),
          }).catch(() => {});
        }

        recordSessionTurns(effectiveSessionId, finalPrompt, text);

        return finalizeResponse(text, taskType, { prompt_tokens: dsIn, completion_tokens: dsOut, total_tokens: dsIn + dsOut, estimated_usd: cost }, cost);
      }

      if (config.provider === "anthropic") {
        const anthropicKey = getApiKeyForProvider("anthropic");
        if (!anthropicKey) throw new Error("ANTHROPIC_API_KEY not set");

        response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: config.model,
            max_tokens: scopedMaxTokens,
            system: systemPrompt,
            messages: deltaMessages
              ? deltaMessages
              : [{ role: "user", content: finalPrompt }],
          }),
          signal: AbortSignal.timeout(COUNCIL_TIMEOUT_MS),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Anthropic HTTP ${response.status}: ${errorText.slice(0, 300)}`);
        }

        const json = await response.json();
        if (json.error) throw new Error(json.error.message);

        let text = json.content?.[0]?.text || "";
        if (!text) throw new Error("Empty response from Anthropic");

        text = decompressResponse(text, useCompression);

        const inputTokens = json.usage?.input_tokens || estimateTokens(finalPrompt);
        const outputTokens = json.usage?.output_tokens || estimateTokens(text);
        const cost = calculateCost(json.usage, config.model, member);
        if (cost > 0) await updateDailySpend(cost);

        tokenOptimizer.trackUsage({
          provider: "anthropic",
          model: config.model || member,
          taskType,
          inputTokens,
          outputTokens,
          savedTokens: totalSavedInputTokens,
          cacheHit: false,
          costUSD: cost,
          savedCostUSD: totalSavedInputTokens * 0.000003,
        }).catch(() => {});

        recordMetered({
            ...meterTiming(),
            provider: "anthropic",
            model: config.model || member,
            taskType,
            originalTokens: inputTokens + totalSavedInputTokens,
            compressedTokens: inputTokens,
            outputTokens,
            savedTokens: totalSavedInputTokens,
            savedOutputPct: codSavedOutputPct,
            costUSD: cost,
            cacheHit: false,
            compressionLayers: buildRecordedCompressionLayers(compressionLayers, outputTokens, codSavedOutputPct),
          }).catch(() => {});

        if (options.useCache !== false) {
          await cacheResponse(prompt, member, cleanForCache(text), taskType);
        }

        recordSessionTurns(effectiveSessionId, finalPrompt, text);
        lclMonitor.inspect(text, { member, taskType, symbolsFired: lclSymbolsFired, lclWasActive });

        return finalizeResponse(text, taskType, { prompt_tokens: inputTokens, completion_tokens: outputTokens, total_tokens: inputTokens + outputTokens, estimated_usd: cost }, cost);
      }

      throw new Error(
        `Provider ${config.provider} not yet wired in council-service`
      );
    } catch (error) {
      if (error?.name === 'TimeoutError' || error?.code === 'ABORT_ERR') {
        error = new Error(`Council provider timed out after ${COUNCIL_TIMEOUT_MS}ms for ${member}`);
      }
      const duration = Date.now() - startTime;
      if (trackAIPerformance) {
        await trackAIPerformance(member, "chat", duration, 0, 0, false);
      }

      // ── Parse provider-level failure signals ──
      const statusMatch = typeof error?.message === 'string' ? error.message.match(/HTTP (\d{3})/) : null;
      const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : null;
      const isProviderHttpError = statusCode !== null || (typeof error?.message === 'string' && error.message.includes('HTTP '));
      const isConnRefused = error.message?.toLowerCase().includes('fetch failed') ||
                            error.message?.toLowerCase().includes('econnrefused') ||
                            error.message?.toLowerCase().includes('enotfound') ||
                            error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND';
      const isTimeout = typeof error?.message === 'string' && error.message.includes('timed out');

      // Non-retryable payloads or oversized context should not burn the cascade.
      if (error?.nonRetryable || statusCode === 413) {
        throw error;
      }

      // ── 429 = rate limit hit → mark provider exhausted, cascade to next free ──
      const is429 = statusCode === 429 ||
                    error.message?.includes('429') ||
                    error.message?.toLowerCase().includes('rate limit') ||
                    error.message?.toLowerCase().includes('quota');
      if (is429 && !founderComms && !builderLane) {
        await freeTierGovernor.on429(member);
        const exhaustedProvider = freeTierGovernor.resolveProvider(member);
        _markProviderExhausted(exhaustedProvider); // keep selectOptimalModel from re-picking it
        const nextProvider = await freeTierGovernor.getNextAvailable([exhaustedProvider]);
        if (!nextProvider) throw error;
        const fallbackMembers = freeTierGovernor.PROVIDER_LIMITS[nextProvider]?.councilMembers || ['cerebras_llama'];
        for (const fallbackMember of fallbackMembers) {
          if (COUNCIL_MEMBERS[fallbackMember]) {
            if (triedMembers.has(fallbackMember)) continue;
            console.log(`🔄 [FREE-TIER] ${member} rate limited → cascading to ${fallbackMember} (${nextProvider})`);
            return await callCouncilMember(fallbackMember, prompt, { ...options, _triedMembers: triedMembers });
          }
        }
      }

      // ── Any other provider-level failure (credit dry, auth, 5xx, DNS, timeout) ──
      // must also cascade to the next strong provider. This is the last-resort
      // safety net that keeps the chair and BuilderOS alive when an account runs dry.
      if (isProviderHttpError || isConnRefused || isTimeout) {
        const failoverMembers = getProviderFailoverMembers(member, triedMembers);
        for (const fallbackMember of failoverMembers) {
          triedMembers.add(fallbackMember);
          console.log(`🔄 [COUNCIL] ${member} provider error (status=${statusCode || 'n/a'}) → cascading to ${fallbackMember}`);
          return await callCouncilMember(fallbackMember, prompt, { ...options, _triedMembers: triedMembers });
        }
      }

      // ── fetch failed on a legacy-local alias → keep retired provider exhausted ──
      if (isConnRefused && COUNCIL_MEMBERS[member]?.isLocal) {
        _markProviderExhausted('ollama');
        console.log(`🔌 [COUNCIL] Retired local-model alias hit a dead endpoint — keeping it out of routing`);
      }

      throw error;
    }
  }

  async function callCouncilWithFailover(
    prompt,
    preferredMember = "cerebras_llama",
    requireOversight = false,
    options = {}
  ) {
    const isProduction =
      NODE_ENV === "production" || !!RAILWAY_ENVIRONMENT;

    const spendingDisabled = MAX_DAILY_SPEND === 0;

    const today = dayjs().format("YYYY-MM-DD");
    const currentSpend = await getDailySpend(today);
    const inCostShutdown =
      currentSpend >= COST_SHUTDOWN_THRESHOLD || spendingDisabled;

    if (spendingDisabled) {
      console.warn(
        `💰 [COST SHUTDOWN] Spending DISABLED (MAX_DAILY_SPEND=$0) - Only using FREE models`
      );
    }

    const openSourceCouncil = getOpenSourceCouncil
      ? getOpenSourceCouncil()
      : null;

    if (isProduction && openSourceCouncil) {
      console.log(
        `⚠️  [OSC] Skipping worker council in production (local-model runtime retired)`
      );
    } else if (inCostShutdown) {
      console.warn(
        `💰 [COST SHUTDOWN] Spending $${currentSpend.toFixed(
          2
        )}/$${COST_SHUTDOWN_THRESHOLD} - Only using free/cheap models`
      );
    }

    const willUseOSC =
      !isProduction &&
      openSourceCouncil &&
      !requireOversight &&
      (inCostShutdown || options.useOpenSourceCouncil === true);

    if (willUseOSC) {
      const reasonText = inCostShutdown ? "Cost shutdown mode" : "Explicit opt-in";
      console.log(
        "\n╔══════════════════════════════════════════════════════════════════════════════════╗"
      );
      console.log(
        "║ 🆓 [WORKER COUNCIL] ACTIVATED - Using free/cheap cloud lanes                     ║"
      );
      console.log(
        `║    Reason: ${reasonText.padEnd(63)}║`
      );
      console.log(
        "╚══════════════════════════════════════════════════════════════════════════════════╝\n"
      );

      try {
        const promptLength = prompt.length;
        const isComplex =
          promptLength > 2000 ||
          options.complexity === "complex" ||
          options.complexity === "critical" ||
          options.requireConsensus === true;

        console.log(
          `🔄 [OSC] Routing task: ${prompt.substring(0, 80)}...`
        );
        console.log(
          `    Task Type: ${options.taskType || "auto-detect"}`
        );
        console.log(
          `    Complexity: ${
            isComplex ? "COMPLEX (will use consensus)" : "SIMPLE (single model)"
          }`
        );
        console.log(`    Prompt Length: ${promptLength} chars\n`);

        const routerOptions = {
          taskType: options.taskType,
          requireConsensus: isComplex || options.requireConsensus,
          consensusThreshold: options.consensusThreshold || 2,
          complexity: options.complexity || (isComplex ? "complex" : "medium"),
          ...options,
        };

        const routeStartTime = Date.now();
        const result = await openSourceCouncil.routeTask(
          prompt,
          routerOptions
        );
        const routeDuration = Date.now() - routeStartTime;

        if (result.success) {
          const consensusText = result.consensus
            ? " (consensus from multiple models)"
            : "";
          const modelText = `${result.model}${consensusText}`;
          const taskTypeText = result.taskType || "general";
          console.log(
            "\n╔══════════════════════════════════════════════════════════════════════════════════╗"
          );
          console.log(
            "║ ✅ [OPEN SOURCE COUNCIL] SUCCESS                                                  ║"
          );
          console.log(
            `║    Model: ${modelText.padEnd(63)}║`
          );
          console.log(
            `║    Task Type: ${taskTypeText.padEnd(63)}║`
          );
          console.log(
            `║    Response Time: ${`${routeDuration}ms`.padEnd(79)}║`
          );
          console.log(
            "║    Cost: low/free cloud lane".padEnd(79) + "║"
          );
          console.log(
            "╚══════════════════════════════════════════════════════════════════════════════════╝\n"
          );
          return result.response;
        } else {
          console.warn(
            "\n⚠️  [OSC] Router returned unsuccessful result, falling back...\n"
          );
        }
      } catch (error) {
        console.error(
          "\n╔══════════════════════════════════════════════════════════════════════════════════╗"
        );
        console.error(
          "║ ❌ [OPEN SOURCE COUNCIL] ERROR                                                    ║"
        );
        console.error(
          `║    Error: ${error.message}                                                         ║`
        );
        console.error(
          "║    Falling back to standard failover...                                           ║"
        );
        console.error(
          "╚══════════════════════════════════════════════════════════════════════════════════╝\n"
        );
      }
    } else if (openSourceCouncil) {
      if (requireOversight) {
        console.log(
          "ℹ️  [OSC] Skipped - Task requires oversight (Tier 1 models)"
        );
      } else if (!inCostShutdown && options.useOpenSourceCouncil !== true) {
        console.log(
          "ℹ️  [OSC] Skipped - Not in cost shutdown and not explicitly requested (opt-in)"
        );
      }
    }

    const members = Object.keys(COUNCIL_MEMBERS);

    const now = Date.now();
    let availableMembers = members.filter((m) => {
      const retryAt = providerCooldowns?.get(m) || 0;
      return now >= retryAt;
    });

    if (inCostShutdown) {
      availableMembers = availableMembers.filter((m) => {
        const member = COUNCIL_MEMBERS[m];
        return member.isFree === true;
      });
      console.log(
        `💰 [COST SHUTDOWN] Filtered to FREE models only: ${availableMembers.join(
          ", "
        )}`
      );

      if (availableMembers.length === 0) {
        console.error(
          "❌ [COST SHUTDOWN] No free models available. System cannot proceed without spending."
        );
        return "System is in cost shutdown mode and no free cloud models are available. Add a free provider key or raise MAX_DAILY_SPEND.";
      }
    } else if (!requireOversight) {
      const tier0Members = availableMembers.filter(
        (m) => COUNCIL_MEMBERS[m].tier === "tier0"
      );
      const tier1Members = availableMembers.filter(
        (m) => COUNCIL_MEMBERS[m].tier === "tier1"
      );

      availableMembers = [...tier0Members, ...tier1Members];
    } else {
      availableMembers = availableMembers.filter(
        (m) => COUNCIL_MEMBERS[m].tier === "tier1"
      );
    }

    const ordered = [
      preferredMember,
      ...availableMembers.filter((m) => m !== preferredMember),
    ].filter((m, idx, arr) => arr.indexOf(m) === idx);

    const candidates = ordered.length > 0 ? ordered : availableMembers;

    const errors = [];
    for (const member of candidates) {
      try {
        const response = await callCouncilMember(member, prompt, options);
        if (response) {
          console.log(
            `✅ Got response from ${member} (Tier ${
              COUNCIL_MEMBERS[member]?.tier || "unknown"
            })`
          );
          return response;
        }
      } catch (error) {
        console.log(
          `⚠️ ${member} failed: ${error.message}, trying next...`
        );
        errors.push(`${member}: ${error.message}`);
        continue;
      }
    }

    console.error("❌ All AI council members unavailable");
    if (notifyCriticalIssue) {
      notifyCriticalIssue(
        `All AI providers unavailable. Errors: ${errors.join(" | ")}`
      );
    }
    return "All AI council members currently unavailable. Check API keys/quotas.";
  }

  // ==================== BLIND SPOT DETECTION ====================

  async function detectBlindSpots(decision, context) {
    try {
      const blindSpotPrompt = `Analyze this decision for blind spots and unintended consequences:
    
Decision: ${decision}
Context: ${JSON.stringify(context)}
    
Identify:
1. What are we not considering?
2. What could go wrong that we haven't thought of?
3. What are the second-order effects?
4. What would a skeptical outsider point out?
5. What assumptions are we making?
    
Be specific and critical.`;

      const responses = await Promise.allSettled([
        callCouncilMember("chatgpt", blindSpotPrompt, {
          checkBlindSpots: true,
        }),
        callCouncilMember("grok", blindSpotPrompt, {
          checkBlindSpots: true,
        }),
      ]);

      const blindSpots = [];
      for (const response of responses) {
        if (response.status === "fulfilled" && response.value) {
          const spots = response.value
            .split("\n")
            .filter((line) => line.trim().length > 0);
          blindSpots.push(...spots);

          for (const spot of spots.slice(0, 3)) {
            await pool.query(
              `INSERT INTO blind_spots (detected_by, decision_context, blind_spot, severity, mitigation, created_at)
               VALUES ($1, $2, $3, $4, $5, NOW())`,
              ["ai_council", decision, spot, "medium", ""]
            );
          }
        }
      }

      if (systemMetrics) {
        systemMetrics.blindSpotsDetected =
          (systemMetrics.blindSpotsDetected || 0) + blindSpots.length;
      }
      return blindSpots;
    } catch (error) {
      console.error("Blind spot detection error:", error.message);
      return [];
    }
  }

  return {
    compressPrompt,
    decompressResponse,
    decodeMicroBody,
    buildMicroResponse,
    getApiKeyForProvider: getApiKeyForProvider,
    getProviderPingConfig,
    pingCouncilMember,
    calculateCost,
    getDailySpend,
    updateDailySpend,
    resolveCouncilMember,
    callCouncilMember,
    callCouncilWithFailover,
    detectBlindSpots,
    tokenOptimizer, // exposed for monitoring dashboard
    lclMonitor,     // exposed for /lcl-stats route and drift dashboard
  };
}
