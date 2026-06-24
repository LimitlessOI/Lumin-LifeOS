/**
 * SYNOPSIS: Chair Intent Protocol — ask until understood, then execute toward founder Point B.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import { loadPointBTarget } from './point-b-target-lite.js';
import { isMissionPipelineIntent } from './lifeos-mission-pipeline-executor.js';
import { formatStrategicBriefSection } from './lumin-strategic-intelligence.js';
import {
  assessFounderBuildClarity,
  paraphraseFounderAsk,
} from './founder-intent-clarify.js';
import {
  assessGovernanceClarity,
  isGovernanceOrSsotIntent,
} from './founder-governance-clarify.js';

export const CHAIR_INTENT_PROTOCOL = {
  version: 'chair_intent_protocol_v2',
  supreme_authority: 'docs/constitution/FOUNDER_PACKET_V2_BUILDEROS_MASTER_ARCHITECTURE.md',
  point_b_dna: 'docs/constitution/POINT_B_DNA.md',
  chair_job: 'Ask until founder intent is understood; flesh broad vision with synergy; then execute toward founder Point B.',
  point_b_defined_by: 'founder_communications_intent',
  tools_not_destination:
    'Governance, SSOT, receipts, and pipelines are tools accountable to efficiency and A→B results — not the destination.',
  only_result: 'Point A reached Point B as Adam defined it.',
  scoreboard: 'Results are the scoreboard. Reality scores predictions.',
};

export function draftFounderOutcomeHypothesis(text = '', pointBTarget = null) {
  const t = String(text || '');
  const label = pointBTarget?.label || 'Point B';
  const founderTest = pointBTarget?.founder_success_test || pointBTarget?.target?.founder_success_test;

  if (/\b(lifere|life-?re)\b/i.test(t)) {
    return `LifeRE moves toward ${label}: daily command center usable for you without Cursor.`;
  }
  if (/\b(lumin|chair)\b/i.test(t)) {
    return `Lumin Chair behaves as you intend — understands you, then executes honestly.`;
  }
  if (/\b(point b|alpha)\b/i.test(t)) {
    return founderTest
      ? `Reach ${label}: ${founderTest}`
      : `Reach ${label} as you define it — not machine receipt theater.`;
  }
  if (/\b(north star|ssot|amendment|protocol)\b/i.test(t)) {
    return `Change law or process the right way — aligned to getting you to ${label}, not bureaucracy for its own sake.`;
  }
  return `Deliver the outcome in your message — I need a sharper picture of "done" before I execute.`;
}

function buildQuestions(gaps = [], options = []) {
  const questions = [];
  if (gaps.some((g) => /target file|which surface/i.test(g))) {
    questions.push('Which surface should change — LifeRE page, app shell, API/service, or SSOT only?');
  }
  if (gaps.some((g) => /success criteria|done/i.test(g))) {
    questions.push('What will you see or do when this is done? (One sentence — your Point B for this ask.)');
  }
  if (gaps.some((g) => /Point B|Alpha|receipt scan|usability/i.test(g))) {
    questions.push('Do you want code shipped, a receipt check, or your manual usability test?');
  }
  if (gaps.some((g) => /Governance|law|NSSOT|gate/i.test(g))) {
    questions.push('Is this a product change, a change receipt, gate-change council, or constitutional amendment?');
  }
  if (!questions.length && options.length) {
    questions.push('Which option matches what you want — reply A/B/C (or D/E for governance)?');
  }
  if (!questions.length && gaps.length) {
    questions.push('Correct my assumptions above — what should actually happen?');
  }
  return questions.slice(0, 4);
}

/**
 * Unified intent assessment — merges build + governance gaps into one understanding pass.
 */
