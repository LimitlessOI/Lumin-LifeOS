/**
 * SYNOPSIS: Script — Write Phase14 Ledger.
 */
import { readFile } from 'fs/promises';
import pg from 'pg';

const { Client } = pg;

function derivePhaseLedger(payload) {
  if (Array.isArray(payload?.phase_ledger)) {
    return payload.phase_ledger;
  }

  if (Array.isArray(payload?.phases)) {
    return payload.phases.map((phase) => ({
      phase: phase?.phase ?? phase?.name ?? phase?.id ?? 'unknown',
      status: phase?.status === 'fail' ? 'fail' : 'pass',
      note: phase?.note ?? phase?.message ?? '',
    }));
  }

  if (Array.isArray(payload?.findings)) {
    return payload.findings.map((finding, idx) => ({
      phase: finding?.phase ?? finding?.name ?? finding?.id ?? `phase-${idx + 1}`,
      status: finding?.status === 'fail' ? 'fail' : 'pass',
      note: finding?.note ?? finding?.message ?? finding?.finding ?? '',
    }));
  }

  return [];
}

async function main() {
  const findingsJsonPath = process.env.FINDINGS_JSON_PATH ?? './findings.json';
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const raw = await readFile(findingsJsonPath, 'utf8');
  const payload = JSON.parse(raw);
  const phaseLedger = derivePhaseLedger(payload);

  const client = new Client({ connectionString: databaseUrl });
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
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});