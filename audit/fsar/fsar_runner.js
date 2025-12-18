import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import { analyzeTemporalAdversary } from '../../council/roles/temporal_adversary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORTS_DIR = path.resolve(__dirname, '..', 'reports');

/**
 * Generate a timestamped filename component safe for filesystems
 */
function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function ensureReportsDir() {
  await fs.mkdir(REPORTS_DIR, { recursive: true });
}

/**
 * Run a Future-State Adversarial Retrospection (FSAR) analysis.
 * System law: "No decision is complete until future-us has tried to destroy it."
 * Local-only: uses stubbed reasoning until council models are wired.
 * @param {string} proposal - The proposal text being evaluated
 * @returns {Promise<{ jsonPath: string, mdPath: string, report: object }>} paths and report content
 */
export async function runFSAR(proposal) {
  if (!proposal || !proposal.trim()) {
    throw new Error('Proposal text is required');
  }

  await ensureReportsDir();

  // Temporal Adversary reasoning (local-only; if router not wired, use role directly)
  let adv = null;
  try {
    adv = await analyzeTemporalAdversary(proposal, { source: 'fsar_runner' });
  } catch {
    adv = null; // fail over to stub below
  }

  // Stubbed fallback reasoning
  const id = `fsar_${randomUUID()}`;
  const ts = timestamp();
  let severity = adv?.severity ?? 6;
  let block_execution = adv?.block_execution ?? false;

  const lowered = proposal.toLowerCase();
  if (lowered.includes('[fsar_block]')) {
    severity = 50;
    block_execution = true;
  } else if (lowered.includes('[fsar_review]')) {
    severity = 30;
  }

  const risks = adv?.risks || [
    'Silent failure modes if monitoring is weak',
    'Second-order costs due to over-automation',
    'Trust inflation from optimistic summaries'
  ];
  const mitigations = adv?.mitigations || [
    'Add runtime checks and alerts on critical paths',
    'Bias toward reversible, cheap experiments first',
    'Enforce periodic FSAR reruns with updated data'
  ];

  const report = {
    id,
    timestamp: new Date().toISOString(),
    proposal,
    severity,
    risks,
    mitigations,
    block_execution,
  };

  const baseName = `fsar_proposal_${ts}`;
  const jsonPath = path.join(REPORTS_DIR, `${baseName}.json`);
  const mdPath = path.join(REPORTS_DIR, `${baseName}.md`);

  const markdown = [
    `# FSAR Proposal Report`,
    `- id: ${id}`,
    `- timestamp: ${report.timestamp}`,
    `- severity: ${severity}`,
    `- block_execution: ${block_execution}`,
    `- proposal:`,
    '',
    proposal,
    '',
    '## Risks',
    ...risks.map((r) => `- ${r}`),
    '',
    '## Mitigations',
    ...mitigations.map((m) => `- ${m}`),
  ].join('\n');

  await fs.writeFile(jsonPath, JSON.stringify(report, null, 2), 'utf8');
  await fs.writeFile(mdPath, markdown, 'utf8');

  return { jsonPath, mdPath, report };
}

export default runFSAR;
