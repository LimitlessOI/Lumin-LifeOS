/**
 * SYNOPSIS: Orchestrates POST /api/v1/lifeos/builder/build for Phase 2 Safety, Coaching, and Wisdom engines.
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
const BUILDEROS_HOME = 'docs/products/builderos/PRODUCT_HOME.md';
const LIFEOS_HOME = 'docs/products/lifeos/PRODUCT_HOME.md';

const SHARED_REQS = [
  'The generated file MUST start with a JSDoc comment block that includes the exact tag: @ssot {{SSOT}}',
  'Only export the functions/constants named in this task; no new file imports unless explicitly allowed below.',
  'Use plain JS (ES modules), Node-compatible, no external packages.',
  'Do not use JavaScript reserved/strict-mode words as identifiers (package, interface, class, private, public, etc.).',
  'When including apostrophes inside string literals, use double quotes or template literals so the file passes node --check.',
  'The commit gate rejects the literal strings PLACEHOLDER, STUB, TODO, FIXME, "for demonstration", "not implemented", and "this is a placeholder" anywhere in code, comments, strings, or JSDoc. Do NOT use them.',
  'Avoid meta-commentary such as "in a real implementation" or "this would typically involve". Write production-ready, runnable code.',
  'All functions should be deterministic and return plain JSON-serializable objects or primitives.',
];

function sharedBlock(ssot) {
  return `FILE REQUIREMENTS:
- ${SHARED_REQS.join('\n- ').replace(/{{SSOT}}/g, ssot)}`;
}

const STEPS = [
  {
    step_id: 'P2-001',
    title: 'Build emotional-modeling.js',
    target_file: 'services/emotional-modeling.js',
    ssot: LIFEOS_HOME,
    product: 'lifeos',
    task: `Build \`services/emotional-modeling.js\` for LifeOS.
Purpose: model emotional weight as significance (not intensity). Significance = how much an observation matters to the person's values, goals, relationships, and identity.
Exported functions:
- \`scoreEmotionalWeight(observation)\` where observation is \`{subject, event, bodySensation, intensity: number 0-1, context, timestamp, valuesAtStake?: string[]}\`. Returns \`{significance: number 0-1, emotionalWeight: number 0-1, confidence: number 0-1, notes: string}\`. Derive emotionalWeight from intensity and context, but significance must be anchored to valuesAtStake and long-term stakes, not raw intensity.
- \`clusterEmotions(observations: array)\` returns \`{clusters: [{label, observations, averageSignificance, count}]}\`. Use simple string/bodySensation similarity grouping.
- \`mergeEmotionalSignals(signals: array)\` where each signal is like \`scoreEmotionalWeight\` output. Returns a single merged object with combined significance, confidence, and a synthesized \`notes\` string.
- \`explainSignificance(score)\` returns a short human-readable sentence describing why the significance score is what it is.
- \`getDefaultObservationSchema()\` returns the expected observation shape as an object.
Keep all logic self-contained; do not import other service modules.`,
  },
  {
    step_id: 'P2-002',
    title: 'Build state-modeling.js',
    target_file: 'services/state-modeling.js',
    ssot: LIFEOS_HOME,
    product: 'lifeos',
    task: `Build \`services/state-modeling.js\` for LifeOS.
Purpose: infer a person's current state from their constellation and recent events, and adapt coaching style without labeling.
Exported functions:
- \`inferState(constellation, recentEvents)\` where constellation is \`{nodes: [{id, type, name, value}], edges: [{from, to, weight}]}\` and recentEvents is an array of event strings. Returns \`{state: string, confidence: number 0-1, indicators: string[], suggestions: {pace: 'slow'|'normal'|'pause', depth: 'surface'|'medium'|'deep', directness: 'indirect'|'gentle'|'direct', avoidLabels: boolean}}\`. States: calm, excited, overwhelmed, ashamed, grieving, angry, hopeful, unknown. Pick based on node types 'states', 'triggers', 'needs', and event keywords.
- \`adaptCoachingForState(state)\` returns the same suggestions shape for the inferred state.
- \`detectStateShift(previousState, currentState)\` returns \`{shifted: boolean, direction: string, note: string}\`.
- \`describeState(state, confidence)\` returns a short, non-labeling sentence like "It sounds like there may be a lot right now".
Keep all logic self-contained; do not import other service modules.`,
  },
  {
    step_id: 'P2-003',
    title: 'Build lifeos-coaching-protocol.js',
    target_file: 'services/lifeos-coaching-protocol.js',
    ssot: LIFEOS_HOME,
    product: 'lifeos',
    task: `Build \`services/lifeos-coaching-protocol.js\` for LifeOS.
Purpose: implement the coaching flow: Observe → Become curious → Help them feel understood → Expand the landscape → Verify shared understanding → Assess readiness → Explore paths (if invited).
Exported functions:
- \`observe(input)\` takes a string or \`{text, metadata}\` and returns \`{observation: string, themes: string[], entities: string[]}\`.
- \`becomeCurious(observation)\` returns a single curious, open-ended question string.
- \`helpFeelUnderstood(constellation, statement)\` returns a reflection string that mirrors content and emotion without adding interpretation.
- \`expandLandscape(constellation, topic)\` returns \`{perspectives: string[], unstatedNeeds: string[], betterQuestions: string[]}\`. Use the constellation's nodes and edges.
- \`verifySharedUnderstanding(summary, userReply)\` returns \`{aligned: boolean, confidence: number 0-1, gap: string|null}\`.
- \`assessReadiness(constellation, topic, complexity='medium', emotionalWeight=0.5)\` returns \`{readinessScore: number 0-1, riskIfForced: number 0-1, form: 'question'|'suggestion'|'pause'|'resource'}\`. Self-contained readiness logic (do not import readiness-engine).
- \`explorePaths(constellation, topic, invitation=true)\` returns \`{invited: boolean, paths: [{label, rationale, nextStep}]}\`.
Keep all logic self-contained; do not import other service modules.`,
  },
  {
    step_id: 'P2-004',
    title: 'Build lifeos-risk-detection.js',
    target_file: 'services/lifeos-risk-detection.js',
    ssot: LIFEOS_HOME,
    product: 'lifeos',
    task: `Build \`services/lifeos-risk-detection.js\` for LifeOS.
Purpose: recognize trajectories (not merely danger) toward burnout, isolation, hopelessness, relationship collapse, addiction, financial collapse, violence, medical decline. Use least-invasive intervention.
Exported functions:
- \`detectTrajectory(constellation, eventStream)\` where eventStream is an array of \`{type, description, timestamp, weight}\`. Returns \`{risks: [{riskType, severity: 'low'|'moderate'|'high'|'critical', trajectory: 'improving'|'stable'|'worsening'|'unknown', confidence: number 0-1, indicators: string[], evidence: string[]}]}\`. riskType is one of the eight categories above.
- \`assessSeverity(risk)\` returns \`{level: 'low'|'moderate'|'high'|'critical', rationale: string}\`.
- \`recommendIntervention(risk, preferences={})\` returns \`{intervention: string, invasiveness: number 0-1, rationale: string, resources: string[]}\`. Invasiveness should be lowest that can reduce risk.
- \`isEscalationNeeded(risk)\` returns boolean (true for critical or high with imminent language).
- \`getRiskTypes()\` returns the list of supported risk types.
Keep all logic self-contained; do not import other service modules.`,
  },
  {
    step_id: 'P2-005',
    title: 'Build lifeos-crisis-protocol.js',
    target_file: 'services/lifeos-crisis-protocol.js',
    ssot: LIFEOS_HOME,
    product: 'lifeos',
    task: `Build \`services/lifeos-crisis-protocol.js\` for LifeOS.
Purpose: provide personalized, consent-based crisis plans with contacts, grounding techniques, and language to avoid.
Exported functions:
- \`createCrisisPlan({userId, contacts, groundingTechniques, avoidLanguage, consent})\` returns a plan object with those fields plus \`createdAt\` and \`verifyConsent(plan)\` returns true if \`plan.consent\` is present and not empty.
- \`getGroundingTechnique(state, plan, preferences={})\` returns a grounding instruction string chosen from plan.groundingTechniques based on state.
- \`getContactsForRisk(risk, plan)\` returns a filtered array of contacts from plan.contacts based on risk severity.
- \`renderCrisisMessage(risk, plan)\` returns a compassionate, transparent message that includes grounding instructions and contact options, while avoiding plan.avoidLanguage words.
- \`updateCrisisPlan(plan, update)\` returns an updated plan object.
Keep all logic self-contained; do not import other service modules.`,
  },
  {
    step_id: 'P2-006',
    title: 'Build lifeos-avoidance-pattern.js',
    target_file: 'services/lifeos-avoidance-pattern.js',
    ssot: LIFEOS_HOME,
    product: 'lifeos',
    task: `Build \`services/lifeos-avoidance-pattern.js\` for LifeOS.
Purpose: detect when a topic is repeatedly approached and moved away from, and frame it as a curious invitation, not confrontation.
Exported functions:
- \`detectAvoidancePattern(constellation, topic, events)\` where events is an array of \`{topic, action: 'approach'|'avoid', timestamp}\`. Returns \`{detected: boolean, occurrences: number, pattern: 'consistent_avoidance'|'mixed'|'none', confidence: number 0-1, examples: string[]}\`.
- \`formatCuriousInvitation(pattern, topic, tone='gentle')\` returns a string like: "I notice this topic has come up several times but we consistently move away from it. I could be reading that incorrectly. Does that observation fit your experience?" Adapt to tone.
- \`trackTopicExposure(constellation, topic, event)\` returns an updated constellation-like object with a new or updated node/edge entry for the topic exposure.
Keep all logic self-contained; do not import other service modules.`,
  },
  {
    step_id: 'P2-007',
    title: 'Build chair-preliminary-decision.js',
    target_file: 'services/chair-preliminary-decision.js',
    ssot: BUILDEROS_HOME,
    product: 'builderos',
    task: `Build \`services/chair-preliminary-decision.js\` for BuilderOS governance.
Purpose: the Chair receives the evidence package, performs independent reasoning, and records a preliminary decision BEFORE seeing Solomon's recommendation.
Exported functions:
- \`createEvidencePackage(topic, evidenceItems)\` where evidenceItems is an array of \`{source, content, confidence}\`. Returns an object with \`topic, evidenceItems, createdAt\`.
- \`recordPreliminaryDecision(pkg, chairId, reasoning, proposedDecision)\` returns a new object adding \`chairPreliminary: {chairId, reasoning, proposedDecision, recordedAt}\`.
- \`getChairReasoning(pkg)\` returns the reasoning string or null.
- \`getProposedDecision(pkg)\` returns the proposedDecision or null.
- \`hasPreliminaryDecision(pkg)\` returns boolean.
Keep all logic self-contained; do not import other service modules.`,
  },
  {
    step_id: 'P2-008',
    title: 'Build solomon-withheld-recommendation.js',
    target_file: 'services/solomon-withheld-recommendation.js',
    ssot: BUILDEROS_HOME,
    product: 'builderos',
    task: `Build \`services/solomon-withheld-recommendation.js\` for BuilderOS governance.
Purpose: Solomon independently analyzes the same evidence package and withholds its recommendation until the Chair has recorded a preliminary decision.
Exported functions:
- \`createWithheldPackage(evidencePackage)\` returns a base package with the evidence.
- \`addSolomonFinding(pkg, finding)\` where finding is \`{claim, evidence, confidence}\`. Returns an updated package.
- \`addSolomonRecommendation(pkg, {courseOfAction, confidence, assumptions, uncertainties, constitutionalTensions})\` returns an updated package with a \`solomonRecommendation\` object and \`withheld: true\`.
- \`revealRecommendation(pkg, chairPreliminaryPkg)\` returns the \`solomonRecommendation\` only if \`chairPreliminaryPkg\` has a preliminary decision (use \`chairPreliminary && chairPreliminary.proposedDecision\` check); otherwise returns \`{revealed: false, reason: 'Chair preliminary decision not yet recorded'}\`.
- \`getSolomonSummary(pkg)\` returns a string summary of findings and recommendation (even if withheld).
Keep all logic self-contained; do not import other service modules.`,
  },
  {
    step_id: 'P2-009',
    title: 'Build chair-solomon-calibration.js',
    target_file: 'services/chair-solomon-calibration.js',
    ssot: BUILDEROS_HOME,
    product: 'builderos',
    task: `Build \`services/chair-solomon-calibration.js\` for BuilderOS governance.
Purpose: compare Chair and Solomon reasoning against actual outcomes and calibrate both.
Exported functions:
- \`compareDecisions(chairPreliminary, solomonRecommendation, outcome={actualResult})\` returns \`{agreement: boolean, divergence: string, chairFit: number 0-1, solomonFit: number 0-1, lesson: string}\`.
- \`updateCalibrationScores(officeId, result, ledger={})\` returns an updated ledger object mapping \`officeId\` to \`{predictions, correct, calibrationScore: number 0-1, lastUpdated}\`. Track simple running accuracy and a calibration score.
- \`formatComparisonReport(chairPreliminary, solomonRecommendation, outcome)\` returns a concise markdown-ish report string.
- \`getCalibrationScore(ledger, officeId)\` returns the score or 0.
Keep all logic self-contained; do not import other service modules.`,
  },
  {
    step_id: 'P2-010',
    title: 'Build founder-communication-calibration.js',
    target_file: 'services/founder-communication-calibration.js',
    ssot: BUILDEROS_HOME,
    product: 'builderos',
    task: `Build \`services/founder-communication-calibration.js\` for BuilderOS.
Purpose: translate messages toward Adam's communication style — literalness, precision, confidence expression, abstraction, narrative density, goal orientation, learning style, biases, correction strategies.
Exported functions:
- \`getDefaultProfile()\` returns \`{literalness: number 0-1, precision: number 0-1, confidenceExpression: number 0-1, abstraction: number 0-1, narrativeDensity: number 0-1, goalOrientation: number 0-1, learningStyle: 'example'|'principle'|'story', biases: string[], correctionStrategies: string[]}\`.
- \`calibrateMessage(message, profile={})\` returns \`{adjusted: string, changes: string[], why: string}\`. Adjust the message toward the profile dimensions.
- \`learnFromFeedback(profile, originalMessage, adjustedMessage, feedback)\` returns an updated profile object. Feedback is \`{dimension: string, direction: 'more'|'less', strength: number 0-1}\`.
- \`estimateProfile(messages, feedbackItems)\` returns a profile inferred from sample messages and feedback.
Keep all logic self-contained; do not import other service modules.`,
  },
];

const resumeFrom = process.env.PHASE2_RESUME;
const ACTIVE_STEPS = resumeFrom
  ? STEPS.slice(STEPS.findIndex((s) => s.step_id === resumeFrom))
  : STEPS;

async function buildStep(step) {
  const url = `${BASE}/api/v1/lifeos/builder/build`;
  const files = [MASTER_BP, step.ssot];
  if (step.product === 'lifeos') files.push(BUILDEROS_HOME);
  else files.push(LIFEOS_HOME);

  const body = {
    mission_id: 'FACTORY-PHASE2-SAFETY-WISDOM-0001',
    target_file: step.target_file,
    commit_message: `Phase 2 safety/wisdom: ${step.step_id} ${step.title}`,
    task: `${step.task}\n\n${sharedBlock(step.ssot)}`,
    spec: `Phase 2 Safety, Coaching, and Wisdom implementation per ${MASTER_BP} sections 4.2 and 5. Build the file exactly as specified in the task.`,
    mode: 'code',
    model: 'openai_builder_standard',
    max_output_tokens: 16384,
    strict_model: true,
    confirm_intent: true,
    platform_gap_fill: true,
    platform_gap_fill_reason: `GAP-FILL: operator-authorized Phase 2 safety/wisdom build for ${step.step_id} per the ratified master blueprint. Adam ordered Builder to execute the A-to-Z blueprint without stopping and this service is listed in Phase 2.`,
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
  try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 500) }; }
  return { ok: res.ok && json.ok === true && json.committed === true, status: res.status, json, step };
}

async function main() {
  if (!KEY) {
    console.error('Missing COMMAND_CENTER_KEY (or COMMAND_KEY / LIFEOS_KEY / API_KEY).');
    process.exit(1);
  }

  console.log(`Dispatching ${ACTIVE_STEPS.length} Phase 2 steps to ${BASE}/api/v1/lifeos/builder/build`);
  const results = [];
  for (const step of ACTIVE_STEPS) {
    console.log(`\n[${step.step_id}] ${step.title} -> ${step.target_file}`);
    const result = await buildStep(step);
    results.push(result);
    if (result.ok) {
      console.log(`  COMMITTED: ${result.json.commit_sha || result.json.target_file}`);
    } else {
      console.error(`  FAILED (${result.status}): ${JSON.stringify(result.json, null, 2)}`);
      break;
    }
  }

  const failures = results.filter((r) => !r.ok);
  console.log(`\nDONE — committed: ${results.length - failures.length}, failed: ${failures.length}`);
  process.exit(failures.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
