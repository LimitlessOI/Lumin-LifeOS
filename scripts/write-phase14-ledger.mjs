/**
 * SYNOPSIS: Script — Write Phase14 Ledger.
 */
import { readFile } from 'fs/promises';
import pg from 'pg';

const { Client } = pg;

const FINDINGS_JSON_PATH = process.env.FINDINGS_JSON_PATH ?? './findings.json';
const DATABASE_URL = process.env.DATABASE_URL;

function derivePhaseLedger(data) {
  if (Array.isArray(data?.phases)) {
    return data.phases
      .map((phase) => {
        if (!phase || typeof phase !== 'object') return null;
        const name = phase.phase ?? phase.name ?? phase.id ?? phase.key;
        const statusRaw = phase.status ?? phase.result ?? phase.outcome;
        const note = phase.note ?? phase.message ?? phase.detail ?? '';
        if (!name) return null;
        const status = statusRaw === 'fail' ? 'fail' : 'pass';
        return { phase: String(name), status, note: String(note) };
      })
      .filter(Boolean);
  }

  if (Array.isArray(data?.findings)) {
    return data.findings.map((finding, idx) => {
      if (finding && typeof finding === 'object') {
        const phase = finding.phase ?? finding.name ?? finding.id ?? `phase-${idx + 1}`;
        const status = finding.status === 'fail' ? 'fail' : 'pass';
        const note = finding.note ?? finding.message ?? finding.detail ?? '';
        return { phase: String(phase), status, note: String(note) };
      }
      return { phase: `phase-${idx + 1}`, status: 'pass', note: String(finding ?? '') };
    });
  }

  return [];
}

async function main() {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const raw = await readFile(FINDINGS_JSON_PATH, 'utf8');
  const data = JSON.parse(raw);
  const phaseLedger = Array.isArray(data?.phase_ledger) ? data.phase_ledger : derivePhaseLedger(data);

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    const findingsJson = JSON.stringify({
      ...data,
      phase_ledger: phaseLedger,
    });

    const result = await client.query('INSERT INTO builder_findings(findings_json) VALUES($1)', [findingsJson]);
    console.log(JSON.stringify({ rows_affected: result.rowCount ?? 0, phase_ledger_length: phaseLedger.length }));
  } finally {
    await client.end();
  }
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exit(1);
  }
);