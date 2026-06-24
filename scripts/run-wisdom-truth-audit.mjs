#!/usr/bin/env node
/**
 * SYNOPSIS: Wisdom truth auditor CLI — adversarial probes + enforcement gap scan (preflight).
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runWisdomTruthAudit } from '../services/wisdom-truth-auditor.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const report = await runWisdomTruthAudit({
  logger: {
    info: () => {},
    warn: (obj, msg) => console.warn(msg, obj),
  },
});

const outPath = path.join(ROOT, 'products/receipts/WISDOM_TRUTH_AUDIT.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

if (!report.ok) {
  console.error('WISDOM_TRUTH_AUDIT FAIL');
  for (const p of report.adversarial_probes.filter((x) => !x.passed)) {
    console.error(`  • PROBE_FAIL:${p.id}${p.error ? ` (${p.error})` : ''}`);
  }
  for (const g of report.enforcement_gaps.filter((x) =>
    x.type === 'FOUNDER_USABILITY_PASS_HARDCODED' || x.type === 'SERVER_MISSING_TRUTH_MIDDLEWARE')) {
    console.error(`  • GAP:${g.type}:${g.file}`);
  }
  process.exit(1);
}

console.log('WISDOM_TRUTH_AUDIT OK');
console.log(JSON.stringify(report, null, 2));
process.exit(0);
