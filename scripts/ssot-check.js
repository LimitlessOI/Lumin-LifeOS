#!/usr/bin/env node
/**
 * ssot-check.js
 * Scans changed files for @ssot tags and verifies the linked amendment
 * was also updated in the same git commit (or warns if not).
 *
 * Usage:
 *   node scripts/ssot-check.js            — check all staged/changed files
 *   node scripts/ssot-check.js --all      — scan entire codebase for missing @ssot tags
 *   node scripts/ssot-check.js --report   — full drift report (all amendments vs files)
 *
 * Install as a git hook:
 *   echo 'node scripts/ssot-check.js' >> .git/hooks/pre-push
 *   chmod +x .git/hooks/pre-push
 *
 * @ssot docs/projects/INDEX.md
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync, readdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const COLORS = {
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  green:  '\x1b[32m',
  cyan:   '\x1b[36m',
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
};

const c = (color, text) => `${COLORS[color]}${text}${COLORS.reset}`;

// ── Helpers ──────────────────────────────────────────────────────────────────

function getChangedFiles(pushRange, stagedOnly = false) {
  try {
    if (pushRange) {
      // Pre-push mode: only check files in the commits being pushed.
      // pushRange is "<remoteRef>..<localRef>" e.g. "origin/main..HEAD"
      // Uses diff-tree to list files changed in those commits (not working tree).
      const files = execSync(`git diff --name-only ${pushRange}`, { cwd: ROOT })
        .toString().trim().split('\n').filter(Boolean);
      return files;
    }
    // Pre-commit mode: staged only by default (avoids false-positives from
    // unrelated unstaged working-tree changes across long multi-session work).
    const staged = execSync('git diff --cached --name-only', { cwd: ROOT })
      .toString().trim().split('\n').filter(Boolean);
    if (stagedOnly) return staged;
    const unstaged = execSync('git diff --name-only', { cwd: ROOT })
      .toString().trim().split('\n').filter(Boolean);
    return [...new Set([...staged, ...unstaged])];
  } catch {
    return [];
  }
}

function getAllSourceFiles() {
  const dirs = ['routes', 'services', 'core', 'startup'];
  const files = [];
  for (const dir of dirs) {
    const full = path.join(ROOT, dir);
    if (!existsSync(full)) continue;
    try {
      for (const f of readdirSync(full)) {
        if (f.endsWith('.js')) files.push(path.join(dir, f));
      }
    } catch { /* skip */ }
  }
  return files;
}

