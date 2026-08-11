/**
 * SYNOPSIS: M0 enforcement-truth sweep — finds mechanisms that CLAIM operational
 * enforcement but have no caller, no reader, no writer, or certify themselves.
 * Built after `runChairConsensusGate` was found with zero callers while §2.0K
 * declared the Chair/Conductor seal mandatory and a constitutional mapping doc
 * listed it as `enforced`. Deterministic: no model judgment anywhere in the
 * verdict path.
 *
 * Ratchet discipline (same as audit-false-done-steps): a baseline pins the known
 * debt; new dormant enforcement fails the gate, and the baseline may only shrink.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  ROOT,
  buildCodeIndex,
  buildClaimIndex,
  extractExports,
  symbolReachability,
  findFileReaders,
  findReferences,
  reachableModules,
  entrypointRoots,
} from './lib/reference-index.mjs';

const BASELINE_REL = 'data/enforcement-truth-baseline.json';
const RECEIPT_REL = 'products/receipts/GOVERNANCE_ENFORCEMENT_TRUTH_RECEIPT.json';

/** A symbol/file is "enforcement-semantic" if its name asserts governance power. */
const ENFORCEMENT_NAME_RE = /(gate|seal|enforc|authoriz|guard|quarantin|reputation|consensus|verify|validate|blocker|invalidat|freshness|sentry|receipt|trust)/i;

/** Directories whose exports are load-bearing runtime, not tooling. */
const RUNTIME_DIRS = ['services/', 'routes/', 'middleware/', 'startup/', 'factory-staging/factory-core/'];

function readJson(rel, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(rel, data) {
  const abs = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `${JSON.stringify(data, null, 2)}\n`);
}

/* ------------------------------------------------------------------ *
 * CHECK 1 — enforcement modules not reachable from any real entrypoint,
 * and dead enforcement exports inside modules that ARE reachable.
 *
 * Reachability is computed from a transitive import graph rooted at real
 * entrypoints (server.js, startup/, routes/, middleware/, and every file
 * named by a package.json script). Name heuristics cannot prove a module
 * runs; an import graph can.
 * ------------------------------------------------------------------ */
function checkDormantEnforcementSymbols(index, reachable) {
  const findings = [];
  for (const f of index) {
    if (!RUNTIME_DIRS.some((d) => f.rel.startsWith(d))) continue;
    if (!f.rel.endsWith('.js') && !f.rel.endsWith('.mjs')) continue;
    const fileIsEnforcement = ENFORCEMENT_NAME_RE.test(path.basename(f.rel));
    const exports = extractExports(f.content);
    const enforcementExports = exports.filter((s) => ENFORCEMENT_NAME_RE.test(s));
    if (!fileIsEnforcement && enforcementExports.length === 0) continue;

    // Module-level: the whole file is never loaded by anything the system runs.
    if (!reachable.has(f.rel)) {
      findings.push({
        id: `unreachable_module:${f.rel}`,
        class: 'module_not_reachable',
        file: f.rel,
        exports: exports.slice(0, 12),
        detail: 'enforcement module is not transitively imported from any entrypoint — it cannot enforce anything at runtime',
      });
      continue;
    }

    // Symbol-level: module runs, but this exported gate/check is never called.
    for (const sym of enforcementExports) {
      const reach = symbolReachability(sym, f.rel, { index });
      if (reach.total_refs > 0 && !reach.test_only) continue;
      findings.push({
        id: `dead_export:${f.rel}:${sym}`,
        class: reach.test_only ? 'test_only_export' : 'dead_export',
        file: f.rel,
        symbol: sym,
        detail: reach.test_only
          ? 'exported enforcement symbol referenced only by tests — unit-green is not reachability'
          : 'exported enforcement symbol has no reference outside its own file',
      });
    }
  }
  return findings;
}

/* ------------------------------------------------------------------ *
 * CHECK 2 — governance config with no code reader
 * ------------------------------------------------------------------ */
