/**
 * services/prompt-translator.js
 *
 * LifeOS Compression Language (LCL) — Prompt Translator
 *
 * Every outgoing prompt passes through here before hitting any AI provider.
 * The translator:
 *   1. Applies the versioned codebook (CODE_SYMBOLS + INSTRUCTION_IDS)
 *   2. Applies the existing PHRASE_TABLE from token-optimizer.js
 *   3. Strips noise (whitespace, markdown for non-display prompts)
 *   4. Decides routing tier: free → free-with-escalation → paid
 *
 * The codebook system block is injected ONCE per model session (KV-cached).
 * Every subsequent message uses shorthand — the model already has the key.
 *
 * Routing tiers:
 *   FREE   — Groq Llama / Gemini Flash (default for all tasks)
 *   SMART  — Gemini Flash (complex reasoning, spec > 2000 tokens)
 *   PAID   — Only if MAX_DAILY_SPEND > 0 AND all free providers exhausted
 *             AND task is flagged HIGH_STAKES (medical, billing, legal)
 *
 * Phase roadmap (documented here for future agents):
 *   Phase 1 (now)  — Codebook in system prompt, KV-cached per session
 *   Phase 2 (later) — Custom BPE tokenizer trained on LifeOS codebase
 *   Phase 3 (later) — LoRA fine-tune: codebook baked into model weights,
 *                      0 tokens ever for the key, 10-25x efficiency vs generic LLMs
 *
 * @ssot docs/projects/AMENDMENT_01_AI_COUNCIL.md
 */

import {
  CODEBOOK_VERSION,
  INSTRUCTION_IDS,
  CODE_SYMBOLS,
  buildCodebookSystemBlock,
} from '../config/codebook-v1.js';
import { DOMAIN_CODE_SYMBOLS } from '../config/codebook-domains.js';
import { compress, estimateTokens } from './token-optimizer.js';

// ── Routing thresholds ────────────────────────────────────────────────────────

// Prompts over this token count get routed to Gemini Flash instead of Groq
// (Gemini has a larger context window and handles long specs better)
const SMART_TIER_TOKEN_THRESHOLD = 1500;

// Keywords that flag a task as HIGH_STAKES — requires paid model if available
// and all free providers are exhausted. Default is always free.
const HIGH_STAKES_KEYWORDS = [
  'hipaa', 'medical record', 'billing charge', 'credit card', 'payment processor',
  'legal liability', 'compliance violation', 'delete all', 'drop table',
];

// ── Session codebook state ────────────────────────────────────────────────────
// Tracks which model keys have received the codebook system block this session.
// Once injected, it's KV-cached by the provider — no need to resend.
const codebookInjectedFor = new Set();

// ── Core translation functions ────────────────────────────────────────────────

/**
 * Apply instruction ID aliases: replace full instruction text with [CI:xx] tokens.
 * Longest strings matched first (already sorted in INSTRUCTION_IDS by length at authoring time).
 */
function applyInstructionAliases(text) {
  let result = text;
  // Sort by full text length descending to avoid partial collisions
  const entries = Object.entries(INSTRUCTION_IDS).sort(([, a], [, b]) => b.length - a.length);
  for (const [id, full] of entries) {
    if (result.includes(full)) {
      result = result.replaceAll(full, `[${id}]`);
    }
  }
  return result;
}

/**
 * Apply code symbol aliases: replace long code patterns with short symbols.
 * CODE_SYMBOLS is already sorted longest-first in the config.
 */
function applyCodeSymbols(text) {
  let result = text;
  for (const [full, sym] of CODE_SYMBOLS) {
    if (result.includes(full)) {
      result = result.replaceAll(full, sym);
    }
  }
  return result;
}

/** Domain-specific overlays (longest entries should be listed first per domain). */
function applyDomainCodeSymbols(text, domain) {
  const entries = DOMAIN_CODE_SYMBOLS[domain];
  if (!entries?.length) return text;
  let result = text;
  for (const [full, sym] of entries) {
    if (result.includes(full)) {
      result = result.replaceAll(full, sym);
    }
  }
  return result;
}

/**
 * Determine routing tier for a prompt.
 *
 * @param {string} text — the compressed prompt text
 * @param {object} opts
 *   - taskType {string}   — e.g. 'council.builder.code'
 *   - forceSmart {boolean} — caller requests Gemini Flash
 * @returns {{ tier: 'free'|'smart'|'paid', reason: string, suggestedModel: string }}
 */
