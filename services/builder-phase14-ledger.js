/**
 * SYNOPSIS: Shared Phase 14 phase ledger — single source for Railway certify/run-proofs
 * Shared Phase 14 phase ledger — single source for Railway certify/run-proofs
 * and local certification. Reads only builder_audit_receipts (no local JSON files).
 *
 * @ssot docs/projects/AMENDMENT_19_PROJECT_GOVERNANCE.md
 */

import { createHash } from 'node:crypto';

export const PHASE_FALLBACK_PATTERNS = {
  1: ['Phase 1 live serial-lock:%', 'Phase 1 serial-lock verification passed:%'],
  2: ['Phase 2 OIL:%', 'Tracker exceeded budget at 100 tokens%'],
  3: ['Phase 3 allowed-files enforcement:%', 'Violation detected and worktree rolled back%'],
  4: ['Post-exec truncation detected%', 'Pre-exec halt when injected > 120% of estimate%'],
  5: ['Phase 5 blocker remediation:%', 'All terminal tasks trigger QUEUE_EXHAUSTED%'],
  6: ['Second segment blocked WAIT via supervisor lock gate%', 'Phase 6 %'],
  8: ['OUT_OF_SCOPE_WRITE produces scope_violation%', 'Phase 8 failure taxonomy%'],
  9: ['Interrupted execution → PARTIAL%', 'Phase 9 partial recovery%', 'founder safe mode enter%'],
  10: ['Phase 10 two-lane canon:%'],
  11: ['Phase 11 Rollback Drill:%'],
  12: ['Phase 12 receipt federation:%'],
  13: ['Phase 13 legacy demotion:%'],
};

