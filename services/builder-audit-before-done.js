/**
 * SYNOPSIS: services/builder-audit-before-done.js
 * services/builder-audit-before-done.js
 *
 * Phase 7 — independent audit-before-done (OIL-only audit receipts).
 *
 * @ssot docs/products/project-governance/PRODUCT_HOME.md
 */

import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { mirrorReceiptToFile } from './builder-truth-surface.js';

export const AUDIT_REQUIRED = 'AUDIT_REQUIRED';
export const AUDIT_FAILED = 'AUDIT_FAILED';
export const AUDIT_SELF_SESSION_VIOLATION = 'AUDIT_SELF_SESSION_VIOLATION';

/** Gate for writeOILAuditReceipt — not available to Builder self-audit paths. */
export const OIL_AUDITOR_ROLE = Symbol('OIL_AUDITOR_ROLE');

const MAX_FILE_CHARS = 12000;
const MAX_TOTAL_CHARS = 48000;

/**
 * @param {number} segmentId
 */
export function createBuildSessionId(segmentId) {
  return `build-seg-${segmentId}-${Date.now()}-${randomBytes(4).toString('hex')}`;
}

/**
 * @param {number} segmentId
 * @param {string} buildSessionId
 */
export function createAuditSessionId(segmentId, buildSessionId) {
  let auditSessionId = `audit-seg-${segmentId}-${Date.now()}-${randomBytes(4).toString('hex')}`;
  if (auditSessionId === buildSessionId) {
    auditSessionId = `${auditSessionId}-ind`;
  }
  return auditSessionId;
}

/**
 * @param {import('pg').Pool} pool
 */