function extractSsotTag(filePath) {
  try {
    const content = readFileSync(path.join(ROOT, filePath), 'utf8');
    const match = content.match(/@ssot\s+(docs\/projects\/[^\s*]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function amendmentExists(amendmentPath) {
  return existsSync(path.join(ROOT, amendmentPath));
}

function getAmendmentLastUpdated(amendmentPath) {
  try {
    const content = readFileSync(path.join(ROOT, amendmentPath), 'utf8');
    const match = content.match(/\*\*Last Updated:\*\*\s*(.+)/);
    return match ? match[1].trim() : 'unknown';
  } catch {
    return 'missing';
  }
}

// ── Main modes ────────────────────────────────────────────────────────────────

function checkChangedFiles(pushRange, stagedOnly = false) {
  const changed = getChangedFiles(pushRange, stagedOnly);
  if (!changed.length) {
    console.log(c('green', '✅ No changed files to check.'));
    return 0;
  }

  console.log(c('bold', `\n🔍 SSOT Check — ${changed.length} changed file(s)\n`));

  const needsAmendmentUpdate = [];
  const missingTag = [];

  for (const file of changed) {
    // Skip non-source files and the amendments themselves
    if (!file.match(/\.(js|ts)$/) || file.includes('docs/') || file.includes('scripts/')) continue;
    if (!file.match(/^(routes|services|core|startup)\//)) continue;
    if (!existsSync(path.join(ROOT, file))) continue; // e.g. deleted in working tree; do not false-flag @ssot

    const ssotTag = extractSsotTag(file);
    if (!ssotTag) {
      missingTag.push(file);
      continue;
    }

    // Check if the amendment was also updated in this change set
    const amendmentChanged = changed.some(f => f.includes(path.basename(ssotTag)));
    if (!amendmentChanged) {
      needsAmendmentUpdate.push({ file, ssot: ssotTag });
    }
  }

  let exitCode = 0;

  if (needsAmendmentUpdate.length) {
    console.log(c('yellow', '⚠️  Files changed without updating their SSOT amendment:\n'));
    for (const { file, ssot } of needsAmendmentUpdate) {
      const lastUpdated = getAmendmentLastUpdated(ssot);
      console.log(`  ${c('cyan', file)}`);
      console.log(`    → ${c('yellow', ssot)} (last updated: ${lastUpdated})\n`);
    }
    console.log(c('yellow', 'Update the listed amendments before pushing.\n'));
    exitCode = 1;
  }

  if (missingTag.length) {
    console.log(c('yellow', '⚠️  Source files missing @ssot tag:\n'));
    for (const file of missingTag) {
      console.log(`  ${c('cyan', file)}`);
    }
    console.log(c('yellow', '\nAdd @ssot docs/projects/AMENDMENT_XX.md to their JSDoc header.\n'));
    // Warning only, not a hard fail
  }

  if (!needsAmendmentUpdate.length && !missingTag.length) {
    console.log(c('green', '✅ All changed files have up-to-date SSOT references.\n'));
  }

  return exitCode;
}

function scanAllForMissingTags() {
  const files = getAllSourceFiles();
  console.log(c('bold', `\n📋 @ssot Tag Audit — ${files.length} source files\n`));

  const missing = [];
  const tagged = [];

  for (const file of files) {
    const tag = extractSsotTag(file);
    if (tag) {
      tagged.push({ file, tag, exists: amendmentExists(tag) });
    } else {
      missing.push(file);
    }
  }

  console.log(c('green', `✅ Tagged: ${tagged.length}`));
  console.log(c(missing.length ? 'yellow' : 'green', `${missing.length ? '⚠️ ' : '✅ '}Missing tag: ${missing.length}\n`));

  if (missing.length) {
    console.log(c('yellow', 'Files missing @ssot tag:'));
    for (const f of missing) console.log(`  ${c('cyan', f)}`);
  }

  const brokenLinks = tagged.filter(t => !t.exists);
  if (brokenLinks.length) {
    console.log(c('red', '\n❌ Files pointing to non-existent amendments:'));
    for (const { file, tag } of brokenLinks) {
      console.log(`  ${c('cyan', file)} → ${c('red', tag)}`);
    }
  }
}

function fullReport() {
  const amendments = readdirSync(path.join(ROOT, 'docs/projects'))
    .filter(f => f.startsWith('AMENDMENT_'));

  console.log(c('bold', '\n📊 SSOT Amendment Status Report\n'));
  console.log(`${'Amendment'.padEnd(50)} ${'Last Updated'.padEnd(20)} Status`);
  console.log('─'.repeat(85));

  for (const amendment of amendments) {
    const fullPath = `docs/projects/${amendment}`;
    const lastUpdated = getAmendmentLastUpdated(fullPath);
    const isStale = lastUpdated === 'unknown' || lastUpdated < '2026-03-20';
    const status = isStale ? c('yellow', '⚠ may be stale') : c('green', '✅ recent');
    console.log(`${amendment.padEnd(50)} ${lastUpdated.padEnd(20)} ${status}`);
  }

  console.log('');
  scanAllForMissingTags();
}

// ── Entry point ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.includes('--all')) {
  scanAllForMissingTags();
} else if (args.includes('--report')) {
  fullReport();
} else {
  // Support --push-range <range> for pre-push hook use (avoids false-positives
  // from unrelated working-tree changes by checking only the pushed commits).
  const rangeIdx = args.indexOf('--push-range');
  const pushRange = rangeIdx >= 0 ? args[rangeIdx + 1] : null;
  // --staged-only: only check git-cached (staged) files, skip working-tree changes.
  // The pre-commit hook passes this to avoid false-positives from unrelated
  // unstaged modifications left over from prior sessions.
  const stagedOnly = args.includes('--staged-only');
  process.exit(checkChangedFiles(pushRange, stagedOnly));
}
