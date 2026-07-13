#!/usr/bin/env node
/**
 * SYNOPSIS: ssot-check.js
 * ssot-check.js
 * Scans changed files for @ssot tags and verifies the linked SSOT document
 * was also updated in the same git commit (or warns if not).
 *
 * Usage:
 *   node scripts/ssot-check.js                 — check staged/changed source files (co-commit)
 *   node scripts/ssot-check.js --staged-only   — pre-commit: staged files only
 *   node scripts/ssot-check.js --all           — scan routes/services/core/startup for missing @ssot
 *   node scripts/ssot-check.js --report        — amendment status + tag audit
 *   node scripts/ssot-check.js --product-debt  — manifest-owned files on wrong @ssot (warn-style)
 *   node scripts/ssot-check.js --product-enforce — full product-home drift audit (exit 1 on hard violations)
 *   node scripts/ssot-check.js --staged-product-enforce — pre-commit: block staged regressions
 *
 * @ssot docs/products/PRODUCT_REGISTRY.json
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync, readdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  auditManifestOwnedSources,
  auditProductPrompts,
  auditStagedProductRegression,
  buildOwnedIndex,
  extractSsotTag as extractSsotFromContent,
  formatViolation,
  isManifestOwnedSource,
  loadProductManifests,
  resolveCoCommitPaths,
  sharedSsotPaths,
} from './lib/product-home-enforce.mjs';

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

const MANIFEST_SOURCE_PREFIXES = [
  'routes/', 'services/', 'core/', 'startup/', 'middleware/', 'config/',
  'public/', 'scripts/', 'tests/',
];

function getChangedFiles(pushRange, stagedOnly = false) {
  try {
    if (pushRange) {
      const files = execSync(`git diff --name-only ${pushRange}`, { cwd: ROOT })
        .toString().trim().split('\n').filter(Boolean);
      return files;
    }
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
    return extractSsotFromContent(content);
  } catch {
    return null;
  }
}

function isSynopsisOnlyStagedChange(filePath) {
  try {
    const diff = execSync(`git diff --cached -- "${filePath}"`, { cwd: ROOT, encoding: 'utf8' });
    if (!diff.trim()) return false;
    const addLines = diff.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++')).map((l) => l.slice(1));
    const remLines = diff.split('\n').filter((l) => l.startsWith('-') && !l.startsWith('---')).map((l) => l.slice(1));
    if (!addLines.length && !remLines.length) return false;
    const headerLine = (line) =>
      /SYNOPSIS\s*:/i.test(line)
      || /^\s*\*\s*$/.test(line)
      || /^\s*\/\*\*/.test(line)
      || /^\s*\*\//.test(line)
      || /^\s*\*\s/.test(line)
      || /^\s*$/.test(line);
    return [...addLines, ...remLines].every(headerLine);
  } catch {
    return false;
  }
}

function ssotExists(ssotPath) {
  return existsSync(path.join(ROOT, ssotPath));
}

function getSsotLastUpdated(ssotPath) {
  try {
    const content = readFileSync(path.join(ROOT, ssotPath), 'utf8');
    // Match either table rows: | **Last Updated** | 2026-07-13 ... |
    // or plain lines: **Last Updated:** 2026-06-29
    const match = content.match(/\*\*Last Updated:?\*\*\s*(?:\|\s*)?(.+?)(?=[\n\|]|$)/);
    return match ? match[1].trim() : 'unknown';
  } catch {
    return 'missing';
  }
}

function getAmendmentLastUpdated(ssotPath) {
  return getSsotLastUpdated(ssotPath);
}

function changedMatchesCoCommit(changed, coPaths) {
  return changed.some((f) =>
    coPaths.some((p) => f === p || f.endsWith(`/${p}`) || path.basename(f) === path.basename(p))
  );
}

function isCoCommitSourceFile(file) {
  if (!file.match(/\.(js|ts|mjs)$/)) return false;
  if (file.includes('docs/')) return false;
  return MANIFEST_SOURCE_PREFIXES.some((p) => file.startsWith(p));
}

function reportProductHomeDebt(manifests) {
  const violations = [
    ...auditManifestOwnedSources(manifests, ROOT, { includeDebt: true }),
    ...auditProductPrompts(ROOT),
  ];
  console.log(c('bold', '\n📦 Product-home migration debt (lifeos + lifere)\n'));
  if (!violations.length) {
    console.log(c('green', '✅ All manifest-owned sources and product prompts use canonical product homes.\n'));
    return 0;
  }
  for (const v of violations) {
    console.log(`  ${c('cyan', v.file)}`);
    console.log(`    → ${c('yellow', v.kind)}${v.tag ? ` (${v.tag})` : ''} — expected ${v.expected}\n`);
  }
  console.log(c('yellow', `⚠️  ${violations.length} product-home drift issue(s).\n`));
  return 1;
}

function enforceProductHome({ stagedOnly = false } = {}) {
  const manifests = loadProductManifests(ROOT);
  const violations = [
    ...auditManifestOwnedSources(manifests, ROOT),
    ...auditProductPrompts(ROOT),
  ];
  if (stagedOnly) {
    const staged = getChangedFiles(null, true);
    violations.push(...auditStagedProductRegression(manifests, ROOT, staged));
  }
  console.log(c('bold', `\n🛡️  Product-home enforcement (lifeos + lifere)${stagedOnly ? ' [staged]' : ''}\n`));
  if (!violations.length) {
    console.log(c('green', '✅ No product-home drift detected.\n'));
    return 0;
  }
  for (const v of violations) {
    console.log(`  ${c('red', formatViolation(v))}`);
  }
  console.log(c('red', `\n❌ ${violations.length} violation(s) — use canonical product home @ssot, not flat stubs or foreign amendments.\n`));
  return 1;
}

