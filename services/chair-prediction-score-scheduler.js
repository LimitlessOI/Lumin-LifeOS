/**
 * SYNOPSIS: Score due Chair/ADF predictions — Founder Packet V2 scoreboard loop.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAdfPredictionLedger } from './adf-prediction-ledger.js';
import { createUsefulWorkGuard } from './useful-work-guard.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DUE_LOG = path.join(REPO_ROOT, 'data/chair-live/predictions-due-for-scoring.jsonl');

async function listOpenPredictions(rootDir) {
  const ledger = createAdfPredictionLedger({ rootDir });
  const all = await ledger.listPredictions({ status: 'open', limit: 200 });
  return all;
}

function isDue(receipt) {
  const criteria = receipt?.test_plan?.success_criteria || '';
  const match = criteria.match(/(\d{4}-\d{2}-\d{2})/);
  if (!match) return false;
  return match[1] <= new Date().toISOString().slice(0, 10);
}

export async function runChairPredictionScoreTick({ logger } = {}) {
  const open = await listOpenPredictions(REPO_ROOT);
  const due = open.filter((row) => isDue(row.receipt));
  for (const { receipt } of due) {
    const row = {
      schema: 'prediction_due_for_scoring_v1',
      at: new Date().toISOString(),
      prediction_id: receipt.prediction_id,
      status: 'due_for_hist_scoring',
      note: 'Resolve against reality — verbal agreement does not score',
    };
    await fs.mkdir(path.dirname(DUE_LOG), { recursive: true });
    await fs.appendFile(DUE_LOG, `${JSON.stringify(row)}\n`);
  }
  logger?.info?.({ due: due.length, open: open.length }, '[CHAIR-PREDICTION-SCORE] tick');
  return { ok: true, due_count: due.length, open_count: open.length };
}

export function registerChairPredictionScoreScheduler({ logger, intervalMs = 6 * 60 * 60 * 1000 } = {}) {
  const guarded = createUsefulWorkGuard({
    taskName: 'Chair Prediction Score Tick',
    purpose: 'Mark due ADF/Chair predictions for Hist scoring (Founder Packet V2 scoreboard)',
    prerequisites: async () => true,
    workCheck: async () => {
      const open = await listOpenPredictions(REPO_ROOT);
      return open.some((row) => isDue(row.receipt)) ? 1 : 0;
    },
    execute: () => runChairPredictionScoreTick({ logger }),
    logger,
  });
  const timer = setInterval(guarded, intervalMs);
  if (typeof timer.unref === 'function') timer.unref();
  return { timer, tick: guarded };
}
