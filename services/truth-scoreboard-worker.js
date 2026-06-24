/**
 * SYNOPSIS: Truth scoreboard worker — reality results promote/demote epistemic facts.
 * GUESS → watch scoreboard → TESTED/RECEIPT or demote on FAIL. Results not fancy.
 * @ssot docs/projects/AMENDMENT_39_MEMORY_INTELLIGENCE.md
 */
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createUsefulWorkGuard } from './useful-work-guard.js';
import { createMemoryIntelligenceService, LEVEL } from './memory-intelligence-service.js';
import { validateReceiptDirectory, writeReceiptValidationReport } from './receipt-truth-validator.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HYPOTHESES_PATH = path.join(ROOT, 'config/truth-governance-hypotheses.json');
const SCOREBOARD_LOG = path.join(ROOT, 'data/chair-live/truth-scoreboard-tick.jsonl');
const MISSIONS_ROOT = path.join(ROOT, 'builderos-reboot/MISSIONS');

async function readJson(absPath) {
  try {
    return JSON.parse(await fs.readFile(absPath, 'utf8'));
  } catch {
    return null;
  }
}

function evalCondition(receipt, cond) {
  if (!cond || !receipt) return null;
  const val = receipt[cond.field];
  if (cond.equals !== undefined) return val === cond.equals;
  if (cond.truthy) return Boolean(val);
  return null;
}

async function findFactByText(pool, text, domain) {
  if (!pool) return null;
  const { rows } = await pool.query(
    `SELECT id, level, text FROM epistemic_facts
     WHERE domain = $1 AND LOWER(TRIM(text)) = LOWER(TRIM($2))
     LIMIT 1`,
    [domain, text],
  );
  return rows[0] || null;
}

async function ensureHypothesisFact(svc, pool, { text, domain, createdBy }) {
  let fact = await findFactByText(pool, text, domain);
  if (fact) return fact;
  return svc.recordFact({
    text,
    domain,
    level: LEVEL.HYPOTHESIS,
    createdBy,
    reviewBy: new Date(Date.now() + 7 * 86400000).toISOString(),
  });
}

async function ingestHypothesisFromConfig(svc, pool, hypothesis, logger) {
  const absReceipt = path.join(ROOT, hypothesis.receipt_path);
  const receipt = await readJson(absReceipt);
  if (!receipt) {
    return { id: hypothesis.id, skipped: true, reason: 'receipt_missing' };
  }

  const passSignal = evalCondition(receipt, hypothesis.pass_when);
  const failSignal = evalCondition(receipt, hypothesis.fail_when);

  if (passSignal !== true && failSignal !== true) {
    return { id: hypothesis.id, skipped: true, reason: 'no_signal' };
  }

  const fact = await ensureHypothesisFact(svc, pool, {
    text: hypothesis.text,
    domain: hypothesis.domain || 'governance',
    createdBy: 'truth_scoreboard_worker',
  });

  const result = passSignal ? 'confirmed' : 'failed';
  const eventType = passSignal ? 'ci_pass' : 'ci_fail';
  const evidence = await svc.addEvidence(fact.id, {
    eventType,
    result,
    evidenceText: `${hypothesis.id}: ${hypothesis.receipt_path} → ${passSignal ? 'PASS' : 'FAIL'} at ${new Date().toISOString()}`,
    source: 'truth_scoreboard',
    sourceIsIndependent: true,
  });

  if (passSignal && fact.level < LEVEL.RECEIPT) {
    try {
      await svc.promoteFact(fact.id, {
        reason: `Scoreboard PASS: ${hypothesis.receipt_path}`,
        promotedBy: 'truth_scoreboard_worker',
      });
    } catch {
      /* level gate — evidence recorded */
    }
  }

  if (failSignal && fact.level > LEVEL.CLAIM) {
    try {
      await svc.demoteFact(fact.id, {
        toLevel: Math.max(LEVEL.CLAIM, fact.level - 1),
        reason: `Scoreboard FAIL: ${hypothesis.receipt_path}`,
        demotedBy: 'truth_scoreboard_worker',
      });
    } catch (err) {
      logger?.warn?.({ id: hypothesis.id, err: err.message }, '[TRUTH-SCOREBOARD] demote skip');
    }
  }

  return {
    id: hypothesis.id,
    fact_id: fact.id,
    result,
    level: evidence.fact?.level ?? fact.level,
    level_changed: evidence.levelChanged,
  };
}

