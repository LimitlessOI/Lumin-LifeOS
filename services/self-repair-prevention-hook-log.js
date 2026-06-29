/**
 * SYNOPSIS: JSONL log for governed prevention hook runs — skip/execute only, no secrets.
 * JSONL log for governed prevention hook runs — skip/execute only, no secrets.
 *
 * @ssot docs/products/command-center/PRODUCT_HOME.md
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PREVENTION_HOOK_LOG_PATH = path.join(ROOT, 'data', 'self-repair-prevention-hook-log.jsonl');

function ensureDataDir() {
  const dir = path.dirname(PREVENTION_HOOK_LOG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/** Append one prevention hook run (skip or execute). */
export function appendPreventionHookLog(entry = {}) {
  ensureDataDir();
  const line = JSON.stringify({
    ts: entry.ts || new Date().toISOString(),
    hook_id: entry.hook_id || null,
    candidate_rule_id: entry.candidate_rule_id || null,
    classification: entry.classification || null,
    action: entry.action || null,
    reason: entry.reason || null,
    triggered_by: entry.triggered_by || null,
    confidence: entry.confidence ?? null,
    source_receipt_ids: entry.source_receipt_ids || [],
    verification_path: entry.verification_path || null,
    deploy_sha: entry.deploy_sha || null,
    proof_status: entry.proof_status || null,
    duration_ms: entry.duration_ms ?? null,
    promoted_to_invariant: false,
  });
  fs.appendFileSync(PREVENTION_HOOK_LOG_PATH, `${line}\n`, 'utf8');
  return line;
}

export function readPreventionHookLogTail(limit = 20) {
  if (!fs.existsSync(PREVENTION_HOOK_LOG_PATH)) return [];
  const lines = fs.readFileSync(PREVENTION_HOOK_LOG_PATH, 'utf8').split('\n').filter(Boolean);
  return lines
    .slice(-limit)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .reverse();
}

/** Latest log entry for a hook_id (scans up to 100 lines). */
export function readLastPreventionHookRun(hookId) {
  if (!hookId || !fs.existsSync(PREVENTION_HOOK_LOG_PATH)) return null;
  const lines = fs.readFileSync(PREVENTION_HOOK_LOG_PATH, 'utf8').split('\n').filter(Boolean);
  for (let i = lines.length - 1; i >= 0 && i >= lines.length - 100; i -= 1) {
    try {
      const entry = JSON.parse(lines[i]);
      if (entry.hook_id === hookId) return entry;
    } catch {
      // skip
    }
  }
  return null;
}
