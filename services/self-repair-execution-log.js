/**
 * SYNOPSIS: TSOS compact JSONL log for self-repair executor runs.
 * TSOS compact JSONL log for self-repair executor runs.
 *
 * @ssot docs/products/command-center/PRODUCT_HOME.md
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SELF_REPAIR_EXECUTION_LOG_PATH = path.join(ROOT, 'data', 'self-repair-execution-log.jsonl');

function ensureDataDir() {
  const dir = path.dirname(SELF_REPAIR_EXECUTION_LOG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/** Append one compact JSONL line — no secrets. */
export function appendSelfRepairExecutionLog(entry = {}) {
  ensureDataDir();
  const line = JSON.stringify({
    ts: entry.ts || new Date().toISOString(),
    deploy_sha: entry.deploy_sha || null,
    proof_status: entry.proof_status || null,
    repair_id: entry.repair_id || null,
    steps: entry.steps || [],
    step_details: entry.step_details || [],
    receipts: entry.receipts || [],
    duration_ms: entry.duration_ms ?? null,
    result: entry.result || null,
    triggered_by: entry.triggered_by || null,
    stopped_reason: entry.stopped_reason || null,
  });
  fs.appendFileSync(SELF_REPAIR_EXECUTION_LOG_PATH, `${line}\n`, 'utf8');
  return line;
}

/** Read last N entries from JSONL (newest last in file). */
export function readSelfRepairExecutionLogTail(limit = 1) {
  if (!fs.existsSync(SELF_REPAIR_EXECUTION_LOG_PATH)) return [];
  const text = fs.readFileSync(SELF_REPAIR_EXECUTION_LOG_PATH, 'utf8');
  const lines = text.split('\n').filter(Boolean);
  return lines.slice(-limit).map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  }).filter(Boolean);
}

/** Newest PASS entry from JSONL tail scan (up to 50 lines). */
export function readLastPassExecutionLogEntry() {
  if (!fs.existsSync(SELF_REPAIR_EXECUTION_LOG_PATH)) return null;
  const lines = fs.readFileSync(SELF_REPAIR_EXECUTION_LOG_PATH, 'utf8').split('\n').filter(Boolean);
  for (let i = lines.length - 1; i >= 0 && i >= lines.length - 50; i -= 1) {
    try {
      const entry = JSON.parse(lines[i]);
      if (entry.result === 'PASS') return entry;
    } catch {
      // skip bad line
    }
  }
  return null;
}

/** Fallback: latest executor receipt from builder_audit_receipts. */
export async function readLatestExecutorReceiptFromPool(pool) {
  if (!pool?.query) return null;
  const { rows } = await pool.query(
    `SELECT id, audited_at, findings_json, findings
     FROM builder_audit_receipts
     WHERE findings_json->>'type' = 'self_repair_executor_run'
        OR findings ILIKE '%self-repair executor%'
     ORDER BY id DESC
     LIMIT 1`
  );
  const row = rows[0];
  if (!row) return null;
  const fj = row.findings_json || {};
  return {
    ts: row.audited_at,
    deploy_sha: fj.verification?.readiness?.deployed_sha || fj.verification?.proof_freshness?.freshness?.deploy_sha || null,
    proof_status: fj.verification?.readiness?.proof_freshness_overall || fj.verification?.proof_freshness?.freshness?.overall || null,
    repair_id: fj.repair_id || null,
    steps: (fj.steps_executed || []).map((s) => s.code).filter(Boolean),
    step_details: (fj.steps_executed || []).map((s) => ({
      code: s.code,
      attempt: s.attempt ?? null,
      attempt_stage: s.attempt_stage || null,
      required_context: s.required_context || null,
    })),
    receipts: (fj.steps_executed || [])
      .flatMap((s) => s.receipt_ids || [])
      .concat(fj.receipt_id ? [fj.receipt_id] : []),
    duration_ms: fj.duration_ms ?? null,
    result: fj.status || null,
    triggered_by: fj.triggered_by || null,
    stopped_reason: fj.stopped_reason || null,
    source: 'builder_audit_receipts',
    receipt_id: row.id,
  };
}

/** Latest execution — JSONL tail preferred, DB fallback on Railway. */
export async function readLatestSelfRepairExecution(pool) {
  const fromFile = readSelfRepairExecutionLogTail(1)[0] || null;
  if (fromFile) {
    return { ok: true, source: 'jsonl', entry: fromFile };
  }
  const fromDb = await readLatestExecutorReceiptFromPool(pool);
  if (fromDb) {
    return { ok: true, source: 'builder_audit_receipts', entry: fromDb };
  }
  return { ok: false, source: null, entry: null };
}
