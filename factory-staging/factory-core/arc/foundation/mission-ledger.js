/**
 * SYNOPSIS: Mission-centric token/time ledger — append-only JSONL.
 * @ssot docs/projects/AMENDMENT_46_BUILDEROS_CONTROL_PLANE.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from '../../builder/run-step.js';
import { appendStepMetrics } from '../../tsos/record-step-metrics.js';

const LEDGER_PATH = path.join(REPO_ROOT, 'data/builderos-mission-ledger.jsonl');

export function appendMissionLedger(entry) {
  const row = {
    schema: 'builderos_mission_ledger_v1',
    recorded_at: new Date().toISOString(),
    mission_id: entry.mission_id,
    event: entry.event,
    runner: entry.runner || null,
    token_cost: entry.token_cost ?? 0,
    latency_ms: entry.latency_ms ?? 0,
    verdict: entry.verdict ?? null,
    violations: entry.violations ?? [],
    git_sha: entry.git_sha ?? null,
    note: entry.note ?? null,
  };

  fs.mkdirSync(path.dirname(LEDGER_PATH), { recursive: true });
  fs.appendFileSync(LEDGER_PATH, `${JSON.stringify(row)}\n`, 'utf8');

  if (entry.mission_id && entry.event) {
    appendStepMetrics({
      mission_id: entry.mission_id,
      blueprint_id: entry.blueprint_id || entry.mission_id,
      step_id: entry.event,
      token_cost: entry.token_cost ?? 0,
      latency_ms: entry.latency_ms ?? 0,
      waste: entry.verdict === 'FAIL',
      input_mode: entry.runner || 'foundation',
      model_tier: entry.model_tier || 'unspecified',
    });
  }

  return { ok: true, path: LEDGER_PATH, row };
}

export function getMissionLedgerPath() {
  return LEDGER_PATH;
}
