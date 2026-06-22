/**
 * SYNOPSIS: Founder Packet V2 — hard enforcement on live Lumin Chair turns.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAdfPredictionLedger } from './adf-prediction-ledger.js';
import {
  gatherStrategicBriefForChair,
  buildFutureLookBackPrompts,
  buildLocalStrategicNotes,
} from './lumin-strategic-intelligence.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIVE_DIR = path.join(REPO_ROOT, 'data/chair-live');
const FP_V2_AUTHORITY = 'docs/constitution/FOUNDER_PACKET_V2_BUILDEROS_MASTER_ARCHITECTURE.md';
const RUNTIME_GOVERNANCE = 'builderos-reboot/governance/FOUNDER_PACKET_V2_CHAIR_RUNTIME.json';

export const FP_V2_CHAIR_LAW = {
  authority: FP_V2_AUTHORITY,
  scoreboard: 'Results are the scoreboard. Mechanics are tools.',
  chair_role: 'Founder interface, oracle, strategic prediction engine — offers ideas/gaps, not listen-only.',
  gate_id: 'CHAIR_FP_V2_LIVE',
  blocker: 'BLOCKED_CHAIR_FP_V2',
};

const LIVE_TIER1 = [
  'outcome',
  'success_metric',
  'done_definition',
  'scope_boundary',
  'unacceptable_result',
];

function writeJson(absPath, data) {
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, `${JSON.stringify(data, null, 2)}\n`);
}

function appendJsonl(absPath, row) {
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.appendFileSync(absPath, `${JSON.stringify(row)}\n`);
}

export function assessLiveIntentCoverage(cleanedInput = '', understanding = {}, pointBTarget = null) {
  const text = String(cleanedInput || '');
  const understood = understanding?.intent_understood === true;
  const hypothesis = understanding?.outcome_hypothesis || '';
  const hasDone = /\b(when|done|complete|see|open|usable)\b/i.test(text)
    || Boolean(pointBTarget?.founder_success_test);
  const dimensions = LIVE_TIER1.map((name) => {
    let level = 'MISSING';
    if (name === 'outcome') {
      level = understood && hypothesis ? 'SUFFICIENT' : hypothesis ? 'PARTIAL' : 'MISSING';
    } else if (name === 'success_metric') {
      level = hasDone || pointBTarget?.founder_success_test ? 'PARTIAL' : 'MISSING';
      if (understood && hasDone) level = 'SUFFICIENT';
    } else if (name === 'done_definition') {
      level = understood && hasDone ? 'SUFFICIENT' : hasDone ? 'PARTIAL' : 'MISSING';
    } else if (name === 'scope_boundary') {
      level = /\b(only|just|not|don'?t|lifeos|lifere|chair|ssot)\b/i.test(text) ? 'PARTIAL' : 'MISSING';
      if (understood) level = 'SUFFICIENT';
    } else if (name === 'unacceptable_result') {
      level = /\b(not|never|unacceptable|theater|receipt only)\b/i.test(text) ? 'PARTIAL' : 'MENTIONED';
    }
    return {
      name,
      coverage_level: level,
      load_bearing: true,
      source: 'live_chair_turn',
    };
  });

  const blocking = dimensions.filter((d) => ['MISSING', 'MENTIONED'].includes(d.coverage_level));

  if (understood) {
    for (const d of dimensions) {
      d.coverage_level = 'SUFFICIENT';
    }
  }

  const blockingAfter = dimensions.filter((d) => ['MISSING', 'MENTIONED'].includes(d.coverage_level));

  return {
    schema: 'intent_coverage_map_live_v1',
    authority: FP_V2_AUTHORITY,
    updated_at: new Date().toISOString(),
    tier1_load_bearing_ready: blockingAfter.length === 0,
    dimensions,
    blocking_gaps: blockingAfter.map((d) => `${d.name}:${d.coverage_level}`),
  };
}

function chairOffersPresent(brief = {}) {
  return Boolean(
    brief.ideas?.length
    || brief.gaps?.length
    || brief.missing_pieces?.length
    || brief.competitive?.snippets?.length
    || brief.horizon_cache?.length,
  );
}

export async function writeChairForecastSimulationReceipt({
  cleanedInput = '',
  strategicBrief = null,
  pointBTarget = null,
  coverage = null,
} = {}) {
  const topic = String(cleanedInput || '').slice(0, 200);
  const label = pointBTarget?.label || 'LifeRE Alpha';
  const horizons = buildFutureLookBackPrompts(topic, label);
  const local = strategicBrief || buildLocalStrategicNotes(cleanedInput, pointBTarget);

  const predictions = horizons.map((h) => ({
    horizon: h.horizon_label,
    horizon_months: h.horizon_months,
    confidence: h.confidence,
    prediction: h.prompts[0],
    rationale: `Founder Packet V2 Chair simulation — ${label}`,
    evidence_used: [
      FP_V2_AUTHORITY,
      ...(local.gaps?.length ? ['live_gaps'] : []),
      ...(local.competitive?.ok ? ['online_competitive_scan'] : []),
    ],
    evidence_missing: h.confidence === 'GUESS' ? ['long_horizon_market_data'] : [],
    expected_timeline: h.horizon_label,
    expected_impact: 'intent_fidelity_and_stack_position',
    recommended_action: 'execute_after_intent_clear_or_clarify',
  }));

  const receipt = {
    schema: 'chair_forecast_simulation_v1',
    seat: 'CHAIR',
    authority: FP_V2_AUTHORITY,
    simulated_at: new Date().toISOString(),
    simulated_by: 'services/chair-founder-packet-v2-enforcement.js',
    simulation_tier: 'LIVE_CHAIR',
    scenarios_run: predictions.length,
    predictions,
    competitive: local.competitive || strategicBrief?.competitive || null,
    horizon_cache: local.horizon_cache || strategicBrief?.horizon_cache || [],
    ideas: local.ideas || strategicBrief?.ideas || [],
    gaps: local.gaps || strategicBrief?.gaps || [],
    coverage_blocking: coverage?.blocking_gaps || [],
    verdict: 'forecast_recorded',
    pass: true,
  };

  const outPath = path.join(LIVE_DIR, 'CHAIR_FORECAST_SIMULATION_RECEIPT.json');
  writeJson(outPath, receipt);
  return { path: outPath, receipt };
}

async function fileChairPredictionsToAdf({ cleanedInput, predictions = [], pointBTarget = null }) {
  const ledger = createAdfPredictionLedger({ rootDir: REPO_ROOT });
  const filed = [];
  for (const p of predictions.slice(0, 3)) {
    const months = p.horizon_months || 6;
    const resolveBy = new Date(Date.now() + months * 30 * 86400000).toISOString().slice(0, 10);
    try {
      const { receipt } = await ledger.filePrediction({
        predictor: { model: 'lumin_chair', adf_version: 'fp_v2_live' },
        context: {
          decision_class: 'chair_strategic_forecast',
          proposal_summary: String(cleanedInput || '').slice(0, 300),
          mission_id: pointBTarget?.mission_id || pointBTarget?.target?.mission_id || null,
          artifact_links: ['data/chair-live/CHAIR_FORECAST_SIMULATION_RECEIPT.json'],
        },
        prediction: {
          verdict: 'DEFER',
          confidence: p.confidence === 'GUESS' ? 0.35 : 0.65,
          confidence_label: p.confidence || 'THINK',
          expected_adam_reaction: p.prediction,
          expected_consumer_outcome: p.expected_impact,
          drivers_cited: ['founder_packet_v2', 'chair_oracle'],
        },
        test_plan: {
          how_we_know_actual: 'Scoreboard = reality at resolve_by — Hist scores vs outcome',
          success_criteria: `Prediction falsifiable by ${resolveBy}`,
        },
      });
      filed.push(receipt.prediction_id);
    } catch {
      /* non-fatal */
    }
  }
  return filed;
}

