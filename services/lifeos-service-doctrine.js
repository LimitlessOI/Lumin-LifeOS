/**
 * SYNOPSIS: LifeOS service doctrine — prompt block, twin helpers, compliance exports.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const DOCTRINE_PATH = 'docs/LIFEOS_SERVICE_AND_EPISTEMOLOGY_DOCTRINE.md';
const RUNTIME_PATH = 'builderos-reboot/governance/LIFEOS_SERVICE_DOCTRINE_RUNTIME.json';

const PROMPT_BLOCK = `LIFEOS SERVICE DOCTRINE (NON-NEGOTIABLE — all stacks inherit):
- Serve, don't decide: present costs, benefits, pros, cons with best attainable truth; user chooses.
- Motivation is PER-PERSON (Personal Twin whys) — never one-size GCI/Europe/millionaire templates.
- Time is the root resource; money is stored time / scoreboard — not primary fuel.
- Mirror: "Does it serve me?" — map pattern benefits AND costs; never force pattern breaks.
- Be→Do→Have: identity upstream; honest steps — no magic without tradeoffs.
- Truth: KNOW/THINK/GUESS/DON'T KNOW; law = repeated real-world pass, always scrutinizable.
- No manipulation, hype, or AI theater.
- Fluid OS: one shell (lifeos-app); stacks (LifeRE, SMOS) plug in — NOT separate products.
- Remove unwanted busywork; organize liked busywork; amplify superpowers.
- SMOS: brief-first → record → post → publish; coaching_tolerance adapts director intensity.`;

const FORBIDDEN_USER_COPY = [
  /\beveryone should want\b/i,
  /\ball agents must hit \$?\d+k gci\b/i,
  /\bmanifest (millions|wealth) (now|instantly|like magic)\b/i,
  /\byou must become a millionaire\b/i,
];

export function getDoctrinePaths() {
  return {
    doctrine: path.join(ROOT, DOCTRINE_PATH),
    runtime: path.join(ROOT, RUNTIME_PATH),
    personalTwinSchema: path.join(ROOT, 'config/lifeos-personal-twin-schema.json'),
    stackRegistry: path.join(ROOT, 'config/lifeos-stack-registry.json'),
  };
}

export function loadServiceDoctrineRuntime() {
  const fp = path.join(ROOT, RUNTIME_PATH);
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

export function getDoctrinePromptBlock() {
  return PROMPT_BLOCK;
}

export function getStackRegistry() {
  const fp = path.join(ROOT, 'config/lifeos-stack-registry.json');
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

export function getPersonalTwinSchema() {
  const fp = path.join(ROOT, 'config/lifeos-personal-twin-schema.json');
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

export function assertStackIsNotSeparateProduct(stackId) {
  const reg = getStackRegistry();
  const stack = reg.stacks?.find((s) => s.stack_id === stackId);
  if (!stack) return { ok: false, error: `Unknown stack: ${stackId}` };
  if (stack.is_separate_product) {
    return { ok: false, error: `${stackId} must not be flagged separate product` };
  }
  return { ok: true, stack };
}

export function validateUserFacingCopy(text = '') {
  const hits = FORBIDDEN_USER_COPY.filter((re) => re.test(text)).map((re) => re.source);
  return { ok: hits.length === 0, forbidden: hits };
}

export function enrichPersonalTwin(base = {}) {
  return {
    schema: 'lifeos_personal_twin_v2',
    whys: base.whys || [],
    demotivators: base.demotivators || [],
    superpowers: base.superpowers || [],
    unwanted_busywork: base.unwanted_busywork || [],
    liked_busywork: base.liked_busywork || [],
    autopilot_programs: base.autopilot_programs || [],
    serve_me_map: base.serve_me_map || [],
    habit_loops: base.habit_loops || [],
    coaching_tolerance: base.coaching_tolerance || 'moderate',
    break_intent: base.break_intent || 'none',
    goal_reviews: base.goal_reviews || [],
    motivations_legacy_tags: base.motivations || base.motivations_legacy_tags || [],
    label: base.label || 'THINK',
    ...base,
  };
}

export function pickWhyForSession(twin = {}, { index = 0 } = {}) {
  const whys = twin.whys || [];
  if (!whys.length) return null;
  return whys[index % whys.length];
}

export function formatServeMeMirror(entry = {}) {
  const benefits = (entry.benefits || []).join('; ') || '—';
  const costs = (entry.costs || []).join('; ') || '—';
  return `Benefits: ${benefits}. Costs: ${costs}. Does this serve you?`;
}

export default {
  getDoctrinePromptBlock,
  loadServiceDoctrineRuntime,
  getStackRegistry,
  getPersonalTwinSchema,
  assertStackIsNotSeparateProduct,
  validateUserFacingCopy,
  enrichPersonalTwin,
  pickWhyForSession,
  formatServeMeMirror,
};