export function assessChairIntentUnderstanding(cleanedInput = '', opts = {}) {
  const text = String(cleanedInput || '').trim();
  const expandedTask = String(opts.expandedTask || text).trim();
  const pointBTarget = opts.pointBTarget || loadPointBTarget();
  const includeBuild = opts.includeBuild === true;
  const includeGovernance = opts.includeGovernance === true;

  const includeMissionPipeline = opts.includeMissionPipeline === true;

  const gaps = [];
  const options = [];
  let buildClarity = null;
  let govClarity = null;

  if (includeMissionPipeline && /\b(point b|alpha|lifere)\b/i.test(text) && !/\b(receipt|pipeline only|machine path|scan)\b/i.test(text)) {
    gaps.push('Assumption: mission pipeline = receipt scan only (~400ms) — not shipping code toward what you want.');
    options.push(
      { id: 'A', label: 'Build / ship code toward my intent (builder commit)', channel: 'build_async' },
      { id: 'B', label: 'Receipt scan only — check machine path, no commit', channel: 'mission_pipeline' },
      { id: 'C', label: 'I will test usability myself — no build', channel: 'point_b' },
    );
  }

  if (includeGovernance && isGovernanceOrSsotIntent(text)) {
    govClarity = assessGovernanceClarity(text);
    gaps.push(...(govClarity.assumptions || []));
    options.push(...(govClarity.options || []));
  }

  if (includeBuild) {
    buildClarity = assessFounderBuildClarity(text, expandedTask);
    if (buildClarity.needs_clarify) {
      gaps.push(...(buildClarity.assumptions || []));
      for (const opt of buildClarity.options || []) {
        if (!options.some((o) => o.id === opt.id && o.label === opt.label)) {
          options.push(opt);
        }
      }
    }
  }

  const uniqueGaps = [...new Set(gaps)];
  const outcomeHypothesis = draftFounderOutcomeHypothesis(text, pointBTarget);
  const questions = buildQuestions(uniqueGaps, options);

  const missionBlocked = includeMissionPipeline
    && /\b(point b|alpha|lifere)\b/i.test(text)
    && !/\b(receipt|pipeline only|machine path|scan)\b/i.test(text);
  const buildBlocked = includeBuild && (buildClarity?.needs_clarify === true);
  const govBlocked = includeGovernance && isGovernanceOrSsotIntent(text) && govClarity?.needs_clarify !== false;
  const intentUnderstood = !buildBlocked && !govBlocked && !missionBlocked;

  return {
    intent_understood: intentUnderstood,
    protocol: CHAIR_INTENT_PROTOCOL,
    paraphrase: paraphraseFounderAsk(text),
    outcome_hypothesis: outcomeHypothesis,
    point_b_label: pointBTarget?.label || pointBTarget?.target?.label || null,
    founder_intent_gaps: uniqueGaps,
    questions,
    options: options.slice(0, 6),
    build_clarity: buildClarity,
    governance_clarity: govClarity,
  };
}

export function formatChairIntentClarifySummary(understanding = {}, strategicBrief = null) {
  const lines = [
    '🔍 CHAIR — UNDERSTANDING YOUR INTENT',
    '',
    CHAIR_INTENT_PROTOCOL.tools_not_destination,
    `Only result that matters: ${CHAIR_INTENT_PROTOCOL.only_result}`,
    '',
    understanding.paraphrase || '',
    '',
    'What I think you want to happen:',
    understanding.outcome_hypothesis || '(still unclear)',
  ];
  if (understanding.point_b_label) {
    lines.push('', `Current program Point B anchor: ${understanding.point_b_label} — defined by your intent, not by receipts alone.`);
  }
  if (understanding.founder_intent_gaps?.length) {
    lines.push('', 'I will NOT assume silently:');
    for (const g of understanding.founder_intent_gaps) {
      lines.push(`• ${g}`);
    }
  }
  if (understanding.questions?.length) {
    lines.push('', 'Questions for you:');
    understanding.questions.forEach((q, i) => lines.push(`${i + 1}. ${q}`));
  }
  if (understanding.options?.length) {
    lines.push('', 'Or pick a path:');
    for (const opt of understanding.options) {
      lines.push(`  ${opt.id}) ${opt.label}`);
    }
  }
  lines.push(
    '',
    'Nothing executes until intent is clear. Reply with answers, or **confirm** + your choice.',
    'When I understand — I get busy delivering it through the real system.',
  );

  if (strategicBrief) {
    const extra = formatStrategicBriefSection(strategicBrief);
    if (extra) lines.push(extra);
  }

  return lines.join('\n');
}
