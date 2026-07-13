/**
 * SYNOPSIS: Script — Write Phase14 Ledger.
 */
import pg from 'pg';
import { readFile } from 'fs/promises';

const { Client } = pg;

function buildPhaseLedger(payload) {
  if (Array.isArray(payload?.phases)) {
    return payload.phases.map((phase) => ({
      phase: phase?.phase ?? phase?.name ?? phase?.id ?? 'unknown',
      status: phase?.status === 'pass' ? 'pass' : 'fail',
      note: phase?.note ?? phase?.message ?? '',
    }));
  }

  if (Array.isArray(payload?.findings)) {
    return payload.findings.map((finding, index) => ({
      phase: finding?.phase ?? finding?.name ?? `phase-${index + 1}`,
      status: finding?.status === 'pass' ? 'pass' : 'fail',
      note: finding?.note ?? finding?.message ?? String(finding ?? ''),
    }));
  }

  return [];
}

async function main() {
  const findingsPath = process.env.FINDINGS_JSON_PATH ?? './findings.json';
  const raw = await readFile(findingsPath, 'utf8');
  const payload = JSON.parse(raw);
  const phaseLedger = buildPhaseLedger(payload);

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();

  try {
    const result = await client.query(
      'INSERT INTO builder_findings(findings_json) VALUES($1)',
      [JSON.stringify({ ...payload, phase_ledger: phaseLedger })],
    );

    console.log(
      JSON.stringify({
        rows_affected: result.rowCount ?? 0,
        phase_ledger_length: phaseLedger.length,
      }),
    );

    process.exit(0);
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});