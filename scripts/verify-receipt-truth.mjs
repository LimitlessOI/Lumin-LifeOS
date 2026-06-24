#!/usr/bin/env node
/**
 * SYNOPSIS: Validate product receipts — no PASS without proof.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  validateReceiptDirectory,
  writeReceiptValidationReport,
} from '../services/receipt-truth-validator.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const report = validateReceiptDirectory(path.join(ROOT, 'products/receipts'));
const written = writeReceiptValidationReport({
  ok: report.ok,
  checked: report.checked,
  failures: report.failures,
  results: report.results?.map((r) => ({ file: r.file, ok: r.ok, violations: r.violations, claims_pass: r.claims_pass })),
});

console.log(JSON.stringify(written, null, 2));
process.exit(written.ok ? 0 : 1);
