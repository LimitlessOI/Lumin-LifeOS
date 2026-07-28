#!/usr/bin/env node
/**
 * SYNOPSIS: Validate product receipts — no PASS without proof.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
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
  known_debt: report.known_debt,
  stale_baseline: report.stale_baseline,
  advisories: report.advisories,
  results: report.results?.map((r) => ({
    file: r.file,
    ok: r.ok,
    violations: r.violations,
    claims_pass: r.claims_pass,
    proposed_solutions: r.proposed_solutions,
  })),
});

console.log(`receipts checked: ${written.checked}`);
if (written.failures?.length) {
  console.log(`\n❌ ${written.failures.length} NEW violation(s):`);
  for (const f of written.failures) console.log(`   ${f}`);
  for (const r of report.results.filter((x) => !x.ok && !report.known_debt.some((d) => d.startsWith(`${x.file}:`)))) {
    for (const s of r.proposed_solutions || []) console.log(`     → ${s.violation}: ${s.proposed_solution}`);
  }
}
if (written.known_debt?.length) {
  console.log(`\n⚠️  ${written.known_debt.length} baselined violation(s) (known debt, see config/receipt-truth-baseline.json):`);
  for (const d of written.known_debt) console.log(`   ${d}`);
}
if (written.stale_baseline?.length) {
  console.log(`\n🧹 ${written.stale_baseline.length} stale baseline entr(ies) — violation is gone, delete the entry:`);
  for (const s of written.stale_baseline) console.log(`   ${s}`);
}
if (written.advisories?.length) {
  console.log(`\nℹ️  ${written.advisories.length} grandfathered separation advisory(ies) — legacy receipts predating the verifier-identity rule.`);
}
console.log(written.ok ? '\n✅ No new receipt-truth violations.' : '');
process.exit(written.ok ? 0 : 1);
