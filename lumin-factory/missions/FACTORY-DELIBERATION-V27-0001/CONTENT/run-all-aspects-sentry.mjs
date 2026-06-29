#!/usr/bin/env node
/**
 * SYNOPSIS: SENTRY loop — every aspect built in deliberation v2.7 session.
 * SENTRY loop — every aspect built in deliberation v2.7 session.
 * FP slice → aspect BP (registry) → acceptance → per-aspect SENTRY verdict.
 *
 * Usage: npm run factory:deliberation-v27:sentry-loop
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

try {
  const dotenv = await import('dotenv');
  dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../../../../.env.local') });
  if (process.env.DELIBERATION_SENTRY_PROVEN === '1') dotenv.config();
} catch {
  /* optional */
}

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const MISSION_DIR = path.join(REPO_ROOT, 'builderos-reboot/MISSIONS/FACTORY-DELIBERATION-V27-0001');
const ASPECTS_DIR = path.join(MISSION_DIR, 'ASPECTS');
const REGISTRY = JSON.parse(fs.readFileSync(path.join(ASPECTS_DIR, 'aspects.registry.json'), 'utf8'));

function runAspectAcceptance(testsRel) {
  const useProvenEnv = process.env.DELIBERATION_SENTRY_PROVEN === '1';
  const childEnv = useProvenEnv
    ? { ...process.env }
    : {
        ...process.env,
        DATABASE_URL: '',
        PUBLIC_BASE_URL: '',
        COMMAND_CENTER_KEY: '',
        LIFEOS_KEY: '',
        API_KEY: '',
      };
  const result = spawnSync(
    process.execPath,
    [path.join(REPO_ROOT, 'builderos-reboot/scripts/run-aspect-acceptance.mjs'), testsRel],
    { cwd: REPO_ROOT, encoding: 'utf8', env: childEnv }
  );
  let summary = null;
  try {
    const lines = (result.stdout || '').trim().split('\n').filter(Boolean);
    const jsonLine = [...lines].reverse().find((l) => l.startsWith('{'));
    summary = jsonLine ? JSON.parse(jsonLine) : null;
  } catch {
    summary = null;
  }
  if (!summary) summary = { passed: 0, failed: 1, total: 1, parse_error: true };
  return { exit: result.status, summary, stdout: result.stdout };
}

function classifyMaturity(aspect, acceptancePass) {
  if (!acceptancePass) return 'FAIL';
  return 'WIRED';
}

const aspectResults = [];
let blockers = 0;

console.log('=== SENTRY Aspect Loop — deliberation v2.7 ===\n');

for (const aspect of REGISTRY.aspects) {
  const testsPath = `builderos-reboot/MISSIONS/FACTORY-DELIBERATION-V27-0001/ASPECTS/${aspect.aspect_id}/ACCEPTANCE_TESTS.json`;
  const testsFile = path.join(REPO_ROOT, testsPath);
  if (!fs.existsSync(testsFile)) {
    aspectResults.push({
      aspect_id: aspect.aspect_id,
      title: aspect.title,
      verdict: 'SENTRY_ASPECT_FAIL',
      maturity: 'FAIL',
      error: 'missing ACCEPTANCE_TESTS.json',
    });
    blockers += 1;
    console.log(`FAIL ${aspect.aspect_id} — missing acceptance tests\n`);
    continue;
  }

  console.log(`--- ${aspect.aspect_id}: ${aspect.title} ---`);
  const run = runAspectAcceptance(testsPath);
  const pass = run.exit === 0;
  const maturity = classifyMaturity(aspect, pass);
  const verdict = pass ? 'SENTRY_ASPECT_PASS' : 'SENTRY_ASPECT_FAIL';
  if (!pass) blockers += 1;

  const aspectOut = {
    aspect_id: aspect.aspect_id,
    title: aspect.title,
    blueprint_steps: aspect.blueprint_steps,
    verdict,
    maturity,
    acceptance: run.summary,
    generated_at: new Date().toISOString(),
  };

  const outDir = path.join(ASPECTS_DIR, aspect.aspect_id);
  fs.writeFileSync(path.join(outDir, 'SENTRY_CHECK_RESULT.json'), `${JSON.stringify(aspectOut, null, 2)}\n`);
  aspectResults.push(aspectOut);
  console.log(`${verdict} (${maturity}) — ${run.summary?.passed || 0}/${run.summary?.total || '?'} tests\n`);
}

