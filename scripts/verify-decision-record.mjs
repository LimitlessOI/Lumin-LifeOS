#!/usr/bin/env node
/**
 * SYNOPSIS: Verify a DECISION-XXXX.md file against the Collaboration Spine template.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const REQUIRED_HEADINGS = [
  '## Decision',
  '## Founder intent',
  '## Problem being solved',
  '## Alternatives considered',
  '## Per-role reasoning',
  '## Assumptions',
  '## Predictions',
  '## Success criteria',
  '## Failure criteria',
  '## Consensus',
  '## Why this decision',
  '## Implementation trace',
  '## Sentry verification',
  '## Actual real-world outcome',
  '## Prediction-versus-reality comparison',
  '## Resulting lessons / wisdom update',
  '## Reality judgment',
];

function extractHeadings(content) {
  const headings = [];
  for (const line of content.split(/\r?\n/)) {
    const m = line.match(/^(#{2,3})\s+(.+)$/);
    if (m) headings.push(`${m[1]} ${m[2].trim()}`);
  }
  return headings;
}

export function verifyDecisionRecord(filePath) {
  const absPath = path.isAbsolute(filePath) ? filePath : path.join(ROOT, filePath);
  if (!fs.existsSync(absPath)) {
    return { ok: false, file: absPath, errors: ['File does not exist'] };
  }
  const content = fs.readFileSync(absPath, 'utf8');
  const errors = [];
  const headings = extractHeadings(content);

  for (const required of REQUIRED_HEADINGS) {
    if (!headings.includes(required)) {
      errors.push(`Missing required heading: ${required}`);
    }
  }

  // Check for decision ID in synopsis or heading
  const idMatch = content.match(/DECISION-\d{4}/);
  if (!idMatch) {
    errors.push('No DECISION-XXXX identifier found in file');
  }

  // Reality judgment must have a status marker
  const realitySection = content.split('## Reality judgment')[1] || '';
  if (!/\*\*Status:\*\*\s*`?(PENDING|CONFIRMED|PARTIALLY_CONFIRMED|REFUTED)`?/.test(realitySection)) {
    errors.push('Reality judgment section missing valid Status marker (PENDING, CONFIRMED, PARTIALLY_CONFIRMED, REFUTED)');
  }

  return { ok: errors.length === 0, file: absPath, decision_id: idMatch ? idMatch[0] : null, headings, errors };
}

export default verifyDecisionRecord;

if (import.meta.url === `file://${process.argv[1]}`) {
  const target = process.argv[2];
  if (!target) {
    console.error('Usage: node scripts/verify-decision-record.mjs <path-to-DECISION-XXXX.md>');
    process.exit(1);
  }
  const result = verifyDecisionRecord(target);
  if (result.ok) {
    console.log(`Decision record valid: ${result.decision_id} (${result.file})`);
    process.exit(0);
  }
  console.error(`Decision record invalid: ${result.file}`);
  for (const e of result.errors) console.error(`  - ${e}`);
  process.exit(1);
}