function checkUnreadGovernanceConfig(index) {
  const findings = [];
  const dir = 'builderos-reboot/governance';
  let entries = [];
  try {
    entries = fs.readdirSync(path.join(ROOT, dir)).filter((n) => n.endsWith('.json'));
  } catch {
    return findings;
  }
  for (const name of entries) {
    const rel = `${dir}/${name}`;
    const readers = findFileReaders(rel, { index });
    if (readers.length === 0) {
      findings.push({
        id: `unread_config:${rel}`,
        class: 'no_reader',
        file: rel,
        detail: 'governance config referenced by no code file — it enforces nothing at runtime',
      });
    }
  }
  return findings;
}

/* ------------------------------------------------------------------ *
 * CHECK 3 — contract-named fields/artifacts with no writer
 * ------------------------------------------------------------------ */
function collectStringLeaves(node, out = []) {
  if (typeof node === 'string') out.push(node);
  else if (Array.isArray(node)) node.forEach((n) => collectStringLeaves(n, out));
  else if (node && typeof node === 'object') Object.values(node).forEach((n) => collectStringLeaves(n, out));
  return out;
}

function checkArtifactsWithoutWriters(index) {
  const findings = [];
  const sources = [
    'builderos-reboot/governance/DEPARTMENT_ROLE_CONTRACT.json',
    'builderos-reboot/governance/MISSION_PHASE_ARTIFACTS.json',
  ];
  const seen = new Set();
  for (const src of sources) {
    const data = readJson(src);
    if (!data) continue;
    for (const leaf of collectStringLeaves(data)) {
      // Receipt/report artifact names, e.g. REALITY_CHECK_RECEIPT or FOO_REPORT.json
      const m = leaf.match(/\b([A-Z][A-Z0-9_]{5,})(?:\.json)?\b/);
      if (!m) continue;
      const artifact = m[1];
      if (!/(RECEIPT|REPORT|PACKET|SCOREBOARD|LEDGER|MAP|BASELINE)$/.test(artifact)) continue;
      if (seen.has(artifact)) continue;
      seen.add(artifact);
      const refs = findReferences(artifact, { index });
      if (refs.length === 0) {
        findings.push({
          id: `artifact_no_writer:${artifact}`,
          class: 'no_writer',
          artifact,
          declared_in: src,
          detail: 'artifact named in a role/phase contract but no code writes or reads it',
        });
      }
    }
  }
  return findings;
}

/* ------------------------------------------------------------------ *
 * CHECK 4 — docs claiming `enforced` by a file that has no caller
 * ------------------------------------------------------------------ */
function checkClaimedEnforcedWithoutCaller(index, entrypoints) {
  const findings = [];
  const seenIds = new Set();
  const claims = buildClaimIndex();
  // Lookahead matters: without it, `FOO_RECEIPT.json` matched as `FOO_RECEIPT.js`
  // and the sweep reported a missing implementation for a file that never existed.
  const fileRe = /([a-z0-9][\w.-]*\.(?:mjs|js))(?![\w])/gi;
  for (const c of claims) {
    if (!c.rel.endsWith('.md')) continue;
    for (const rawLine of c.content.split('\n')) {
      if (!/\benforced\b/i.test(rawLine)) continue;
      const names = [...rawLine.matchAll(fileRe)].map((m) => m[1]);
      for (const name of new Set(names)) {
        const defFile = index.find((f) => path.basename(f.rel) === name);
        if (!defFile) {
          findings.push({
            id: `claim_missing_file:${c.rel}:${name}`,
            class: 'claim_without_implementation',
            claim_source: c.rel,
            named_file: name,
            detail: 'doc claims enforcement by a file that does not exist in the code index',
          });
          continue;
        }
        // Being invoked by a package.json script IS a real execution path for a
        // verifier (that is how builder:preflight enforces things), so an
        // entrypoint file needs no importer to count as wired.
        if (entrypoints.has(defFile.rel)) continue;
        const readers = findFileReaders(defFile.rel, { index }).filter((r) => !r.startsWith('tests/'));
        if (readers.length === 0) {
          const id = `claim_without_caller:${defFile.rel}`;
          if (seenIds.has(id)) continue;
          seenIds.add(id);
          findings.push({
            id,
            class: 'claim_without_caller',
            claim_source: c.rel,
            file: defFile.rel,
            detail: 'doc claims this file enforces a law, but nothing imports it and no npm script runs it',
          });
        }
      }
    }
  }
  return findings;
}

