#!/usr/bin/env node
/** Mechanical BPB fix: add missing probe_id rows to ACCEPTANCE_TESTS from catalog. */
import fs from 'node:fs';
import path from 'node:path';
import { missionDir } from './mission-lib.mjs';

const objectiveId = process.argv[2] || 'FACTORY-DELIBERATION-SENTRY-REGRESSION-0001';
const dir = missionDir(objectiveId);
const catalog = JSON.parse(fs.readFileSync(path.join(dir, 'REGRESSION_PROBE_CATALOG.json'), 'utf8'));
const accPath = path.join(dir, 'ACCEPTANCE_TESTS.json');
const acc = JSON.parse(fs.readFileSync(accPath, 'utf8'));
const tests = acc.tests || acc;

const covered = new Set(tests.filter((t) => t.probe_id).map((t) => t.probe_id));
const added = [];
for (const p of catalog.probes || []) {
  if (covered.has(p.id)) continue;
  tests.push({
    id: `AT-PROBE-${p.id}`,
    probe_id: p.id,
    description: `Catalog probe ${p.id} covered (BPB mechanical fix)`,
    command: `node scripts/deliberation-sentry-regression-harness.mjs --layer=local --probe=${p.id}`,
    expected_exit_code: 0,
  });
  added.push(p.id);
}

acc.tests = tests;
fs.writeFileSync(accPath, `${JSON.stringify(acc, null, 2)}\n`);
console.log(JSON.stringify({ objective_id: objectiveId, added, total: tests.length }, null, 2));
process.exit(added.length ? 0 : 0);
