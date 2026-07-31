/**
 * SYNOPSIS: Cognitive Step Runner — Chair/Lens/Model/Execution pipeline.
 * Every factory execute-step first composes responsibilities + lenses, selects
 * the cheapest capable model per lens, collects independent outputs with
 * disagreement preserved, stores a Chair synthesis, and only then writes code.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { composeReasoning, loadLensRegistry } from '../../../services/cognitive-chair.mjs';
import { createCouncilMembers } from '../../../config/council-members.js';
import { decideGate } from '../../../services/cognitive-core-oracle.js';

const RESPONSIBILITY_CAPABILITY_MAP = {
  chair: ['reasoning', 'architecture', 'planning', 'governance'],
  architect: ['architecture', 'reasoning', 'planning'],
  builder: ['code', 'code_generation', 'execution', 'builderos', 'bounded_patching'],
  sentry: ['testing', 'review', 'analysis'],
  cfo: ['analysis', 'reasoning'],
  wisdom: ['reasoning', 'planning', 'architecture'],
  creative: ['reasoning', 'code', 'code_generation'],
};

const TIER_RANK = { tier0: 0, tier1: 1, tier2: 2, tier3: 3 };

function rankOf(member) {
  return TIER_RANK[member?.tier] ?? 1;
}

function memberIsCapableFor(member, lens, responsibility) {
  const required = new Set(RESPONSIBILITY_CAPABILITY_MAP[responsibility] || []);
  const specialties = new Set(member?.specialties || []);
  // A lens explicitly declares a default model member; that member is always capable.
  if (lens?.default_model_member && member?.key === lens.default_model_member) return true;
  // Otherwise the member must match a capability the responsibility demands.
  if (required.size === 0) return true;
  for (const r of required) if (specialties.has(r)) return true;
  return false;
}

/**
 * Pick the cheapest council member that is not disabled and is capable for the
 * lens + responsibility, but never exceed the lens's declared default member tier
 * (strong-first floor). Falls back to the lens default_model_member if nothing
 * cheaper is capable.
 */
export function selectCheapestCapableModel(lens, responsibility, members) {
  const defaultMember = lens?.default_model_member ? (members[lens.default_model_member] || null) : null;
  const defaultRank = defaultMember ? rankOf(defaultMember) : 1;
  const candidates = Object.entries(members)
    .filter(([, m]) => !m.disabled)
    .map(([key, m]) => ({ key, ...m }))
    .filter((m) => rankOf(m) <= defaultRank)
    .filter((m) => memberIsCapableFor(m, lens, responsibility))
    .sort((a, b) => (a.costPer1M ?? Infinity) - (b.costPer1M ?? Infinity));

  if (candidates.length > 0) return candidates[0].key;
  return lens?.default_model_member || 'openai_gpt';
}

/**
 * Run one cognitive step for a build task. Returns a Chair synthesis and a build
 * plan that execution (authoring.js / codegen) can consume. In dry-run no models
 * are called and no code is written.
 */
export async function runCognitiveStep({
  step = {},
  mission,
  responsibilities = [],
  lenses = [],
  root,
  callModel = null,
  dryRun = false,
} = {}) {
  if (!mission && step?.task) ({ mission } = { mission: step.task });
  if (!mission) throw new Error('runCognitiveStep requires mission or step.task');

  const members = createCouncilMembers({ DEEPSEEK_BRIDGE_ENABLED: process.env.DEEPSEEK_BRIDGE_ENABLED });
  const transcript = await composeReasoning({ mission, responsibilities, lenses, root, callModel });
  const registry = loadLensRegistry(root);

  const buildPlan = transcript.outputs.map((o) => {
    const lens = registry.lenses.find((l) => l.lens_id === o.lens_id) || {};
    const selected = dryRun ? 'dry-run' : selectCheapestCapableModel(lens, o.responsibility, members);
    return {
      responsibility: o.responsibility,
      lens_id: o.lens_id,
      lens_name: o.lens_name,
      selected_model: selected,
      default_model: lens?.default_model_member || o.model_member,
      summary: o.parsed?.summary || o.response?.slice(0, 200) || '',
      position: o.parsed?.position || '',
      evidence: o.parsed?.evidence || [],
      disagreements: o.parsed?.disagreements || [],
      confidence: o.parsed?.confidence ?? null,
      recommended_action: o.parsed?.recommended_action || '',
    };
  });

  const chair = transcript.chair?.parsed || null;
  let gate = null;
  if (chair?.confidence != null) {
    // Reuse generic cognitive-core-oracle math for trust scoring, not the
    // user-specific judgment tables (cognitive-core-judgment.js).
    gate = decideGate({ p: chair.confidence, stake: 1, verifyCost: 0.2 });
  }

  const executionSpec = {
    mission,
    dry_run: dryRun,
    chair_position: chair?.chair_position || '',
    tradeoffs: chair?.tradeoffs || [],
    named_disagreements: chair?.named_disagreements || [],
    why_this_wins: chair?.why_this_wins || '',
    risks: chair?.risks || [],
    next_action: chair?.next_action || '',
    gate,
    plan: buildPlan,
  };

  return { transcript, buildPlan, chair, gate, executionSpec, dryRun };
}

export function formatBuildPlan(result) {
  const lines = [
    `# Cognitive Step Build Plan`,
    `Mission: ${result.executionSpec.mission}`,
    `Dry run: ${result.dryRun}`,
    `Chair gate: ${result.gate ? `${result.gate.verdict} (p_hat=${result.gate.p_hat?.toFixed(2)}, threshold=${result.gate.threshold?.toFixed(2)})` : 'none'}`,
    '',
    `## Chair synthesis`,
    `- Position: ${result.executionSpec.chair_position || '(none)'}`,
    `- Tradeoffs: ${(result.executionSpec.tradeoffs || []).join('; ') || 'none'}`,
    `- Named disagreements: ${(result.executionSpec.named_disagreements || []).join('; ') || 'none'}`,
    `- Why this wins: ${result.executionSpec.why_this_wins || 'none'}`,
    `- Risks: ${(result.executionSpec.risks || []).join('; ') || 'none'}`,
    `- Next action: ${result.executionSpec.next_action || 'none'}`,
    '',
    `## Lens execution plan`,
  ];
  for (const p of result.buildPlan) {
    lines.push(`### ${p.responsibility} / ${p.lens_id} (${p.lens_name})`);
    lines.push(`- selected_model: ${p.selected_model} (default: ${p.default_model})`);
    lines.push(`- confidence: ${p.confidence ?? 'n/a'}`);
    lines.push(`- summary: ${p.summary}`);
    lines.push(`- recommended_action: ${p.recommended_action || 'n/a'}`);
    if (p.disagreements.length) lines.push(`- disagreements: ${p.disagreements.join('; ')}`);
  }
  return lines.join('\n');
}