/* ------------------------------------------------------------------ *
 * CHECK 5 — self-certifying gates and caller-controlled bypasses
 * ------------------------------------------------------------------ */
function checkSelfCertificationAndBypass(index) {
  const findings = [];
  for (const f of index) {
    if (!RUNTIME_DIRS.some((d) => f.rel.startsWith(d))) continue;
    const lines = f.content.split('\n');

    // Caller-controlled gate skips: `body?.skip_x_gate === true`, `options.skipGate`.
    // A skip that additionally requires environment/authority authorization is NOT
    // caller-controlled — the caller may request it, only the environment grants it.
    lines.forEach((line, i) => {
      const isSkipSite = /\b(?:body|req\.body|opts|options|input|params)\s*(?:\?\.)?\.?\s*\[?['"]?skip[_A-Za-z]*(?:gate|check|verify|auth)/i.test(line)
        || /\bskip[_A-Za-z]*(?:Gate|Check|Verify|Auth)\b\s*(?:=|:)/.test(line);
      if (!isSkipSite) return;
      const window = lines.slice(Math.max(0, i - 6), i + 7).join('\n');
      const envGated = /process\.env\.[A-Z0-9_]*(?:ALLOW|PERMIT|STRICT|ENABLE)[A-Z0-9_]*/.test(window);
      if (envGated) return;
      findings.push({
        id: `caller_bypass:${f.rel}:${i + 1}`,
        class: 'caller_controlled_bypass',
        file: f.rel,
        line: i + 1,
        detail: `gate can be skipped by the caller with no environment/authority check: ${line.trim().slice(0, 160)}`,
      });
    });

    // Self-certification: a function that writes the field it then validates.
    const isGateFile = /(gate|seal|enforc|authoriz)/i.test(path.basename(f.rel));
    if (isGateFile) {
      const mintsOwnSeal = /(\w*seal\w*)\s*=\s*(create|make|generate|derive)\w*Seal\s*\(/i.test(f.content);
      const validatesOwnSeal = /\b\w*seal\w*\s*(?:&&\s*)?(?:\.startsWith\(|===|typeof)/i.test(f.content);
      if (mintsOwnSeal && validatesOwnSeal) {
        findings.push({
          id: `self_seal:${f.rel}`,
          class: 'self_certification',
          file: f.rel,
          detail: 'file mints a seal/approval and then validates that same value — it manufactures the evidence of its own compliance',
        });
      }
      const fabricatesThenChecks = /\?\?=\s*(\[\]|\{\}|0(?:\.\d+)?|true)/.test(f.content)
        && /(Array\.isArray|>=\s*0?\.\d|typeof)/.test(f.content);
      if (fabricatesThenChecks) {
        findings.push({
          id: `fabricated_field:${f.rel}`,
          class: 'self_certification',
          file: f.rel,
          detail: 'file defaults required governance fields (??=) and then validates the defaults it just wrote',
        });
      }
    }
  }
  return findings;
}

/* ------------------------------------------------------------------ *
 * CHECK 6 — declared-required regression fixtures that nothing runs
 * ------------------------------------------------------------------ */
function checkFixtureHarnessWiring(index) {
  const findings = [];
  const harness = readJson('builderos-reboot/governance/BUILDEROS_INTAKE_REGRESSION_HARNESS.json');
  if (!harness) return findings;
  const fixtureDirs = fs.existsSync(path.join(ROOT, 'docs/products/builderos/fixtures'))
    ? fs.readdirSync(path.join(ROOT, 'docs/products/builderos/fixtures'))
    : [];
  const harnessText = JSON.stringify(harness);
  for (const dir of fixtureDirs) {
    if (!harnessText.includes(dir)) {
      findings.push({
        id: `fixture_unregistered:${dir}`,
        class: 'declared_exam_not_run',
        fixture: `docs/products/builderos/fixtures/${dir}`,
        detail: 'frozen regression fixture is not registered in the intake regression harness — nothing runs the exam',
      });
    }
  }
  return findings;
}

/* ------------------------------------------------------------------ */

export function runEnforcementTruthSweep() {
  const index = buildCodeIndex();
  const entrypoints = new Set(entrypointRoots({ index }));
  const reachable = reachableModules({ index, roots: [...entrypoints] });
  const raw = [
    ...checkDormantEnforcementSymbols(index, reachable),
    ...checkUnreadGovernanceConfig(index),
    ...checkArtifactsWithoutWriters(index),
    ...checkClaimedEnforcedWithoutCaller(index, entrypoints),
    ...checkSelfCertificationAndBypass(index),
    ...checkFixtureHarnessWiring(index),
  ];
  const byId = new Map();
  for (const f of raw) if (!byId.has(f.id)) byId.set(f.id, f);
  const findings = [...byId.values()];
  const byClass = {};
  for (const f of findings) byClass[f.class] = (byClass[f.class] || 0) + 1;
  return { findings, by_class: byClass, files_indexed: index.length, modules_reachable: reachable.size };
}

function main() {
  const args = process.argv.slice(2);
  const writeBaseline = args.includes('--baseline-write');
  const ci = args.includes('--ci');

  const sweep = runEnforcementTruthSweep();
  const ids = sweep.findings.map((f) => f.id).sort();

  if (writeBaseline) {
    writeJson(BASELINE_REL, {
      schema: 'enforcement_truth_baseline_v1',
      written_at: new Date().toISOString(),
      note: 'Known dormant-enforcement debt. This list may only shrink. New ids fail the gate.',
      count: ids.length,
      by_class: sweep.by_class,
      allowed_ids: ids,
    });
    console.log(`ENFORCEMENT_TRUTH: baseline written with ${ids.length} known finding(s)`);
  }

  const baseline = readJson(BASELINE_REL, { allowed_ids: [] });
  const allowed = new Set(baseline.allowed_ids || []);
  const regressions = ids.filter((id) => !allowed.has(id));
  const fixed = (baseline.allowed_ids || []).filter((id) => !ids.includes(id));

  const receipt = {
    schema: 'governance_enforcement_truth_receipt_v1',
    generated_at: new Date().toISOString(),
    // The receipt-truth validator caught the first version of this receipt
    // claiming PASS with no independent verifier — the exact defect class this
    // sweep exists to find. Declared honestly rather than baselined away.
    produced_by: 'scripts/verify-enforcement-truth.mjs',
    separation_collapsed: true,
    separation_note:
      'No independent actor verified this run: the same script computes the findings and the verdict. Mitigation, not equivalence — the verdict is a pure function of repository bytes the script never writes, plus a ratchet baseline authored in an earlier commit, so any third party re-derives it byte-identically with `npm run builderos:enforcement:truth`. No model judgment is in the verdict path. The specific repairs this sweep reports are additionally proven by an independent executable mechanism (`node --test tests/chair-consensus-gate-sealing.test.js`).',
    independent_reproduction_command: 'npm run builderos:enforcement:truth',
    independent_proof_of_repairs: 'node --test tests/chair-consensus-gate-sealing.test.js',
    files_indexed: sweep.files_indexed,
    total_findings: ids.length,
    by_class: sweep.by_class,
    baseline_count: allowed.size,
    new_regressions: regressions,
    fixed_since_baseline: fixed,
    ok: regressions.length === 0,
    // Deliberately NOT 'PASS': in this repo verdict:'PASS' means mission acceptance
    // registered in BP_PRIORITY (§2.18). This is a verifier result, not a mission.
    verdict: regressions.length === 0 ? 'CLEAN' : 'REGRESSIONS_PRESENT',
    findings: sweep.findings,
  };
  writeJson(RECEIPT_REL, receipt);

  console.log(JSON.stringify({
    verdict: receipt.verdict,
    files_indexed: receipt.files_indexed,
    total_findings: receipt.total_findings,
    by_class: receipt.by_class,
    new_regressions: regressions.slice(0, 20),
    fixed_since_baseline: fixed.slice(0, 20),
    receipt: RECEIPT_REL,
  }, null, 2));

  if (ci && regressions.length > 0) {
    console.error(`ENFORCEMENT_TRUTH: FAIL — ${regressions.length} new dormant-enforcement finding(s)`);
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith('verify-enforcement-truth.mjs')) {
  main();
}
