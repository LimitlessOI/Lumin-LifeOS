/**
 * SYNOPSIS: Orchestrates POST /api/v1/lifeos/builder/build for the Institutional Constellation service.
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
const SPEC = 'docs/products/builderos/specs/INSTITUTIONAL_CONSTELLATION.md';
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
    mission_id: 'FACTORY-PHASE3.5-INSTITUTIONAL-CONSTELLATION-0001',
    target_file: step.target_file,
    commit_message: `Phase 3.5 Institutional Constellation: ${step.step_id} ${step.title}`,
    task: `${step.task}\n\n${sharedBlock(SSOT)}`,
    spec: `Phase 3.5 Institutional Constellation implementation per ${MASTER_BP} Phase 3.5 and ${SPEC}. Build the file exactly as specified in the task.`,
    mode: 'code',
    model: 'openai_builder_standard',
    max_output_tokens: 16384,
    strict_model: true,
    confirm_intent: true,
    platform_gap_fill: true,
    platform_gap_fill_reason: `GAP-FILL: operator-authorized Phase 3.5 Institutional Constellation build for ${step.step_id} per the ratified master blueprint. The institution must model itself with the same epistemological machinery it applies to people and organizations.`,
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
    step_id: 'P3.5-001',
    title: 'Build institutional-constellation.js',
    target_file: 'services/institutional-constellation.js',
    product: 'builderos',
    task: `Build \`services/institutional-constellation.js\` for BuilderOS.
Purpose: Taloa models itself with the same graph, confidence, causality, and calibration machinery it applies to people and organizations.
Exported functions:
- \`createInstitutionalConstellation()\` returns a fresh institutional constellation object with maps for nodes and edges.
- \`addBelief(constellation, belief, evidence = [], confidence = 0.5)\` adds a node of type \`belief\` and returns the node. \`belief\` is a string.
- \`addOffice(constellation, officeId, attributes = {})\` adds a node of type \`office\` with payload { officeId, ...attributes } and returns the node.
- \`addProduct(constellation, productId, attributes = {})\` adds a node of type \`product\` with payload { productId, ...attributes } and returns the node.
- \`weightAgreement(constellation, fromNodeId, toNodeId, weights = {})\` creates or updates a weighted edge. Default weights: { strength: 0.5, stability: 0.5, recency: current ISO timestamp, frequency: 1, causal_confidence: 0.0, source: 'unknown' }.
- \`recordPrediction(constellation, officeId, prediction, confidence = 0.5)\` adds a node of type \`prediction\` and links it from the named office with weight { strength: confidence, source: officeId }.
- \`recordOutcome(constellation, predictionId, outcome)\` adds a node of type \`outcome\` and links it from the prediction. Computes prediction accuracy as 1 - abs(prediction.payload.confidence - outcome.matching_score) when the prediction payload has a confidence field; otherwise accuracy is 0.5. Updates the prediction->outcome edge with { accuracy }.
- \`getCalibrationReport(constellation)\` returns { total_nodes, total_edges, average_confidence, agreement_index, accuracy, overconfident_offices, underconfident_offices, summary }.
- \`getDriftSignals(constellation)\` returns an array of drift signals: contradictions (edges with strength < 0 between same-type nodes), overconfidence (prediction confidence > 0.9 with no outcome), stale edges (recency older than 30 days), and fading agreement (strength < 0.2 and frequency > 5).
- \`getBlindSpots(constellation)\` returns nodes with confidence < 0.3 or evidence.length < 2, sorted by confidence ascending.
- \`getConstellationSummary(constellation)\` returns a short human-readable overview string with node counts by type and a top drift signal if any.
Keep all logic self-contained; do not import other service modules. Use Node ESM, no external packages.`,
  };

  console.log(`Dispatching ${step.step_id}: ${step.target_file}`);
  const result = await dispatchStep(step);
  console.log(JSON.stringify({ step: step.step_id, status: result.status, body: result.body }, null, 2));
  if (!result.ok) process.exit(1);
}

main();
