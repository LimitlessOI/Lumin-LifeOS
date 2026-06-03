#!/usr/bin/env node
/**
 * Builder factory health — Operations Director CLI.
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  analyzeFactoryHealth,
  writeFactoryHealthReport,
  FACTORY_KPI_TARGETS,
} from '../services/builder-operations-director.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const sinceHours = process.argv.includes('--24h') ? 24 : 0;
const write = process.argv.includes('--write');

const report = await analyzeFactoryHealth({ root: ROOT, sinceHours });
report.kpi_targets = FACTORY_KPI_TARGETS;

if (write) {
  const out = path.join(ROOT, 'data', 'builder-factory-health.json');
  await writeFactoryHealthReport(report, out);
  console.log('Wrote', out);
}

const { layers: L, factory_score, throughput, recommendations } = report;
console.log('\n=== Builder Operations Director ===');
console.log('Initiative: Builder Reliability Initiative');
console.log('Factory score:', factory_score, '/ 10');
console.log('Window starts:', throughput?.task_starts ?? 0, sinceHours ? `(last ${sinceHours}h)` : '(full log)');
console.log('\nLayer 1 — Survival:', L?.layer1?.combined_survival_blocker_pct + '%', '502+syntax', L?.layer1?.healthy ? 'OK' : 'FAIL');
console.log('Layer 2 — Utilization: proof', L?.layer2?.proof_doc_start_pct + '%', 'product', L?.layer2?.product_build_start_pct + '%', L?.layer2?.healthy ? 'OK' : 'FAIL');
console.log('Layer 3 — Value: FV/1000 starts', L?.layer3?.founder_value_per_1000_starts, L?.layer3?.healthy ? 'OK' : 'FAIL');
console.log('\nTop blockers:');
for (const b of report.top_blockers || []) console.log(`  ${b.count}x ${b.blocker} (${b.pct}%)`);
console.log('\nRecommendations:');
for (const r of recommendations || []) console.log(`  [${r.priority}] L${r.layer}: ${r.action}`);
console.log('');

process.exit(report.factory_score >= 7 ? 0 : 1);
