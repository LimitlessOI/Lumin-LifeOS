/**
 * SYNOPSIS: Exports appendHistorianRecord — factory-staging/factory-core/historian/append-record.js.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FACTORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const HISTORIAN_PATH = path.join(FACTORY_ROOT, 'data/historian-records.jsonl');

export function appendHistorianRecord(entry) {
  if (!entry?.step_id && !entry?.type) {
    return { ok: false, status: 'HISTORIAN_INVALID', violations: ['step_id or type required'] };
  }

  fs.mkdirSync(path.dirname(HISTORIAN_PATH), { recursive: true });
  const record = {
    ...entry,
    recorded_at: new Date().toISOString(),
    trust_level: entry.trust_level || 'observed',
  };
  fs.appendFileSync(HISTORIAN_PATH, `${JSON.stringify(record)}\n`, 'utf8');
  return { ok: true, status: 'RECORDED', path: 'factory-staging/data/historian-records.jsonl' };
}

export function appendStepExecutionRecord({
  mission_id,
  blueprint_id,
  step_id,
  builderResult,
  sentryReview,
  tsosResult,
  behaviorResults,
  authoringResult,
}) {
  return appendHistorianRecord({
    type: 'step_execution',
    mission_id,
    blueprint_id,
    step_id,
    target_file: builderResult?.target_file,
    builder_status: builderResult?.status,
    sentry_status: sentryReview?.implementation_status,
    tsos_latency_ms: tsosResult?.metrics?.latency_ms,
    // Raw per-assertion behavioral-proof outputs, verbatim — Chair ruling: the
    // receipt is the only ground truth for whether a behavior was verified, so
    // it stores the actual results, never a pass/fail summary.
    behavior_assertions: Array.isArray(behaviorResults) ? behaviorResults : [],
    // STEP 4 codegen provenance — which model tier authored the content, whether
    // it escalated, and the sha of what was written. assertion_provenance records
    // that the proof assertions came from the blueprint, not the codegen.
    codegen: authoringResult && authoringResult.ok
      ? {
          model_tier: authoringResult.model_tier || null,
          escalated: Boolean(authoringResult.escalated),
          content_sha256: authoringResult.content_sha256 || null,
          assertion_provenance: authoringResult.assertion_provenance || null,
        }
      : null,
    mission_state: 'Verification',
    trust_level: 'outcome-linked',
  });
}

export function readHistorianRecords(limit = 100) {
  if (!fs.existsSync(HISTORIAN_PATH)) {
    return { count: 0, records: [] };
  }
  const lines = fs.readFileSync(HISTORIAN_PATH, 'utf8').trim().split('\n').filter(Boolean);
  const records = lines.slice(-limit).map((l) => JSON.parse(l));
  return { count: records.length, records };
}

export function summarizeHistorian() {
  const { records } = readHistorianRecords(500);
  const byMission = {};
  for (const r of records) {
    const m = r.mission_id || 'unknown';
    byMission[m] = (byMission[m] || 0) + 1;
  }
  return {
    total_records: records.length,
    by_mission: byMission,
    last: records[records.length - 1] || null,
    authority_note: 'Historian records truth and outcomes — never assigns builder work',
  };
}