function checkChangedFiles(pushRange, stagedOnly = false) {
  const changed = getChangedFiles(pushRange, stagedOnly);
  const manifests = loadProductManifests(ROOT);
  if (!changed.length) {
    console.log(c('green', '✅ No changed files to check.'));
    return 0;
  }

  console.log(c('bold', `\n🔍 SSOT Check — ${changed.length} changed file(s)\n`));

  const needsSsotUpdate = [];
  const missingTag = [];
  const productRegressions = auditStagedProductRegression(manifests, ROOT, changed);

  for (const file of changed) {
    if (!isCoCommitSourceFile(file)) continue;
    if (!existsSync(path.join(ROOT, file))) continue;

    const ssotTag = extractSsotTag(file);
    if (!ssotTag) {
      if (isManifestOwnedSource(file, manifests)) missingTag.push(file);
      continue;
    }

    if (isSynopsisOnlyStagedChange(file)) continue;

    const coPaths = resolveCoCommitPaths(ssotTag, file, manifests);
    const ssotChanged = changedMatchesCoCommit(changed, coPaths);
    if (!ssotChanged) {
      needsSsotUpdate.push({ file, ssot: ssotTag, coPaths });
    }
  }

  let exitCode = 0;

  if (productRegressions.length) {
    console.log(c('red', '❌ Product-home regression in changed manifest-owned files:\n'));
    for (const v of productRegressions) {
      console.log(`  ${c('cyan', v.file)} → ${c('red', v.kind)} (${v.tag || 'missing'})`);
    }
    console.log('');
    exitCode = 1;
  }

  if (needsSsotUpdate.length) {
    console.log(c('yellow', '⚠️  Files changed without updating their SSOT document:\n'));
    for (const { file, ssot } of needsSsotUpdate) {
      const lastUpdated = getSsotLastUpdated(ssot);
      const owned = isManifestOwnedSource(file, manifests);
      const hint = owned ? ' (update PRODUCT_HOME.md or FILE_MANIFEST.json)' : '';
      console.log(`  ${c('cyan', file)}`);
      console.log(`    → ${c('yellow', ssot)} (last updated: ${lastUpdated})${hint}\n`);
    }
    console.log(c('yellow', 'Update the listed SSOT documents before pushing.\n'));
    exitCode = 1;
  }

  if (missingTag.length) {
    console.log(c('yellow', '⚠️  Manifest-owned source files missing @ssot tag:\n'));
    for (const file of missingTag) {
      console.log(`  ${c('cyan', file)}`);
    }
    console.log(c('yellow', '\nAdd @ssot docs/products/<product>/PRODUCT_HOME.md to JSDoc header.\n'));
    exitCode = 1;
  }

  if (!needsSsotUpdate.length && !missingTag.length && !productRegressions.length) {
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
      tagged.push({ file, tag, exists: ssotExists(tag) });
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
    console.log(c('red', '\n❌ Files pointing to non-existent SSOT documents:'));
    for (const { file, tag } of brokenLinks) {
      console.log(`  ${c('cyan', file)} → ${c('red', tag)}`);
    }
  }
}

function fullReport() {
  const productHomes = [];
  const productsRoot = path.join(ROOT, 'docs/products');
  for (const ent of readdirSync(productsRoot, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const home = path.join('docs/products', ent.name, 'PRODUCT_HOME.md');
    if (existsSync(path.join(ROOT, home))) productHomes.push(home);
  }

  console.log(c('bold', '\n📊 SSOT Product Home Status Report\n'));
  console.log(`${'Product Home'.padEnd(55)} ${'Last Updated'.padEnd(20)} Status`);
  console.log('─'.repeat(90));

  for (const home of productHomes.sort()) {
    const lastUpdated = getAmendmentLastUpdated(home);
    const isStale = lastUpdated === 'unknown' || lastUpdated < '2026-03-20';
    const status = isStale ? c('yellow', '⚠ may be stale') : c('green', '✅ recent');
    console.log(`${home.padEnd(55)} ${lastUpdated.padEnd(20)} ${status}`);
  }

  console.log('');
  scanAllForMissingTags();
}

const args = process.argv.slice(2);

if (args.includes('--all')) {
  scanAllForMissingTags();
} else if (args.includes('--report')) {
  fullReport();
} else if (args.includes('--product-debt')) {
  process.exit(reportProductHomeDebt(loadProductManifests(ROOT)));
} else if (args.includes('--product-enforce')) {
  process.exit(enforceProductHome({ stagedOnly: false }));
} else if (args.includes('--staged-product-enforce')) {
  process.exit(enforceProductHome({ stagedOnly: true }));
} else {
  const rangeIdx = args.indexOf('--push-range');
  const pushRange = rangeIdx >= 0 ? args[rangeIdx + 1] : null;
  const stagedOnly = args.includes('--staged-only');
  process.exit(checkChangedFiles(pushRange, stagedOnly));
}
