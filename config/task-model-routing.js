/**
 * SYNOPSIS: config/task-model-routing.js
 *
 * Maps task type strings to council member keys.
 * Static preferences only. Runtime task authority may reorder or block.
 *
 * Rule: start with a STRONG, PAID, provider-diverse model for high-stakes
 * reasoning/code; never start with the cheapest/free tier (SO-003). Fail over
 * to another provider, never sit idle. The model mapping is the first line of
 * the conductor's one-pathway track — the AI cats are not allowed to downgrade
 * themselves unless the caller explicitly opts in.
 *
 * Usage:
 *   import { getModelForTask } from './config/task-model-routing.js';
 *   const member = getModelForTask('lifeos.lumin.chat');  // → 'claude_sonnet'
 *   const result = await callCouncilMember(member, prompt, { maxOutputTokens: 500 });
 *
 * IMPORTANT: Use `maxOutputTokens` (NOT `maxTokens`) to override output length.
 * council-service reads `options.maxOutputTokens`; `options.maxTokens` is silently ignored.
 *
 * @ssot docs/products/ai-council/PRODUCT_HOME.md
 */

/**
 * Task → council member key.
 *
 * Keys must match entries in config/council-members.js COUNCIL_MEMBERS object.
 *
 * Tier guide (strong-first, paid-first, provider-diverse):
 *   claude_sonnet — chair, primary code author, complex reasoning, long-form output
 *   openai_gpt    — general conversation, reasoning, analysis, openai direct
 *   openai_builder_standard — standard BuilderOS reasoning/review lane
 *   openai_builder_escalation — stronger BuilderOS escalation lane
 *   openai_builder_mini — cheapest-capable bounded BuilderOS execution lane
 *   century       — long-horizon strategy / architect-level reasoning
 *   deepseek      — structured extraction, fast JSON, code-review fallback
 *   gemini_flash  — fast summaries and lightweight tasks (free)
 *   groq_llama    — fast routing and classification (free)
 */
export const TASK_MODEL_MAP = {
  // ── LifeOS: Lumin AI ──────────────────────────────────────────────────────
  'lifeos.lumin.chat':               'claude_sonnet',       // Chair — user-facing conversation
  'lifeos.lumin.context_snapshot':   'openai_gpt',          // context summary / status
  'lifeos.lumin.program_plan':       'openai_builder_standard', // structured plan for repo changes

  // ── LifeOS: Emotional ─────────────────────────────────────────────────────
  'lifeos.emotional.analyze_patterns': 'claude_sonnet',     // high-stakes pattern analysis
  'lifeos.emotional.early_warning':    'openai_gpt',        // classification
  'lifeos.emotional.detect_sabotage':  'claude_sonnet',     // chair-level detection

  // ── LifeOS: Truth Delivery ────────────────────────────────────────────────
  'lifeos.truth.generate':           'claude_sonnet',       // calibrated truth statement
  'lifeos.truth.calibration':        null,                  // pure SQL, no AI needed

  // ── LifeOS: Weekly Review ─────────────────────────────────────────────────
  'lifeos.weekly.generate_letter':   'claude_sonnet',       // 4-6 paragraph narrative
  'lifeos.weekly.conversation':      'claude_sonnet',       // interactive session
  'lifeos.weekly.extract_actions':   'deepseek',            // structured JSON extraction

  // ── LifeOS: Daily Scorecard ───────────────────────────────────────────────
  'lifeos.scorecard.narrative':      'openai_gpt',          // short AI narrative
  'lifeos.scorecard.compute':        null,                  // pure math, no AI

  // ── LifeOS: Conflict ──────────────────────────────────────────────────────
  'lifeos.conflict.detect_escalation': 'openai_gpt',        // keyword + classify
  'lifeos.conflict.mediation':         'claude_sonnet',     // chair-level facilitation
  'lifeos.conflict.pattern_learn':     null,                // pure SQL

  // ── LifeOS: Decision Intelligence ────────────────────────────────────────────
  'lifeos.decisions.second_opinion':   'claude_sonnet',
  'lifeos.decisions.bias_detect':      'openai_gpt',
  'lifeos.decisions.outcome_convo':    'claude_sonnet',

  // ── LifeOS: Purpose / Monetization ───────────────────────────────────────────
  'lifeos.purpose.synthesize':         'century',           // long-horizon strategy
  'lifeos.monetization.draft_outreach': 'openai_gpt',

  // ── LifeOS: Health ───────────────────────────────────────────────────────
  'lifeos.health.pattern_analysis':    'openai_gpt',

  // ── Council / Builder ────────────────────────────────────────────────────
  'council.builder.task':             'openai_builder_standard',
  'council.builder.code':             'openai_builder_standard', // avoid Anthropic credit-dry failures; openai failover in council-service handles retries
  'council.builder.code_execute':     'openai_builder_mini',
  'council.builder.plan':             'century',             // architect-level planning
  'council.builder.review':           'openai_builder_escalation', // openai escalation lane while Anthropic is credit-dry
  'council.builder.code_review':      'openai_builder_standard', // openai while Anthropic is credit-dry
  'council.gate_change.debate':       'century',             // governance / strategy

  // ── Site Builder ─────────────────────────────────────────────────────────
  'site_builder.generate_site':       'claude_sonnet',       // full HTML generation (needs >4k tokens)
  'site_builder.repair_site':         'openai_builder_standard', // HTML repair pass
  'site_builder.extract_business':    'deepseek',            // structured JSON extraction
  'site_builder.generate_blogs':      'claude_sonnet',       // 3x blog posts (> 4k tokens)
  'site_builder.draft_cold_email':    'openai_gpt',

  // ── Email / Outreach ─────────────────────────────────────────────────────
  'outreach.email.draft':             'openai_gpt',
  'outreach.crm.classify':            'openai_gpt',

  // ── Autonomy / Self-improvement ───────────────────────────────────────────
  'autonomy.self_improve':            'century',             // long-horizon improvement
  'autonomy.event_ingest':            'openai_gpt',          // classify conversation events
};

