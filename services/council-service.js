/**
 * Council routing, token/LCL/savings, and model failover for platform AI calls.
 * @ssot docs/projects/AMENDMENT_01_AI_COUNCIL.md
 */
import dayjs from "dayjs";
import { injectKnowledgeContext, buildSystemContext } from "./knowledge-context.js";
import { createFreeTierGovernor } from "./free-tier-governor.js";
import { compress as optimizePrompt, estimateTokens, createTokenOptimizer } from "./token-optimizer.js";
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
  "ollama",
]);
const OPENAI_COMPATIBLE_PROVIDERS = new Set([
  "openai",
  "groq",
  "cerebras",
  "openrouter",
  "mistral",
  "together",
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
  OLLAMA_ENDPOINT,
  COUNCIL_OLLAMA_MODE = "last_resort",
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
}) {
  // Both backed by Neon — stats survive Railway deploys
  const tokenOptimizer = createTokenOptimizer(pool);
  const freeTierGovernor = createFreeTierGovernor({
    pool,
    ollamaMode: COUNCIL_OLLAMA_MODE,
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

  const ollamaCouncilOff = COUNCIL_OLLAMA_MODE === "off";
  const ollamaDisabled = ollamaCouncilOff ||
    !OLLAMA_ENDPOINT ||
    OLLAMA_ENDPOINT === "disabled" ||
    OLLAMA_ENDPOINT === "none" ||
    (RAILWAY_ENVIRONMENT && /localhost|127\.0\.0\.1|PASTE_YOUR/i.test(String(OLLAMA_ENDPOINT)));

  const _exhaustedProviders = new Set();
  if (ollamaCouncilOff) {
    _exhaustedProviders.add("ollama");
  }

  // Startup Ollama ping — skip when council mode is off or endpoint unusable
  (async () => {
    const endpoint = OLLAMA_ENDPOINT;
    if (ollamaDisabled) {
      if (!ollamaCouncilOff) _exhaustedProviders.add("ollama");
      return;
    }
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 3000);
      const res = await fetch(`${endpoint}/api/tags`, { signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) throw new Error(`status ${res.status}`);
      console.log(`✅ [COUNCIL] Ollama reachable at ${endpoint}`);
    } catch {
      _exhaustedProviders.add('ollama');
      console.log(`🔌 [COUNCIL] Ollama not available — excluded from routing`);
    }
  })();

  console.log(
    `🔌 [COUNCIL] Ollama policy: ${COUNCIL_OLLAMA_MODE}${
      ollamaCouncilOff ? " (local Ollama excluded — free cloud APIs only)" : ""
    }`
  );

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
          process.env.GEMINI_API_KEY?.trim()
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

  async function pingCouncilMember(memberKey) {
    const targetMember = resolveCouncilMember(memberKey);
    const memberConfig = COUNCIL_MEMBERS[targetMember];
    if (!memberConfig) {
      return { ok: false, error: "unknown_member" };
    }

    if (memberConfig.provider === "ollama") {
      const endpoint =
        memberConfig.endpoint || OLLAMA_ENDPOINT || "http://localhost:11434";
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

  function calculateCost(usage, model = "gpt-4o-mini") {
    const prices = {
      "claude-3-5-sonnet-latest": { input: 0.003, output: 0.015 },
      "gpt-4o": { input: 0.0025, output: 0.01 },
      "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
      "gemini-2.5-flash": { input: 0.0001, output: 0.0004 },
      "deepseek-coder": { input: 0.0001, output: 0.0003 },
      "grok-2-1212": { input: 0.005, output: 0.015 },
    };
    const price = prices[model] || prices["gpt-4o-mini"];
    const promptTokens =
      usage?.prompt_tokens || usage?.input_tokens || usage?.total_tokens || 0;
    const completionTokens = usage?.completion_tokens || usage?.output_tokens || 0;

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

    // Determine if a real Ollama endpoint is reachable on this deployment
    const hasRealOllama = OLLAMA_ENDPOINT &&
      !OLLAMA_ENDPOINT.includes('localhost') &&
      !OLLAMA_ENDPOINT.includes('127.0.0.1') &&
      !OLLAMA_ENDPOINT.includes('PASTE_YOUR');

    // Only consider tier0 models that are actually reachable right now:
    //  - exclude local-only (Ollama) models when no real tunnel is configured
    //  - exclude providers already rate-limited this session (_exhaustedProviders)
    const candidates = Object.entries(COUNCIL_MEMBERS).filter(
      ([, cfg]) => {
        if (!cfg || cfg.tier !== "tier0") return false;
        if (cfg.isLocal && !hasRealOllama) return false;
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

  // Called by the 429 handler so selectOptimalModel stops picking exhausted providers
  function _markProviderExhausted(providerKey) {
    _exhaustedProviders.add(providerKey);
    // Auto-clear at midnight UTC so tomorrow's limit is fresh
    const msUntilMidnight = new Date().setUTCHours(24, 0, 0, 0) - Date.now();
    setTimeout(() => _exhaustedProviders.delete(providerKey), msUntilMidnight);
  }

  async function callCouncilMember(member, prompt, options = {}) {
    const requestedMember = member;
    const resolvedMember = resolveCouncilMember(member);
    if (resolvedMember !== requestedMember) {
      console.log(`🔁 [ALIAS] ${requestedMember} → ${resolvedMember}`);
    }
    member = resolvedMember;
    // config is declared later, after selectOptimalModel may rewrite member
    if (!COUNCIL_MEMBERS[member]) {
      throw new Error(`Unknown member: ${member}`);
    }

    const today = dayjs().format("YYYY-MM-DD");
    const spend = await getDailySpend(today);

    const isPaid =
      !COUNCIL_MEMBERS[member]?.isFree &&
      (COUNCIL_MEMBERS[member]?.costPer1M > 0 || COUNCIL_MEMBERS[member]?.tier === "tier1");

    // ── Free-tier cascade (Groq → Gemini → Cerebras → OpenRouter → Mistral → Ollama) ──
    // If a paid member was requested and spending is disabled/over limit,
    // cascade through every free provider until one is available.
    if (MAX_DAILY_SPEND === 0 && isPaid) {
      const nextProvider = await freeTierGovernor.getNextAvailable();
      if (!nextProvider) {
        throw new Error(
          `💰 [COST SHUTDOWN] Blocked ${member} — no free providers available (Ollama off: set COUNCIL_OLLAMA_MODE=last_resort for local fallback after caps).`
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

    if (spend >= COST_SHUTDOWN_THRESHOLD && isPaid) {
      const nextProvider = await freeTierGovernor.getNextAvailable();
      if (!nextProvider) {
        throw new Error(
          `💰 [SPEND LIMIT] $${spend.toFixed(2)}/$${COST_SHUTDOWN_THRESHOLD} — no free providers (Ollama off: set COUNCIL_OLLAMA_MODE=last_resort for local fallback).`
        );
      }
      const fallbackMembers = freeTierGovernor.PROVIDER_LIMITS[nextProvider]?.councilMembers || ['cerebras_llama'];
      for (const fallbackMember of fallbackMembers) {
        if (COUNCIL_MEMBERS[fallbackMember]) {
          console.log(`💰 [SPEND LIMIT] $${spend.toFixed(2)}/$${COST_SHUTDOWN_THRESHOLD} → cascading to ${fallbackMember} (${nextProvider})`);
          return await callCouncilMember(fallbackMember, prompt, options);
        }
      }
      throw new Error(`💰 [SPEND LIMIT] $${spend.toFixed(2)}/$${COST_SHUTDOWN_THRESHOLD} — no free providers available.`);
    }

    if (spend > MAX_DAILY_SPEND * 0.1) {
      console.log(
        `💰 [SPEND CHECK] Today (${today}): $${spend.toFixed(
          4
        )} / $${MAX_DAILY_SPEND}`
      );
    }

    const isOllama =
      COUNCIL_MEMBERS[member]?.provider === "ollama" ||
      member?.startsWith("ollama_") ||
      COUNCIL_MEMBERS[member]?.isLocal === true;
    const isFreeModel =
      COUNCIL_MEMBERS[member]?.isFree === true || isOllama;

    if (!isFreeModel && spend >= MAX_DAILY_SPEND) {
      throw new Error(
        `Daily spend limit ($${MAX_DAILY_SPEND}) reached at $${spend.toFixed(
          4
        )} for ${today}. Resets at midnight UTC.`
      );
    }

    // SOT context is now injected into the system prompt via buildSystemContext().
    // Removed: duplicate SOT injection into user prompt that caused double-billing.

    if (!options.useOpenSourceCouncil) {
      const optimalModel = selectOptimalModel(prompt, options.complexity);
      if (optimalModel && options.allowModelDowngrade !== false) {
        const optimalConfig = COUNCIL_MEMBERS[optimalModel.member];
        if (optimalConfig) {
          const optimalKey = getApiKeyForProvider(optimalConfig.provider);
          if (optimalConfig.provider === "ollama") {
            // Only override to Ollama if a real external endpoint is configured
            // (localhost fallback is not valid on Railway — Ollama doesn't run there)
            const hasRealEndpoint = OLLAMA_ENDPOINT &&
              !OLLAMA_ENDPOINT.includes('localhost') &&
              !OLLAMA_ENDPOINT.includes('127.0.0.1') &&
              !OLLAMA_ENDPOINT.includes('PASTE_YOUR');
            if (hasRealEndpoint) {
              member = optimalModel.member;
              console.log(
                `💰 [MODEL OPTIMIZATION] Using ${member} instead (${optimalModel.reason})`
              );
            }
          } else if (optimalKey) {
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

    // ── Auto-detect taskType from prompt content if not provided ─────────────
    // Enables Layers 2-4 for far more calls without callers needing to set options.
    const isCritical = options.critical === true;
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

    kingsmanAudit({ pool, member, taskType, prompt }).catch(() => {});

    // ── Rules engine pre-flight — deterministic no-AI answers + lightweight routing ──
    const ruleDecision = rulesEngine.evaluate({
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

      if (savingsLedger) {
        savingsLedger.record({
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
      }

      return text;
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
        if (savingsLedger) {
          savingsLedger.record({
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
        }
        return cached;
      }
    }

    const apiKey = getApiKey(config.provider);

    if (config.provider === "ollama") {
      // endpoint will be checked on request
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
    const systemPromptBase = `You are ${config.name} (${config.role}) in LifeOS AI Council on Railway.
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

    // Layer 1 — noise strip + phrase sub
    const optimized = optimizePrompt(enhancedPrompt, {
      stripMd: !isCritical,
      phraseSub: !isCritical,
      critical: isCritical,
    });
    let finalPrompt = optimized.text;
    if (optimized.savedTokens > 0) {
      compressionLayers.noise_phrase = { savedTokens: optimized.savedTokens, savedPct: optimized.savingsPct };
    }

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
    const scopedMaxTokens = (() => {
      if (taskType === 'routing' || taskType === 'classification') return 50;
      if (taskType === 'validation') return 100;
      if (taskType === 'health' || taskType === 'status') return 150;
      if (taskType === 'summary') return 300;
      if (taskType === 'extraction' || taskType === 'json') return 400;
      if (taskType === 'analysis' || taskType === 'review') return 600;
      if (taskType === 'planning') return 700;
      if (taskType === 'codegen' || taskType === 'code') return 1500;
      return Math.min(config.maxTokens || 800, 800); // default cap: 800 (was 1000)
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
        response = await fetch(getChatCompletionUrl(config.provider), {
          method: "POST",
          headers: buildOpenAICompatibleHeaders(config.provider, apiKey),
          body: JSON.stringify({
            model: config.model,
            max_tokens: scopedMaxTokens,
            temperature,
            ...(stopSequences && { stop: stopSequences }),
            messages: deltaMessages
              // Always prepend system message — delta window never carries it
              ? [{ role: "system", content: systemPrompt }, ...deltaMessages]
              : [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: finalPrompt },
                ],
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(
            `OpenAI API error: ${response.status} - ${errorText}`
          );
          throw new Error(`HTTP ${response.status}`);
        }

        const json = await response.json();
        if (json.error) throw new Error(json.error.message);

        let text = json.choices?.[0]?.message?.content || "";
        if (!text) throw new Error("Empty response");

        text = decompressResponse(text, useCompression);

        const cost = ZERO_COST_PROVIDERS.has(config.provider)
          ? 0
          : calculateCost(json.usage, config.model);
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

        // TCO-E01: Savings ledger — fire-and-forget, never blocks the response
        if (savingsLedger) {
          savingsLedger.record({
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
        }

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

        return text;
      }

      if (config.provider === "gemini" || config.provider === "google") {
        const geminiBody = buildGeminiContents(
          systemPrompt,
          finalPrompt,
          deltaMessages
        );

        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              ...geminiBody,
              generationConfig: {
                temperature,
                maxOutputTokens: scopedMaxTokens,
              },
            }),
            signal: AbortSignal.timeout(COUNCIL_TIMEOUT_MS),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
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

        if (savingsLedger) {
          savingsLedger.record({
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
        }

        if (options.useCache !== false) {
          await cacheResponse(prompt, member, cleanForCache(text), taskType);
        }

        await freeTierGovernor.record("gemini", inputTokens + outputTokens).catch(() => {});
        recordSessionTurns(effectiveSessionId, finalPrompt, text);

        // LCL drift inspection — fire-and-forget, never blocks response
        lclMonitor.inspect(text, { member, taskType, symbolsFired: lclSymbolsFired, lclWasActive });

        return text;
      }

      if (config.provider === "ollama" || member.startsWith("ollama_")) {
        const currentConfig = COUNCIL_MEMBERS[member] || config;
        const ollamaEndpoint =
          currentConfig.endpoint || OLLAMA_ENDPOINT || "http://localhost:11434";

        response = await fetch(`${ollamaEndpoint}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: currentConfig.model,
            messages: deltaMessages
              ? [{ role: "system", content: systemPrompt }, ...deltaMessages]
              : [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: finalPrompt },
                ],
            stream: false,
          }),
          signal: AbortSignal.timeout(COUNCIL_TIMEOUT_MS),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Ollama HTTP ${response.status}: ${errorText.slice(0, 200)}`
          );
        }

        const json = await response.json();
        let text = json.message?.content || json.response || "";
        if (!text) throw new Error("Empty response from Ollama");

        text = decompressResponse(text, useCompression);

        if (options.useCache !== false) {
          await cacheResponse(prompt, member, cleanForCache(text), taskType);
        }

        // TCO-E01: ledger for Ollama (free/local — cost $0)
        if (savingsLedger) {
          const ollamaIn = estimateTokens(finalPrompt);
          const ollamaOut = estimateTokens(text);
          savingsLedger.record({
            provider: 'ollama',
            model: currentConfig.model || member,
            taskType,
            originalTokens: ollamaIn + totalSavedInputTokens,
            compressedTokens: ollamaIn,
            outputTokens: ollamaOut,
            savedTokens: totalSavedInputTokens,
            savedOutputPct: codSavedOutputPct,
            costUSD: 0,
            cacheHit: false,
            compressionLayers: buildRecordedCompressionLayers(compressionLayers, ollamaOut, codSavedOutputPct),
          }).catch(() => {});
        }

        recordSessionTurns(effectiveSessionId, finalPrompt, text);

        lclMonitor.inspect(text, { member, taskType, symbolsFired: lclSymbolsFired, lclWasActive });

        return text;
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

        const cost = calculateCost(json.usage, config.model);
        await updateDailySpend(cost);

        if (options.useCache !== false) {
          await cacheResponse(prompt, member, cleanForCache(text), taskType);
        }

        // TCO-E01: ledger for DeepSeek
        if (savingsLedger) {
          const dsIn = json.usage?.prompt_tokens || estimateTokens(finalPrompt);
          const dsOut = json.usage?.completion_tokens || estimateTokens(text);
          savingsLedger.record({
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

        return text;
      }

      throw new Error(
        `Provider ${config.provider} not yet wired in council-service`
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      if (trackAIPerformance) {
        await trackAIPerformance(member, "chat", duration, 0, 0, false);
      }

      // ── 429 = rate limit hit → mark provider exhausted, cascade to next free ──
      const is429 = error.message?.includes('429') ||
                    error.message?.toLowerCase().includes('rate limit') ||
                    error.message?.toLowerCase().includes('quota');
      if (is429) {
        await freeTierGovernor.on429(member);
        const exhaustedProvider = freeTierGovernor.resolveProvider(member);
        _markProviderExhausted(exhaustedProvider); // keep selectOptimalModel from re-picking it
        const nextProvider = await freeTierGovernor.getNextAvailable([exhaustedProvider]);
        if (!nextProvider) throw error;
        const fallbackMembers = freeTierGovernor.PROVIDER_LIMITS[nextProvider]?.councilMembers || ['cerebras_llama'];
        for (const fallbackMember of fallbackMembers) {
          if (COUNCIL_MEMBERS[fallbackMember]) {
            console.log(`🔄 [FREE-TIER] ${member} rate limited → cascading to ${fallbackMember} (${nextProvider})`);
            return await callCouncilMember(fallbackMember, prompt, options);
          }
        }
      }

      // ── fetch failed = provider unreachable → mark Ollama out for this session ──
      const isConnRefused = error.message?.toLowerCase().includes('fetch failed') ||
                            error.message?.toLowerCase().includes('econnrefused') ||
                            error.message?.toLowerCase().includes('enotfound') ||
                            error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND';
      if (isConnRefused && COUNCIL_MEMBERS[member]?.isLocal) {
        _markProviderExhausted('ollama');
        console.log(`🔌 [COUNCIL] Ollama unreachable — removed from routing for this session`);
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
        `⚠️  [OSC] Skipping Open Source Council in production (Ollama not available on Railway)`
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
        "║ 🆓 [OPEN SOURCE COUNCIL] ACTIVATED - Using local Ollama models (FREE)            ║"
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
            "║    Cost: $0.00 (FREE - local Ollama)".padEnd(79) + "║"
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
        return "System is in cost shutdown mode and no free models are available. Please enable Ollama or set MAX_DAILY_SPEND > 0.";
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