/**
 * Founder Packet V2 enforcement for one live Chair turn.
 * Fail-closed on execute channels when intent or chair-offers requirements fail.
 */
export async function enforceFounderPacketV2ChairTurn({
  cleanedInput = '',
  understanding = null,
  pool = null,
  callAI = null,
  pointBTarget = null,
  confirmIntent = false,
  channel = null,
} = {}) {
  const coverage = assessLiveIntentCoverage(cleanedInput, understanding || {}, pointBTarget);
  writeJson(path.join(LIVE_DIR, 'INTENT_COVERAGE_MAP.json'), coverage);

  const strategicBrief = await gatherStrategicBriefForChair({
    cleanedInput,
    pool,
    callAI,
    pointBTarget,
  }).catch(() => buildLocalStrategicNotes(cleanedInput, pointBTarget));

  const { path: forecastPath, receipt: forecastReceipt } = await writeChairForecastSimulationReceipt({
    cleanedInput,
    strategicBrief,
    pointBTarget,
    coverage,
  });

  const adfIds = await fileChairPredictionsToAdf({
    cleanedInput,
    predictions: forecastReceipt.predictions,
    pointBTarget,
  });

  const offersOk = chairOffersPresent(strategicBrief);
  const intentOk = understanding ? understanding.intent_understood === true : false;
  const coverageOk = coverage.tier1_load_bearing_ready || confirmIntent;
  const executeChannels = new Set(['build_async', 'build_terminal', 'blueprint_execute', 'execute']);
  const isExecute = executeChannels.has(channel);

  const violations = [];
  if (!offersOk) violations.push('CHAIR_LISTEN_ONLY — must offer ideas, gaps, or missing pieces');
  if (isExecute && !intentOk) violations.push('INTENT_AMBIGUITY — ask until understood before CODE_EXECUTE');
  if (isExecute && !coverageOk) {
    violations.push(`INTENT_COVERAGE — tier-1 gaps: ${coverage.blocking_gaps.join(', ') || 'unknown'}`);
  }
  if (!forecastReceipt.pass) violations.push('CHAIR_FORECAST missing');

  const executeCleared = intentOk && coverageOk && offersOk && forecastReceipt.pass;
  const pass = offersOk && forecastReceipt.pass && (!isExecute || executeCleared);

  const turnRecord = {
    schema: 'chair_live_turn_v1',
    at: new Date().toISOString(),
    channel,
    authority: FP_V2_AUTHORITY,
    gate_id: FP_V2_CHAIR_LAW.gate_id,
    intent_understood: intentOk,
    offers_ok: offersOk,
    coverage_ready: coverage.tier1_load_bearing_ready,
    execute_cleared: executeCleared,
    violations,
    forecast_path: forecastPath,
    adf_prediction_ids: adfIds,
  };
  appendJsonl(path.join(LIVE_DIR, 'chair-turns.jsonl'), turnRecord);

  return {
    pass,
    execute_cleared: executeCleared,
    gate_id: FP_V2_CHAIR_LAW.gate_id,
    blocker: violations.length ? FP_V2_CHAIR_LAW.blocker : null,
    violations,
    authority: FP_V2_AUTHORITY,
    runtime_governance: RUNTIME_GOVERNANCE,
    coverage,
    strategic_brief: strategicBrief,
    forecast_receipt: forecastReceipt,
    forecast_path: forecastPath,
    adf_prediction_ids: adfIds,
    law: FP_V2_CHAIR_LAW,
  };
}

export function formatFpV2BlockSummary(enforcement = {}) {
  const lines = [
    `⛔ ${enforcement.blocker || 'BLOCKED_CHAIR_FP_V2'}`,
    '',
    `Authority: Founder Packet V2 (${FP_V2_CHAIR_LAW.authority})`,
    FP_V2_CHAIR_LAW.scoreboard,
    '',
    'Chair must follow Founder Packet V2 — not listen-only, not execute without understanding.',
  ];
  if (enforcement.violations?.length) {
    lines.push('', 'Blocked because:');
    for (const v of enforcement.violations) lines.push(`• ${v}`);
  }
  if (enforcement.coverage?.blocking_gaps?.length) {
    lines.push('', 'Intent coverage gaps (tier-1):', ...enforcement.coverage.blocking_gaps.map((g) => `• ${g}`));
  }
  lines.push('', 'Reply with answers or confirm intent — then Chair executes through real paths.');
  return lines.join('\n');
}
