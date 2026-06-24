#!/usr/bin/env node
/**
 * SYNOPSIS: Compound improvement log summary for BuilderOS harness.
 * Usage: node scripts/builderos-compound-summary.mjs [--production-only]
 * @ssot services/builderos-compound-improvement.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  COMPOUND_LOG_PATH,
  getCompoundImprovementSummary,
} from '../services/builderos-compound-improvement.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const productionOnly = process.argv.includes('--production-only');

function readLog() {
  if (!fs.existsSync(COMPOUND_LOG_PATH)) return [];
  return fs
    .readFileSync(COMPOUND_LOG_PATH, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

const rows = readLog().filter((r) => !productionOnly || (r.source && r.source !== 'test'));
const summary = getCompoundImprovementSummary();
const levers = {};
for (const row of rows) {
  const key = row.lever || 'unknown';
  levers[key] = levers[key] || { count: 0, successes: 0, failures: 0, playbooks: new Set() };
  levers[key].count += 1;
  if (row.success) levers[key].successes += 1;
  else levers[key].failures += 1;
  if (row.classification?.playbook) levers[key].playbooks.add(row.classification.playbook);
}

const report = {
  schema: 'builderos_compound_summary_v1',
  generated_at: new Date().toISOString(),
  log_path: path.relative(ROOT, COMPOUND_LOG_PATH),
  production_only: productionOnly,
  row_count: rows.length,
  state: summary,
  levers: Object.fromEntries(
    Object.entries(levers).map(([k, v]) => [
      k,
      { ...v, playbooks: [...v.playbooks] },
    ]),
  ),
  recent: rows.slice(-10),
};

console.log(JSON.stringify(report, null, 2));
