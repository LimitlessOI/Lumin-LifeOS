/**
 * SYNOPSIS: Self-repair memory write-back — lessons from real execution logs only.
 * Self-repair memory write-back — lessons from real execution logs only.
 *
 * @ssot docs/projects/AMENDMENT_39_MEMORY_INTELLIGENCE.md
 * @ssot docs/projects/AMENDMENT_12_COMMAND_CENTER.md
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMemoryIntelligenceService, LEVEL } from './memory-intelligence-service.js';
import { classifyRepairLesson, enrichLessonsWithClassification } from './self-repair-lesson-classifier.js';
import { appendRealityRecord } from './reality-ledger.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SELF_REPAIR_MEMORY_LOG_PATH = path.join(ROOT, 'data', 'self-repair-memory.jsonl');

const PREVENTION_BY_ISSUE = Object.freeze({
  'DR-003-RECEIPT-STALE': 'After Railway redeploy, run POST /self-repair/deploy-check once deploy SHA is stable',
  RECEIPT_STALE_RUNTIME_SHA: 'Refresh gemini runtime proof when receipt commit SHA != deploy SHA (PF-001)',
  deploy_drift: 'Use deploy-check at boot (+45s) or manually after redeploy — do not repair mid-rollout',
  proof_remains_stale_after_max_attempts: 'Wait for deploy to settle before execute; retry deploy-check not raw execute',
});

function ensureDataDir() {
  const dir = path.dirname(SELF_REPAIR_MEMORY_LOG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/** Derive honest lesson from verified execution fields — null if nothing to learn. */
export function deriveRepairLesson({
  auditResult,
  dryRun,
  stoppedReason,
  repairId,
  triggeredBy,
  auditBefore,
  verificationResult,
  stepsExecuted,
  deploySha,
}) {
  if (dryRun || auditResult === 'DRY_RUN') return null;

  const proofBefore =
    auditBefore?.proof_freshness_overall ||
    auditBefore?.runtime_proof_status ||
    null;
  const proofAfter =
    verificationResult?.readiness?.proof_freshness_overall ||
    verificationResult?.proof_freshness?.freshness?.overall ||
    null;

  const chain = (stepsExecuted || []).map((s) => s.code).filter(Boolean);
  const chainLabel = chain.length ? chain.join(' → ') : 'none';

  if (auditResult === 'PASS') {
    const issue =
      proofBefore === 'STALE' || proofBefore === 'NOT_VERIFIED'
        ? `Stale runtime proof after deploy drift (repair_id=${repairId})`
        : `Authorized repair completed (${repairId})`;
    return {
      trigger: triggeredBy || 'unknown',
      issue_detected: issue,
      repair_chain_run: chainLabel,
      result: auditResult,
      lesson_learned: `PF chain ${chainLabel} restored proof ${proofBefore || '?'} → ${proofAfter || 'CURRENT'} under SYSTEM_AUTHORIZED_UNDER_PB`,
      prevention_rule:
        PREVENTION_BY_ISSUE[repairId] ||
        PREVENTION_BY_ISSUE.deploy_drift ||
        null,
    };
  }

  if (auditResult === 'FAILED') {
    if (stoppedReason === 'proof_remains_stale_after_max_attempts') {
      return {
        trigger: triggeredBy || 'unknown',
        issue_detected: `Proof STALE after ${chainLabel} (${maxAttemptsLabel(stepsExecuted)} attempts)`,
        repair_chain_run: chainLabel,
        result: auditResult,
        lesson_learned:
          'Executor exhausted max attempts while proof stayed STALE — likely ran during rolling deploy or deploy SHA changed mid-chain',
        prevention_rule: PREVENTION_BY_ISSUE.proof_remains_stale_after_max_attempts,
      };
    }
    if (stoppedReason?.startsWith('step_failed:')) {
      const step = stoppedReason.replace('step_failed:', '');
      return {
        trigger: triggeredBy || 'unknown',
        issue_detected: `Self-repair step ${step} failed during ${repairId}`,
        repair_chain_run: chainLabel,
        result: auditResult,
        lesson_learned: `Chain halted at ${step}; inspect Railway logs and endpoint health before retry`,
        prevention_rule: `Verify ${step} endpoint returns 200 on Railway before re-running executor`,
      };
    }
    return null;
  }

  if (auditResult === 'BLOCKED' && stoppedReason === 'adam_required_or_p0_stop') {
    return {
      trigger: triggeredBy || 'unknown',
      issue_detected: 'Repair blocked by ADAM_REQUIRED or P0 stop',
      repair_chain_run: chainLabel,
      result: auditResult,
      lesson_learned: 'Self-repair halted at authority gate — human decision required per §2.16',
      prevention_rule: 'Resolve ADAM_REQUIRED items before invoking executor',
    };
  }

  return null;
}

