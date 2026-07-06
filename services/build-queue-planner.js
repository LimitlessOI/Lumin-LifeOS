/**
 * SYNOPSIS: Build-queue planner — turns a product's PRODUCT_HOME backlog into a
 * validated product_build_queue_v1 so ANY product can self-enroll into the
 * autonomous build loop without a human hand-authoring steps. This is the
 * "scale" lever: the orchestrator executes queues; this generates them.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { STEP_STATUS } from './product-build-orchestrator.js';

// Only strong, paid models are hardwired into what the system ships (founder rule).
export const PLANNER_MODEL = process.env.BUILD_QUEUE_PLANNER_MODEL || 'claude_sonnet';
const MAX_STEPS = 12;

// Backlog lives under headings that describe remaining/next work. Deterministic,
// no model call — we only feed the model REAL documented work, never invent it.
const BACKLOG_HEADING = /^#{1,6}\s*(build plan|remaining|not (yet )?done|to ?do|next|backlog|missing|roadmap)\b/i;
const HEADING = /^#{1,6}\s+/;
const BULLET = /^\s*(?:[-*+]|\d+[.)])\s+(.*\S)\s*$/;

/**
 * Pull candidate remaining-work bullet lines from a PRODUCT_HOME.md body. Reads
 * bullets that sit under a backlog-style heading until the next heading. Returns
 * de-duplicated, trimmed strings (never fabricated — purely extracted).
 */
