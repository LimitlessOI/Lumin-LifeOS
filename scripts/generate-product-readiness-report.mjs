#!/usr/bin/env node
/**
 * SYNOPSIS: Generate canonical product readiness report from registry + BP priority + Point B lock.
 * Generate canonical product readiness report from registry + BP priority + Point B lock.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildProductReadinessReport } from '../services/product-readiness.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outPath = path.join(ROOT, 'builderos-reboot/PRODUCT_READINESS_REPORT.json');
const report = buildProductReadinessReport({ root: ROOT });
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  ok: true,
  output: path.relative(ROOT, outPath),
  products: report.summary.products,
  missing_product_homes: report.summary.missing_product_homes,
}, null, 2));