async function ingestTwinDriftReports(svc, pool, logger) {
  const rows = [];
  if (!fsSync.existsSync(MISSIONS_ROOT)) return rows;

  const missions = fsSync.readdirSync(MISSIONS_ROOT);
  for (const missionId of missions) {
    const driftPath = path.join(MISSIONS_ROOT, missionId, 'receipts/TWIN_DRIFT_REPORT.json');
    const drift = await readJson(driftPath);
    if (!drift) continue;

    const text = `Simulation vs reality for ${missionId}: ${drift.pass ? 'aligned' : 'drift detected'}`;
    const fact = await ensureHypothesisFact(svc, pool, {
      text,
      domain: 'simulation',
      createdBy: 'twin_drift_ingest',
    });

    await svc.addEvidence(fact.id, {
      eventType: drift.pass ? 'ci_pass' : 'ci_fail',
      result: drift.pass ? 'confirmed' : 'failed',
      evidenceText: drift.lesson || JSON.stringify(drift.simulation_vs_reality?.slice?.(0, 2) || []),
      source: `twin_drift:${missionId}`,
      sourceIsIndependent: true,
    });
    rows.push({ mission_id: missionId, pass: drift.pass, fact_id: fact.id });
  }
  return rows;
}

export async function runTruthScoreboardTick({ pool, logger } = {}) {
  const receiptValidation = validateReceiptDirectory();
  writeReceiptValidationReport({
    ok: receiptValidation.ok,
    checked: receiptValidation.checked,
    failures: receiptValidation.failures,
    results: receiptValidation.results?.map((r) => ({
      file: r.file,
      ok: r.ok,
      violations: r.violations,
    })),
  });

  const hypothesesConfig = await readJson(HYPOTHESES_PATH);
  const hypotheses = hypothesesConfig?.hypotheses || [];

  const outcomes = {
    schema: 'truth_scoreboard_tick_v1',
    at: new Date().toISOString(),
    receipt_validation_ok: receiptValidation.ok,
    hypotheses: [],
    twin_drift: [],
    pool_connected: Boolean(pool),
  };

  if (!pool) {
    outcomes.note = 'No DB pool — receipt validation only; epistemic promotion skipped';
    await fs.mkdir(path.dirname(SCOREBOARD_LOG), { recursive: true });
    await fs.appendFile(SCOREBOARD_LOG, `${JSON.stringify(outcomes)}\n`);
    return outcomes;
  }

  const svc = createMemoryIntelligenceService(pool, logger);

  for (const h of hypotheses) {
    try {
      outcomes.hypotheses.push(await ingestHypothesisFromConfig(svc, pool, h, logger));
    } catch (err) {
      outcomes.hypotheses.push({ id: h.id, error: err.message });
      logger?.warn?.({ id: h.id, err: err.message }, '[TRUTH-SCOREBOARD] hypothesis skip');
    }
  }

  try {
    outcomes.twin_drift = await ingestTwinDriftReports(svc, pool, logger);
  } catch (err) {
    outcomes.twin_drift_error = err.message;
  }

  outcomes.ok = receiptValidation.ok;
  await fs.mkdir(path.dirname(SCOREBOARD_LOG), { recursive: true });
  await fs.appendFile(SCOREBOARD_LOG, `${JSON.stringify(outcomes)}\n`);
  logger?.info?.(
    {
      hypotheses: outcomes.hypotheses.length,
      receipt_ok: receiptValidation.ok,
      twin_drift: outcomes.twin_drift.length,
    },
    '[TRUTH-SCOREBOARD] tick',
  );
  return outcomes;
}

export function registerTruthScoreboardScheduler({ pool, logger, intervalMs = 4 * 60 * 60 * 1000 } = {}) {
  const guarded = createUsefulWorkGuard({
    taskName: 'Truth Scoreboard Tick',
    purpose: 'Promote/demote governance hypotheses from parity receipts, validation, and twin drift — results are the scoreboard',
    prerequisites: async () => ({ ok: true }),
    workCheck: async () => {
      const parity = await readJson(path.join(ROOT, 'products/receipts/LUMIN_CHAIR_DIRECT_CONNECTION_PARITY.json'));
      if (parity) return 1;
      const verify = await readJson(path.join(ROOT, 'products/receipts/TRUTH_LOCKDOWN_VERIFY.json'));
      return verify ? 1 : 0;
    },
    execute: () => runTruthScoreboardTick({ pool, logger }),
    logger,
  });
  const timer = setInterval(guarded, intervalMs);
  if (typeof timer.unref === 'function') timer.unref();
  guarded().catch(() => {});
  return { timer, tick: guarded };
}