// Optional Neon + API proof when operator sets DELIBERATION_SENTRY_PROVEN=1
let neonProof = null;
if (process.env.DELIBERATION_SENTRY_PROVEN === '1' && process.env.DATABASE_URL) {
  const verify = spawnSync(process.execPath, ['scripts/verify-deliberation-governance.mjs'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: process.env,
  });
  neonProof = { pass: verify.status === 0, detail: verify.stdout?.slice(-300) };
  if (neonProof.pass) {
    for (const ar of aspectResults) {
      if (['A02-db-core', 'A03-db-debrief-rep', 'A07-api-production'].includes(ar.aspect_id) && ar.verdict === 'SENTRY_ASPECT_PASS') {
        ar.maturity = 'PROVEN';
      }
    }
  }
}

const allPass = blockers === 0;
const sessionVerdict = allPass ? 'SENTRY_SESSION_PASS' : 'SENTRY_SESSION_FAIL';
const provenCount = aspectResults.filter((a) => a.maturity === 'PROVEN').length;
const wiredCount = aspectResults.filter((a) => a.maturity === 'WIRED').length;
const failCount = aspectResults.filter((a) => a.maturity === 'FAIL').length;

const report = `# SENTRY Session Loop — ${REGISTRY.session_id}

**Generated:** ${new Date().toISOString()}
**Mission:** ${REGISTRY.mission_id}
**Aspects:** ${aspectResults.length}
**Session verdict:** **${sessionVerdict}**

| Metric | Count |
|--------|-------|
| PROVEN | ${provenCount} |
| WIRED | ${wiredCount} |
| FAIL | ${failCount} |

## Per-aspect results

| Aspect | Title | Verdict | Maturity | Tests |
|--------|-------|---------|----------|-------|
${aspectResults.map((a) => `| ${a.aspect_id} | ${a.title} | ${a.verdict} | ${a.maturity} | ${a.acceptance?.passed ?? '?'}/${a.acceptance?.total ?? '?'} |`).join('\n')}

## Neon proof

${neonProof ? (neonProof.pass ? 'DELIBERATION_SENTRY_PROVEN=1 — verify script **PASS** (Neon tables).' : 'DELIBERATION_SENTRY_PROVEN=1 — verify script **FAIL**.') : 'WIRED mode — set `DELIBERATION_SENTRY_PROVEN=1` + DATABASE_URL for Neon PROVEN upgrade.'}

## Railway API proof

${process.env.DELIBERATION_SENTRY_PROVEN === '1' && process.env.PUBLIC_BASE_URL ? 'Run `npm run lifeos:deliberation:a-to-z-smoke` with keys for API PROVEN.' : 'Skipped in WIRED mode — use DELIBERATION_SENTRY_PROVEN=1 for full proof.'}

## SENTRY rules applied

1. No partial aspect certified as PROVEN without evidence
2. Each aspect has isolated acceptance tests
3. Mission pack (A14) validates parent FP/BP contract
4. Factory gate (A08) runs live seed pipeline in shell
5. Vocabulary (A01) checks v2.7 doc seal

## Blockers

${blockers ? aspectResults.filter((a) => a.verdict !== 'SENTRY_ASPECT_PASS').map((a) => `- **${a.aspect_id}**: ${a.error || 'acceptance failed'}`).join('\n') : 'None'}
`;

fs.writeFileSync(path.join(MISSION_DIR, 'SESSION_SENTRY_LOOP_REPORT.md'), report);

const sessionResult = {
  generated_at: new Date().toISOString(),
  session_id: REGISTRY.session_id,
  mission_id: REGISTRY.mission_id,
  verdict: sessionVerdict,
  aspects: aspectResults,
  neon_proof: neonProof,
  counts: { proven: provenCount, wired: wiredCount, fail: failCount, total: aspectResults.length },
};
fs.writeFileSync(path.join(MISSION_DIR, 'SESSION_SENTRY_LOOP_RESULT.json'), `${JSON.stringify(sessionResult, null, 2)}\n`);

console.log('=== Session summary ===');
console.log(JSON.stringify(sessionResult.counts, null, 2));
console.log(`Verdict: ${sessionVerdict}`);
console.log(`Report: builderos-reboot/MISSIONS/FACTORY-DELIBERATION-V27-0001/SESSION_SENTRY_LOOP_REPORT.md`);

process.exit(allPass ? 0 : 1);
