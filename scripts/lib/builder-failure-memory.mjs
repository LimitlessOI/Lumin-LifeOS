/**
 * SYNOPSIS: Persistent failure-pattern memory for the autonomous builder queue.
 * Persistent failure-pattern memory for the autonomous builder queue.
 *
 * Tracks cumulative failure counts per task across daemon restarts and
 * circuit-breaker cycles. When a task exceeds a threshold, callers receive
 * an escalation hint they can inject into the builder spec, or a directive
 * to auto-quarantine rather than loop forever.
 *
 * Storage: data/builder-failure-patterns.json (gitignored, local+Railway).
 * Reads are fail-safe (missing file = empty state). Writes are best-effort.
 *
 * Escalation ladder:
 *   level 0 (< 3 failures)  — normal, no hint
 *   level 1 (3–5 failures)  — TOKEN_HINT: concise output requested
 *   level 2 (6–9 failures)  — SCOPE_HINT: suggest splitting the file
 *   level 3 (10+ failures)  — OPERATOR_ALERT: auto-quarantine + log
 *
 * @ssot docs/products/zero-drift-handoff-protocol/PRODUCT_HOME.md
 */

import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const ROOT = process.cwd();
const PATTERNS_PATH = join(ROOT, 'data/builder-failure-patterns.json');

const THRESHOLDS = [
  {
    minCount: 10,
    level: 3,
    hint:
      'OPERATOR_ALERT: This task has failed 10+ times across multiple builder cycles. ' +
      'Auto-quarantine is recommended. If the spec is too large, split this into smaller target files ' +
      'or reduce the scope to a single exported function.',
  },
  {
    minCount: 6,
    level: 2,
    hint:
      'SCOPE_HINT: Previous attempts may have been truncated due to spec size. ' +
      'Produce the smallest possible complete implementation — one file, one primary export. ' +
      'Omit inline documentation, inline comments, and unused helper functions.',
  },
  {
    minCount: 3,
    level: 1,
    hint:
      'TOKEN_HINT: Previous attempts produced truncated output. ' +
      'Write a concise implementation under 120 lines. ' +
      'Focus only on the core function signatures; no verbose JSDoc or inline examples.',
  },
];

function computeLevel(count) {
  for (const t of THRESHOLDS) {
    if (count >= t.minCount) return t.level;
  }
  return 0;
}

function escalationHint(count) {
  for (const t of THRESHOLDS) {
    if (count >= t.minCount) return t.hint;
  }
  return null;
}

async function readPatterns() {
  try {
    const raw = await readFile(PATTERNS_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writePatterns(patterns) {
  try {
    await writeFile(PATTERNS_PATH, JSON.stringify(patterns, null, 2) + '\n', 'utf8');
  } catch {
    // best-effort — do not block queue progress on write errors
  }
}

/**
 * Record a failure for a task. Returns the updated record including new escalationLevel.
 * @param {string} taskId
 * @param {string} lane
 * @param {string} failureSig  short failure signature (first ~200 chars of error)
 * @param {string} [targetFile]
 * @returns {Promise<{taskId,lane,count,escalationLevel,resolved,lastAt,hint:string|null}>}
 */
export async function recordFailure(taskId, lane, failureSig, targetFile) {
  const patterns = await readPatterns();
  const prev = patterns[taskId] || { count: 0, firstAt: new Date().toISOString(), resolved: false };
  const newCount = (prev.resolved ? 0 : prev.count) + 1;
  const level = computeLevel(newCount);
  const record = {
    ...prev,
    taskId,
    lane: lane || null,
    targetFile: targetFile || null,
    count: newCount,
    lastSig: failureSig ? String(failureSig).slice(0, 200) : null,
    lastAt: new Date().toISOString(),
    escalationLevel: level,
    resolved: false,
  };
  patterns[taskId] = record;
  await writePatterns(patterns);
  return { ...record, hint: escalationHint(newCount) };
}

/**
 * Returns escalation data if the task has a failure history above threshold, otherwise null.
 * Resolved tasks return null (they succeeded and no longer need escalation).
 * @param {string} taskId
 * @returns {Promise<{level:number, count:number, hint:string}|null>}
 */
export async function getEscalationHint(taskId) {
  const patterns = await readPatterns();
  const rec = patterns[taskId];
  if (!rec || rec.resolved || rec.count < 3) return null;
  const hint = escalationHint(rec.count);
  if (!hint) return null;
  return { level: rec.escalationLevel, count: rec.count, hint };
}

/**
 * Mark a task as resolved (successful build). Keeps history for debugging but
 * stops escalation hints on future attempts.
 * @param {string} taskId
 */
export async function resolveTask(taskId) {
  const patterns = await readPatterns();
  if (!patterns[taskId]) return;
  patterns[taskId] = {
    ...patterns[taskId],
    resolved: true,
    resolvedAt: new Date().toISOString(),
  };
  await writePatterns(patterns);
}
