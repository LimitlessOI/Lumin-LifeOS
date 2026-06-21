/**
 * SYNOPSIS: scripts/verify-builder-output.mjs
 * scripts/verify-builder-output.mjs
 * Detect when the council builder emitted a stub instead of a real implementation.
 *
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 *
 * Usage:
 *   node scripts/verify-builder-output.mjs <filepath> [original-line-count]
 *   node scripts/verify-builder-output.mjs --self-test
 *
 * Exits 0 = OK, exits 1 = stub detected (with explanation).
 */
import { readFileSync, existsSync, writeFileSync, unlinkSync } from 'fs';

const STUB_CONTENT_MARKERS = ['TODO', 'PLACEHOLDER', 'not implemented'];
const EMPTY_EXPORT_RE = /export\s+(?:async\s+)?function\s+\w+\s*\([^)]*\)\s*\{\s*\}/;
const COMMENT_ELLIPSIS_RE = /\/\/\s*\.\.\./;

/**
 * Detect whether a file is a stub.
 * @param {string} filePath
 * @param {number|null} originalLines - line count before builder ran (null = skip collapse check)
 * @returns {{ isStub: boolean, reason: string|null, lineCount: number, signals: string[] }}
 */
export function detectBuilderStub(filePath, originalLines = null) {
  if (!existsSync(filePath)) {
    return { isStub: true, reason: 'file does not exist', lineCount: 0, signals: ['file_missing'] };
  }

  const content = readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const lineCount = lines.length;
  const signals = [];

  // Signal 1: line-count collapse (large file replaced by short stub)
  if (originalLines !== null && originalLines > 100 && lineCount < 30) {
    signals.push(`line_count_collapse: was_${originalLines}_now_${lineCount}`);
  }

  // Signal 2: absolute floor — catches true truncation (near-empty output); legitimate short utilities pass through to other signals
  if (lineCount < 5) {
    signals.push(`too_short_${lineCount}_lines`);
  }

  // Signal 3: stub content markers anywhere in file (case-insensitive)
  const contentWithoutStrings = content
    .replace(/`(?:\\.|[^`])*`/gs, '``')
    .replace(/"(?:\\.|[^"])*"/gs, '""')
    .replace(/'(?:\\.|[^'])*'/gs, "''");
  const lowerContent = contentWithoutStrings.toLowerCase();
  for (const marker of STUB_CONTENT_MARKERS) {
    if (lowerContent.includes(marker.toLowerCase())) {
      signals.push(`stub_marker_"${marker}"`);
      break;
    }
  }

  // Signal 4: comment ellipsis (// ...) — hallmark of truncated builder output
  if (COMMENT_ELLIPSIS_RE.test(content)) {
    signals.push('comment_ellipsis_found');
  }

  // Signal 5: empty exported function body — export function x() {}
  if (EMPTY_EXPORT_RE.test(content)) {
    signals.push('empty_export_function_body');
  }

  return {
    isStub: signals.length > 0,
    reason: signals.length > 0 ? signals.join('; ') : null,
    lineCount,
    signals,
  };
}

/**
 * Verify a builder-committed file is not a stub. Exits 1 if stub.
 * @param {string} filePath
 * @param {number|null} preCommitLines
 */
export function verifyBuilderCommit(filePath, preCommitLines = null) {
  const result = detectBuilderStub(filePath, preCommitLines);
  if (result.isStub) {
    console.error(`[verify-builder-output] STUB DETECTED: ${filePath}`);
    console.error(`  Reason:     ${result.reason}`);
    console.error(`  Line count: ${result.lineCount}`);
    if (preCommitLines !== null) {
      console.error(`  Was:        ${preCommitLines} lines`);
    }
    process.exit(1);
  }
  console.log(`[verify-builder-output] OK: ${filePath} (${result.lineCount} lines)`);
}

// ── Self-test ────────────────────────────────────────────────────────────────

function runSelfTest() {
  const cases = [
    {
      label: 'stub: too short (10 lines)',
      content: 'export function foo() {}\n'.repeat(10),
      originalLines: null,
      expectStub: true,
    },
    {
      label: 'stub: line-count collapse (200→8)',
      content: 'export default {};\n'.repeat(8),
      originalLines: 200,
      expectStub: true,
    },
    {
      label: 'stub: contains TODO',
      content: 'export function x() {\n  // TODO: implement\n}\n'.repeat(10),
      originalLines: null,
      expectStub: true,
    },
    {
      label: 'stub: comment ellipsis',
      content: 'export function x() {\n  // ... rest of logic\n}\n'.repeat(10),
      originalLines: null,
      expectStub: true,
    },
    {
      label: 'pass: real 50-line module',
      content: Array.from({ length: 50 }, (_, i) => `// line ${i + 1}\nexport const v${i} = ${i};`).join('\n'),
      originalLines: 80,
      expectStub: false,
    },
  ];

  const tmpFile = '/tmp/verify-builder-test-tmp.mjs';
  let passed = 0;
  let failed = 0;

  for (const tc of cases) {
    writeFileSync(tmpFile, tc.content, 'utf8');
    const result = detectBuilderStub(tmpFile, tc.originalLines);
    const ok = result.isStub === tc.expectStub;
    console.log(`  ${ok ? 'PASS' : 'FAIL'} — ${tc.label}${ok ? '' : ` (got isStub=${result.isStub}, expected ${tc.expectStub}, signals: ${result.signals.join(',')})`}`);
    ok ? passed++ : failed++;
  }

  try { unlinkSync(tmpFile); } catch { /* ignore */ }
  console.log(`\n${passed}/${cases.length} tests passed`);
  process.exit(failed > 0 ? 1 : 0);
}

// ── CLI entry ────────────────────────────────────────────────────────────────

const isMain = process.argv[1] && process.argv[1].endsWith('verify-builder-output.mjs');
if (isMain) {
  if (process.argv[2] === '--self-test') {
    runSelfTest();
  } else {
    const filePath = process.argv[2];
    if (!filePath) {
      console.error('Usage: node scripts/verify-builder-output.mjs <filepath> [original-line-count]');
      process.exit(1);
    }
    const originalLines = process.argv[3] ? parseInt(process.argv[3], 10) : null;
    verifyBuilderCommit(filePath, originalLines);
  }
}