export function extractBacklog(homeText) {
  if (typeof homeText !== 'string' || !homeText.trim()) return [];
  const lines = homeText.split(/\r?\n/);
  const out = [];
  const seen = new Set();
  let inBacklog = false;
  for (const line of lines) {
    if (HEADING.test(line)) {
      inBacklog = BACKLOG_HEADING.test(line);
      continue;
    }
    if (!inBacklog) continue;
    const m = line.match(BULLET);
    if (!m) continue;
    const text = m[1].replace(/^\**|\**$/g, '').trim();
    // skip items already marked done/shipped
    if (/^(done|shipped|complete|✅|~~)/i.test(text)) continue;
    const key = text.toLowerCase();
    if (text.length < 6 || seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

const UI_HINT = /\b(ui|panel|page|screen|customi[sz]e|logo|design|frontend|client-facing|overlay|\.html)\b/i;

/**
 * Founder-gate anything customer/UI-facing by default — those need Adam's eyes
 * before they ship (the "attempt 35" waste is re-building gated work; the
 * inverse waste is auto-shipping UI nobody approved).
 */
export function shouldFounderGate(step) {
  return UI_HINT.test(`${step.target_file || ''} ${step.task || ''} ${step.spec || ''}`);
}

function slugify(value, fallback) {
  const s = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return s || fallback;
}

/**
 * Coerce a raw model-proposed step into the canonical, always-pending shape the
 * orchestrator expects. Returns null when required fields are missing (we never
 * invent a target_file or task to fill a gap).
 */
export function normalizePlannedStep(raw, productId, index) {
  if (!raw || typeof raw !== 'object') return null;
  const target_file = String(raw.target_file || '').trim();
  const task = String(raw.task || '').trim();
  if (!target_file || !task) return null;
  const id = slugify(raw.id || task, `${productId}-step-${index + 1}`);
  const step = {
    id,
    status: STEP_STATUS.PENDING,
    target_file,
    task,
    spec: String(raw.spec || task).trim(),
    depends_on: Array.isArray(raw.depends_on) ? raw.depends_on.map(String) : [],
    founder_gated: Boolean(raw.founder_gated),
    attempts: 0,
  };
  if (!step.founder_gated && shouldFounderGate(step)) step.founder_gated = true;
  if (step.founder_gated) step.status = STEP_STATUS.FOUNDER_GATED;
  return step;
}

/**
 * Validate a planned queue against product_build_queue_v1 without touching disk.
 * Returns { ok, errors[] }.
 */
export function validatePlannedQueue(queue) {
  const errors = [];
  if (!queue || queue.schema !== 'product_build_queue_v1') errors.push('schema must be product_build_queue_v1');
  if (!queue || !queue.product_id) errors.push('product_id required');
  const steps = Array.isArray(queue?.steps) ? queue.steps : [];
  if (!steps.length) errors.push('at least one step required');
  const ids = new Set();
  for (const s of steps) {
    if (!s.id) errors.push('step missing id');
    else if (ids.has(s.id)) errors.push(`duplicate step id: ${s.id}`);
    else ids.add(s.id);
    if (!s.target_file) errors.push(`step ${s.id || '?'} missing target_file`);
    if (!s.task) errors.push(`step ${s.id || '?'} missing task`);
  }
  for (const s of steps) {
    for (const dep of s.depends_on || []) {
      if (!ids.has(dep)) errors.push(`step ${s.id} depends on unknown step ${dep}`);
    }
  }
  return { ok: errors.length === 0, errors };
}

function buildPrompt(productId, backlog, verifyScript) {
  return `You are a build planner for an autonomous software factory. Turn the REAL, already-documented remaining work for product "${productId}" into an ordered JSON build queue.

DOCUMENTED REMAINING WORK (do NOT invent anything beyond these items — each step must map to one of them):
${backlog.map((b, i) => `${i + 1}. ${b}`).join('\n')}

Rules:
- Output ONLY minified JSON, no prose, no markdown fences.
- Shape: {"steps":[{"id","target_file","task","spec","depends_on":[],"founder_gated":bool}]}
- Each step edits exactly ONE concrete repo file (target_file). Prefer existing conventional paths (services/*.js, routes/*.js, public/overlay/*.html, scripts/*.mjs).
- "task" is a short imperative; "spec" is the acceptance/definition-of-done for that file.
- Set founder_gated:true for any customer-facing UI or brand/design surface.
- Use depends_on (by step id) only when one step truly requires another first.
- At most ${MAX_STEPS} steps. Ground every step in the documented work above; if an item is too vague to build, omit it rather than guessing.
${verifyScript ? `- The product's verify command is: ${verifyScript}` : ''}`;
}

function parseModelJson(text) {
  if (typeof text !== 'string') return null;
  let s = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try { return JSON.parse(s.slice(start, end + 1)); } catch { return null; }
}

/**
 * Plan a BUILD_QUEUE for a product from its PRODUCT_HOME text.
 *
 * Dependency-injected `callModel(model, prompt, opts) -> string` (e.g. the
 * council's callCouncilMember) — separation from I/O keeps this unit-testable
 * and model-agnostic. Fail-closed: returns null (never a fabricated queue) when
 * there is no documented backlog, the model is missing/broken, or nothing valid
 * comes back. `existingQueue` steps are preserved and new steps are de-duplicated
 * against them by id and by (target_file+task).
 *
 * @returns {Promise<{queue, added, source}|null>}
 */
export async function planBuildQueue({
  productId,
  homeText,
  existingQueue = null,
  verifyScript = null,
  callModel,
  model = PLANNER_MODEL,
  maxSteps = MAX_STEPS,
  logger = console,
} = {}) {
  if (!productId) return null;
  const backlog = extractBacklog(homeText);
  if (!backlog.length) {
    logger?.info?.({ productId }, '[BUILD-QUEUE-PLANNER] no documented backlog — nothing to plan');
    return null;
  }
  if (typeof callModel !== 'function') {
    logger?.warn?.({ productId }, '[BUILD-QUEUE-PLANNER] no callModel — fail closed');
    return null;
  }

  let raw;
  try {
    raw = await callModel(model, buildPrompt(productId, backlog, verifyScript), {
      maxOutputTokens: 2000,
      allowModelDowngrade: false,
    });
  } catch (e) {
    logger?.warn?.({ productId, error: e.message }, '[BUILD-QUEUE-PLANNER] model call failed — fail closed');
    return null;
  }

  const parsed = parseModelJson(raw);
  const proposed = Array.isArray(parsed?.steps) ? parsed.steps : [];
  if (!proposed.length) return null;

  const existingSteps = Array.isArray(existingQueue?.steps) ? existingQueue.steps : [];
  const existingIds = new Set(existingSteps.map((s) => s.id));
  const existingFingerprints = new Set(existingSteps.map((s) => `${s.target_file}::${s.task}`.toLowerCase()));

  const added = [];
  for (let i = 0; i < proposed.length && added.length < maxSteps; i++) {
    const step = normalizePlannedStep(proposed[i], productId, existingSteps.length + i);
    if (!step) continue;
    const fp = `${step.target_file}::${step.task}`.toLowerCase();
    if (existingIds.has(step.id) || existingFingerprints.has(fp)) continue;
    // ensure id uniqueness after slugify collisions
    let uid = step.id;
    let n = 2;
    while (existingIds.has(uid)) uid = `${step.id}-${n++}`;
    step.id = uid;
    existingIds.add(uid);
    existingFingerprints.add(fp);
    added.push(step);
  }

  if (!added.length) return null;

  const queue = {
    schema: 'product_build_queue_v1',
    product_id: productId,
    ...(verifyScript ? { verify_script: verifyScript } : (existingQueue?.verify_script ? { verify_script: existingQueue.verify_script } : {})),
    planned_at: new Date().toISOString(),
    steps: [...existingSteps, ...added],
  };

  const check = validatePlannedQueue(queue);
  if (!check.ok) {
    logger?.warn?.({ productId, errors: check.errors }, '[BUILD-QUEUE-PLANNER] planned queue invalid — fail closed');
    return null;
  }

  return { queue, added, source: 'planner' };
}
