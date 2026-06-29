/**
 * SYNOPSIS: scripts/classify-mutation-zone.mjs
 * scripts/classify-mutation-zone.mjs
 * Classify a file path into Zone 1-4 before any builder mutation.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 *
 * Zones:
 *   Zone 1 = new file (does not exist)      — SAFE    — builder OK
 *   Zone 2 = existing, 1-150 lines          — CAUTION — builder maybe safe
 *   Zone 3 = existing, >150 lines           — DANGER  — builder stubs, GAP-FILL required
 *   Zone 4 = runtime/infra paths            — BLOCKED — never builder-authored
 *
 * Usage:
 *   node scripts/classify-mutation-zone.mjs <filepath>
 *   node scripts/classify-mutation-zone.mjs --self-test
 */
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { resolve, dirname, basename } from 'path';

// Zone 4: prefixes relative to repo root (checked as path prefix, no trailing slash required)
const ZONE4_PREFIXES = [
  'startup/',
  'middleware/',
  'core/',
  'config/',
];
const ZONE4_EXACT = ['server.js'];

function isZone4(filePath) {
  const normalized = filePath.replace(/\\/g, '/').replace(/^\.\//, '');
  for (const prefix of ZONE4_PREFIXES) {
    if (normalized === prefix.replace(/\/$/, '') || normalized.startsWith(prefix)) return true;
  }
  return ZONE4_EXACT.includes(basename(normalized));
}

function countLines(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    return content.split('\n').length;
  } catch {
    return null;
  }
}

/**
 * Classify a file path into Zone 1-4.
 * @param {string} filePath - repo-relative or absolute path
 * @returns {{ zone: 1|2|3|4, label: string, lineCount: number|null, reason: string, blockerPaths: string[]|null }}
 */
export function classifyMutationZone(filePath) {
  // Zone 4 check first (highest priority)
  if (isZone4(filePath)) {
    return {
      zone: 4,
      label: 'BLOCKED',
      lineCount: existsSync(filePath) ? countLines(filePath) : null,
      reason: `Runtime/infra path — never builder-authored`,
      blockerPaths: ZONE4_PREFIXES.concat(ZONE4_EXACT),
    };
  }

  // Zone 1: file does not exist yet
  if (!existsSync(filePath)) {
    return {
      zone: 1,
      label: 'SAFE',
      lineCount: null,
      reason: 'New file — safe for builder to create',
      blockerPaths: null,
    };
  }

  const lineCount = countLines(filePath);

  // Zone 2: exists and ≤150 lines
  if (lineCount !== null && lineCount <= 150) {
    return {
      zone: 2,
      label: 'CAUTION',
      lineCount,
      reason: `Existing file (${lineCount} lines ≤ 150) — builder may be safe, verify output`,
      blockerPaths: null,
    };
  }

  // Zone 3: exists and >150 lines
  return {
    zone: 3,
    label: 'DANGER',
    lineCount,
    reason: `Existing file (${lineCount} lines > 150) — builder will stub, GAP-FILL required`,
    blockerPaths: null,
  };
}

/**
 * Return policy for a zone.
 * @param {1|2|3|4} zone
 * @returns {{ allowBuilder: boolean, requiresGapFill: boolean, description: string }}
 */
export function getZonePolicy(zone) {
  switch (zone) {
    case 1: return { allowBuilder: true,  requiresGapFill: false, description: 'New file — builder safe' };
    case 2: return { allowBuilder: true,  requiresGapFill: false, description: 'Small existing file — builder caution, verify' };
    case 3: return { allowBuilder: false, requiresGapFill: true,  description: 'Large existing file — builder stubs, GAP-FILL required' };
    case 4: return { allowBuilder: false, requiresGapFill: false, description: 'Runtime/infra — always blocked from builder' };
    default: throw new Error(`Unknown zone: ${zone}`);
  }
}

// ── Self-test ────────────────────────────────────────────────────────────────

function runSelfTest() {
  const tmp = (name, content) => {
    const p = `/tmp/zone-test-${name}.mjs`;
    writeFileSync(p, content, 'utf8');
    return p;
  };
  const short = tmp('short', Array.from({length: 10}, (_, i) => `const s${i} = ${i};`).join('\n') + '\n');  // 10 lines
  const med   = tmp('med',   Array.from({length: 50}, (_, i) => `const m${i} = ${i};`).join('\n') + '\n');  // 50 lines ≤ 150
  const large = tmp('large', Array.from({length: 160}, (_, i) => `const l${i} = ${i};`).join('\n') + '\n'); // 160 lines > 150

  const cases = [
    { label: 'Zone 1: nonexistent file',        path: '/tmp/zone-test-does-not-exist.mjs', expectZone: 1, expectLabel: 'SAFE'    },
    { label: 'Zone 2: short file (~10 lines)',   path: short,                               expectZone: 2, expectLabel: 'CAUTION' },
    { label: 'Zone 2: 150-line file',            path: med,                                 expectZone: 2, expectLabel: 'CAUTION' },
    { label: 'Zone 3: large file (>150 lines)',  path: large,                               expectZone: 3, expectLabel: 'DANGER'  },
    { label: 'Zone 4: startup/boot.js',          path: 'startup/boot.js',                   expectZone: 4, expectLabel: 'BLOCKED' },
    { label: 'Zone 4: middleware/auth.js',       path: 'middleware/auth.js',                expectZone: 4, expectLabel: 'BLOCKED' },
    { label: 'Zone 4: server.js',                path: 'server.js',                         expectZone: 4, expectLabel: 'BLOCKED' },
  ];

  let passed = 0; let failed = 0;
  for (const tc of cases) {
    const result = classifyMutationZone(tc.path);
    const ok = result.zone === tc.expectZone && result.label === tc.expectLabel;
    console.log(`  ${ok ? 'PASS' : 'FAIL'} — ${tc.label}${ok ? '' : ` (got zone=${result.zone} ${result.label})`}`);
    ok ? passed++ : failed++;
  }

  for (const p of [short, med, large]) { try { unlinkSync(p); } catch { /* ignore */ } }
  console.log(`\n${passed}/${cases.length} tests passed`);
  process.exit(failed > 0 ? 1 : 0);
}

// ── CLI entry ────────────────────────────────────────────────────────────────

const isMain = process.argv[1] && process.argv[1].endsWith('classify-mutation-zone.mjs');
if (isMain) {
  if (process.argv[2] === '--self-test') {
    runSelfTest();
  } else {
    const filePath = process.argv[2];
    if (!filePath) {
      console.error('Usage: node scripts/classify-mutation-zone.mjs <filepath>');
      process.exit(1);
    }
    const result = classifyMutationZone(filePath);
    const policy = getZonePolicy(result.zone);
    console.log(`Zone:        ${result.zone} (${result.label})`);
    console.log(`Line count:  ${result.lineCount ?? 'N/A (new file)'}`);
    console.log(`Reason:      ${result.reason}`);
    console.log(`Allow builder: ${policy.allowBuilder}`);
    console.log(`Needs GAP-FILL: ${policy.requiresGapFill}`);
  }
}
