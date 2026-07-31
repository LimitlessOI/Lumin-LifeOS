/**
 * SYNOPSIS: Blueprint generator — produces a real Blueprint artifact from cleared
 * Chair consensus and a Reasoning Plan. The output is a manufacturable twin of
 * founder intent: purpose, users, business, competition, UX, architecture,
 * acceptance criteria, failure modes, implementation order, SENTRY plan, and
 * reality metrics.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BLUEPRINTS_DIR = path.resolve(__dirname, '..', '..', '..', 'data', 'blueprints');

export function generateBlueprint({
  reasoningPlan = null,
  chairSynthesis = null,
  founderPacket = null,
} = {}) {
  if (!reasoningPlan || !reasoningPlan.intent) {
    throw new Error('generateBlueprint requires a Reasoning Plan with intent.');
  }

  const intent = reasoningPlan.intent;
  const classification = reasoningPlan.classification || {};
  const gates = reasoningPlan.gates || {};
  const budget = reasoningPlan.budget || {};
  const measures = reasoningPlan.reality_measures || [];
  const unknowns = (chairSynthesis?.unknowns || reasoningPlan.unknowns || []);
  const assumptions = (chairSynthesis?.assumptions || reasoningPlan.assumptions || []);
  const risks = (chairSynthesis?.risks || reasoningPlan.risks || []);
  const evidenceNeeded = (chairSynthesis?.evidence_needed || reasoningPlan.evidence_needed || []);

  const blueprintId = `BP-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  const blueprint = {
    schema: 'builderos_blueprint_v1',
    id: blueprintId,
    created_at: new Date().toISOString(),
    reasoning_plan_id: reasoningPlan.id || null,
    source: 'chair_consensus',
    classification,
    budget,
    gates,
    purpose: {
      one_liner: intent.slice(0, 200),
      full_statement: intent,
      problem: `The system must autonomously decide and execute ${intent} without founder acting as communication bus.`,
      success: `A reproducible, SENTRY-verified artifact satisfies ${intent} with named disagreements preserved and confidence reported.`,
    },
    users: [
      { role: 'founder', needs: 'clear recommendation with confidence, risks, and a concrete next action' },
      { role: 'builder', needs: 'manufacturable spec with acceptance criteria and failure modes' },
      { role: 'sentry', needs: 'verifiable reality measures and a SENTRY plan' },
    ],
    business: {
      value_proposition: `Reduce founder cognitive load and communication overhead for ${intent}.`,
      cost_of_delay: classification.cost_of_error || 1,
      revenue_hypothesis: gates.affects_money ? 'Direct revenue impact if customer-facing.' : 'Indirect via founder throughput.',
    },
    competition: [
      { name: 'Claude Code / OpenAI Codex', gap: 'no constitutional governance or product-level blueprint authority' },
      { name: 'Cognition Devin', gap: 'no public receipt/SENET truth layer; PRs require human merge' },
      { name: 'Lovable / v0', gap: 'no reasoning-plan/lens separation or continuous reality-based learning' },
    ],
    ux: {
      founder_surface: 'Chair conversation with summarized recommendation, confidence, and next action',
      machine_surface: 'Reasoning Plan → Lens outputs → Chair synthesis → Blueprint → SENTRY PASS → Wisdom update',
      edge_cases: 'Unresolved disagreement escalates to founder with labeled options; Type C decisions require explicit founder approval.',
    },
    architecture: {
      components: [
        'Constitutional Decision Engine (Reasoning Plan)',
        'Lens Registry + Knowledge/Judgment-separated lenses',
        'Chair synthesis with named disagreements and propagated confidence',
        'Blueprint generator + readiness review gate',
        'Factory execute-step with SENTRY/Receipt Auditor hard gates',
        'Wisdom learning loop (model/lens/founder-philosophy trust)',
      ],
      data_flow: 'Mission → Reasoning Plan → Lenses → Chair synthesis → Blueprint → Implementation → SENTRY → Receipt → Wisdom',
    },
    acceptance_criteria: [
      ...measures.map((m) => `Reality measure "${m}" produces a pass receipt before DONE.`),
      'Named disagreements are preserved, not narrated away.',
      'Propagated confidence is reported and limiting factor is identified.',
      'Unknowns and evidence_needed shrink before mission reaches DONE.',
    ],
    failure_modes: [
      ...risks.map((r) => `Risk: ${r}`),
      'Type C mission proceeds without founder approval.',
      'SENTRY-mandatory mission reaches DONE without SENTRY PASS receipt.',
      'Chair averages lens outputs instead of preserving disagreement.',
    ],
    implementation_order: [
      'Confirm Reasoning Plan gate passes.',
      'Run required responsibilities/lenses within budget.',
      'Produce Chair synthesis with confidence and unknowns.',
      'Run blueprint readiness review.',
      'Execute manufacturable steps with SENTRY/Receipt Auditor gates.',
      'Update Wisdom with reality outcomes.',
    ],
    sentry_plan: {
      mandatory: gates.sentry_mandatory,
      layer_a: 'Structural HTTP/functional assertions against deployed artifact.',
      layer_b: 'Real-browser human-sim walkthrough with screenshots and UX critique.',
      fallback: 'If SENTRY cannot run, write BLOCKED receipt and pause mission.',
    },
    reality_metrics: {
      propagated_confidence: chairSynthesis?.propagated_confidence ?? null,
      limiting_factor: chairSynthesis?.limiting_factor ?? null,
      measures,
      unknowns,
      assumptions,
      evidence_needed: evidenceNeeded,
    },
    founder_packet_reference: founderPacket || null,
  };

  try {
    fs.mkdirSync(BLUEPRINTS_DIR, { recursive: true });
    fs.writeFileSync(path.join(BLUEPRINTS_DIR, `${blueprintId}.json`), JSON.stringify(blueprint, null, 2));
  } catch {
    // persistence is evidence, not logic
  }

  return blueprint;
}

export function reviewBlueprint(blueprint) {
  const reasons = [];
  if (!blueprint?.purpose?.full_statement) reasons.push('missing_purpose');
  if (!Array.isArray(blueprint?.acceptance_criteria) || blueprint.acceptance_criteria.length === 0) reasons.push('missing_acceptance_criteria');
  if (!Array.isArray(blueprint?.implementation_order) || blueprint.implementation_order.length === 0) reasons.push('missing_implementation_order');
  if (typeof blueprint?.sentry_plan?.mandatory !== 'boolean') reasons.push('missing_sentry_plan');
  if (blueprint?.classification?.type === 'C' && !blueprint?.gates?.founder_approval_required) reasons.push('type_c_requires_founder_approval');
  if (blueprint?.reality_metrics?.propagated_confidence == null) reasons.push('missing_propagated_confidence');
  if (Array.isArray(blueprint?.reality_metrics?.unknowns) && blueprint.reality_metrics.unknowns.length > 5) reasons.push('too_many_unknowns_for_blueprint');

  return { ok: reasons.length === 0, reasons };
}

export function loadBlueprint(blueprintId) {
  if (!blueprintId) return null;
  try {
    return JSON.parse(fs.readFileSync(path.join(BLUEPRINTS_DIR, `${blueprintId}.json`), 'utf8'));
  } catch {
    return null;
  }
}
