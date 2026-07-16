/**
 * SYNOPSIS: Build-queue planner — turns a product's PRODUCT_HOME backlog into a
 * validated product_build_queue_v1 so ANY product can self-enroll into the
 * autonomous build loop without a human hand-authoring steps. This is the
 * "scale" lever: the orchestrator executes queues; this generates them.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STEP_STATUS } from './product-build-orchestrator.js';
import { parseRouteDeclaration } from '../factory-staging/factory-core/bpb/build-queue-step-adapter.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Only strong, paid models are hardwired into what the system ships (founder rule).
export const PLANNER_MODEL = process.env.BUILD_QUEUE_PLANNER_MODEL || 'claude_sonnet';
const MAX_STEPS = 12;

// Backlog lives under headings that describe remaining/next work. Deterministic,
// no model call — we only feed the model REAL documented work, never invent it.
const BACKLOG_HEADING = /^#{1,6}\s*(?:\d+\.\s*)?(?:current\s+bp|approved\s+product\s+backlog|build plan|remaining(?:\s+work)?|not (yet )?done|to ?do|next(?:\s+build)?|backlog|missing|roadmap|known\s+gaps|agent\s+handoff(?:\s+notes)?|open\s+work|incomplete|pre-build\s+readiness)\b/i;
const HEADING = /^#{1,6}\s+/;
const BULLET = /^\s*(?:[-*+]|\d+[.)])\s+(.*\S)\s*$/;
const OPEN_CHECKBOX = /^\s*(?:[-*+]|\d+[.)])?\s*\[\s*\]\s+(.*\S)\s*$/;
const DONE_CHECKBOX = /^\s*(?:[-*+]|\d+[.)])?\s*\[[xX]\]\s+/;
const NEXT_LINE = /^\*\*Next(?:\s+priority)?:\*\*\s*(.+)$/i;
const NEXT_TABLE = /^\|\s*\*?\*?Next(?:\s+build|\s+priority)?\*?\*?\s*\|\s*(.+?)\s*\|/i;
const SKIP_DOC_NAMES = new Set([
  'product_home.md',
  'file_manifest.json',
  'twin.md',
  'readme.md',
]);
const MAX_CORPUS_CHARS = 120_000;

// The section that holds the real phased roadmap. Phases are only extracted while
// inside it, so unrelated "### Phase N Tables" subsections in a technical-spec
// section are NOT mistaken for buildable phases.
const PHASE_SECTION_HEADING = /^#{1,3}\s*(?:\d+\.\s*)?(?:[\w-]+\s+)*?(phased build plan|build plan|roadmap|phased? roadmap)\b/i;
// A documented product phase inside that section: "### Phase 2 — Social Content
// Calendar". Require a title separator (— : -) so bare "Phase N Tables" headings
// (SQL spec subsections) are not treated as buildable phases.
const PHASE_HEADING = /^(#{2,6})\s*Phase\s+(\d+[a-z]?)\s*[—:–-]\s+(.+)$/i;
// A phase whose body/heading carries any of these is NOT auto-buildable — either
// it depends on unverified/blocked infra (never build on unverified infra) or it
// is a manual/non-code sprint. Deterministic gate; keeps the loop from queuing
// steps it structurally cannot finish.
const PHASE_NOT_BUILDABLE = /\b(UNVERIFIED|BLOCKED|requires app review|manual revenue|manual\b)/i;
// Heading-level "already shipped" markers — skip so we don't re-queue done phases.
const PHASE_DONE = /(✅|~~|\bdone\b|\bshipped\b|\bcomplete[d]?\b)/i;

/**
 * Pull candidate remaining-work bullet lines from a PRODUCT_HOME.md body. Reads
 * bullets that sit under a backlog-style heading until the next heading. Returns
 * de-duplicated, trimmed strings (never fabricated — purely extracted).
 */
function isDoneItem(text) {
  const t = String(text || '').trim();
  if (!t) return true;
  if (DONE_CHECKBOX.test(t)) return true;
  if (/^\[x\]/i.test(t)) return true;
  if (/^(done|shipped|complete|✅|~~)/i.test(t)) return true;
  if (/^\[[xX]\]/.test(t)) return true;
  // Common PRODUCT_HOME checklist form: "[x] **Thing** …"
  if (/^\[[xX]\]\s+/.test(t)) return true;
  return false;
}

function pushUnique(out, seen, text) {
  const cleaned = String(text || '').replace(/^\**|\**$/g, '').trim();
  if (cleaned.length < 6 || isDoneItem(cleaned)) return;
  const key = cleaned.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  out.push(cleaned);
}

