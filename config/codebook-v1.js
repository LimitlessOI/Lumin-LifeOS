/**
 * config/codebook-v1.js
 *
 * LifeOS Compression Language (LCL) — Codebook Version 1
 *
 * A pre-shared symbol table. Both the sender (prompt-translator.js) and the
 * receiver (any council model) know this table. The receiver learns it once via
 * a system block that gets KV-cached — it never travels with each individual
 * message. This is the key insight: both ends know the key, so the key has
 * zero per-call cost.
 *
 * Current phase: Phase 1 — the codebook lives in system prompt context (KV-cached).
 * Future phase:  Phase 2 — custom BPE tokenizer trained on LifeOS codebase.
 * Future phase:  Phase 3 — LoRA fine-tune where the codebook is baked into weights.
 *                          At Phase 3, the key is IN the model — costs 0 tokens ever.
 *
 * VERSIONING RULE: Never modify existing entries in a deployed version.
 * Add new entries only. When breaking changes are needed, create codebook-v2.js.
 * The receiving model was trained on v1 — changing v1 silently breaks it.
 *
 * EXTENSION RULE: Add entries with the longest strings first. The translator
 * matches longest-first to prevent partial collisions (e.g. "*uid" matching
 * inside "*luid" if order is wrong).
 *
 * @ssot docs/projects/AMENDMENT_01_AI_COUNCIL.md
 */

export const CODEBOOK_VERSION = 'v1';

/**
 * TIER 1 — Instruction aliases.
 * Long boilerplate instruction blocks replaced with ID tokens.
 * The full text is defined in INSTRUCTION_BLOCKS below.
 * These are the biggest wins — each one saves 100-500 tokens per call.
 */
export const INSTRUCTION_IDS = {
  'CI:01': 'Generate the complete implementation code. Output ONLY the code — no explanation before or after. Begin with the first line of code. No preamble, no summary after.',
  'CI:02': 'You are a senior engineer working on the LifeOS platform. You write clean, production-quality Node.js/ESM code that follows existing patterns. You never rebuild what already exists. You extend what is there.',
  'CI:03': 'Generate a step-by-step implementation plan. Be specific about file names, function signatures, DB schema changes, and route endpoints. No code yet.',
  'CI:04': 'Review the provided code or diff. Identify bugs, missing edge cases, drift from domain conventions, and anything that contradicts what already exists.',
  'CI:05': 'Think in draft notes — 5 words max per reasoning step. Then output your final answer only. No chain-of-thought in the final response.',
  'CI:06': 'Output ONLY valid JSON. No explanation. No markdown. No code fences. Raw JSON only.',
  'CI:07': 'Be specific and actionable. No vague recommendations. Name exact files, functions, and line ranges.',
  'CI:08': 'Use ESM syntax only. No require(). No CommonJS. All imports at the top of the file.',
  'CI:09': 'Follow existing error handling pattern: try/catch, log.error({ err: err.message }, "[TAG] description"), res.status(500).json({ ok: false, error: "..." }).',
  'CI:10': 'Route handler pattern: async function name(req, res) — extract from req.body, validate, call service, return res.json({ ok: true, ... }). Never inline business logic in the route.',
};

/**
 * TIER 2 — Code pattern aliases.
 * Common code constructs compressed to short symbols.
 * Sorted longest-match first (critical — prevents partial collisions).
 */
export const CODE_SYMBOLS = [
  // ── Full common expressions ─────────────────────────────────────────────────
  ['TIMESTAMP WITH TIME ZONE DEFAULT NOW()', '*tsz'],
  ['UUID DEFAULT gen_random_uuid()', '*uuid'],
  ['CREATE TABLE IF NOT EXISTS', '*ct'],
  ['ON CONFLICT DO NOTHING', '*ocdn'],
  ['ON CONFLICT', '*oc'],
  ['RETURNING *', '*ret'],
  ['INSERT INTO', '*ins'],
  ['ALTER TABLE', '*at'],
  ['CREATE INDEX', '*ci'],
  ['INNER JOIN', '*ij'],
  ['LEFT JOIN', '*lj'],
  ['NOT NULL', '*nn'],
  ['DEFAULT NOW()', '*now'],

  // ── LifeOS identifiers ──────────────────────────────────────────────────────
  ['lifeos_user_id', '*luid'],
  ['callCouncilMember', '*ccm'],
  ['pool.query', '*pq'],
  ['requireKey', '*rk'],
  ['token_usage_log', '*tul'],
  ['free_tier_usage', '*ftu'],
  ['user_id', '*uid'],

  // ── Node.js / Express ───────────────────────────────────────────────────────
  ['res.json({ ok: false, error:', '*jerr('],
  ['res.json({ ok: true,', '*jok('],
  ['res.status(400).json', '*j400'],
  ['res.status(500).json', '*j500'],
  ['async function', '*afn'],
  ['async (req, res)', '*route'],
  ['export function', '*exp'],
  ['req.body', '*body'],
  ['req.params', '*prm'],
  ['req.query', '*qry'],
  ['log.error', '*lerr'],
  ['log.info', '*linfo'],
  ['log.warn', '*lwarn'],

  // ── ESM imports ─────────────────────────────────────────────────────────────
  ['import { readdir, readFile } from', '*fsimport'],
  ['import { join, dirname } from', '*pathimport'],
  ['import { fileURLToPath } from', '*urlimport'],
];

/**
 * The system block sent to the model ONCE at session start.
 * After first call, this gets KV-cached by the provider — costs 0 tokens thereafter.
 * Do NOT change this string without bumping CODEBOOK_VERSION.
 */
export function buildCodebookSystemBlock() {
  const instructionLines = Object.entries(INSTRUCTION_IDS)
    .map(([id, text]) => `${id}: ${text}`)
    .join('\n');

  const symbolLines = CODE_SYMBOLS
    .map(([full, sym]) => `${sym}=${full}`)
    .join(' | ');

  return [
    `=== LCL CODEBOOK ${CODEBOOK_VERSION} ===`,
    'You have been given a compression codebook. All prompts in this session may use these aliases.',
    'Decode them before processing. Respond using plain text (codebook is input-only).',
    '',
    '--- INSTRUCTION ALIASES ---',
    instructionLines,
    '',
    '--- CODE SYMBOLS ---',
    symbolLines,
    '=== END CODEBOOK ===',
  ].join('\n');
}

/**
 * Reverse map: symbol → full text (for decompression of any reflected output).
 * Built once at module load.
 */
export const SYMBOL_TO_FULL = Object.fromEntries(
  CODE_SYMBOLS.map(([full, sym]) => [sym, full])
);
