#!/usr/bin/env node
/**
 * SYNOPSIS: Dry-run: reports amendment markdown files over 900 lines (Change Receipts
 * Dry-run: reports amendment markdown files over 900 lines (Change Receipts
 * compaction candidates). Does not move files.
 *
 * @ssot docs/products/zero-drift-handoff-protocol/PRODUCT_HOME.md
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

async function main() {
  const dir = path.join(ROOT, 'docs/projects');
  const files = (await fs.readdir(dir)).filter((f) => /^AMENDMENT_\d+.*\.md$/.test(f));
  for (const f of files.sort()) {
    const text = await fs.readFile(path.join(dir, f), 'utf8');
    const lines = text.split('\n').length;
    if (lines > 900) {
      console.log(`[COMPACT-CANDIDATE] ${f} — ${lines} lines (consider archiving old Change Receipts)`);
    }
  }
  console.log('ssot-compact-receipts-dryrun complete');
}

main().catch(console.error);
