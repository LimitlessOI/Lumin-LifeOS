/**
 * SYNOPSIS: Score due Chair/ADF predictions against mission reality — Founder Packet V2 scoreboard.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAdfPredictionLedger } from './adf-prediction-ledger.js';
import { createUsefulWorkGuard } from './useful-work-guard.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MISSIONS_ROOT = path.join(REPO_ROOT, 'builderos-reboot/MISSIONS');
const DUE_LOG = path.join(REPO_ROOT, 'data/chair-live/predictions-due-for-scoring.jsonl');
const HIST_SCORE_LOG = path.join(REPO_ROOT, 'data/chair-live/hist-prediction-scores.jsonl');

async function readJson(absPath) {
  try {
    const raw = await fs.readFile(absPath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function listOpenPredictions(rootDir) {
  const ledger = createAdfPredictionLedger({ rootDir });
  return ledger.listPredictions({ status: 'open' });
}

function isDue(receipt) {
  const criteria = receipt?.test_plan?.success_criteria || '';
  const match = criteria.match(/(\d{4}-\d{2}-\d{2})/);
  if (!match) return false;
  return match[1] <= new Date().toISOString().slice(0, 10);
}

function inferActualFromMissionVerdict(missionId, verdict) {
  if (!verdict) return null;
  const technicalOk = ['TECHNICAL_PASS', 'PASS', 'OBJECTIVE_COMPLETE'].includes(
    String(verdict.verdict || '').toUpperCase(),
  );
  if (verdict.founder_usability_pass === true) {
    return {
      adam_verdict: 'APPROVE',
      adam_quote: verdict.founder_usability_quote
        || `Founder usability PASS (${missionId})`,
      variance_notes: 'Hist: founder_usability_pass true in OBJECTIVE_VERDICT',
    };
  }
  if (technicalOk) {
    return {
      adam_verdict: 'DEFER',
      adam_quote: `Technical PASS; awaiting founder usability (${missionId})`,
      variance_notes: 'Hist: TECHNICAL_PASS without founder usability',
    };
  }
  if (String(verdict.verdict || '').toUpperCase() === 'FAIL') {
    return {
      adam_verdict: 'REJECT',
      adam_quote: `Mission acceptance FAIL (${missionId})`,
      variance_notes: 'Hist: objective verdict FAIL',
    };
  }
  return null;
}

async function inferActualFromReality(receipt) {
  const missionId = receipt.context?.mission_id;
  if (missionId) {
    const verdictPath = path.join(MISSIONS_ROOT, missionId, 'OBJECTIVE_VERDICT.json');
    const verdict = await readJson(verdictPath);
    const fromVerdict = inferActualFromMissionVerdict(missionId, verdict);
    if (fromVerdict) return fromVerdict;
  }

  const criteria = String(receipt.test_plan?.success_criteria || '');
  const missionMatch = criteria.match(/PRODUCT-[A-Z0-9-]+/);
  if (missionMatch) {
    const verdictPath = path.join(MISSIONS_ROOT, missionMatch[0], 'OBJECTIVE_VERDICT.json');
    const verdict = await readJson(verdictPath);
    const fromVerdict = inferActualFromMissionVerdict(missionMatch[0], verdict);
    if (fromVerdict) return fromVerdict;
  }

  return null;
}

async function scoreOnePrediction(ledger, receipt) {
  const actual = await inferActualFromReality(receipt);
  if (!actual) return null;

  if (receipt.status === 'open') {
    await ledger.recordActual(receipt.prediction_id, {
      recorder: 'hist_auto_score',
      adam_verdict: actual.adam_verdict,
      adam_quote: actual.adam_quote,
    });
  }

  const result = await ledger.scorePrediction(receipt.prediction_id, {
    variance_notes: actual.variance_notes,
  });

  const row = {
    schema: 'hist_prediction_score_v1',
    at: new Date().toISOString(),
    prediction_id: receipt.prediction_id,
    mission_id: receipt.context?.mission_id || null,
    actual_verdict: actual.adam_verdict,
    direction_match: result.receipt.score?.direction_match,
    lesson: result.receipt.score?.lesson || null,
  };
  await fs.mkdir(path.dirname(HIST_SCORE_LOG), { recursive: true });
  await fs.appendFile(HIST_SCORE_LOG, `${JSON.stringify(row)}\n`);
  return row;
}

export async function runChairPredictionScoreTick({ logger } = {}) {
  const ledger = createAdfPredictionLedger({ rootDir: REPO_ROOT });
  const open = await listOpenPredictions(REPO_ROOT);
  const due = open.filter((row) => isDue(row.receipt));
  const scoreable = open.filter((row) => row.receipt.status === 'open');

  const scored = [];
  for (const { receipt } of scoreable) {
    const dueOrReality = isDue(receipt) || receipt.context?.mission_id;
    if (!dueOrReality) continue;
    try {
      const row = await scoreOnePrediction(ledger, receipt);
      if (row) scored.push(row);
    } catch (err) {
      logger?.warn?.({ prediction_id: receipt.prediction_id, err: err.message }, '[CHAIR-PREDICTION-SCORE] skip');
    }
  }

  for (const { receipt } of due) {
    if (scored.some((s) => s.prediction_id === receipt.prediction_id)) continue;
    const row = {
      schema: 'prediction_due_for_scoring_v1',
      at: new Date().toISOString(),
      prediction_id: receipt.prediction_id,
      status: 'due_no_reality_signal',
      note: 'Due but no OBJECTIVE_VERDICT signal yet',
    };
    await fs.mkdir(path.dirname(DUE_LOG), { recursive: true });
    await fs.appendFile(DUE_LOG, `${JSON.stringify(row)}\n`);
  }

  logger?.info?.(
    { due: due.length, open: open.length, scored: scored.length },
    '[CHAIR-PREDICTION-SCORE] tick',
  );
  return { ok: true, due_count: due.length, open_count: open.length, scored_count: scored.length, scored };
}

export function registerChairPredictionScoreScheduler({ logger, intervalMs = 6 * 60 * 60 * 1000 } = {}) {
  const guarded = createUsefulWorkGuard({
    taskName: 'Chair Prediction Score Tick',
    purpose: 'Hist auto-score ADF/Chair predictions against OBJECTIVE_VERDICT reality (Founder Packet V2 scoreboard)',
    prerequisites: async () => true,
    workCheck: async () => {
      const open = await listOpenPredictions(REPO_ROOT);
      for (const { receipt } of open) {
        if (isDue(receipt)) return 1;
        if (receipt.context?.mission_id) {
          const verdict = await readJson(
            path.join(MISSIONS_ROOT, receipt.context.mission_id, 'OBJECTIVE_VERDICT.json'),
          );
          if (inferActualFromMissionVerdict(receipt.context.mission_id, verdict)) return 1;
        }
      }
      return 0;
    },
    execute: () => runChairPredictionScoreTick({ logger }),
    logger,
  });
  const timer = setInterval(guarded, intervalMs);
  if (typeof timer.unref === 'function') timer.unref();
  guarded().catch(() => {});
  return { timer, tick: guarded };
}
