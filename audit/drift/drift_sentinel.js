import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dayjs from 'dayjs';
import { aggregateDriftSignals } from './drift_metrics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORTS_DIR = path.resolve(__dirname, '..', 'reports');

function ts() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function ensureReportsDir() {
  await fs.mkdir(REPORTS_DIR, { recursive: true });
}

/**
 * Run a drift check over council signals.
 * @param {object} payload - { messages: string[], votes: {spread}[], responses: {certainty}[] }
 * @returns {Promise<{ jsonPath: string, mdPath: string, report: object }>}
 */
export async function runDriftCheck(payload = {}) {
  await ensureReportsDir();

  const report = aggregateDriftSignals({
    messages: payload.messages || [],
    votes: payload.votes || [],
    responses: payload.responses || [],
  });

  const base = `drift_report_${ts()}`;
  const jsonPath = path.join(REPORTS_DIR, `${base}.json`);
  const mdPath = path.join(REPORTS_DIR, `${base}.md`);

  const markdown = [
    '# Drift Report',
    `- id: ${report.id}`,
    `- timestamp: ${dayjs().toISOString()}`,
    `- severity: ${report.severity}`,
    '',
    '## Signals',
    `- repeated_phrasing: ${report.signals.repeated_phrasing.toFixed(3)}`,
    `- declining_disagreement: ${report.signals.declining_disagreement.toFixed(3)}`,
    `- rising_certainty: ${report.signals.rising_certainty.toFixed(3)}`,
    '',
    '## Recommendations',
    ...(report.recommendations.length ? report.recommendations.map((r) => `- ${r}`) : ['- none']),
  ].join('\n');

  await fs.writeFile(jsonPath, JSON.stringify({ ...report, timestamp: dayjs().toISOString() }, null, 2), 'utf8');
  await fs.writeFile(mdPath, markdown, 'utf8');

  return { jsonPath, mdPath, report };
}

export default runDriftCheck;