/** Default model when task type is unknown */
export const DEFAULT_MODEL = 'openai_gpt';
export const TRUSTED_FALLBACK_MODELS = [
  'openai_builder_standard',
  'openai_gpt',
  'deepseek',
  'claude_sonnet',
  'openai_builder_escalation',
  'gemini_flash',
  'groq_llama',
  'openai_builder_mini',
];

/**
 * Get the council member key for a given task type.
 * Returns null if the task requires no AI (pure computation).
 * Returns DEFAULT_MODEL if the task type is unrecognized.
 *
 * @param {string} taskType — e.g. 'lifeos.lumin.chat'
 * @returns {string|null} council member key
 */
export function getModelForTask(taskType) {
  if (Object.prototype.hasOwnProperty.call(TASK_MODEL_MAP, taskType)) {
    return TASK_MODEL_MAP[taskType]; // may be null (no AI needed)
  }
  return DEFAULT_MODEL;
}

/**
 * Candidate models for a task, ordered by platform preference before runtime authority/performance filtering.
 * The memory-intelligence layer may reorder or block these at runtime.
 *
 * @param {string} taskType
 * @returns {string[]}
 */
export function getCandidateModelsForTask(taskType) {
  const mapped = getModelForTask(taskType);
  const ordered = [
    mapped,
    DEFAULT_MODEL,
    ...TRUSTED_FALLBACK_MODELS,
  ].filter(Boolean);
  return [...new Set(ordered)];
}

/**
 * Check if a task type requires an AI call at all.
 * @param {string} taskType
 * @returns {boolean}
 */
export function taskRequiresAI(taskType) {
  return getModelForTask(taskType) !== null;
}

/**
 * Build a callAI function pre-routed for a specific task type.
 * Convenience wrapper — pass this as `callAI` to services that need it.
 *
 * @param {string} taskType
 * @param {Function} callCouncilMember — the raw callCouncilMember from council-service
 * @returns {Function} async (prompt) => string
 */
export function buildTaskAI(taskType, callCouncilMember) {
  const member = getModelForTask(taskType);
  if (!member) return null; // task needs no AI

  return async (prompt) => {
    try {
      const result = await callCouncilMember(member, prompt);
      return typeof result === 'string' ? result : result?.content || result?.text || '';
    } catch {
      return '';
    }
  };
}