function classifyRoutingTier(text, opts = {}) {
  const { taskType = '', forceSmart = false } = opts;

  // HIGH_STAKES check — only use paid if env allows and free is exhausted
  const lowerText = text.toLowerCase();
  const isHighStakes = HIGH_STAKES_KEYWORDS.some(kw => lowerText.includes(kw));
  if (isHighStakes) {
    return {
      tier: 'paid',
      reason: 'HIGH_STAKES keyword detected',
      suggestedModel: 'gemini_flash', // still try free first; council-service escalates if exhausted
    };
  }

  // Long prompt or caller override → Gemini Flash (larger context window)
  const tokenCount = estimateTokens(text);
  if (forceSmart || tokenCount > SMART_TIER_TOKEN_THRESHOLD) {
    return {
      tier: 'smart',
      reason: tokenCount > SMART_TIER_TOKEN_THRESHOLD
        ? `prompt length ${tokenCount} tokens exceeds threshold ${SMART_TIER_TOKEN_THRESHOLD}`
        : 'caller requested smart tier',
      suggestedModel: 'gemini_flash',
    };
  }

  // Default: Groq (fastest, cheapest, free)
  return {
    tier: 'free',
    reason: 'standard task, free tier sufficient',
    suggestedModel: 'groq_llama',
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * createPromptTranslator — factory that wraps the translation + routing logic.
 *
 * @param {object} opts
 *   - logger {object}  — pino-compatible logger
 * @returns {{ translate, getCodebookBlock, shouldInjectCodebook, markInjected, resetSession }}
 */
export function createPromptTranslator({ logger } = {}) {
  const log = logger || console;

  /**
   * Translate a prompt through the full compression stack.
   *
   * @param {string} prompt         — raw prompt text
   * @param {object} opts
   *   - taskType    {string}  — task type for routing decisions
   *   - stripMd     {boolean} — strip markdown (default true)
   *   - critical    {boolean} — if true, only strip noise (no symbol substitution)
   *   - forceSmart  {boolean} — route to Gemini Flash regardless of length
   *   - domain      {string}  — optional overlay key from `config/codebook-domains.js`
   * @returns {{
   *   prompt: string,          — compressed prompt ready to send
   *   originalTokens: number,
   *   compressedTokens: number,
   *   savedTokens: number,
   *   savingsPct: number,
   *   routing: object,         — { tier, reason, suggestedModel }
   *   codebookVersion: string,
   *   layers: string[],        — which compression layers fired
   * }}
   */
  function translate(prompt, opts = {}) {
    const { taskType = '', stripMd = true, critical = false, forceSmart = false, domain = '' } = opts;
    const originalTokens = estimateTokens(prompt);
    const layers = [];

    let text = prompt;

    // Layer 1: existing noise/markdown strip (from token-optimizer.js compress())
    const baseCompressed = compress(text, { stripMd, phraseSub: true, critical });
    text = baseCompressed.text;
    if (baseCompressed.savedTokens > 0) layers.push('noise+phrase');

    // Layer 2: instruction ID aliases (only for non-critical prompts)
    if (!critical) {
      const before = text.length;
      text = applyInstructionAliases(text);
      if (text.length < before) layers.push('instruction_alias');
    }

    // Layer 3: code symbol aliases (only for non-critical prompts)
    if (!critical) {
      const before = text.length;
      text = applyCodeSymbols(text);
      if (text.length < before) layers.push('code_symbols');
    }

    // Layer 3b: per-domain overlays (optional)
    if (!critical && domain && DOMAIN_CODE_SYMBOLS[domain]) {
      const before = text.length;
      text = applyDomainCodeSymbols(text, domain);
      if (text.length < before) layers.push(`domain:${domain}`);
    }

    const compressedTokens = estimateTokens(text);
    const savedTokens = originalTokens - compressedTokens;
    const savingsPct = originalTokens > 0
      ? Math.round((savedTokens / originalTokens) * 100)
      : 0;

    const routing = classifyRoutingTier(text, { taskType, forceSmart });

    log.info({
      originalTokens,
      compressedTokens,
      savedTokens,
      savingsPct: `${savingsPct}%`,
      layers,
      routing: routing.tier,
      model: routing.suggestedModel,
    }, '[TRANSLATOR] Prompt translated');

    return {
      prompt: text,
      originalTokens,
      compressedTokens,
      savedTokens,
      savingsPct,
      routing,
      codebookVersion: CODEBOOK_VERSION,
      layers,
    };
  }

  /**
   * Get the codebook system block to prepend once per model session.
   * After first call, the provider KV-caches it — subsequent calls don't re-send it.
   */
  function getCodebookBlock() {
    return buildCodebookSystemBlock();
  }

  /**
   * Returns true if the codebook has NOT yet been injected for a given model key.
   * Call this before building the system prompt — inject the codebook block if true.
   *
   * @param {string} modelKey — council member key e.g. 'groq_llama'
   */
  function shouldInjectCodebook(modelKey) {
    return !codebookInjectedFor.has(modelKey);
  }

  /**
   * Mark that a model key has received the codebook this session.
   * @param {string} modelKey
   */
  function markInjected(modelKey) {
    codebookInjectedFor.add(modelKey);
  }

  /**
   * Reset injection state (call on Railway restart or codebook version bump).
   */
  function resetSession() {
    codebookInjectedFor.clear();
    log.info('[TRANSLATOR] Session codebook state reset');
  }

  /**
   * Convenience: translate + determine if codebook injection is needed,
   * returning everything the caller needs to build the final API payload.
   *
   * @param {string} systemPrompt
   * @param {string} userPrompt
   * @param {string} modelKey     — the council member that will receive this
   * @param {object} opts         — passed to translate()
   * @returns {{
   *   systemPrompt: string,      — may have codebook block prepended
   *   userPrompt: string,        — compressed
   *   routing: object,
   *   stats: object,
   * }}
   */
  function prepareCall(systemPrompt, userPrompt, modelKey, opts = {}) {
    // Translate both prompts
    const sysResult = translate(systemPrompt, { ...opts, critical: true }); // system prompts: noise only
    const userResult = translate(userPrompt, opts);

    // Inject codebook into system prompt once per model key
    let finalSystem = sysResult.prompt;
    if (shouldInjectCodebook(modelKey)) {
      finalSystem = getCodebookBlock() + '\n\n' + finalSystem;
      markInjected(modelKey);
    }

    return {
      systemPrompt: finalSystem,
      userPrompt: userResult.prompt,
      routing: userResult.routing,
      stats: {
        systemSaved: sysResult.savedTokens,
        userSaved: userResult.savedTokens,
        totalSaved: sysResult.savedTokens + userResult.savedTokens,
        savingsPct: userResult.savingsPct,
        layers: [...new Set([...sysResult.layers, ...userResult.layers])],
        codebookInjected: !codebookInjectedFor.has(modelKey) || sysResult.prompt !== finalSystem,
      },
    };
  }

  return {
    translate,
    getCodebookBlock,
    shouldInjectCodebook,
    markInjected,
    resetSession,
    prepareCall,
  };
}
