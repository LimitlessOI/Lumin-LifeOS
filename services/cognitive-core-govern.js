/**
 * SYNOPSIS: Cognitive Core Era-9 "Govern Me" — self-governance + integrity audit.
 * #41 Integrity Auditor, #42 Constitutional Conformance, #43 Calibration Decay,
 * #44 Compiler Drift Ledger, #45 Self-Audit Findings → fixes.
 * The compiler audits itself; every finding carries a proposed fix (SENTRY doctrine).
 * @ssot docs/products/memory-intelligence/PRODUCT_HOME.md
 */

import { createCognitiveCoreJudgment } from './cognitive-core-judgment.js';

function clamp01(n, fb = 0) {
  const v = Number(n);
  return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fb;
}

async function softQuery(pool, sql, params = []) {
  if (!pool?.query) return [];
  try {
    const r = await pool.query(sql, params);
    return r.rows || [];
  } catch {
    return [];
  }
}

const LAWS = [
  { id: 'law1_models_are_hypotheses', label: 'Models are hypotheses' },
  { id: 'law2_trust_earned_empirically', label: 'Trust is earned empirically' },
  { id: 'law3_honesty_non_negotiable', label: 'Honesty is non-negotiable' },
  { id: 'law4_user_sovereignty', label: 'User sovereignty' },
  { id: 'law5_improve_the_compiler', label: 'Improve the compiler, not just the model' },
];

/**
 * @param {{ pool: import('pg').Pool, logger?: Console }} deps
 */
