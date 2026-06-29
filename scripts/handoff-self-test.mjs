#!/usr/bin/env node
/**
 * SYNOPSIS: Structural cold-start self-test — fails if critical handoff files are missing
 * Structural cold-start self-test — fails if critical handoff files are missing
 * or Amendment 21 lost its Agent Handoff Notes heading.
 *
 * @ssot docs/products/zero-drift-handoff-protocol/PRODUCT_HOME.md
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
  'docs/products/zero-drift-handoff-protocol/PRODUCT_HOME.md',
  'docs/products/lifeos/FILE_MANIFEST.json',
];

async function main() {
  for (const rel of required) {
    await fs.access(path.join(ROOT, rel));
  }
  const amd21 = await fs.readFile(path.join(ROOT, 'docs/products/lifeos/PRODUCT_HOME.md'), 'utf8');
  if (!amd21.includes('## Agent Handoff Notes')) {
    throw new Error('Amendment 21 missing ## Agent Handoff Notes — cold-start protocol broken');
  }
  const man = JSON.parse(await fs.readFile(path.join(ROOT, 'docs/products/lifeos/FILE_MANIFEST.json'), 'utf8'));
  if (!man.lane_read_manifest) {
    throw new Error('Amendment 21 manifest missing lane_read_manifest');
  }
  console.log('✅ handoff:self-test passed');
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
