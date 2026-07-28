/**
 * SYNOPSIS: Receipt truth validator — PASS claims must carry proof, not theater.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectCounselTheater } from './chair-direct-connection-truth.js';
import { evaluateSeparation, separationSolution } from '../scripts/lib/receipt-separation.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// The validator's own output lives in the directory it validates; validating it
// would make the checker grade its own report.
const SELF_REPORT_FILE = 'RECEIPT_TRUTH_VALIDATION.json';

const BASELINE_PATH = path.join(ROOT, 'config/receipt-truth-baseline.json');

/**
 * Pre-existing violations, recorded so they stay visible without red-lighting
 * builder:preflight. New violations are NOT baselined — they fail. Shrinking this
 * file is the point; it can never grow silently because only violations listed
 * here are tolerated.
 */
function loadBaseline() {
  try {
    const raw = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
    const map = new Map();
    for (const entry of raw.known_violations || []) {
      if (entry?.file) map.set(entry.file, entry);
    }
    return map;
  } catch {
    return new Map();
  }
}

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
  const passProof = validatePassProof(receipt, fileName);
  const asserts = claimsPass(receipt);
  const separation = evaluateSeparation(receipt, asserts);
  const violations = [...passProof, ...separation.violations];
  return {
    ok: violations.length === 0,
    file: fileName,
    violations,
    advisories: separation.advisories,
    claims_pass: asserts,
    actors: separation.actors,
    separation_grandfathered: separation.grandfathered,
    proposed_solutions: violations.map((v) => ({ violation: v, proposed_solution: solutionForViolation(v) })),
  };
}

function solutionForViolation(code) {
  if (String(code).startsWith('PASS_') || String(code).startsWith('SEPARATION_')) {
    return separationSolution(code);
  }
  if (code === 'ACCEPTANCE_PASS_WITHOUT_SHA_OR_BASE') {
    return 'Add commit_sha (or git_sha) and production_base to this receipt so the PASS claim points at a '
      + 'specific commit and a reachable environment. If neither can be produced, the verdict is not PASS — '
      + 'change it to UNSOLVED.';
  }
  if (code === 'PARITY_OK_WITH_FAILED_TESTS') {
    return 'ok:true contradicts a non-empty failed[]. Set ok:false, or move the resolved entries out of failed[].';
  }
  if (code === 'PASS_WITH_NO_COMMAND_RAN') {
    return 'A PASS with command_truth NO_COMMAND_RAN has no evidence. Run the command and record its output, '
      + 'or downgrade the verdict.';
  }
  if (String(code).startsWith('THEATER_IN_RECEIPT')) {
    return 'Remove narrative claims of success from the receipt body and replace them with the observed '
      + 'command output or probe result that supports the verdict.';
  }
  return 'Record the missing evidence, or downgrade the verdict to UNSOLVED.';
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

  // Every receipt is judged. Scope used to be chosen by filename, which let a
  // producer opt its own claim out of review by naming the file something the
  // hint list did not match — 96 of 128 receipts were never checked, 14 of them
  // asserting PASS. The thing being audited must not pick the audit's scope.
  const baseline = loadBaseline();
  const knownDebt = [];
  const advisories = [];
  const matchedBaseline = new Set();

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json') && f !== SELF_REPORT_FILE);
  for (const file of files) {
    if (filter && !filter(file)) continue;

    const r = validateReceiptFile(path.join(dir, file));
    results.push(r);
    if (Array.isArray(r.advisories) && r.advisories.length) {
      advisories.push(`${file}:${r.advisories.join('|')}`);
    }
    if (r.ok) continue;

    const baselined = baseline.get(file);
    if (baselined) {
      matchedBaseline.add(file);
      knownDebt.push(`${file}:${r.violations.join('|')}`);
      continue;
    }
    failures.push(`${file}:${r.violations.join('|')}`);
  }

  // A baseline entry whose violation is gone must be deleted, or the ratchet
  // stops ratcheting (North Star 2.0G self-pruning). Surfaced, not fatal.
  const staleBaseline = [...baseline.keys()].filter((f) => !matchedBaseline.has(f));

  return {
    ok: failures.length === 0,
    results,
    failures,
    known_debt: knownDebt,
    stale_baseline: staleBaseline,
    advisories,
    checked: results.length,
  };
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
