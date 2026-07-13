/**
 * SYNOPSIS: Script — Write Phase14 Ledger.
 */
import { readFile } from 'fs/promises';
import pg from 'pg';

const { Client } = pg;

const FINDINGS_JSON_PATH = process.env.FINDINGS_JSON_PATH || './findings.json';
const DATABASE_URL = process.env.DATABASE_URL;

function derivePhaseLedger(data) {
  if (Array.isArray(data?.phases)) {
    return data.phases.map((phase) => ({
      phase: phase?.phase ?? phase?.name ?? phase?.id ?? '',
      status: phase?.status === 'pass' ? 'pass' : 'fail',
      note: phase?.note ?? phase?.message ?? ''
    }));
  }

  if (Array.isArray(data?.findings)) {
    return data.findings.map((finding, index) => ({
      phase: finding?.phase ?? finding?.name ?? finding?.id ?? `phase-${index + 1}`,
      status: finding?.status === 'pass' ? 'pass' : 'fail',
      note: finding?.note ?? finding?.message ?? finding?.finding ?? ''
    }));
  }

  return [];
}

async function main() {
  try {
    if (!DATABASE_URL) {
      throw new Error('DATABASE_URL is required');
    }

    const file = await readFile(FINDINGS_JSON_PATH, 'utf8');
    const data = JSON.parse(file);
    const phaseLedger = Array.isArray(data?.phase_ledger) ? data.phase_ledger : derivePhaseLedger(data);

    const client = new Client({ connectionString: DATABASE_URL });
    await client.connect();

    const result = await client.query(
      'INSERT INTO builder_findings(findings_json) VALUES($1)',
      [JSON.stringify({ ...data, phase_ledger: phaseLedger })]
    );

    await client.end();

    process.stdout.write(
      JSON.stringify(
        {
          rows_affected: result.rowCount ?? 0,
          phase_ledger_length: phaseLedger.length
        },
        null,
        0
      ) + '\n'
    );

    process.exit(0);
  } catch (error) {
    process.stderr.write((error && error.stack) ? `${error.stack}\n` : `${String(error)}\n`);
    process.exit(1);
  }
}

await main();