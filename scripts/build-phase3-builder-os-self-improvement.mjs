/**
 * SYNOPSIS: Orchestrates POST /api/v1/lifeos/builder/build for Phase 3 BuilderOS Self-Improvement engines.
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
const PHASE3_SPEC = 'docs/products/builderos/specs/BUILDEROS_SELF_IMPROVEMENT.md';
const BUILDEROS_HOME = 'docs/products/builderos/PRODUCT_HOME.md';

const SHARED_REQS = [
  'The generated file MUST start with a JSDoc comment block that includes the exact tag: @ssot {{SSOT}}',
  'Only export the functions/constants named in this task; no new file imports unless explicitly allowed below.',
  'Use plain JS (ES modules), Node-compatible, no external packages.',
  'Do not use JavaScript reserved/strict-mode words as identifiers (package, interface, class, private, public, etc.).',
  'When including apostrophes inside string literals, use double quotes or template literals so the file passes node --check.',
  'The commit gate rejects the literal strings PLACEHOLDER, STUB, TODO, FIXME, "for demonstration", "not implemented", and "this is a placeholder" anywhere in code, comments, strings, or JSDoc. Do NOT use them.',
  'Avoid meta-commentary such as "in a real implementation" or "this would typically involve". Write production-ready, runnable code.',
  'All functions should be deterministic and return plain JSON-serializable objects or primitives.',
  'Export a constant `version` string with the value "2026-08-02" from each module.',
];

function sharedBlock(ssot) {
  return `FILE REQUIREMENTS:
- ${SHARED_REQS.join('\n- ').replace(/{{SSOT}}/g, ssot)}`;
}

const STEPS = [
  {
    step_id: 'P3-001',
    title: 'Build blueprint-quality-index.js',
    target_file: 'services/blueprint-quality-index.js',
    ssot: BUILDEROS_HOME,
    product: 'builderos',
    task: `Build \`services/blueprint-quality-index.js\` for BuilderOS.
Purpose: measure the quality of any blueprint or mission pack before and after execution.
Exported functions:
- \`scoreBlueprint(blueprint, context = {})\` where blueprint is \`{steps: array, acceptance: object, dependencies: array, risk_notes: array}\`. Returns \`{quality_score: number 0-1, dimensions: {completeness, testability, traceability, simplicity, risk_awareness}, recommendations: string[]}\`. Score by checking each step has acceptance, each dependency is mentioned, risk_notes are present, and the structure is simple (fewer than 50 steps preferred).
- \`compareBlueprints(before, after)\` returns \`{quality_delta: number, improved_dimensions: string[], regressed_dimensions: string[]}\`.
- \`recommendImprovements(score)\` returns an array of concrete improvement strings based on score and dimensions.
- \`getDefaultBlueprintSchema()\` returns the expected blueprint shape object.
Keep all logic self-contained; do not import other service modules.`,
  },
  {
    step_id: 'P3-002',
    title: 'Build variance-attribution-engine.js',
    target_file: 'services/variance-attribution-engine.js',
    ssot: BUILDEROS_HOME,
    product: 'builderos',
    task: `Build \`services/variance-attribution-engine.js\` for BuilderOS.
Purpose: when a build outcome differs from the blueprint prediction, attribute the variance to causes.
Exported functions:
- \`attributeVariance(prediction, outcome, execution_log = [])\` where prediction and outcome are plain objects. Returns \`{variance_score: number 0-1, attributions: [{cause: string, contribution: number 0-1, confidence: number 0-1, evidence: string}], learned_lesson: string}\`. Compare keys between prediction and outcome; for each mismatch, assign cause from execution_log entries (keyword matching: 'timeout', 'error', '502', 'denied', 'missing', 'drift', 'token').
- \`rankCauses(attributions)\` returns attributions sorted by contribution descending.
- \`extractLesson(attributions)\` returns a short human-readable lesson string.
- \`getVarianceTypes()\` returns the list of supported cause keywords.
Keep all logic self-contained; do not import other service modules.`,
  },
  {
    step_id: 'P3-003',
    title: 'Build governance-cost-index.js',
    target_file: 'services/governance-cost-index.js',
    ssot: BUILDEROS_HOME,
    product: 'builderos',
    task: `Build \`services/governance-cost-index.js\` for BuilderOS.
Purpose: measure the cost of governance in time, tokens, and decisions so anti-bureaucracy can be enforced.
Exported functions:
- \`measureGovernanceCost(decision, process = [])\` where decision is \`{id, title, urgency}\` and process is an array of \`{office, action, timestamp, tokens?: number}\`. Returns \`{cost_score: number 0-1 (lower is cheaper), breakdown: {time_steps: number, token_calls: number, handoffs: number, blockers: number}, bottlenecks: string[]}\`. Compute handoffs as transitions between different offices; blockers as steps with 'blocked', 'failed', or 'retry' in action; token_calls as count of steps with tokens > 0.
- \`compareProcessCosts(processes)\` where processes is an array of process arrays. Returns \`{cheapest: object, most_expensive: object, average_cost: number}\`.
- \`suggestCheaperPath(decision, process)\` returns an array of concrete suggestions to reduce governance cost.
- \`getCostMetrics()\` returns the metric names.
Keep all logic self-contained; do not import other service modules.`,
  },
  {
    step_id: 'P3-004',
    title: 'Build organizational-calibration-engine.js',
    target_file: 'services/organizational-calibration-engine.js',
    ssot: BUILDEROS_HOME,
    product: 'builderos',
    task: `Build \`services/organizational-calibration-engine.js\` for BuilderOS.
Purpose: calibrate trust and accuracy scores across offices using reality outcomes.
Exported functions:
- \`calibrateOffice(office, predictions = [])\` where each prediction is \`{prediction: number 0-1, outcome: number 0-1, confidence: number 0-1}\`. Returns \`{calibration_score: number 0-1, bias_report: {overconfidence: number, underconfidence: number, directional_bias: string}, recommendation: string}\`. Calibration is 1 - average absolute difference between confidence and outcome; overconfidence is average(max(0, confidence - outcome)); underconfidence is average(max(0, outcome - confidence)).
- \`compareOffices(predictionsByOffice)\` where keys are office names and values are prediction arrays. Returns \`{rankings: [{office, score}], best_office: string, worst_office: string, summary: string}\`.
- \`suggestRecalibration(calibration_score)\` returns a recommendation string.
- \`getSupportedOffices()\` returns \`['Chair', 'Solomon', 'Builder', 'Sentry', 'Historian']\`.
Keep all logic self-contained; do not import other service modules.`,
  },
  {
    step_id: 'P3-005',
    title: 'Build discovery-classification-engine.js',
    target_file: 'services/discovery-classification-engine.js',
    ssot: BUILDEROS_HOME,
    product: 'builderos',
    task: `Build \`services/discovery-classification-engine.js\` for BuilderOS.
Purpose: classify new ideas as observation, inference, hypothesis, model, principle, law, or constitutional principle based on evidence.
Exported functions:
- \`classifyIdea(idea, evidence_history = [])\` where idea is \`{statement: string, evidence: [{type, source, weight}], current_tier?: string}\`. Returns \`{classification: string, next_tier: string, missing_evidence: string[], confidence: number 0-1}\`. Tiers in order: observation, inference, hypothesis, model, principle, law, constitutional_principle. Advance when evidence count and total weight cross thresholds: observation(1, 0.1), inference(1, 0.3), hypothesis(2, 0.5), model(5, 1.5), principle(10, 3.0), law(20, 6.0), constitutional_principle(50, 15.0).
- \`promoteIdea(idea, evidence_history)\` returns the same shape but attempts one tier promotion if thresholds met.
- \`listPromotionCriteria(tier)\` returns the required evidence count and total weight for the given tier.
- \`getTierLadder()\` returns the ordered array of tier strings.
Keep all logic self-contained; do not import other service modules.`,
  },
  {
    step_id: 'P3-006',
    title: 'Build independent-laboratory-architecture.js',
    target_file: 'services/independent-laboratory-architecture.js',
    ssot: BUILDEROS_HOME,
    product: 'builderos',
    task: `Build \`services/independent-laboratory-architecture.js\` for BuilderOS.
Purpose: run controlled experiments where offices independently analyze the same evidence and compare results before convergence.
Exported functions:
- \`runIndependentAnalysis(evidence_package, offices = ['Chair', 'Solomon', 'Sentry'])\` where evidence_package is a plain object. Returns \`{independent_findings: [{office, findings: string[], confidence: number 0-1}], convergence_report: {agreed: string[], disagreed: string[], best_predictor: string|null}, confidence: number 0-1}\`. Each office derives findings by scanning evidence_package keys with a simple deterministic rule: Chair picks top 2 keys, Solomon picks bottom 2, Sentry picks all numeric values.
- \`compareFindings(findings)\` returns the convergence_report shape.
- \`recommendConvergence(findings)\` returns a recommendation string.
- \`getSupportedOffices()\` returns the supported office names.
Keep all logic self-contained; do not import other service modules.`,
  },
  {
    step_id: 'P3-007',
    title: 'Build meta-learning-system.js',
    target_file: 'services/meta-learning-system.js',
    ssot: BUILDEROS_HOME,
    product: 'builderos',
    task: `Build \`services/meta-learning-system.js\` for BuilderOS.
Purpose: learn how the system learns by measuring which model, prompt, and workflow choices produce better reality alignment.
Exported functions:
- \`recordExperiment(experiment)\` where experiment is \`{model: string, prompt_id: string, workflow: string, outcome: {reality_alignment: number 0-1, cost: number}}\`. Returns the experiment with \`recorded_at\` ISO timestamp and a computed \`meta_score = reality_alignment / (1 + cost)\`.
- \`rankApproaches(history = [])\` returns \`{rankings: [{model, prompt_id, workflow, average_meta_score}], best: object|null, worst: object|null}\` grouped by (model, prompt_id, workflow).
- \`recommendConfig(history = [], constraints = {})\` returns \`{recommended: {model, prompt_id, workflow}, confidence: number 0-1, rationale: string}\` selecting the highest average meta_score that matches constraints.
- \`getMetaScore(experiment)\` returns the computed meta_score.
Keep all logic self-contained; do not import other service modules.`,
  },
  {
    step_id: 'P3-008',
    title: 'Build builderos-self-improvement-loop.js',
    target_file: 'services/builderos-self-improvement-loop.js',
    ssot: BUILDEROS_HOME,
    product: 'builderos',
    task: `Build \`services/builderos-self-improvement-loop.js\` for BuilderOS.
Purpose: tie the Phase 3 engines into a continuous loop that improves blueprints, measures variance, bounds governance cost, and feeds reality back into the Learning Architecture.
Exported functions:
- \`runImprovementLoop(mission_outcome, blueprint, runtime_logs = [])\` where mission_outcome is \`{prediction: object, actual: object, logs: array}\` and blueprint is the blueprint object. Returns \`{improved_blueprint: object, improvement_report: {quality_delta: number, variance_lessons: string[], governance_cost: object, meta_insights: string[]}, next_actions: string[]}\`. The function must import and call the other Phase 3 service functions: \`scoreBlueprint\` from \`./blueprint-quality-index.js\`, \`attributeVariance\` from \`./variance-attribution-engine.js\`, \`measureGovernanceCost\` from \`./governance-cost-index.js\`, \`calibrateOffice\` from \`./organizational-calibration-engine.js\`, \`classifyIdea\` from \`./discovery-classification-engine.js\`, \`runIndependentAnalysis\` from \`./independent-laboratory-architecture.js\`, and \`rankApproaches\` from \`./meta-learning-system.js\` to compute the report. improved_blueprint should copy blueprint and append a \`improvement_notes\` array with learned lessons.
- \`generateNextBlueprint(product_id, previous_blueprint, feedback = [])\` returns a blueprint skeleton with the product_id and feedback incorporated.
- \`summarizeImprovementReport(report)\` returns a short human-readable summary string.
Keep logic self-contained; only import the Phase 3 sibling modules listed above.`,
  },
];

function filePayload(rel) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) return null;
  return { file_path: rel, content: fs.readFileSync(full, 'utf8') };
}

async function dispatchStep(step) {
  const url = `${BASE}/api/v1/lifeos/builder/build`;
  const files = [
    filePayload(PHASE3_SPEC),
    filePayload(MASTER_BP),
    filePayload(BUILDEROS_HOME),
  ].filter(Boolean);

  const body = {
    mission_id: 'FACTORY-PHASE3-BUILDEROS-SELF-IMPROVEMENT-0001',
    target_file: step.target_file,
    commit_message: `Phase 3 BuilderOS self-improvement: ${step.step_id} ${step.title}`,
    task: `${step.task}\n\n${sharedBlock(step.ssot)}`,
    spec: `Phase 3 BuilderOS Self-Improvement implementation per ${MASTER_BP} sections 4.3 and 5, and ${PHASE3_SPEC}. Build the file exactly as specified in the task.`,
    mode: 'code',
    model: 'openai_builder_standard',
    max_output_tokens: 16384,
    strict_model: true,
    confirm_intent: true,
    platform_gap_fill: true,
    platform_gap_fill_reason: `GAP-FILL: operator-authorized Phase 3 BuilderOS self-improvement build for ${step.step_id} per the ratified master blueprint. Adam ordered Builder to execute the A-to-Z blueprint without stopping and this service is listed in Phase 3.`,
    files,
    domain: step.product,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-command-key': KEY },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 500) };
  }
  return { step, ok: res.ok && json.ok === true && json.committed === true, status: res.status, json };
}

async function main() {
  if (!KEY) {
    console.error('Missing COMMAND_CENTER_KEY / COMMAND_KEY / LIFEOS_KEY / API_KEY');
    process.exit(1);
  }

  const resumeFrom = process.env.PHASE3_RESUME;
  const ACTIVE_STEPS = resumeFrom
    ? STEPS.slice(STEPS.findIndex((s) => s.step_id === resumeFrom))
    : STEPS;

  for (const step of ACTIVE_STEPS) {
    console.log(`Dispatching ${step.step_id} ${step.target_file}...`);
    let retries = 0;
    let result;
    while (retries < 3) {
      result = await dispatchStep(step);
      if (result.ok) {
        console.log(`  OK ${step.step_id}: ${result.json.commit_sha || 'committed'}`);
        break;
      }
      if (result.status === 502 || (result.json?.code === 502)) {
        retries += 1;
        console.warn(`  502 retry ${retries}/3 for ${step.step_id}`);
        await new Promise((r) => setTimeout(r, 5000));
        continue;
      }
      break;
    }
    if (!result.ok) {
      console.error(`FAILED ${step.step_id}:`, JSON.stringify({ status: result.status, body: result.json }, null, 2));
      process.exit(1);
    }
  }
  console.log('Phase 3 BuilderOS self-improvement build complete.');
}

if (process.argv[1] && process.argv[1].endsWith('build-phase3-builder-os-self-improvement.mjs')) {
  main().catch((err) => {
    console.error(err?.stack || err?.message || String(err));
    process.exit(1);
  });
}
