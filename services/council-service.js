import dayjs from "dayjs";
import { injectKnowledgeContext } from "./knowledge-context.js";

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
}) {
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

  function optimizePrompt(prompt) {
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
    const optimized = optimizePrompt(prompt);

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
      case "google":
        return (
          process.env.LIFEOS_GEMINI_KEY?.trim() ||
          process.env.GEMINI_API_KEY?.trim()
        );
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
    switch (provider) {
      case "anthropic":
        return (
          process.env.LIFEOS_ANTHROPIC_KEY?.trim() ||
          process.env.ANTHROPIC_API_KEY?.trim()
        );
      case "google":
        return (
          process.env.LIFEOS_GEMINI_KEY?.trim() ||
          process.env.GEMINI_API_KEY?.trim()
        );
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

  async function getCachedResponse(prompt, member) {
    try {
      const result = await pool.query(
        `SELECT response_text FROM ai_cache WHERE prompt_hash = $1 AND ai_member = $2`,
        [hashPrompt(prompt), member]
      );
      if (result.rows.length > 0) {
        if (compressionMetrics) {
          compressionMetrics.cache_hits =
            (compressionMetrics.cache_hits || 0) + 1;
        }
        return result.rows[0].response_text;
      }
      return null;
    } catch {
      return null;
    }
  }

  async function cacheResponse(prompt, member, responseText) {
    try {
      await pool.query(
        `INSERT INTO ai_cache (prompt_hash, ai_member, response_text, created_at)
         VALUES ($1, $2, $3, now())
         ON CONFLICT (prompt_hash, ai_member) DO UPDATE SET response_text = $3, created_at = now()`,
        [hashPrompt(prompt), member, responseText]
      );
    } catch {
      // cache failures are non-fatal
    }
  }

  function hashPrompt(prompt) {
    // Simple stable hash (node crypto not imported here to keep service lightweight);
    // rely on database-level deduplication by normalized prompt length + prefix.
    const normalized = String(prompt || "").slice(0, 512);
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      const chr = normalized.charCodeAt(i);
      hash = (hash << 5) - hash + chr;
      hash |= 0;
    }
    return `h_${normalized.length}_${Math.abs(hash)}`;
  }

  function selectOptimalModel(prompt, complexity) {
    const length = prompt.length;
    const isComplex =
      length > 2000 ||
      complexity === "complex" ||
      complexity === "critical";

    // Prefer local models first
    const candidates = Object.entries(COUNCIL_MEMBERS).filter(
      ([, cfg]) => cfg && cfg.tier === "tier0"
    );

    if (isComplex) {
      const reasoningModel = candidates.find(
        ([, cfg]) =>
          cfg.specialties && cfg.specialties.includes("reasoning")
      );
      if (reasoningModel) {
        return {
          member: reasoningModel[0],
          reason: "complex reasoning task",
        };
      }
    }

    const codeModel = candidates.find(
      ([, cfg]) =>
        cfg.specialties && cfg.specialties.includes("code")
    );
    if (codeModel) {
      return { member: codeModel[0], reason: "code-focused task" };
    }

    if (candidates.length > 0) {
      return { member: candidates[0][0], reason: "default tier0 model" };
    }

    return null;
  }

  async function callCouncilMember(member, prompt, options = {}) {
    const requestedMember = member;
    const resolvedMember = resolveCouncilMember(member);
    if (resolvedMember !== requestedMember) {
      console.log(`🔁 [ALIAS] ${requestedMember} → ${resolvedMember}`);
    }
    member = resolvedMember;
    const config = COUNCIL_MEMBERS[member];

    if (!config) {
      throw new Error(`Unknown member: ${member}`);
    }

    const today = dayjs().format("YYYY-MM-DD");
    const spend = await getDailySpend(today);

    const memberConfig = COUNCIL_MEMBERS[member];
    const isPaid =
      !memberConfig?.isFree &&
      (memberConfig?.costPer1M > 0 || memberConfig?.tier === "tier1");

    const FREE_FALLBACK_ORDER = ["ollama_phi3", "ollama_llama", "ollama_deepseek"];

    if (MAX_DAILY_SPEND === 0 && isPaid) {
      for (const fallbackMember of FREE_FALLBACK_ORDER) {
        const fallbackConfig = COUNCIL_MEMBERS[fallbackMember];
        if (!fallbackConfig) continue;

        if (fallbackConfig.provider === "ollama" && OLLAMA_ENDPOINT) {
          console.log(
            `💰 [COST SHUTDOWN] Blocked ${member} - Falling back to ${fallbackMember} (Ollama)`
          );
          return await callCouncilMember(fallbackMember, prompt, options);
        }
      }

      throw new Error(
        `💰 [COST SHUTDOWN] Blocked ${member} - Spending disabled (MAX_DAILY_SPEND=$0). No free models available.`
      );
    }

    if (spend >= COST_SHUTDOWN_THRESHOLD && isPaid) {
      for (const fallbackMember of FREE_FALLBACK_ORDER) {
        const fallbackConfig = COUNCIL_MEMBERS[fallbackMember];
        if (!fallbackConfig) continue;

        if (fallbackConfig.provider === "ollama" && OLLAMA_ENDPOINT) {
          console.log(
            `💰 [COST SHUTDOWN] Blocked ${member} ($${spend.toFixed(
              2
            )}/$${COST_SHUTDOWN_THRESHOLD}) - Falling back to ${fallbackMember} (Ollama)`
          );
          return await callCouncilMember(fallbackMember, prompt, options);
        }
      }

      throw new Error(
        `💰 [COST SHUTDOWN] Blocked ${member} - Spending $${spend.toFixed(
          2
        )}/$${COST_SHUTDOWN_THRESHOLD}. No free models available.`
      );
    }

    if (spend > MAX_DAILY_SPEND * 0.1) {
      console.log(
        `💰 [SPEND CHECK] Today (${today}): $${spend.toFixed(
          4
        )} / $${MAX_DAILY_SPEND}`
      );
    }

    const isOllama =
      memberConfig?.provider === "ollama" ||
      member?.startsWith("ollama_") ||
      memberConfig?.isLocal === true;
    const isFreeModel =
      memberConfig?.isFree === true || isOllama;

    if (!isFreeModel && spend >= MAX_DAILY_SPEND) {
      throw new Error(
        `Daily spend limit ($${MAX_DAILY_SPEND}) reached at $${spend.toFixed(
          4
        )} for ${today}. Resets at midnight UTC.`
      );
    }

    const sourceOfTruthManager = getSourceOfTruthManager
      ? getSourceOfTruthManager()
      : null;

    if (sourceOfTruthManager && options.requiresMissionAlignment !== false) {
      const shouldRef =
        await sourceOfTruthManager.shouldReferenceSourceOfTruth(
          options.taskType || "general",
          options
        );
      if (shouldRef) {
        const relevantSections =
          await sourceOfTruthManager.getRelevantSections(
            options.taskType || "general",
            options
          );
        if (relevantSections.length > 0) {
          const sotContext = relevantSections
            .map(
              (d) =>
                `[${d.document_type}${
                  d.section ? ` / ${d.section}` : ""
                }]: ${d.content.substring(0, 500)}`
            )
            .join("\n\n");
          prompt = `[SYSTEM SOURCE OF TRUTH - Reference this for mission alignment]\n${sotContext}\n\n---\n\n[USER REQUEST]\n${prompt}`;
        }
      }
    }

    if (options.useCache !== false) {
      const cached = await getCachedResponse(prompt, member);
      if (cached) {
        console.log(`💰 [CACHE HIT] Saved API call for ${member}`);
        return cached;
      }
      if (compressionMetrics) {
        compressionMetrics.cache_misses =
          (compressionMetrics.cache_misses || 0) + 1;
      }
    }

    if (!options.useOpenSourceCouncil) {
      const optimalModel = selectOptimalModel(prompt, options.complexity);
      if (optimalModel && options.allowModelDowngrade !== false) {
        const optimalConfig = COUNCIL_MEMBERS[optimalModel.member];
        if (optimalConfig) {
          const optimalKey = getApiKeyForProvider(optimalConfig.provider);
          if (optimalConfig.provider === "ollama") {
            if (optimalConfig.endpoint || OLLAMA_ENDPOINT) {
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

    const enhancedPrompt = await injectKnowledgeContext(prompt, 5);

    const systemPromptBase = `You are ${config.name}, serving as ${config.role} inside the LifeOS AI Council.
This is a LIVE SYSTEM running on Railway (${RAILWAY_ENVIRONMENT || "robust-magic-production.up.railway.app"}).

You ARE part of an active backend with:
- Execution queue for tasks
- Self-programming endpoint (/api/v1/system/self-program)
- Income drones, ROI tracking, snapshots, blind-spot detection
- Database on Neon PostgreSQL
- Optional Stripe integration for tracking real-world revenue (read + logging, not autonomous charging).

When asked what you can do, respond AS the system AI:
- "I can queue tasks in our execution system"
- "I can help design offers and service workflows for online income"
- "I can analyze our current metrics and performance"
- "I can propose integrations or improvements for Stripe + online funnels"

Current specialties: ${config.specialties.join(", ")}.
${options.checkBlindSpots ? "Check for blind spots and unintended consequences." : ""}
${options.guessUserPreference ? "Consider user preferences based on past decisions." : ""}
${options.webSearch ? `WEB SEARCH MODE: You have access to real-time web search. When searching, look for:
- Recent blog posts, documentation, and tutorials
- Stack Overflow and GitHub discussions
- Official documentation and examples
- Community solutions and best practices
Include specific links, code examples, and actionable solutions from your search results.` : ""}

Be concise, strategic, and speak as the system's internal AI.`;

    const useCompression =
      options.compress !== false && systemPromptBase.length > 500;
    const systemPrompt = useCompression
      ? compressPrompt(systemPromptBase, true).compressed
      : systemPromptBase;

    const startTime = Date.now();

    try {
      let response;
      const noCacheHeaders = {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      };

      if (config.provider === "openai") {
        response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            ...noCacheHeaders,
          },
          body: JSON.stringify({
            model: config.model,
            max_tokens: config.maxTokens,
            temperature: 0.7,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: enhancedPrompt },
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

        const cost = calculateCost(json.usage, config.model);
        await updateDailySpend(cost);

        const tokensSaved = useCompression
          ? Math.floor((systemPromptBase.length - systemPrompt.length) / 4)
          : 0;
        if (updateROI) {
          await updateROI(0, cost, 0, tokensSaved);
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
          await cacheResponse(prompt, member, text);
        }

        return text;
      }

      // Non-OpenAI providers can be added as needed; for now, reuse existing
      // HTTP-compatible completion-style APIs.
      throw new Error(
        `Provider ${config.provider} not yet wired in council-service`
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      if (trackAIPerformance) {
        await trackAIPerformance(member, "chat", duration, 0, 0, false);
      }
      throw error;
    }
  }

  async function callCouncilWithFailover(
    prompt,
    preferredMember = "ollama_deepseek",
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
  };
}