function maxAttemptsLabel(stepsExecuted) {
  const attempts = new Set((stepsExecuted || []).map((s) => s.attempt).filter(Boolean));
  return attempts.size || 1;
}

function appendMemoryLog(event) {
  ensureDataDir();
  fs.appendFileSync(SELF_REPAIR_MEMORY_LOG_PATH, `${JSON.stringify(event)}\n`, 'utf8');
  try {
    appendRealityRecord({
      type: 'repair_memory',
      statement: event.lesson_learned || event.issue_detected || 'self-repair memory event',
      owner: event.triggered_by || event.trigger || 'self-repair',
      expected_outcome: event.prevention_rule || 'lesson captured',
      actual_outcome: event.result || event.repair_chain_run || 'recorded',
      evidence: [{ kind: 'self_repair_memory_log', path: 'data/self-repair-memory.jsonl' }],
      lifecycle: 'closed',
    });
  } catch {
    // ledger must never block repair memory
  }
}

/** Read last N repair memory events from JSONL. */
export function readRepairMemoryLogTail(limit = 5) {
  if (!fs.existsSync(SELF_REPAIR_MEMORY_LOG_PATH)) return [];
  const lines = fs.readFileSync(SELF_REPAIR_MEMORY_LOG_PATH, 'utf8').split('\n').filter(Boolean);
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

async function readRepairMemoryFromDedicatedTable(pool, limit = 5) {
  if (!pool?.query) return [];
  try {
    const { rows } = await pool.query(
      `SELECT id, created_at, trigger, issue_detected, repair_chain_run, result,
              receipts_written, lesson_learned, prevention_rule, confidence,
              source_execution_id, repair_id, deploy_sha, proof_status_before,
              proof_status_after, duration_ms, classification, classification_signals,
              verification_path, triggered_by, fact_id
       FROM self_repair_memory_events
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );
    return rows.map((row) => ({
      ts: row.created_at,
      fact_id: row.fact_id,
      id: row.id,
      trigger: row.trigger,
      issue_detected: row.issue_detected,
      repair_chain_run: row.repair_chain_run,
      result: row.result,
      receipts_written: row.receipts_written || [],
      lesson_learned: row.lesson_learned,
      prevention_rule: row.prevention_rule,
      confidence: row.confidence,
      source_execution_id: row.source_execution_id,
      repair_id: row.repair_id,
      deploy_sha: row.deploy_sha,
      proof_status_before: row.proof_status_before,
      proof_status_after: row.proof_status_after,
      duration_ms: row.duration_ms,
      classification: row.classification,
      classification_signals: row.classification_signals,
      verification_path: row.verification_path,
      triggered_by: row.triggered_by,
      source: 'db',
    }));
  } catch {
    return [];
  }
}

async function readRepairMemoryFromPool(pool, limit = 5) {
  if (!pool?.query) return [];
  const { rows } = await pool.query(
    `SELECT id, text, domain, level, context_required, created_at, created_by
     FROM epistemic_facts
     WHERE domain = 'self_repair'
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit]
  );
  return rows.map((row) => {
    let payload = null;
    try {
      payload = row.context_required ? JSON.parse(row.context_required) : null;
    } catch {
      payload = null;
    }
    return {
      ts: row.created_at,
      fact_id: row.id,
      lesson_learned: row.text,
      level: row.level,
      source: 'epistemic_facts',
      ...(payload || {}),
    };
  });
}

/** Latest repair lessons — JSONL → dedicated DB → epistemic_facts fallback chain. */
export async function readLatestRepairMemory(pool, limit = 5) {
  const fromFile = readRepairMemoryLogTail(limit);
  if (fromFile.length) {
    const lessons = enrichLessonsWithClassification(fromFile);
    return { ok: true, source: 'jsonl', lessons, count: lessons.length };
  }
  const fromDedicated = await readRepairMemoryFromDedicatedTable(pool, limit);
  if (fromDedicated.length) {
    const lessons = enrichLessonsWithClassification(fromDedicated);
    return { ok: true, source: 'db', lessons, count: lessons.length };
  }
  const fromDb = await readRepairMemoryFromPool(pool, limit);
  if (fromDb.length) {
    const lessons = enrichLessonsWithClassification(fromDb);
    return { ok: true, source: 'epistemic_facts', lessons, count: lessons.length };
  }
  return { ok: false, status: 'NO_DATA', lessons: [], count: 0 };
}

/**
 * Write repair memory from a completed executor run — skips dry-run and non-lessons.
 */
export async function writeRepairMemoryFromExecution(pool, {
  auditResult,
  dryRun,
  stoppedReason,
  repairId,
  triggeredBy,
  auditBefore,
  verificationResult,
  stepsExecuted,
  receiptsWritten,
  deploySha,
  durationMs,
}) {
  const lesson = deriveRepairLesson({
    auditResult,
    dryRun,
    stoppedReason,
    repairId,
    triggeredBy,
    auditBefore,
    verificationResult,
    stepsExecuted,
    deploySha,
  });

  if (!lesson) {
    return { written: false, reason: 'no_actionable_lesson' };
  }

  const receipts = (receiptsWritten || []).map((r) => r.receipt_id).filter(Boolean);
  const draftEvent = {
    ts: new Date().toISOString(),
    trigger: lesson.trigger,
    issue_detected: lesson.issue_detected,
    repair_chain_run: lesson.repair_chain_run,
    result: lesson.result,
    receipts_written: receipts,
    lesson_learned: lesson.lesson_learned,
    prevention_rule: lesson.prevention_rule,
    deploy_sha: deploySha || null,
    proof_status_before: auditBefore?.proof_freshness_overall || null,
    proof_status_after:
      verificationResult?.readiness?.proof_freshness_overall ||
      verificationResult?.proof_freshness?.freshness?.overall ||
      null,
    duration_ms: durationMs ?? null,
    repair_id: repairId,
    stopped_reason: stoppedReason || null,
    attempt_stages: [...new Set((stepsExecuted || []).map((s) => s.attempt_stage).filter(Boolean))],
    context_requirements_seen: [...new Set(
      (stepsExecuted || []).flatMap((s) => Object.entries(s.required_context || {})
        .filter(([, required]) => required === true)
        .map(([key]) => key))
    )],
  };
  const { classification, signals, verification_path } = classifyRepairLesson(draftEvent);
  const event = {
    ...draftEvent,
    classification,
    classification_signals: signals,
    verification_path,
  };

  let dbWritten = false;
  let jsonlWritten = false;
  let factId = null;

  // Phase 2: DB first — write to dedicated self_repair_memory_events table
  if (pool?.query) {
    try {
      const { rows: ins } = await pool.query(
        `INSERT INTO self_repair_memory_events (
           trigger, issue_detected, repair_chain_run, result, receipts_written,
           lesson_learned, prevention_rule, confidence, repair_id, deploy_sha,
           proof_status_before, proof_status_after, duration_ms,
           classification, classification_signals, verification_path, triggered_by
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         RETURNING id`,
        [
          event.trigger, event.issue_detected, event.repair_chain_run, event.result,
          JSON.stringify(receipts), event.lesson_learned, event.prevention_rule,
          null, event.repair_id, event.deploy_sha,
          event.proof_status_before, event.proof_status_after, event.duration_ms,
          event.classification, event.classification_signals ? JSON.stringify(event.classification_signals) : null,
          event.verification_path, event.trigger,
        ]
      );
      factId = ins[0]?.id || null;
      dbWritten = true;

      // Also write to epistemic_facts for broader memory intelligence integration
      try {
        const memory = createMemoryIntelligenceService(pool);
        const fact = await memory.recordFact({
          text: lesson.lesson_learned.slice(0, 2000),
          domain: 'self_repair',
          level: auditResult === 'PASS' ? LEVEL.RECEIPT : LEVEL.CLAIM,
          contextRequired: JSON.stringify({ ...event, prevention_rule: lesson.prevention_rule }).slice(0, 4000),
          falseWhen: lesson.prevention_rule
            ? `When ${lesson.prevention_rule} is followed, this failure mode should not recur`
            : null,
          createdBy: 'self_repair_executor',
          visibilityClass: 'internal',
        });
        const epicFactId = fact?.id || null;
        if (epicFactId && receipts.length) {
          await memory.addEvidence(epicFactId, {
            eventType: 'confirmation',
            result: 'confirmed',
            evidenceText: `Self-repair receipts: ${receipts.slice(0, 5).join(', ')}`.slice(0, 500),
            source: 'self_repair_executor',
            sourceIsIndependent: false,
          });
        }
        // back-fill fact_id link on the dedicated row
        if (epicFactId && ins[0]?.id) {
          await pool.query(
            'UPDATE self_repair_memory_events SET fact_id=$1 WHERE id=$2',
            [epicFactId, ins[0].id]
          );
        }
      } catch {
        // epistemic_facts write is best-effort
      }
    } catch (dbErr) {
      // DB write failed — JSONL is the fallback
    }
  }

  // Phase 2: JSONL fallback (always attempted on ephemeral FS; graceful on Railway)
  try {
    appendMemoryLog(event);
    jsonlWritten = true;
  } catch {
    // ephemeral FS may not be writable
  }

  const fallbackUsed = !dbWritten && jsonlWritten;

  return {
    written: dbWritten || jsonlWritten,
    db_written: dbWritten,
    jsonl_written: jsonlWritten,
    fallback_used: fallbackUsed,
    event: { ...event, fact_id: factId },
  };
}
