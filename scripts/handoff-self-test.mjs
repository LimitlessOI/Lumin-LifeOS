#!/usr/bin/env node
/**
 * Structural cold-start self-test — fails if critical handoff files are missing
 * or Amendment 21 lost its Agent Handoff Notes heading.
 *
 * @ssot docs/projects/AMENDMENT_36_ZERO_DRIFT_HANDOFF_PROTOCOL.md
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const required = [
  'docs/CONTINUITY_INDEX.md',
  'docs/CONTINUITY_LOG_LIFEOS.md',
  'docs/CONTINUITY_LOG_COUNCIL.md',
  'docs/AI_COLD_START.md',
  'docs/projects/AMENDMENT_36_ZERO_DRIFT_HANDOFF_PROTOCOL.md',
  'docs/projects/AMENDMENT_21_LIFEOS_CORE.manifest.json',
];

async function main() {
  for (const rel of required) {
    await fs.access(path.join(ROOT, rel));
  }
  const amd21 = await fs.readFile(path.join(ROOT, 'docs/projects/AMENDMENT_21_LIFEOS_CORE.md'), 'utf8');
  if (!amd21.includes('## Agent Handoff Notes')) {
    throw new Error('Amendment 21 missing ## Agent Handoff Notes — cold-start protocol broken');
  }
  const man = JSON.parse(await fs.readFile(path.join(ROOT, 'docs/projects/AMENDMENT_21_LIFEOS_CORE.manifest.json'), 'utf8'));
  if (!man.lane_read_manifest) {
    throw new Error('Amendment 21 manifest missing lane_read_manifest');
  }
  console.log('✅ handoff:self-test passed');
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