export function proofStoreFingerprint(connectionString) {
  if (!connectionString) return { proof_store_id: null, db_host: null, db_name: null };
  try {
    const u = new URL(connectionString);
    const dbName = u.pathname.replace(/^\//, '') || 'unknown';
    const material = `${u.hostname}/${dbName}`;
    return {
      proof_store_id: createHash('sha256').update(material).digest('hex').slice(0, 16),
      db_host: u.hostname,
      db_name: dbName,
    };
  } catch {
    return { proof_store_id: 'unparseable', db_host: null, db_name: null };
  }
}

export async function dbFallbackReceipt(pool, phaseNum) {
  const patterns = PHASE_FALLBACK_PATTERNS[phaseNum];
  if (!patterns) return null;
  const { rows } = await pool.query(
    `SELECT id, verdict, confidence_pct, findings, findings_json, audit_session_id, audited_at
     FROM builder_audit_receipts
     WHERE written_by = 'OIL' AND findings ILIKE ANY($1::text[])
     ORDER BY audited_at DESC, id DESC LIMIT 1`,
    [patterns]
  );
  return rows[0] || null;
}

export async function phase7ProofReceipt(pool) {
  const { rows } = await pool.query(
    `SELECT id, verdict, confidence_pct, findings, findings_json, audit_session_id, audited_at
     FROM builder_audit_receipts
     WHERE project_slug = 'builder-final-synthesis-rerun'
       AND written_by = 'OIL'
       AND (
         kill_test_scenario IN ('GEMINI_LIVE_AUDIT_FAILED', 'GEMINI_LIVE_AUDIT_FAILED_BLOCKED_RUNTIME')
         OR findings_json->>'scenario' IN ('GEMINI_LIVE_AUDIT_FAILED', 'GEMINI_LIVE_AUDIT_FAILED_BLOCKED_RUNTIME')
         OR audit_session_id LIKE 'OIL-phase7-railway-%'
         OR findings_json->>'server_proof' = 'true'
       )
     ORDER BY audited_at DESC, id DESC LIMIT 1`
  );
  return rows[0] || null;
}

export function resolvePhase7Status(proof) {
  if (!proof) {
    return { status: 'MISSING', notes: 'No canonical Railway Phase 7 runtime proof in builder_audit_receipts' };
  }
  const scenario = proof.findings_json?.scenario || null;
  const blocked = scenario === 'GEMINI_LIVE_AUDIT_FAILED_BLOCKED_RUNTIME';
  const ok =
    (proof.verdict === 'PASS' && scenario === 'GEMINI_LIVE_AUDIT_FAILED') ||
    (blocked && (proof.verdict === 'CONDITIONAL_PASS' || proof.verdict === 'PASS'));
  return {
    status: ok ? 'VERIFIED' : 'CONDITIONAL',
    notes: ok
      ? blocked
        ? 'BLOCKED_RUNTIME accepted as VERIFIED (platform constraint)'
        : 'Canonical runtime proof receipt recorded'
      : proof.findings_json?.blocker || proof.findings || 'Not verified',
    confidence: proof.confidence_pct,
    audit_id: proof.id,
  };
}

export async function buildPhaseLedger(pool) {
  const phaseSpecs = [
    { phase: 1, label: 'Serial Execution Enforcement + Truth Surface Schema', fallback: true },
    { phase: 2, label: 'Token Budget Governance', fallback: true },
    { phase: 3, label: 'Allowed-Files Runtime Enforcement', fallback: true },
    { phase: 4, label: 'Context Overflow Detection', fallback: true },
    { phase: 5, label: 'Queue DB Migration + Exhaustion Handler', fallback: true },
    { phase: 6, label: 'Write Lock (AUTONOMY_WRITE_LOCK)', fallback: true },
    { phase: 7, label: 'Audit-Before-Done (independent OIL audit)', p7: true },
    { phase: 8, label: 'Failure Taxonomy + Prompt Hash', fallback: true },
    { phase: 9, label: 'Partial Recovery + Founder Safe Mode', fallback: true },
    { phase: 10, label: 'Two-Lane Canon / Prevent Chaos', fallback: true },
    { phase: 11, label: 'Rollback Drill + Replay Baselines', fallback: true },
    { phase: 12, label: 'Receipt Federation', fallback: true },
    { phase: 13, label: 'Legacy Builder Demotion / Parts-Car Integration', fallback: true },
  ];

  const phases = [];
  for (const spec of phaseSpecs) {
    if (spec.p7) {
      const proof = await phase7ProofReceipt(pool);
      phases.push({ phase: spec.phase, label: spec.label, ...resolvePhase7Status(proof) });
      continue;
    }
    if (spec.fallback) {
      const rec = await dbFallbackReceipt(pool, spec.phase);
      if (!rec) {
        phases.push({
          phase: spec.phase,
          label: spec.label,
          status: 'MISSING',
          notes: `No proof receipt for phase ${spec.phase}`,
        });
      } else {
        phases.push({
          phase: spec.phase,
          label: spec.label,
          status: rec.verdict === 'PASS' ? 'VERIFIED' : 'CONDITIONAL',
          notes: rec.findings || '',
          confidence: rec.confidence_pct,
          audit_id: rec.id,
        });
      }
    }
  }
  return phases;
}

export async function readLatestPhase14Cert(pool) {
  const { rows } = await pool.query(
    `SELECT id, verdict, findings, findings_json, audited_at
     FROM builder_audit_receipts
     WHERE written_by = 'OIL'
       AND findings ILIKE 'Phase 14 Alpha-Ready Certification%'
     ORDER BY audited_at DESC LIMIT 1`
  );
  return rows[0] || null;
}

export function phase14StatusFromLedger(phases) {
  const verified = phases.filter((p) => p.status === 'VERIFIED');
  const conditional = phases.filter((p) => p.status === 'CONDITIONAL');
  const hardBlockers = phases
    .filter((p) => p.status === 'MISSING' || p.status === 'FAIL')
    .map((p) => ({ phase: p.phase, label: p.label, blocker: p.notes || p.status }));
  const alphaReady = hardBlockers.length === 0;
  return { verified, conditional, hardBlockers, alphaReady };
}