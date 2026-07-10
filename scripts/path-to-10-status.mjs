#!/usr/bin/env node
/**
 * SYNOPSIS: Print TOP_10_PATH_TO_10 open items + scorecard pointer.
 * @ssot docs/SYSTEM_SCORECARD_PATH_TO_10.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checklist = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/TOP_10_PATH_TO_10.json'), 'utf8'));
const items = checklist.items || [];
const open = items.filter((i) => i.status !== 'done');
const done = items.filter((i) => i.status === 'done');

console.log('=== PATH TO 10 ===');
console.log(`updated: ${checklist._authority?.updated_at || '?'}`);
console.log(`done: ${done.length}/${items.length} · open: ${open.length}`);
console.log('');
for (const i of items) {
  const mark = i.status === 'done' ? '✅' : i.status === 'in_progress' ? '🔄' : '⬜';
  console.log(`${mark} T${String(i.rank).padStart(2, '0')} ${i.title}`);
  if (i.status !== 'done') {
    console.log(`   next: ${i.next_action}`);
    if (i.blocker) console.log(`   blocker: ${i.blocker}`);
  }
}
console.log('');
console.log('scorecard: docs/SYSTEM_SCORECARD_PATH_TO_10.md');
process.exit(open.length === 0 ? 0 : 0);