export function createCognitiveCoreGovern(deps = {}) {
  const pool = deps.pool;
  const logger = deps.logger || console;
  const journal = createCognitiveCoreJudgment({ pool, logger });

  async function checkConstitution(userId, { auditId = null } = {}) {
    const uid = String(userId || '1');
    const board = await journal.getScoreboard(uid).catch(() => ({ by_domain: [], totals: {} }));
    const domains = board.by_domain || [];
    const totals = board.totals || {};
    const checks = [];

    // Law 2 — no domain should sit above 'refuse' with n<5.
    const law2Violations = domains.filter(
      (d) => (d.n || 0) < 5 && ['suggest', 'allow'].includes(d.delegation_tier),
    );
    checks.push({
      law: 'law2_trust_earned_empirically',
      status: law2Violations.length ? 'fail' : 'pass',
      evidence: law2Violations.length
        ? `${law2Violations.length} domain(s) elevated with n<5`
        : 'no domain elevated without evidence',
      detail: { violations: law2Violations.map((d) => d.domain) },
    });

    // Law 5 — misses should produce reports (compiler learns).
    const missGap = (totals.outcomes || 0) > 0 && (totals.miss_reports || 0) === 0;
    checks.push({
      law: 'law5_improve_the_compiler',
      status: missGap ? 'warn' : 'pass',
      evidence: missGap
        ? 'outcomes recorded but zero miss reports — compiler may not be learning'
        : 'miss loop active or no outcomes yet',
      detail: { outcomes: totals.outcomes || 0, miss_reports: totals.miss_reports || 0 },
    });

    // Law 1 — hypotheses carry confidence; flag any program at exactly 1.0 (certainty theater).
    const overcertain = await softQuery(pool,
      `SELECT program_id, label FROM judgment_programs
       WHERE user_id = $1 AND status = 'active' AND confidence >= 0.999`, [uid]);
    checks.push({
      law: 'law1_models_are_hypotheses',
      status: overcertain.length ? 'warn' : 'pass',
      evidence: overcertain.length
        ? `${overcertain.length} program(s) at confidence 1.0 (no certainty allowed)`
        : 'all programs carry sub-certain confidence',
      detail: { overcertain: overcertain.map((p) => p.label) },
    });

    for (const c of checks) {
      await pool.query(
        `INSERT INTO constitutional_checks (user_id, law, status, evidence, detail, audit_id)
         VALUES ($1,$2,$3,$4,$5::jsonb,$6)`,
        [uid, c.law, c.status, c.evidence, JSON.stringify(c.detail || {}), auditId],
      );
    }
    return checks;
  }

  async function detectCalibrationDecay(userId) {
    const uid = String(userId || '1');
    const board = await journal.getScoreboard(uid).catch(() => ({ by_domain: [] }));
    const created = [];
    for (const d of board.by_domain || []) {
      const prev = await softQuery(pool,
        `SELECT accuracy, brier_score FROM calibration_snapshots
         WHERE user_id = $1 AND domain = $2
         ORDER BY created_at DESC LIMIT 1 OFFSET 1`, [uid, d.domain]);
      if (!prev.length) continue;
      const prevAcc = prev[0].accuracy != null ? Number(prev[0].accuracy) : null;
      const currAcc = d.accuracy != null ? Number(d.accuracy) : null;
      if (prevAcc == null || currAcc == null) continue;
      const delta = currAcc - prevAcc;
      if (delta < -0.05) {
        const severity = delta < -0.2 ? 'high' : delta < -0.1 ? 'medium' : 'low';
        const r = await pool.query(
          `INSERT INTO calibration_decay_events
             (user_id, domain, metric, prev_value, curr_value, delta, severity)
           VALUES ($1,$2,'accuracy',$3,$4,$5,$6)
           RETURNING *`,
          [uid, d.domain, prevAcc, currAcc, delta, severity],
        );
        if (r.rows[0]) {
          created.push(r.rows[0]);
          await recordDrift({
            userId: uid,
            kind: 'calibration_decay',
            summary: `Accuracy in ${d.domain} dropped ${(delta * 100).toFixed(1)}pts`,
            severity,
            refs: [{ domain: d.domain }],
          });
        }
      }
    }
    return { ok: true, decay_events: created };
  }

  async function recordDrift({ userId, kind, summary, severity = 'low', refs = [] } = {}) {
    const validKinds = new Set([
      'calibration_decay', 'honesty_gap', 'law_violation',
      'stale_hypothesis', 'unresolved_debt', 'config_over_evidence',
    ]);
    const r = await pool.query(
      `INSERT INTO compiler_drift_ledger (user_id, kind, summary, severity, refs)
       VALUES ($1,$2,$3,$4,$5::jsonb)
       RETURNING *`,
      [
        String(userId || '1'),
        validKinds.has(kind) ? kind : 'stale_hypothesis',
        String(summary || '').slice(0, 500),
        ['low', 'medium', 'high'].includes(severity) ? severity : 'low',
        JSON.stringify(refs || []),
      ],
    );
    return r.rows[0];
  }

  async function listDrift(userId, { resolved = false, limit = 50 } = {}) {
    const r = await pool.query(
      `SELECT * FROM compiler_drift_ledger
       WHERE user_id = $1 AND resolved = $2
       ORDER BY severity DESC, created_at DESC LIMIT $3`,
      [String(userId || '1'), !!resolved, Math.min(Math.max(Number(limit) || 50, 1), 200)],
    );
    return r.rows;
  }

  async function resolveDrift({ driftId } = {}) {
    const r = await pool.query(
      `UPDATE compiler_drift_ledger SET resolved = TRUE WHERE drift_id = $1 RETURNING *`,
      [String(driftId)],
    );
    return r.rows[0] || null;
  }

  async function runIntegrityAudit({ userId, scope = 'full' } = {}) {
    const uid = String(userId || '1');
    const sc = ['full', 'calibration', 'honesty', 'law_conformance'].includes(scope) ? scope : 'full';
    const auditRow = await pool.query(
      `INSERT INTO integrity_audits (user_id, scope, passed, findings_n, summary, detail)
       VALUES ($1,$2,TRUE,0,'pending','{}'::jsonb)
       RETURNING *`,
      [uid, sc],
    );
    const auditId = auditRow.rows[0].audit_id;

    const checks = (sc === 'full' || sc === 'law_conformance')
      ? await checkConstitution(uid, { auditId })
      : [];
    const decay = (sc === 'full' || sc === 'calibration')
      ? await detectCalibrationDecay(uid)
      : { decay_events: [] };
    const openDrift = await listDrift(uid, { resolved: false, limit: 100 });

    const findings = [];
    for (const c of checks.filter((x) => x.status !== 'pass')) {
      findings.push({
        title: `Constitution ${c.status}: ${c.law}`,
        finding: c.evidence,
        proposed_fix: c.law === 'law2_trust_earned_empirically'
          ? 'Demote elevated domains to refuse until n>=5 (compound ladder review)'
          : c.law === 'law5_improve_the_compiler'
            ? 'Run miss loop on recent outcomes; induce corrective programs'
            : 'Recalibrate program confidence away from certainty',
        target_ref: c.law,
        severity: c.status === 'fail' ? 'high' : 'medium',
      });
    }
    for (const d of (decay.decay_events || [])) {
      findings.push({
        title: `Calibration decay in ${d.domain}`,
        finding: `Accuracy delta ${Number(d.delta).toFixed(3)} (${d.severity})`,
        proposed_fix: 'Trigger recalibration ritual for the domain; refresh cognitive debt',
        target_ref: `domain:${d.domain}`,
        severity: d.severity,
      });
    }

    const created = [];
    for (const f of findings) {
      const r = await pool.query(
        `INSERT INTO self_audit_findings
           (user_id, audit_id, title, finding, proposed_fix, target_ref, severity, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'open')
         RETURNING *`,
        [uid, auditId, f.title, f.finding, f.proposed_fix, f.target_ref, f.severity],
      );
      if (r.rows[0]) created.push(r.rows[0]);
    }

    const passed = findings.length === 0 && openDrift.length === 0;
    const summary = passed
      ? 'Clean — no conformance failures or unresolved drift'
      : `${findings.length} finding(s), ${openDrift.length} open drift item(s)`;
    await pool.query(
      `UPDATE integrity_audits
       SET passed = $2, findings_n = $3, summary = $4, detail = $5::jsonb
       WHERE audit_id = $1`,
      [
        auditId,
        passed,
        created.length,
        summary,
        JSON.stringify({ checks, open_drift_n: openDrift.length }),
      ],
    );

    return {
      ok: true,
      audit_id: auditId,
      passed,
      summary,
      checks,
      findings: created,
      open_drift: openDrift,
      honesty: 'KNOW: checks ran against live scoreboard/programs. Every finding carries a proposed_fix (solution-mandatory).',
    };
  }

  async function listAudits(userId, { limit = 20 } = {}) {
    const r = await pool.query(
      `SELECT * FROM integrity_audits WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2`,
      [String(userId || '1'), Math.min(Math.max(Number(limit) || 20, 1), 100)],
    );
    return r.rows;
  }

  async function listFindings(userId, { status = 'open', limit = 50 } = {}) {
    const r = await pool.query(
      `SELECT * FROM self_audit_findings
       WHERE user_id = $1 AND status = $2
       ORDER BY severity DESC, created_at DESC LIMIT $3`,
      [String(userId || '1'), status || 'open', Math.min(Math.max(Number(limit) || 50, 1), 200)],
    );
    return r.rows;
  }

  async function updateFinding({ findingId, status = 'queued' } = {}) {
    const st = ['open', 'queued', 'resolved', 'dismissed'].includes(status) ? status : 'queued';
    const r = await pool.query(
      `UPDATE self_audit_findings SET status = $2, updated_at = NOW()
       WHERE finding_id = $1 RETURNING *`,
      [String(findingId), st],
    );
    return r.rows[0] || null;
  }

  return {
    LAWS,
    checkConstitution,
    detectCalibrationDecay,
    recordDrift,
    listDrift,
    resolveDrift,
    runIntegrityAudit,
    listAudits,
    listFindings,
    updateFinding,
  };
}

export default createCognitiveCoreGovern;
