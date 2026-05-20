/**
 * services/builder-oil-phase7-probe.js
 *
 * OIL-only Phase 7 live Gemini audit-before-done probe (Railway runtime).
 * Never returns or logs API key values.
 *
 * @ssot docs/projects/AMENDMENT_19_PROJECT_GOVERNANCE.md
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  enforceAuditBeforeDone,
  requireAuditReceiptForVerified,
  writeOILAuditReceipt,
  OIL_AUDITOR_ROLE,
  AUDIT_FAILED,
  AUDIT_REQUIRED,
  createBuildSessionId,
  assertAuditBeforeDoneReady,
} from './builder-audit-before-done.js';
import { writeTaskReceipt } from './builder-truth-surface.js';

const execFileAsync = promisify(execFile);
const PROBE_SEGMENT_ID = 99707;

export function isGeminiAuditKeyConfigured() {
  return Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY);
}

async function makeBadWorktree() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oil-p7-railway-'));
  await execFileAsync('git', ['init'], { cwd: tmp });
  await execFileAsync('git', ['config', 'user.email', 'oil-probe@lifeos.local'], { cwd: tmp });
  await execFileAsync('git', ['config', 'user.name', 'OIL Probe'], { cwd: tmp });
  fs.writeFileSync(
    path.join(tmp, 'bad-output.js'),
    '// Deliberately empty — does not export proofMarker required by exact_outcome\n'
  );
  await execFileAsync('git', ['add', '.'], { cwd: tmp });
  await execFileAsync('git', ['commit', '-m', 'oil phase7 bad baseline'], { cwd: tmp });
  return tmp;
}

function rmWorktree(wt) {
  try {
    fs.rmSync(wt, { recursive: true, force: true });
  } catch { /* best-effort */ }
}

/**
 * Run live Gemini AUDIT_FAILED proof inside Railway (or any runtime with GEMINI_API_KEY).
 * @param {import('pg').Pool} pool
 */
export async function runPhase7GeminiLiveProbe(pool) {
  const report = {
    phase: 7,
    probe: 'phase7-gemini-live',
    runtime: 'railway',
    checks: [],
    status: 'FAIL',
  };

  await assertAuditBeforeDoneReady(pool);

  const keyConfigured = isGeminiAuditKeyConfigured();
  report.checks.push({
    name: 'gemini_key_configured',
    pass: keyConfigured,
    detail: { GOOGLE_AI_KEY_set: Boolean(process.env.GOOGLE_AI_KEY), GEMINI_API_KEY_set: Boolean(process.env.GEMINI_API_KEY) },
  });
  if (!keyConfigured) {
    report.error = 'GEMINI_API_KEY or GOOGLE_AI_KEY not set in runtime process.env';
    return report;
  }

  const wt = await makeBadWorktree();
  const buildSessionId = createBuildSessionId(PROBE_SEGMENT_ID);
  const segment = {
    id: PROBE_SEGMENT_ID,
    project_slug: 'builder-final-synthesis-rerun',
    title: 'OIL Gemini live bad-output proof (Railway)',
    description: 'File must export proofMarker function',
    exact_outcome: 'bad-output.js exports function proofMarker() returning true',
    required_checks: ['node --check'],
    allowed_files: ['bad-output.js'],
  };

  const taskReceiptId = await writeTaskReceipt(pool, {
    segmentId: segment.id,
    projectSlug: segment.project_slug,
    status: 'conditional',
    startedAt: new Date(),
    completedAt: new Date(),
    buildSessionId,
  });
  report.task_receipt_id = taskReceiptId;

  try {
    await requireAuditReceiptForVerified(pool, taskReceiptId);
    throw new Error('expected AUDIT_REQUIRED before audit receipt exists');
  } catch (err) {
    if (err.halt_code !== AUDIT_REQUIRED) throw err;
    report.checks.push({ name: 'no_done_without_receipt', pass: true, haltCode: AUDIT_REQUIRED });
  }

  const result = await enforceAuditBeforeDone(pool, {
    segment,
    taskReceiptId,
    buildSessionId,
    worktree: wt,
    changedFiles: ['bad-output.js'],
  });

  if (result.verified) {
    throw new Error('bad output must not verify');
  }
  if (result.haltCode !== AUDIT_FAILED) {
    throw new Error(`expected AUDIT_FAILED got ${result.haltCode}`);
  }
  if (!result.auditReceiptId) {
    throw new Error('missing fail audit receipt id');
  }

  report.checks.push({
    name: 'live_gemini_audit_failed',
    pass: true,
    haltCode: AUDIT_FAILED,
    fail_audit_receipt_id: result.auditReceiptId,
    auditor_provider: result.audit?.auditor_provider || 'gemini',
    audit_verdict: result.audit?.verdict,
  });

  const { rows: [taskRow] } = await pool.query(
    `SELECT status, halt_code, audit_receipt_id FROM builder_task_receipts WHERE id = $1`,
    [taskReceiptId]
  );
  if (taskRow.status !== 'audit_failed') {
    throw new Error(`task status ${taskRow.status}`);
  }
  report.checks.push({ name: 'task_status_audit_failed', pass: true, status: taskRow.status });

  try {
    await requireAuditReceiptForVerified(pool, taskReceiptId);
    throw new Error('FAIL audit must block VERIFIED');
  } catch (err) {
    if (err.halt_code !== AUDIT_FAILED) throw err;
    report.checks.push({ name: 'no_done_without_pass_audit', pass: true, haltCode: AUDIT_FAILED });
  }

  const { rows: [auditRow] } = await pool.query(
    `SELECT verdict, written_by FROM builder_audit_receipts WHERE id = $1`,
    [result.auditReceiptId]
  );
  if (auditRow.verdict !== 'FAIL' || auditRow.written_by !== 'OIL') {
    throw new Error(`audit receipt invalid: verdict=${auditRow.verdict} written_by=${auditRow.written_by}`);
  }
  report.checks.push({ name: 'oil_fail_receipt', pass: true, verdict: 'FAIL' });

  report.slice_audit_receipt_id = await writeOILAuditReceipt(pool, OIL_AUDITOR_ROLE, {
    projectSlug: segment.project_slug,
    verdict: 'PASS',
    confidencePct: 92,
    findings:
      `Phase 7 live Gemini (Railway runtime): bad output → AUDIT_FAILED; task ${taskReceiptId}; fail receipt ${result.auditReceiptId}.`,
    findingsJson: {
      scenario: 'GEMINI_LIVE_AUDIT_FAILED',
      runtime: 'railway',
      taskReceiptId,
      fail_audit_receipt_id: result.auditReceiptId,
      checks: report.checks.map(c => c.name),
    },
    auditSessionId: `OIL-phase7-railway-${Date.now()}`,
    buildSessionId,
    killTestFlag: true,
    killTestScenario: 'GEMINI_LIVE_AUDIT_FAILED',
  });

  report.audit_receipt_id = report.slice_audit_receipt_id;
  report.fail_audit_receipt_id = result.auditReceiptId;
  report.status = 'VERIFIED';
  report.ok = true;

  rmWorktree(wt);
  return report;
}
