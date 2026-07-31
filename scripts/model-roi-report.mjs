/**
 * SYNOPSIS: CLI report generator for the model-cost ROI ledger.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

import { readLedger, computeRoiReport, formatRoiReport, DEFAULT_LEDGER_PATH } from '../services/model-roi-ledger.mjs';
import fs from 'node:fs';
import path from 'node:path';

const ledgerPath = process.argv.includes('--ledger')
  ? process.argv[process.argv.indexOf('--ledger') + 1]
  : DEFAULT_LEDGER_PATH;

const entries = readLedger(ledgerPath);
const report = computeRoiReport(entries);
console.log(formatRoiReport(report));

const outDir = path.dirname(ledgerPath);
fs.mkdirSync(outDir, { recursive: true });
const reportPath = path.join(outDir, `model-roi-report-${Date.now()}.json`);
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`\nWrote JSON report to ${reportPath}`);
