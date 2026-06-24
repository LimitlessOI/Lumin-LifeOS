/**
 * SYNOPSIS: Receipt truth validator — PASS claims must carry proof, not theater.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectCounselTheater } from './chair-direct-connection-truth.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const ACCEPTANCE_GLOB_HINTS = [
  'ACCEPTANCE.json',
  'PARITY.json',
  'VERIFY.json',
  'AUDIT.json',
  'READINESS.json',
];

function claimsPass(receipt = {}) {
  const v = String(receipt.verdict || receipt.pass_fail || '').toUpperCase();
  if (v === 'PASS') return true;
  const schema = String(receipt.schema || '');
  if (receipt.ok === true && schema.includes('parity') && Array.isArray(receipt.passed)) return true;
  if (receipt.ok === true && schema.includes('verify')) return true;
  if (receipt.ok === true && /acceptance/i.test(schema) && Array.isArray(receipt.tests_passed)) return true;
  return false;
}

function validatePassProof(receipt = {}, fileName = '') {
  const violations = [];
  if (!claimsPass(receipt)) return violations;

  const isAcceptance = /ACCEPTANCE|ALPHA|E2E/i.test(fileName);
  const isParity = /PARITY|VERIFY/i.test(fileName);

  if (isAcceptance) {
    if (!receipt.git_sha && !receipt.commit_sha && !receipt.production_base) {
      violations.push('ACCEPTANCE_PASS_WITHOUT_SHA_OR_BASE');
    }
    if (receipt.founder_usability_pass === false && /alpha|point.?b|usability/i.test(JSON.stringify(receipt))) {
      if (/alpha.?reached|point.?b.?reached|founder success test satisfied/i.test(JSON.stringify(receipt))) {
        violations.push('FOUNDER_ALPHA_CLAIM_WITHOUT_USABILITY');
      }
    }
  }

  if (isParity && receipt.ok === true) {
    if (Array.isArray(receipt.failed) && receipt.failed.length > 0) {
      violations.push('PARITY_OK_WITH_FAILED_TESTS');
    }
  }

  const proseBlob = JSON.stringify(receipt.results || receipt.human_summary || '');
  const theater = detectCounselTheater(proseBlob, 'NO_COMMAND_RAN');
  if (theater.violation) {
    violations.push(`THEATER_IN_RECEIPT:${theater.hits[0]?.slice(0, 40)}`);
  }

  if (receipt.pass_fail === 'PASS' && receipt.command_truth === 'NO_COMMAND_RAN') {
    violations.push('PASS_WITH_NO_COMMAND_RAN');
  }

  return violations;
}

export function validateReceiptObject(receipt, fileName = 'inline') {
  const violations = validatePassProof(receipt, fileName);
  return {
    ok: violations.length === 0,
    file: fileName,
    violations,
    claims_pass: claimsPass(receipt),
  };
}

export function validateReceiptFile(absPath) {
  const fileName = path.basename(absPath);
  let receipt;
  try {
    receipt = JSON.parse(fs.readFileSync(absPath, 'utf8'));
  } catch (err) {
    return { ok: false, file: fileName, violations: [`INVALID_JSON:${err.message}`], claims_pass: false };
  }
  return validateReceiptObject(receipt, fileName);
}

export function validateReceiptDirectory(dir = path.join(ROOT, 'products/receipts'), { filter } = {}) {
  const results = [];
  const failures = [];
  if (!fs.existsSync(dir)) {
    return { ok: false, results: [], failures: ['receipts_dir_missing'] };
  }

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  for (const file of files) {
    if (filter && !filter(file)) continue;
    const shouldCheck = ACCEPTANCE_GLOB_HINTS.some((h) => file.includes(h.replace('.json', '')))
      || file.startsWith('LUMIN_')
      || file.startsWith('TRUTH_')
      || file.startsWith('RECEIPT_');
    if (!shouldCheck) continue;

    const r = validateReceiptFile(path.join(dir, file));
    results.push(r);
    if (!r.ok) failures.push(`${file}:${r.violations.join('|')}`);
  }

  return { ok: failures.length === 0, results, failures, checked: results.length };
}

export async function validateReceiptWithLiveProbe(receipt, fileName, { fetchFn = fetch, timeoutMs = 8000 } = {}) {
  const base = validateReceiptObject(receipt, fileName);
  if (!base.ok || !receipt.production_base) return base;

  const url = `${String(receipt.production_base).replace(/\/$/, '')}/ready`;
  try {
    const res = await fetchFn(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) {
      return {
        ...base,
        ok: false,
        violations: [...base.violations, `LIVE_PROBE_FAIL:${res.status}`],
      };
    }
    return { ...base, live_probe: { url, status: res.status } };
  } catch (err) {
    return {
      ...base,
      ok: false,
      violations: [...base.violations, `LIVE_PROBE_ERROR:${err.message}`],
    };
  }
}

export function writeReceiptValidationReport(report, outPath = path.join(ROOT, 'products/receipts/RECEIPT_TRUTH_VALIDATION.json')) {
  const payload = {
    schema: 'receipt_truth_validation_v1',
    at: new Date().toISOString(),
    ...report,
  };
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);
  return payload;
}
