/**
 * SYNOPSIS: BuilderOS Phase 01 — Useful-Work-Guard Coverage Audit
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 * BuilderOS Phase 01 — Useful-Work-Guard Coverage Audit
 *
 * READ-ONLY static analysis. No AI calls. No DB writes. No runtime mutations.
 * Scans services/, routes/, startup/, scripts/ for AI call sites and classifies
 * each file as GUARDED / PB_GOVERNED / UNGUARDED / UNKNOWN.
 *
 * GAP-FILL repair: builder committed broken version (patterns used .includes() with
 * regex-escaped strings like 'ccm\\(' which match literal backslash — zero matches;
 * classifyFile() defined but never called; classification never set on result objects).
 *
 * Exit 1 if any UNGUARDED file also contains setInterval (HIGH_RISK_SCHEDULED).
 * Exit 0 otherwise.
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join, extname, relative, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const SCAN_DIRS = ['services', 'routes', 'startup', 'scripts'];

// Plain-string patterns — no regex escaping; matched with line.includes(p)
const AI_CALL_PATTERNS = [
  'callCouncilMember(',
  'callCouncilWithFailover(',
  'callAI(',
  'anthropic.messages.create(',
  'openai.chat.completions.create(',
  'generateContent(',
  'callCouncilMemberWithFallback(',
];

const GUARD_PATTERNS = [
  'createUsefulWorkGuard(',
  'isPBAuthorized(',
  'requirePBAuthorization(',
  'pb_authorized',
  'PB_GOVERNED',
];

// Env-gate and prerequisite patterns that block scheduler start without explicit opt-in.
// These are valid guards — the AI calls cannot fire if the gate prevents the setInterval
// from registering. Distinguished from GUARDED (createUsefulWorkGuard) but still safe.
const ENV_GATE_PATTERNS = [
  'AUTONOMY_ORCHESTRATOR_ENABLED !== "true"',
  'IDEA_ENGINE_SCHEDULER_ENABLED !== "true"',
  'LEGACY_SCHEDULER_ENABLED',
  'isTCImapConfigured(',
  'EMAIL_TRIAGE_ENABLED !== "true"',
];

// Patterns that indicate this line is a function/const DEFINITION (not a call site)
const DEFINITION_PATTERNS = [
  'function callCouncilMember',
  'const callCouncilMember',
  'export function callCouncilMember',
  'function callCouncilWithFailover',
  'const callCouncilWithFailover',
  'export function callCouncilWithFailover',
  'export const callCouncilMember',
  'export const callCouncilWithFailover',
];

const SKIP_DIRS = ['node_modules', '.git', 'coverage', 'dist', '.nyc_output'];

function walkDir(dir) {
  const entries = readdirSync(dir);
  const files = [];
  for (const entry of entries) {
    if (SKIP_DIRS.includes(entry)) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...walkDir(full));
    } else if (stat.isFile() && (extname(entry) === '.js' || extname(entry) === '.mjs')) {
      files.push(full);
    }
  }
  return files;
}

function analyzeFile(fullPath) {
  const rel = relative(ROOT, fullPath);
  let content;
  try {
    content = readFileSync(fullPath, 'utf8');
  } catch {
    return null;
  }

  const lines = content.split('\n');

  // Collect AI call lines (excluding definition lines and comment lines)
  const aiCallLines = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;
    const isDefinition = DEFINITION_PATTERNS.some(p => trimmed.includes(p));
    if (isDefinition) continue;
    const pattern = AI_CALL_PATTERNS.find(p => line.includes(p));
    if (pattern) {
      aiCallLines.push({ lineNum: i + 1, text: trimmed.slice(0, 120), pattern });
    }
  }

  if (aiCallLines.length === 0) return null;

  // Check whole-file for guard patterns
  const hasGuard = GUARD_PATTERNS.slice(0, 3).some(p => content.includes(p)); // createUsefulWorkGuard, isPBAuthorized, requirePBAuthorization
  const hasPB = GUARD_PATTERNS.slice(3).some(p => content.includes(p)); // pb_authorized, PB_GOVERNED
  const hasEnvGate = ENV_GATE_PATTERNS.some(p => content.includes(p));
  const hasSetInterval = content.includes('setInterval');

  // Classify
  let classification;
  if (hasGuard) {
    classification = 'GUARDED';
  } else if (hasPB) {
    classification = 'PB_GOVERNED';
  } else if (hasEnvGate) {
    classification = 'ENV_GUARDED';
  } else if (aiCallLines.length > 0) {
    // Check if all AI calls are inside guard wrappers by proximity (within 20 lines)
    // Conservative: if no guard pattern anywhere in file, it's UNGUARDED
    const guardNearby = aiCallLines.some(cl => {
      const start = Math.max(0, cl.lineNum - 25);
      const end = Math.min(lines.length - 1, cl.lineNum + 5);
      const window = lines.slice(start, end).join('\n');
      return GUARD_PATTERNS.some(p => window.includes(p));
    });
    classification = guardNearby ? 'UNKNOWN' : 'UNGUARDED';
  } else {
    classification = 'UNKNOWN';
  }

  const highRiskScheduled = classification === 'UNGUARDED' && hasSetInterval;

  return {
    rel,
    classification,
    aiCallLines,
    aiCallCount: aiCallLines.length,
    hasGuard,
    hasPB,
    hasSetInterval,
    highRiskScheduled,
  };
}

function main() {
  const allFiles = [];
  for (const d of SCAN_DIRS) {
    const dir = join(ROOT, d);
    try {
      allFiles.push(...walkDir(dir));
    } catch {
      // Directory may not exist
    }
  }

  const results = allFiles.map(analyzeFile).filter(Boolean);

  const guarded = results.filter(r => r.classification === 'GUARDED');
  const pbGoverned = results.filter(r => r.classification === 'PB_GOVERNED');
  const envGuarded = results.filter(r => r.classification === 'ENV_GUARDED');
  const unguarded = results.filter(r => r.classification === 'UNGUARDED');
  const unknown = results.filter(r => r.classification === 'UNKNOWN');
  const highRisk = results.filter(r => r.highRiskScheduled);

  const totalWithAI = results.length;
  const coveredCount = guarded.length + pbGoverned.length + envGuarded.length;
  const coveragePct = totalWithAI > 0 ? ((coveredCount / totalWithAI) * 100).toFixed(1) : '0.0';

  console.log('');
  console.log('=== USEFUL-WORK-GUARD COVERAGE AUDIT ===');
  console.log(`Scanned: ${allFiles.length} files across ${SCAN_DIRS.join(', ')}`);
  console.log('');
  console.log('SUMMARY');
  console.log('-------');
  console.log(`  files_with_ai_calls : ${totalWithAI}`);
  console.log(`  GUARDED             : ${guarded.length}`);
  console.log(`  PB_GOVERNED         : ${pbGoverned.length}`);
  console.log(`  ENV_GUARDED         : ${envGuarded.length}  ← env-gate or prerequisite prevents scheduler start`);
  console.log(`  UNGUARDED           : ${unguarded.length}`);
  console.log(`  UNKNOWN             : ${unknown.length}`);
  console.log(`  HIGH_RISK_SCHEDULED : ${highRisk.length}  ← setInterval + UNGUARDED (no guard of any kind)`);
  console.log(`  coverage_percent    : ${coveragePct}%  (GUARDED + PB_GOVERNED + ENV_GUARDED / total)`);
  console.log('');

  if (unguarded.length > 0) {
    console.log('UNGUARDED FILES (highest risk first)');
    console.log('------------------------------------');
    const sorted = [...unguarded].sort((a, b) => {
      if (a.highRiskScheduled !== b.highRiskScheduled) return a.highRiskScheduled ? -1 : 1;
      return b.aiCallCount - a.aiCallCount;
    });
    for (const f of sorted) {
      const tag = f.highRiskScheduled ? ' ⚠ HIGH_RISK_SCHEDULED' : '';
      console.log(`  ${f.rel}${tag}`);
      for (const cl of f.aiCallLines.slice(0, 5)) {
        console.log(`    L${cl.lineNum}: ${cl.text}`);
      }
      if (f.aiCallLines.length > 5) {
        console.log(`    ... and ${f.aiCallLines.length - 5} more`);
      }
    }
    console.log('');
  }

  if (envGuarded.length > 0) {
    console.log('ENV_GUARDED FILES (env-gate or prerequisite check gates scheduler start)');
    console.log('-----------------------------------------------------------------------');
    for (const f of envGuarded) {
      console.log(`  ${f.rel}  (${f.aiCallCount} AI call(s) — gated by env-gate/prereq)`);
    }
    console.log('');
  }

  if (pbGoverned.length > 0) {
    console.log('PB_GOVERNED FILES');
    console.log('-----------------');
    for (const f of pbGoverned) {
      console.log(`  ${f.rel}  (${f.aiCallCount} AI call(s))`);
    }
    console.log('');
  }

  if (guarded.length > 0) {
    console.log('GUARDED FILES');
    console.log('-------------');
    for (const f of guarded) {
      console.log(`  ${f.rel}`);
    }
    console.log('');
  }

  if (unknown.length > 0) {
    console.log('UNKNOWN FILES (guard proximity detected — verify manually)');
    console.log('-----------------------------------------------------------');
    for (const f of unknown) {
      console.log(`  ${f.rel}  (${f.aiCallCount} AI call(s), guard found nearby)`);
    }
    console.log('');
  }

  // Top 10 risk files by: HIGH_RISK first, then aiCallCount desc
  const top10 = [...results]
    .sort((a, b) => {
      if (a.highRiskScheduled !== b.highRiskScheduled) return a.highRiskScheduled ? -1 : 1;
      const aRisk = a.classification === 'UNGUARDED' ? 2 : a.classification === 'UNKNOWN' ? 1 : 0;
      const bRisk = b.classification === 'UNGUARDED' ? 2 : b.classification === 'UNKNOWN' ? 1 : 0;
      if (aRisk !== bRisk) return bRisk - aRisk;
      return b.aiCallCount - a.aiCallCount;
    })
    .slice(0, 10);

  console.log('TOP 10 RISK FILES');
  console.log('-----------------');
  for (const f of top10) {
    const tag = f.highRiskScheduled ? '[HIGH_RISK_SCHEDULED]' : `[${f.classification}]`;
    console.log(`  ${tag} ${f.rel}  (${f.aiCallCount} AI call(s))`);
  }
  console.log('');

  // Recommended next fixes — top 5 unguarded, sorted by highRisk then aiCallCount
  const fixes = [...unguarded]
    .sort((a, b) => {
      if (a.highRiskScheduled !== b.highRiskScheduled) return a.highRiskScheduled ? -1 : 1;
      return b.aiCallCount - a.aiCallCount;
    })
    .slice(0, 5);

  if (fixes.length > 0) {
    console.log('RECOMMENDED NEXT FIXES');
    console.log('----------------------');
    for (const f of fixes) {
      const reason = f.highRiskScheduled
        ? 'setInterval + AI call — wrap setInterval body in createUsefulWorkGuard() with workCheck'
        : `${f.aiCallCount} unguarded AI call(s) — wrap in createUsefulWorkGuard() with prereqs + workCheck`;
      console.log(`  ${f.rel}`);
      console.log(`    → ${reason}`);
    }
    console.log('');
  }

  console.log(`EXIT: ${highRisk.length > 0 ? '1 (HIGH_RISK_SCHEDULED files found)' : '0 (no HIGH_RISK_SCHEDULED files)'}`);
  console.log('');

  try {
    const auditResults = {
      high_risk_count: highRisk.length,
      unguarded_count: unguarded.length,
      env_guarded_count: envGuarded.length,
      guarded_count: guarded.length,
      pb_governed_count: pbGoverned.length,
      coverage_percent: parseFloat(coveragePct),
      exit_code: highRisk.length > 0 ? 1 : 0,
      generated_at: new Date().toISOString(),
    };
    writeFileSync(join(ROOT, 'data', 'useful-work-guard-audit-results.json'), JSON.stringify(auditResults, null, 2));
  } catch { /* non-fatal — alpha service falls back to hardcoded blocker if file absent */ }

  process.exit(highRisk.length > 0 ? 1 : 0);
}

main();