/**
 * Pull candidate remaining-work lines from PRODUCT_HOME / conversation corpus.
 * Deterministic + extractive only — never fabricates work.
 */
export function extractBacklog(homeText) {
  if (typeof homeText !== 'string' || !homeText.trim()) return [];
  const lines = homeText.split(/\r?\n/);
  const out = [];
  const seen = new Set();
  let inBacklog = false;
  let inChangeReceipts = false;
  for (const line of lines) {
    if (HEADING.test(line)) {
      inBacklog = BACKLOG_HEADING.test(line);
      inChangeReceipts = /^#{1,6}\s*change\s+receipts\b/i.test(line);
      // Always harvest **Next:** lines even outside backlog headings.
      continue;
    }
    const next = line.match(NEXT_LINE) || line.match(NEXT_TABLE);
    if (next) {
      pushUnique(out, seen, next[1]);
      continue;
    }
    if (inChangeReceipts) continue;
    const open = line.match(OPEN_CHECKBOX);
    if (open) {
      pushUnique(out, seen, open[1]);
      continue;
    }
    if (!inBacklog) continue;
    if (DONE_CHECKBOX.test(line) || /^\s*(?:[-*+]|\d+[.)])?\s*\[[xX]\]/.test(line)) continue;
    const m = line.match(BULLET);
    if (!m) continue;
    pushUnique(out, seen, m[1]);
  }
  // Also fold in any documented, buildable PHASE specs (sub-headings + prose),
  // de-duplicated against bullet backlog. This is what lets the loop plan the
  // NEXT documented phase of a product (e.g. a "### Phase 2 — …" spec), not just
  // flat backlog bullets — the core "adds more to itself" lever.
  for (const item of extractPhaseSpecs(homeText)) {
    pushUnique(out, seen, item);
  }
  return out;
}

/**
 * Load everything the factory may lawfully read for a product folder:
 * PRODUCT_HOME.md + conversations/*.md + sibling product docs (not dumps).
 * Returns combined text for planning + source list for receipts.
 */
export function loadProductCorpus(productId, { root = ROOT } = {}) {
  const productDir = path.join(root, 'docs/products', String(productId || ''));
  const sources = [];
  const chunks = [];
  let total = 0;

  const pushFile = (relOrAbs, label) => {
    const abs = path.isAbsolute(relOrAbs) ? relOrAbs : path.join(root, relOrAbs);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return;
    let text = '';
    try { text = fs.readFileSync(abs, 'utf8'); } catch { return; }
    if (!text.trim()) return;
    const room = MAX_CORPUS_CHARS - total;
    if (room <= 0) return;
    const slice = text.length > room ? text.slice(0, room) : text;
    total += slice.length;
    sources.push({ path: path.relative(root, abs), label, chars: slice.length });
    chunks.push(`\n\n---\n# CORPUS SOURCE: ${label} (${path.relative(root, abs)})\n---\n${slice}`);
  };

  // Load founder conversation files BEFORE the product home. Product homes can be
  // very large (600KB+) and hit MAX_CORPUS_CHARS before any conversation is read.
  // Conversations often contain the most current backlog (e.g. a newly added
  // Founder Alpha Chat v2 slice), so they are included first and are not truncated
  // by the product-home prefix.
  const convDir = path.join(productDir, 'conversations');
  if (fs.existsSync(convDir) && fs.statSync(convDir).isDirectory()) {
    const files = fs.readdirSync(convDir)
      .filter((f) => /\.(md|txt)$/i.test(f))
      .sort();
    for (const f of files) pushFile(path.join(convDir, f), 'conversation');
  }

  pushFile(path.join(productDir, 'PRODUCT_HOME.md'), 'product_home');

  // Sibling markdown in the product folder (specs, twin notes) — skip huge/noise names.
  try {
    for (const f of fs.readdirSync(productDir)) {
      if (!/\.md$/i.test(f)) continue;
      if (SKIP_DOC_NAMES.has(f.toLowerCase())) continue;
      if (/conversation|dump|archive|history/i.test(f)) continue;
      pushFile(path.join(productDir, f), 'product_doc');
    }
  } catch { /* missing dir */ }

  // Nested module homes (e.g. marketingos/socialmediaos)
  try {
    for (const d of fs.readdirSync(productDir, { withFileTypes: true })) {
      if (!d.isDirectory() || d.name === 'conversations') continue;
      const nestedHome = path.join(productDir, d.name, 'PRODUCT_HOME.md');
      if (fs.existsSync(nestedHome)) pushFile(nestedHome, `nested_home:${d.name}`);
    }
  } catch { /* ignore */ }

  return {
    product_id: productId,
    sources,
    combinedText: chunks.join('\n').trim(),
    homePath: path.join(productDir, 'PRODUCT_HOME.md'),
  };
}

