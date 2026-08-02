/**
 * SYNOPSIS: Orchestrates POST /api/v1/lifeos/builder/build for the Confidence Vector Model service.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BASE = (
  process.env.LUMIN_BUILDER_BASE_URL ||
  process.env.BUILDER_BASE_URL ||
  'https://lumin-web-production-e3a9.up.railway.app'
).replace(/\/$/, '');
const KEY = process.env.COMMAND_CENTER_KEY || process.env.COMMAND_KEY || process.env.LIFEOS_KEY || process.env.API_KEY || '';

const MASTER_BP = 'docs/constitution/proposals/2026-08-02-MASTER-BUILD-BLUEPRINT.md';
const SPEC = 'docs/products/builderos/specs/CONFIDENCE_VECTOR_MODEL.md';
const SSOT = 'docs/products/builderos/PRODUCT_HOME.md';

const SHARED_REQS = [
  'The generated file MUST start with a JSDoc comment block that includes the exact tag: @ssot {{SSOT}}',
  'Only export the functions/constants named in this task; no new file imports unless explicitly allowed below.',
  'Use plain JS (ES modules), Node-compatible, no external packages.',
  'Do not use JavaScript reserved/strict-mode words as identifiers (package, interface, class, private, public, etc.).',
  'When including apostrophes inside string literals, use double quotes or template literals so the file passes node --check.',
  'The commit gate rejects the literal strings PLACEHOLDER, STUB, TODO, FIXME, "for demonstration", "not implemented", and "this is a placeholder" anywhere in code, comments, strings, or JSDoc. Do NOT use them.',
  'Avoid meta-commentary such as "in a real implementation" or "this would typically involve". Write production-ready, runnable code.',
  'All functions should be deterministic and return plain JSON-serializable objects or primitives.',
  'Export a constant `version` string with the value "2026-08-02" from the module.',
];

function sharedBlock(ssot) {
  return `FILE REQUIREMENTS:
- ${SHARED_REQS.join('\n- ').replace(/{{SSOT}}/g, ssot)}`;
}

function localFilesFor(file) {
  const deps = new Set();
  try {
    const full = path.join(ROOT, file);
    if (fs.existsSync(full)) deps.add(full);
  } catch { /* ignore */ }
  return Array.from(deps).map((p) => {
    const rel = path.relative(ROOT, p).replace(/\\/g, '/');
    return { path: rel, content: fs.readFileSync(p, 'utf8') };
  });
}

async function dispatchStep(step) {
  const files = [
    { path: SPEC, content: fs.readFileSync(path.join(ROOT, SPEC), 'utf8') },
    { path: MASTER_BP, content: fs.readFileSync(path.join(ROOT, MASTER_BP), 'utf8') },
    ...localFilesFor(step.target_file),
  ];

  const body = {
    mission_id: 'FACTORY-PHASE1-CONFIDENCE-VECTORS-0001',
    target_file: step.target_file,
    commit_message: `Phase 1 Confidence Vector Model: ${step.step_id} ${step.title}`,
    task: `${step.task}\n\n${sharedBlock(SSOT)}`,
    spec: `Phase 1 Confidence Vector Model implementation per ${MASTER_BP} Phase 1 and ${SPEC}. Build the file exactly as specified in the task.`,
    mode: 'code',
    model: 'openai_builder_standard',
    max_output_tokens: 16384,
    strict_model: true,
    confirm_intent: true,
    platform_gap_fill: true,
    platform_gap_fill_reason: `GAP-FILL: operator-authorized Phase 1 Confidence Vector Model service per the ratified master blueprint. Provides the shared confidence dimensions used by Reality Alignment, Human Constellation, Causality Engine, and every Twin.`,
    files,
    domain: step.product,
  };

  const url = `${BASE}/api/v1/lifeos/builder/build`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-command-key': KEY },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json = {};
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { ok: res.ok, status: res.status, body: json };
}

async function main() {
  if (!KEY) {
    console.error('No builder key found in env');
    process.exit(1);
  }

  const step = {
    step_id: 'P1-001',
    title: 'Build confidence-vectors.js',
    target_file: 'services/confidence-vectors.js',
    product: 'builderos',
    task: `Build \`services/confidence-vectors.js\` for BuilderOS.
Purpose: Provide a shared, deterministic confidence vector for any Twin in the architecture.
Exported constants and functions:
- \`DIMENSIONS\` — array of dimension strings: ["belief_strength", "evidence_support", "behavior_alignment", "emotional_weight", "identity_attachment", "readiness", "trust", "confidence"].
- \`DEFAULT_WEIGHTS\` — object mapping each dimension to 1.0.
- \`computeConfidenceVector(evidence)\` — evidence is an object with keys as dimension names and values in [0, 1]. Missing dimensions default to 0.0. Returns a vector object with all dimensions plus a \`confidence\` scalar. Compute \`confidence\` as the weighted average of the non-confidence dimensions using DEFAULT_WEIGHTS. Clamp all values to [0, 1].
- \`combineConfidenceVectors(vectors, weights = [])\` — merges an array of vector objects. If \`weights\` is provided it must be the same length as \`vectors\` and contain numbers in [0, 1]; otherwise default to equal weights. Return a combined vector using weighted averages per dimension. If the vectors array is empty, return a vector of all zeros with confidence 0.
- \`calibrateConfidence(vector, outcome)\` — takes a vector and an outcome object \`{ actual: number in [0,1], expected: number in [0,1] }\`. Returns a new vector with \`confidence\` reduced when the outcome deviates from expected (calibration penalty = |actual - expected|). Reduce \`confidence\` by the penalty, bounded below at 0.1 if evidence_support > 0.5, otherwise bounded at 0.0. Do not modify other dimensions.
- \`formatConfidence(vector, precision = 2)\` — returns a compact string like \`confidence:0.75[bs:0.8,es:0.7,ba:0.6,ew:0.5,ia:0.4,read:0.3,trust:0.9]\`. Abbreviations: bs, es, ba, ew, ia, read, trust for the non-confidence dimensions.
- \`version\` constant string "2026-08-02".
Keep all logic self-contained; do not import other service modules. Use Node ESM, no external packages.`,
  };

  console.log(`Dispatching ${step.step_id}: ${step.target_file}`);
  const result = await dispatchStep(step);
  console.log(JSON.stringify({ step: step.step_id, status: result.status, body: result.body }, null, 2));
  if (!result.ok) process.exit(1);
}

main().catch((err) => { console.error(err); process.exit(1); });
