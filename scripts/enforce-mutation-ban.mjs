/**
 * SYNOPSIS: scripts/enforce-mutation-ban.mjs
 * scripts/enforce-mutation-ban.mjs
 * Enforce Zone 3/4 large-file mutation ban before builder attempts.
 *
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 *
 * Zone 3 (large existing JS, >150 lines): allowed only with GAP-FILL: or [system-build] in commit message.
 * Zone 4 (runtime/infra): always blocked.
 * Zone 1 (new file): always allowed.
 * Zone 2 (small existing): allowed with warning.
 *
 * Usage:
 *   node scripts/enforce-mutation-ban.mjs <filepath> [commit-message]
 *   node scripts/enforce-mutation-ban.mjs --self-test
 */
import { existsSync, writeFileSync, unlinkSync } from 'fs';
import { classifyMutationZone, getZonePolicy } from './classify-mutation-zone.mjs';

/**
 * Check whether a mutation is allowed.
 * @param {string} filePath
 * @param {string} [commitMessage]
 * @returns {{ allowed: boolean, zone: number, label: string, reason: string, remedy: string|null }}
 */
export function checkMutationAllowed(filePath, commitMessage = '') {
  const classification = classifyMutationZone(filePath);
  const { zone, label, lineCount } = classification;

  if (zone === 4) {
    return {
      allowed: false,
      zone,
      label,
      reason: `Zone 4 — runtime/infra path is always blocked from direct builder mutation`,
      remedy: 'Route change through composition wiring (startup/, middleware/ conventions) or open a gate-change.',
    };
  }

  if (zone === 1) {
    return {
      allowed: true,
      zone,
      label,
      reason: 'Zone 1 — new file, builder safe',
      remedy: null,
    };
  }

  if (zone === 2) {
    return {
      allowed: true,
      zone,
      label,
      reason: `Zone 2 — small existing file (${lineCount} lines), builder may be safe`,
      remedy: 'Verify builder output before accepting — small files can still be stubbed.',
    };
  }

  // Zone 3: requires GAP-FILL annotation or [system-build] tag
  const hasGapFill = commitMessage.includes('GAP-FILL:');
  const hasSystemBuild = commitMessage.includes('[system-build]');
  if (hasGapFill || hasSystemBuild) {
    return {
      allowed: true,
      zone,
      label,
      reason: `Zone 3 — large file (${lineCount} lines) allowed via ${hasGapFill ? 'GAP-FILL' : '[system-build]'} annotation`,
      remedy: null,
    };
  }

  return {
    allowed: false,
    zone,
    label,
    reason: `Zone 3 — large file (${lineCount} lines) blocked: commit message missing GAP-FILL: or [system-build]`,
    remedy: 'Add "GAP-FILL: <what builder was asked, exact error, why no other path>" to commit message, OR use [system-build] tag for builder-committed files.',
  };
}

/**
 * Check multiple files against the same commit message.
 * @param {string[]} filePaths
 * @param {string} [commitMessage]
 * @returns {{ results: object[], total: number, allowed: number, blocked: number }}
 */
export function batchCheckFiles(filePaths, commitMessage = '') {
  const results = filePaths.map(fp => ({ filePath: fp, ...checkMutationAllowed(fp, commitMessage) }));
  const allowed = results.filter(r => r.allowed).length;
  return { results, total: results.length, allowed, blocked: results.length - allowed };
}

// ── Self-test ────────────────────────────────────────────────────────────────

function runSelfTest() {
  const tmp = (name, lines) => {
    const p = `/tmp/ban-test-${name}.mjs`;
    writeFileSync(p, Array.from({ length: lines }, (_, i) => `const v${i} = ${i};`).join('\n') + '\n');
    return p;
  };

  const smallFile  = tmp('small', 50);   // Zone 2
  const largeFile  = tmp('large', 200);  // Zone 3

  const cases = [
    { label: 'Zone 1: new file, no message', path: '/tmp/ban-test-nonexistent.mjs', msg: '', expectAllowed: true },
    { label: 'Zone 2: small file, no message', path: smallFile, msg: '', expectAllowed: true },
    { label: 'Zone 3: large file, no annotation → BLOCKED', path: largeFile, msg: 'fix some thing', expectAllowed: false },
    { label: 'Zone 3: large file + GAP-FILL → ALLOWED', path: largeFile, msg: 'GAP-FILL: builder failed with 5xx', expectAllowed: true },
    { label: 'Zone 3: large file + [system-build] → ALLOWED', path: largeFile, msg: '[system-build] council emitted file', expectAllowed: true },
    { label: 'Zone 4: startup/boot.js → BLOCKED always', path: 'startup/boot.js', msg: 'GAP-FILL: anything', expectAllowed: false },
  ];

  let passed = 0; let failed = 0;
  for (const tc of cases) {
    const result = checkMutationAllowed(tc.path, tc.msg);
    const ok = result.allowed === tc.expectAllowed;
    console.log(`  ${ok ? 'PASS' : 'FAIL'} — ${tc.label}${ok ? '' : ` (got allowed=${result.allowed}, expected ${tc.expectAllowed})`}`);
    ok ? passed++ : failed++;
  }

  for (const p of [smallFile, largeFile]) { try { unlinkSync(p); } catch { /* ignore */ } }
  console.log(`\n${passed}/${cases.length} tests passed`);
  process.exit(failed > 0 ? 1 : 0);
}

// ── CLI entry ────────────────────────────────────────────────────────────────

const isMain = process.argv[1] && process.argv[1].endsWith('enforce-mutation-ban.mjs');
if (isMain) {
  if (process.argv[2] === '--self-test') {
    runSelfTest();
  } else if (process.argv[2] === '--batch') {
    const dashIdx = process.argv.indexOf('--');
    const filePaths = dashIdx === -1 ? process.argv.slice(3) : process.argv.slice(3, dashIdx);
    const commitMessage = dashIdx === -1 ? '' : process.argv.slice(dashIdx + 1).join(' ');
    const batch = batchCheckFiles(filePaths, commitMessage);
    console.log(`Checked ${batch.total} files — ${batch.allowed} allowed, ${batch.blocked} blocked`);
    for (const r of batch.results) {
      const icon = r.allowed ? '✅' : '❌';
      console.log(`  ${icon} ${r.filePath} (Zone ${r.zone} ${r.label}): ${r.reason}`);
      if (r.remedy && !r.allowed) console.log(`     Remedy: ${r.remedy}`);
    }
    process.exit(batch.blocked > 0 ? 1 : 0);
  } else {
    const filePath = process.argv[2];
    if (!filePath) {
      console.error('Usage: node scripts/enforce-mutation-ban.mjs <filepath> [commit-message]');
      process.exit(1);
    }
    const commitMessage = process.argv.slice(3).join(' ');
    const result = checkMutationAllowed(filePath, commitMessage);
    const icon = result.allowed ? '✅' : '❌';
    console.log(`${icon} Zone ${result.zone} (${result.label}): ${result.reason}`);
    if (result.remedy) console.log(`   Remedy: ${result.remedy}`);
    process.exit(result.allowed ? 0 : 1);
  }
}
