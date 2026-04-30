/**
 * config/task-model-routing.js
 *
 * Maps task type strings to council member keys.
 * This file defines static preferences only. Runtime task authority from
 * the memory-intelligence layer may reorder or block these choices.
 *
 * Rule: use the CHEAPEST model that can do the job CORRECTLY.
 * Free models (Gemini Flash, Groq) for routing/classification/planning.
 * claude_sonnet for any code generation — free models truncate and emit wrong syntax.
 *
 * Usage:
 *   import { getModelForTask } from './config/task-model-routing.js';
 *   const member = getModelForTask('lifeos.lumin.chat');  // → 'gemini_flash'
 *   const result = await callCouncilMember(member, prompt);
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

/**
 * Task → council member key.
 *
 * Keys must match entries in config/council-members.js COUNCIL_MEMBERS object.
 *
 * Tier guide:
 *   groq_llama    — fast, cheap, great for classification + structured extraction + **literal codegen** when spec is frozen (`council.builder.code_execute`)
 *   gemini_flash  — better reasoning, still free, use for narratives + conversation + open-ended codegen
 *   ollama_deepseek_v3 — local, best reasoning, use only for complex on-demand tasks
 *   gemini_flash  — default fallback
 */
export const TASK_MODEL_MAP = {
  // ── LifeOS: Lumin AI ──────────────────────────────────────────────────────
  'lifeos.lumin.chat':               'gemini_flash',   // user-facing conversation
  'lifeos.lumin.context_snapshot':   'groq_llama',     // pure DB, but if AI needed
  'lifeos.lumin.program_plan':       'gemini_flash',   // Lumin build: structured plan for repo changes

  // ── LifeOS: Emotional ─────────────────────────────────────────────────────
  'lifeos.emotional.analyze_patterns':     'gemini_flash',
  'lifeos.emotional.early_warning':        'groq_llama',   // classification
  'lifeos.emotional.detect_sabotage':      'gemini_flash',

  // ── LifeOS: Truth Delivery ────────────────────────────────────────────────
  'lifeos.truth.generate':           'gemini_flash',   // calibrated truth statement
  'lifeos.truth.calibration':        null,             // pure SQL, no AI needed

  // ── LifeOS: Weekly Review ─────────────────────────────────────────────────
  'lifeos.weekly.generate_letter':   'gemini_flash',   // 4-6 paragraph narrative
  'lifeos.weekly.conversation':      'gemini_flash',   // interactive session
  'lifeos.weekly.extract_actions':   'groq_llama',     // JSON extraction from text

  // ── LifeOS: Daily Scorecard ───────────────────────────────────────────────
  'lifeos.scorecard.narrative':      'groq_llama',     // short AI narrative
  'lifeos.scorecard.compute':        null,             // pure math, no AI

  // ── LifeOS: Conflict ──────────────────────────────────────────────────────
  'lifeos.conflict.detect_escalation': 'groq_llama',  // keyword + classify
  'lifeos.conflict.mediation':         'gemini_flash', // impartial facilitation
  'lifeos.conflict.pattern_learn':     null,           // pure SQL

  // ── LifeOS: Decision Intelligence ────────────────────────────────────────
  'lifeos.decisions.second_opinion':   'gemini_flash',
  'lifeos.decisions.bias_detect':      'groq_llama',
  'lifeos.decisions.outcome_convo':    'gemini_flash',

  // ── LifeOS: Purpose / Monetization ───────────────────────────────────────
  'lifeos.purpose.synthesize':         'gemini_flash',
  'lifeos.monetization.draft_outreach': 'groq_llama',

  // ── LifeOS: Health ───────────────────────────────────────────────────────
  'lifeos.health.pattern_analysis':    'gemini_flash',

  // ── Council / Builder ────────────────────────────────────────────────────
  // NOTE: claude_via_openrouter hitting HTTP 402 (OpenRouter credits exhausted) as of 2026-04-30.
  // Temporarily routed to gemini_flash (free tier, SET on Railway) until OpenRouter is topped up.
  // Restore to claude_via_openrouter once credits are added: https://openrouter.ai/credits
  'council.builder.task':             'gemini_flash',    // was: claude_via_openrouter
  'council.builder.code':             'gemini_flash',    // was: claude_via_openrouter
  'council.builder.code_execute':     'groq_llama',      // frozen spec → groq is fast enough
  'council.builder.plan':             'gemini_flash',    // planning is free-tier safe
  'council.builder.review':           'gemini_flash',    // was: claude_via_openrouter
  'council.builder.code_review':      'gemini_flash',    // was: claude_via_openrouter
  'council.gate_change.debate':       'gemini_flash',    // was: claude_via_openrouter

  // ── Email / Outreach ─────────────────────────────────────────────────────
  'outreach.email.draft':             'groq_llama',
  'outreach.crm.classify':            'groq_llama',

  // ── Autonomy / Self-improvement ───────────────────────────────────────────
  'autonomy.self_improve':            'gemini_flash',
  'autonomy.event_ingest':            'groq_llama',    // classify conversation events
};

/** Default model when task type is unknown */
export const DEFAULT_MODEL = 'gemini_flash';
export const TRUSTED_FALLBACK_MODELS = [
  'gemini_flash',
  'groq_llama',
  'deepseek',
  'ollama_deepseek_v3',
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
