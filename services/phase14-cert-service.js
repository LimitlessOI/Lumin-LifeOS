/**
 * SYNOPSIS: Exports getPhase14Cert — services/phase14-cert-service.js.
 */
export async function getPhase14Cert(db) {
  const nowIso = new Date().toISOString();

  if (!db || typeof db.query !== 'function') {
    throw new TypeError('getPhase14Cert(db) requires a db with a query method');
  }

  await db.query(`
    CREATE TABLE IF NOT EXISTS builder_findings (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      findings_json jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `);

  const result = await db.query(
    `SELECT findings_json
       FROM builder_findings
      ORDER BY created_at DESC
      LIMIT 1`
  );

  const row = result?.rows?.[0];
  if (!row) {
    return {
      certified: false,
      phase_ledger: [],
      generated_at: nowIso,
      summary: { total: 0, passed: 0, failed: 0 },
    };
  }

  const findingsJson = row.findings_json ?? {};
  const phaseLedgerRaw = Array.isArray(findingsJson?.phase_ledger) ? findingsJson.phase_ledger : [];
  const phase_ledger = phaseLedgerRaw.map((entry) => entry);

  let passed = 0;
  let failed = 0;

  for (const entry of phase_ledger) {
    const status = typeof entry === 'string'
      ? entry
      : entry && typeof entry === 'object'
        ? String(entry.status ?? entry.result ?? entry.state ?? '').toLowerCase()
        : '';

    if (status === 'passed' || status === 'pass' || status === 'certified' || status === 'ok' || status === 'true') {
      passed += 1;
    } else if (status === 'failed' || status === 'fail' || status === 'error' || status === 'false') {
      failed += 1;
    }
  }

  const total = phase_ledger.length;
  return {
    certified: total > 0 && failed === 0,
    phase_ledger,
    generated_at: nowIso,
    summary: { total, passed, failed },
  };
}