/**
 * Extract buildable work from the full product corpus (home + conversations + docs).
 */
export function extractCorpusBacklog(productId, { root = ROOT, homeText = null } = {}) {
  const corpus = homeText != null
    ? { combinedText: homeText, sources: [{ path: 'inline', label: 'inline' }] }
    : loadProductCorpus(productId, { root });
  const text = corpus.combinedText || '';
  if (!text.trim()) return { items: [], sources: corpus.sources || [] };
  return { items: extractBacklog(text), sources: corpus.sources || [], corpus };
}

/**
 * Extract documented, AUTO-BUILDABLE phase specs from a PRODUCT_HOME body. Each
 * "### Phase N — Title" sub-heading plus its prose body becomes ONE rich backlog
 * item the planner can decompose into single-file steps. Deterministic + purely
 * extractive (never fabricates). A phase is SKIPPED when it is:
 *   - already shipped (heading carries a done/✅ marker), or
 *   - not buildable on current infra (body/heading carries UNVERIFIED / BLOCKED /
 *     "requires app review" / manual-sprint markers) — never build on unverified
 *     infra, which is exactly the class of false-done that stalled the loop.
 * Returns condensed single-line strings: "Phase N — Title: <condensed body>".
 */
export function extractPhaseSpecs(homeText) {
  if (typeof homeText !== 'string' || !homeText.trim()) return [];
  const lines = homeText.split(/\r?\n/);
  const specs = [];
  let current = null; // { num, title, level, body: [] }
  let sectionLevel = 0; // heading level of the phased-roadmap section (0 = outside)
  const flush = () => {
    if (!current) return;
    const heading = `Phase ${current.num}${current.title ? ` — ${current.title}` : ''}`;
    const body = current.body.join(' ').replace(/\s+/g, ' ').trim();
    const combined = `${heading} ${body}`;
    if (!PHASE_DONE.test(heading) && !PHASE_NOT_BUILDABLE.test(combined) && body.length >= 12) {
      specs.push(`${heading}: ${body.slice(0, 400)}`.trim());
    }
    current = null;
  };
  for (const line of lines) {
    const hm = line.match(/^(#{1,6})\s+/);
    // Enter/exit the phased-roadmap section so unrelated "Phase N" headings in a
    // technical-spec section are never treated as buildable phases.
    if (hm) {
      const lvl = hm[1].length;
      if (PHASE_SECTION_HEADING.test(line)) { flush(); sectionLevel = lvl; continue; }
      if (sectionLevel && lvl <= sectionLevel) { flush(); sectionLevel = 0; }
    }
    if (!sectionLevel) continue;
    const pm = line.match(PHASE_HEADING);
    if (pm) {
      flush();
      current = { num: pm[2], title: (pm[3] || '').replace(/[*_`]/g, '').trim(), level: pm[1].length, body: [] };
      continue;
    }
    if (!current) continue;
    // A heading of same-or-higher level ends the phase block.
    if (hm && hm[1].length <= current.level) { flush(); continue; }
    const stripped = line.replace(/^\s*(?:[-*+]|\d+[.)])\s+/, '').replace(/[*_`>#]/g, '').trim();
    if (stripped) current.body.push(stripped);
  }
  flush();
  return specs;
}

/**
 * Stable content hash of a backlog item list, order-independent. The loop stamps
 * this onto a planned queue so it can tell when a product's DOCUMENTED backlog
 * has actually changed (new phase written) vs. is unchanged — and only re-plans
 * a completed queue when there is genuinely new documented work. This is what
 * keeps self-extension waste-free (no planner model call per idle cycle).
 */
export function backlogSignature(items) {
  const list = Array.isArray(items) ? items : [];
  const norm = list.map((s) => String(s || '').trim().toLowerCase()).filter(Boolean).sort();
  return crypto.createHash('sha256').update(norm.join('\n')).digest('hex').slice(0, 16);
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

  const expectedExports = Array.isArray(raw.expected_exports)
    ? raw.expected_exports.filter((n) => typeof n === 'string' && n.trim())
    : null;
  const route = parseRouteDeclaration(raw.route);
  const fileContains = Array.isArray(raw.file_contains)
    ? raw.file_contains.filter((s) => typeof s === 'string' && s.trim())
    : null;

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

  if (expectedExports && expectedExports.length) step.expected_exports = expectedExports;
  if (route) step.route = route;
  if (fileContains && fileContains.length) step.file_contains = fileContains;

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

function buildPrompt(productId, backlog, verifyScript, builtFiles = []) {
  return `You are a build planner for an autonomous software factory. Turn the REAL, already-documented remaining work for product "${productId}" into an ordered JSON build queue.

DOCUMENTED REMAINING WORK (do NOT invent anything beyond these items — each step must map to one of them):
${backlog.map((b, i) => `${i + 1}. ${b}`).join('\n')}
${builtFiles.length ? `\nALREADY BUILT — these files/features are DONE. Do NOT re-propose the SAME completed behaviour, but you MAY propose a new patch-mode edit to an existing file when the documented remaining work above explicitly asks for a new feature/behaviour in that file.\n${builtFiles.map((f) => `- ${f}`).join('\n')}\n` : ''}
Rules:
- Output ONLY minified JSON, no prose, no markdown fences.
- Shape: {"steps":[{"id","target_file","task","spec","expected_exports":[],"route":"METHOD /path","file_contains":[],"depends_on":[],"founder_gated":bool}]}
- Each step edits exactly ONE concrete repo file (target_file). Prefer existing conventional paths (services/*.js, routes/*.js, public/overlay/*.html, scripts/*.mjs, db/migrations/*.sql).
- "task" is a short imperative; "spec" is the acceptance/definition-of-done for that file.
- For server-code targets, you MUST declare checkable expectations so the governed factory can prove the step:
  - "expected_exports": array of named exports the file must contain (e.g. ["registerXRoutes", "getHealth"]) — use for services/routes/modules.
  - "route": the exact HTTP route the module exposes, as "METHOD /path" or bare "/path" (e.g. "GET /api/v1/lifeos/builder/ready" or "/api/v1/lifeos/builder/ready") — use for routes.
  - "file_contains": array of strings that must appear in the file (e.g. ["CREATE TABLE IF NOT EXISTS", "@ssot"]) — use for SQL migrations or governance markers.
- COMPOSITION (so the generated code actually runs and mounts — non-negotiable):
  - Each file must be SELF-CONTAINED: import ONLY node builtins, packages already installed, or sibling files created by an EARLIER step in this same queue (wire those with depends_on). NEVER import a package or file that does not exist.
  - A route module must export a register function (e.g. registerXRoutes(app, deps)) and be added to config/auto-registered-product-modules.json — NEVER instruct editing server.js or any boot file.
  - SQL migrations: CREATE TABLE IF NOT EXISTS only; id/created_at/updated_at are DB-DEFAULTED (gen_random_uuid()/now()) — do NOT import uuid or generate ids in JS. Never DROP/ALTER a table that holds data.
  - Server modules must have ZERO top-level browser globals (window/document/fetch); client JS lives only inside returned HTML strings.
  - AI must be called via the injected callCouncilMember(role, prompt) dep — never import an AI SDK directly.
- Set founder_gated:true for any customer-facing UI or brand/design surface.
- Use depends_on (by step id) only when one step truly requires another first; order steps so schema → service → routes → UI.
- At most ${MAX_STEPS} steps. Ground every step in the documented work above; if an item is too vague to build, omit it rather than guessing.
${verifyScript ? `- The product's verify command is: ${verifyScript}` : ''}`;
}

// Recover every COMPLETE object from a "steps":[ ... ] array by scanning balanced
// braces (string-aware), dropping any trailing partial object. This salvages a
// plan whose JSON was cut off mid-array when the model hit its max_tokens cap —
// the exact failure that produced `no parseable steps` and starved the loop.
function salvageSteps(s) {
  const key = s.search(/"steps"\s*:\s*\[/);
  if (key === -1) return [];
  const objs = [];
  let depth = 0;
  let objStart = -1;
  let inStr = false;
  let esc = false;
  for (let i = s.indexOf('[', key) + 1; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; continue; }
    if (c === '{') { if (depth === 0) objStart = i; depth++; }
    else if (c === '}') {
      depth--;
      if (depth === 0 && objStart !== -1) {
        try { objs.push(JSON.parse(s.slice(objStart, i + 1))); } catch { /* skip corrupt object */ }
        objStart = -1;
      }
    } else if (c === ']' && depth === 0) {
      break;
    }
  }
  return objs;
}

function parseModelJson(text) {
  if (typeof text !== 'string') return null;
  const s = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try { return JSON.parse(s.slice(start, end + 1)); } catch { /* fall through to salvage */ }
  }
  // The whole-object parse failed (most often a truncated response). Salvage the
  // complete step objects instead of throwing the entire plan away.
  const salvaged = salvageSteps(s);
  return salvaged.length ? { steps: salvaged } : null;
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
  extraBacklog = [],
  callModel,
  model = PLANNER_MODEL,
  maxSteps = MAX_STEPS,
  logger = console,
} = {}) {
  if (!productId) return null;
  // extraBacklog carries non-doc-sourced work (e.g. SENTRY self-fix findings)
  // that must also be planned into concrete target_file steps. It is merged with
  // the documented backlog and de-duplicated; still purely additive, never fabricated.
  // Prefer full product corpus (home + conversations + sibling docs) so the
  // planner sees founder conversations and folder law — not just PRODUCT_HOME.
  let corpusText = homeText;
  let corpusSources = [];
  if (productId) {
    try {
      const corpus = loadProductCorpus(productId);
      if (corpus.combinedText) {
        corpusText = corpus.combinedText;
        corpusSources = corpus.sources;
      }
    } catch { /* fall back to homeText */ }
  }
  const documented = extractBacklog(corpusText || homeText || '');
  const extra = (Array.isArray(extraBacklog) ? extraBacklog : [])
    .map((s) => String(s || '').trim())
    .filter((s) => s.length >= 6);
  const backlog = [...new Set([...documented, ...extra])];
  if (!backlog.length) {
    logger?.info?.({ productId, sources: corpusSources.length }, '[BUILD-QUEUE-PLANNER] no documented backlog — nothing to plan');
    return null;
  }
  if (typeof callModel !== 'function') {
    logger?.warn?.({ productId }, '[BUILD-QUEUE-PLANNER] no callModel — fail closed');
    return null;
  }

  const existingStepsPre = Array.isArray(existingQueue?.steps) ? existingQueue.steps : [];
  const doneCount = existingStepsPre.filter((s) => s.status === STEP_STATUS.DONE).length;
  const doneFiles = [...new Set(
    existingStepsPre
      .filter((s) => s.status === STEP_STATUS.DONE && s.target_file)
      .map((s) => String(s.target_file)),
  )];

  let raw;
  try {
    raw = await callModel(model, buildPrompt(productId, backlog, verifyScript, doneFiles), {
      // A full 12-step plan with specs does not fit in 2000 output tokens — the
      // JSON was being cut off mid-array (parse -> no steps -> loop starved).
      maxOutputTokens: 8000,
      allowModelDowngrade: false,
      taskType: 'builder_lane',
      builderExecution: true,
    });
  } catch (e) {
    logger?.warn?.({ productId, error: e.message }, '[BUILD-QUEUE-PLANNER] model call failed — fail closed');
    return null;
  }

  const parsed = parseModelJson(raw);
  const proposed = Array.isArray(parsed?.steps) ? parsed.steps : [];
  if (!proposed.length) {
    logger?.warn?.({ productId, rawLen: String(raw || '').length }, '[BUILD-QUEUE-PLANNER] model returned no parseable steps — fail closed');
    return null;
  }

  const existingSteps = Array.isArray(existingQueue?.steps) ? existingQueue.steps : [];
  const existingIds = new Set(existingSteps.map((s) => s.id));
  const existingFingerprints = new Set(existingSteps.map((s) => `${s.target_file}::${s.task}`.toLowerCase()));
  // Block only exact duplicate steps (same id or same file+task fingerprint).
  // Patch-mode edits to an existing file are valid when the documented backlog
  // asks for a new behavior in that file; the builder will use additive
  // old_string/new_string JSON patches and SENTRY will prove the change.
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

  if (!added.length) {
    logger?.warn?.({ productId, proposed: proposed.length, doneFiles: doneFiles.length }, '[BUILD-QUEUE-PLANNER] all proposed steps filtered (dedupe/already-done/no target_file) — fail closed');
    return null;
  }

  const queue = {
    schema: 'product_build_queue_v1',
    product_id: productId,
    ...(verifyScript ? { verify_script: verifyScript } : (existingQueue?.verify_script ? { verify_script: existingQueue.verify_script } : {})),
    planned_at: new Date().toISOString(),
    backlog_signature: backlogSignature([...backlog, `__done_count:${doneCount}__`]),
    corpus_sources: corpusSources.map((s) => s.path),
    steps: [...existingSteps, ...added],
  };

  const check = validatePlannedQueue(queue);
  if (!check.ok) {
    logger?.warn?.({ productId, errors: check.errors }, '[BUILD-QUEUE-PLANNER] planned queue invalid — fail closed');
    return null;
  }

  return { queue, added, source: 'planner' };
}