export async function assertAuditBeforeDoneReady(pool) {
  const { rows } = await pool.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'builder_task_receipts'
       AND column_name IN ('build_session_id', 'auditor_session_id')`
  );
  if (rows.length < 2) {
    const err = new Error(
      'Audit-before-done not ready — apply db/migrations/20260522_builder_audit_before_done_phase7.sql'
    );
    err.halt_code = 'AUDIT_BEFORE_DONE_NOT_READY';
    throw err;
  }
}

async function callGeminiAuditor(prompt) {
  const key = process.env.GOOGLE_AI_KEY || process.env.GEMINI_API_KEY;
  if (!key) {
    const err = new Error('GEMINI_API_KEY not set — independent audit cannot run');
    err.halt_code = AUDIT_REQUIRED;
    throw err;
  }

  const model = process.env.BUILDER_AUDIT_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 1024, temperature: 0.2 },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini audit API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

/**
 * Read changed file contents only — no build stdout or council history.
 */
export function collectAuditFilePayload(worktree, changedFiles) {
  const snippets = [];
  let total = 0;

  for (const rel of changedFiles || []) {
    if (total >= MAX_TOTAL_CHARS) break;
    const abs = path.join(worktree, rel);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) continue;
    let content = fs.readFileSync(abs, 'utf8');
    if (content.length > MAX_FILE_CHARS) {
      content = `${content.slice(0, MAX_FILE_CHARS)}\n…[truncated for audit context limit]`;
    }
    snippets.push({ path: rel, content });
    total += content.length;
  }

  return snippets;
}

/**
 * @param {string} text
 */
export function parseAuditVerdict(text) {
  const raw = (text || '').trim();
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const v = String(parsed.verdict || '').toUpperCase();
      if (['PASS', 'FAIL', 'INCONCLUSIVE'].includes(v)) {
        return {
          verdict: v,
          confidence_pct: Number(parsed.confidence_pct) || null,
          evidence_summary: parsed.evidence_summary || parsed.findings || '',
        };
      }
    }
  } catch { /* fall through */ }

  const upper = raw.toUpperCase();
  if (upper.includes('"VERDICT": "PASS"') || /\bVERDICT:\s*PASS\b/.test(upper)) {
    return { verdict: 'PASS', confidence_pct: 80, evidence_summary: raw.slice(0, 500) };
  }
  if (upper.includes('INCONCLUSIVE') || /\bVERDICT:\s*INCONCLUSIVE\b/.test(upper)) {
    return { verdict: 'INCONCLUSIVE', confidence_pct: 50, evidence_summary: raw.slice(0, 500) };
  }
  if (upper.includes('"VERDICT": "FAIL"') || /\bVERDICT:\s*FAIL\b/.test(upper)) {
    return { verdict: 'FAIL', confidence_pct: 85, evidence_summary: raw.slice(0, 500) };
  }
  return { verdict: 'INCONCLUSIVE', confidence_pct: 40, evidence_summary: raw.slice(0, 500) };
}

/**
 * OIL-only audit receipt writer — Builder code must not call with OIL_AUDITOR_ROLE.
 */
export async function writeOILAuditReceipt(pool, auditorRole, receipt) {
  if (auditorRole !== OIL_AUDITOR_ROLE) {
    const err = new Error(
      'Builder cannot write builder_audit_receipts — independent OIL auditor only'
    );
    err.halt_code = AUDIT_SELF_SESSION_VIOLATION;
    throw err;
  }

  const {
    taskReceiptId,
    segmentId,
    projectSlug,
    verdict,
    confidencePct,
    findings,
    findingsJson,
    auditSessionId,
    buildSessionId,
    killTestFlag = false,
    killTestScenario = null,
  } = receipt;

  if (buildSessionId && auditSessionId && buildSessionId === auditSessionId) {
    const err = new Error('Audit session must differ from build session');
    err.halt_code = AUDIT_SELF_SESSION_VIOLATION;
    throw err;
  }

  const dbVerdict = verdict === 'INCONCLUSIVE' ? 'FAIL' : verdict;

  const { rows } = await pool.query(
    `INSERT INTO builder_audit_receipts (
       task_receipt_id, segment_id, project_slug, verdict, confidence_pct,
       findings, findings_json, kill_test_flag, kill_test_scenario,
       audit_session_id, build_session_id, auditor_notes, written_by
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'OIL')
     RETURNING id`,
    [
      taskReceiptId ?? null,
      segmentId ?? null,
      projectSlug,
      dbVerdict,
      confidencePct ?? null,
      findings ?? null,
      findingsJson ? JSON.stringify(findingsJson) : null,
      killTestFlag,
      killTestScenario,
      auditSessionId,
      buildSessionId ?? null,
      'Independent post-build audit (Phase 7)',
    ]
  );

  const id = rows[0].id;
  try {
    mirrorReceiptToFile('audit-before-done', id, { ...receipt, audit_receipt_id: id });
  } catch { /* best-effort */ }
  return id;
}

/**
 * Run independent audit session (Gemini — not Claude build session).
 */
export async function runIndependentAudit({
  segment,
  worktree,
  changedFiles,
  buildSessionId,
}) {
  const auditSessionId = createAuditSessionId(segment.id, buildSessionId);
  const filePayload = collectAuditFilePayload(worktree, changedFiles);

  const acceptance = {
    exact_outcome: segment.exact_outcome,
    required_checks: segment.required_checks,
    description: segment.description,
    title: segment.title,
  };

  const prompt =
    'You are an independent OIL auditor. You did NOT implement this task. ' +
    'You have no access to the builder conversation, stdout, or council review.\n' +
    'Evaluate ONLY the file contents and acceptance criteria below.\n' +
    'Respond with JSON only:\n' +
    '{"verdict":"PASS"|"FAIL"|"INCONCLUSIVE","confidence_pct":0-100,"evidence_summary":"..."}\n\n' +
    `AUDIT_SESSION_ID: ${auditSessionId}\n` +
    `BUILD_SESSION_ID (for independence check only): ${buildSessionId}\n\n` +
    `ACCEPTANCE:\n${JSON.stringify(acceptance, null, 2)}\n\n` +
    `MODIFIED_FILES:\n${JSON.stringify(filePayload, null, 2)}`;

  const raw = await callGeminiAuditor(prompt);
  const parsed = parseAuditVerdict(raw);

  return {
    auditSessionId,
    buildSessionId,
    raw,
    verdict: parsed.verdict,
    confidence_pct: parsed.confidence_pct,
    evidence_summary: parsed.evidence_summary,
    auditor_provider: 'gemini',
    independence: {
      build_session_id: buildSessionId,
      audit_session_id: auditSessionId,
      includes_build_stdout: false,
      includes_council_history: false,
    },
  };
}

/**
 * Gate: no VERIFIED/done without OIL audit PASS receipt linked.
 */
export async function requireAuditReceiptForVerified(pool, taskReceiptId) {
  const { rows } = await pool.query(
    `SELECT tr.id, tr.status, tr.audit_receipt_id, tr.build_session_id, tr.auditor_session_id,
            ar.verdict AS audit_verdict, ar.audit_session_id AS receipt_audit_session
     FROM builder_task_receipts tr
     LEFT JOIN builder_audit_receipts ar ON ar.id = tr.audit_receipt_id
     WHERE tr.id = $1`,
    [taskReceiptId]
  );
  if (!rows.length) {
    const err = new Error(`Task receipt ${taskReceiptId} not found`);
    err.halt_code = AUDIT_REQUIRED;
    throw err;
  }
  const row = rows[0];
  if (!row.audit_receipt_id) {
    const err = new Error('Missing OIL audit receipt — task cannot be VERIFIED');
    err.halt_code = AUDIT_REQUIRED;
    throw err;
  }
  if (row.audit_verdict !== 'PASS') {
    const err = new Error(`Audit verdict is ${row.audit_verdict} — not VERIFIED`);
    err.halt_code = AUDIT_FAILED;
    throw err;
  }
  if (row.build_session_id && row.auditor_session_id && row.build_session_id === row.auditor_session_id) {
    const err = new Error('Build and audit session IDs must differ');
    err.halt_code = AUDIT_SELF_SESSION_VIOLATION;
    throw err;
  }
  return row;
}

/**
 * Post-build audit enforcement — call before markSegmentDone.
 */
export async function enforceAuditBeforeDone(pool, opts) {
  const {
    segment,
    taskReceiptId,
    buildSessionId,
    worktree,
    changedFiles,
  } = opts;

  let audit;
  try {
    audit = await runIndependentAudit({
      segment,
      worktree,
      changedFiles,
      buildSessionId,
    });
  } catch (err) {
    return {
      verified: false,
      haltCode: err.halt_code || AUDIT_REQUIRED,
      detail: { message: err.message },
    };
  }

  if (audit.verdict === 'FAIL' || audit.verdict === 'INCONCLUSIVE') {
    const auditReceiptId = await writeOILAuditReceipt(pool, OIL_AUDITOR_ROLE, {
      taskReceiptId,
      segmentId: segment.id,
      projectSlug: segment.project_slug,
      verdict: audit.verdict,
      confidencePct: audit.confidence_pct,
      findings: audit.evidence_summary,
      findingsJson: {
        verdict: audit.verdict,
        evidence_summary: audit.evidence_summary,
        independence: audit.independence,
      },
      auditSessionId: audit.auditSessionId,
      buildSessionId: audit.buildSessionId,
    });

    await pool.query(
      `UPDATE builder_task_receipts
       SET status = 'audit_failed', audit_receipt_id = $2, auditor_session_id = $3
       WHERE id = $1`,
      [taskReceiptId, auditReceiptId, audit.auditSessionId]
    );

    return {
      verified: false,
      haltCode: AUDIT_FAILED,
      auditReceiptId,
      audit,
    };
  }

  if (audit.verdict !== 'PASS') {
    return { verified: false, haltCode: AUDIT_REQUIRED, audit };
  }

  const auditReceiptId = await writeOILAuditReceipt(pool, OIL_AUDITOR_ROLE, {
    taskReceiptId,
    segmentId: segment.id,
    projectSlug: segment.project_slug,
    verdict: 'PASS',
    confidencePct: audit.confidence_pct,
    findings: audit.evidence_summary,
    findingsJson: {
      verdict: 'PASS',
      evidence_summary: audit.evidence_summary,
      independence: audit.independence,
      auditor_provider: audit.auditor_provider,
    },
    auditSessionId: audit.auditSessionId,
    buildSessionId: audit.buildSessionId,
  });

  await pool.query(
    `UPDATE builder_task_receipts
     SET audit_receipt_id = $2, auditor_session_id = $3, build_session_id = $4
     WHERE id = $1`,
    [taskReceiptId, auditReceiptId, audit.auditSessionId, buildSessionId]
  );

  return {
    verified: true,
    haltCode: null,
    auditReceiptId,
    audit,
  };
}
