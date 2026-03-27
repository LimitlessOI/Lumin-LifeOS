#!/usr/bin/env node
/**
 * scripts/ssot-staleness-check.mjs
 * SSOT Staleness Detector — CI gate that ensures code never drifts ahead
 * of its amendment documentation.
 *
 * How it works:
 *   1. Reads git log to find last commit date of every routes/*.js and services/*.js
 *   2. Reads the @ssot tag in each file to find its linked amendment
 *   3. Reads the "Last Updated:" field in that amendment
 *   4. If code is newer than amendment → violation
 *   5. Exit code 1 if any violations (CI catches this)
 *
 * Usage:
 *   node scripts/ssot-staleness-check.mjs
 *   node scripts/ssot-staleness-check.mjs --warn-only   (exit 0 even on violations)
 *   node scripts/ssot-staleness-check.mjs --fix          (prints remediation steps)
 *
 * @ssot docs/projects/AMENDMENT_19_PROJECT_GOVERNANCE.md
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const warnOnly = process.argv.includes('--warn-only');
const fixMode = process.argv.includes('--fix');

// ── Colors ────────────────────────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', cyan: '\x1b[36m',
};

// ── Get last git commit date for a file ───────────────────────────────────────
function getLastCommitDate(filePath) {
  try {
    const rel = path.relative(ROOT, filePath);
    const out = execSync(`git log -1 --format="%aI" -- "${rel}"`, {
      cwd: ROOT, stdio: 'pipe', encoding: 'utf8'
    }).trim();
    return out ? new Date(out) : null;
  } catch {
    return null;
  }
}

// ── Extract @ssot tag from a JS file ─────────────────────────────────────────
async function extractSsotTag(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    // Match: * @ssot docs/projects/AMENDMENT_XX_NAME.md
    const match = content.match(/@ssot\s+(docs\/projects\/[^\s*]+\.md)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

// ── Extract "Last Updated:" from amendment ────────────────────────────────────
async function extractLastUpdated(amendmentRelPath) {
  try {
    const full = path.join(ROOT, amendmentRelPath);
    const content = await fs.readFile(full, 'utf8');
    // Match: **Last Updated:** 2026-03-27 or Last Updated: 2026-03-27
    const match = content.match(/Last Updated[:\*]+\s*(\d{4}-\d{2}-\d{2})/i);
    if (!match) return null;
    return new Date(match[1] + 'T23:59:59Z'); // end of that day
  } catch {
    return null;
  }
}

// ── Scan target directories ───────────────────────────────────────────────────
async function collectFiles() {
  const dirs = ['routes', 'services', 'core', 'startup', 'middleware'];
  const files = [];
  for (const dir of dirs) {
    const dirPath = path.join(ROOT, dir);
    try {
      const entries = await fs.readdir(dirPath);
      for (const entry of entries) {
        if (entry.endsWith('.js') || entry.endsWith('.mjs')) {
          files.push(path.join(dirPath, entry));
        }
      }
    } catch { /* dir doesn't exist */ }
  }
  return files;
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log(`\n${C.bold}SSOT Staleness Detector${C.reset}`);
console.log(`${C.dim}${'─'.repeat(55)}${C.reset}`);

const files = await collectFiles();
const violations = [];
const clean = [];
const noTag = [];
const noAmendment = [];

for (const file of files) {
  const rel = path.relative(ROOT, file);
  const ssotTag = await extractSsotTag(file);

  if (!ssotTag) {
    noTag.push(rel);
    continue;
  }

  const lastCommit = getLastCommitDate(file);
  if (!lastCommit) continue; // untracked file, skip

  const lastUpdated = await extractLastUpdated(ssotTag);

  if (!lastUpdated) {
    noAmendment.push({ file: rel, amendment: ssotTag });
    continue;
  }

  if (lastCommit > lastUpdated) {
    violations.push({
      file: rel,
      amendment: ssotTag,
      codeDate: lastCommit.toISOString().slice(0, 10),
      docDate: lastUpdated.toISOString().slice(0, 10),
      delta: Math.ceil((lastCommit - lastUpdated) / (1000 * 60 * 60 * 24)),
    });
  } else {
    clean.push(rel);
  }
}

// ── Report ────────────────────────────────────────────────────────────────────
if (clean.length > 0) {
  console.log(`\n${C.green}✓ In sync${C.reset} (${clean.length} files)`);
}

if (noTag.length > 0) {
  console.log(`\n${C.yellow}⚠ Missing @ssot tag${C.reset} (${noTag.length} files)`);
  for (const f of noTag.slice(0, 10)) {
    console.log(`  ${C.dim}${f}${C.reset}`);
  }
  if (noTag.length > 10) console.log(`  ${C.dim}... and ${noTag.length - 10} more${C.reset}`);
}

if (noAmendment.length > 0) {
  console.log(`\n${C.yellow}⚠ Amendment not found${C.reset} (${noAmendment.length} files)`);
  for (const { file, amendment } of noAmendment) {
    console.log(`  ${C.dim}${file} → ${amendment} (missing)${C.reset}`);
  }
}

if (violations.length > 0) {
  console.log(`\n${C.red}✗ STALE AMENDMENTS${C.reset} (${violations.length} violations)`);
  console.log(`${C.dim}  Code was committed after amendment was last updated.${C.reset}`);
  console.log(`${C.dim}  Update the amendment's "Last Updated:" date and add a change receipt.${C.reset}\n`);

  for (const v of violations) {
    console.log(`  ${C.red}✗${C.reset} ${C.bold}${v.file}${C.reset}`);
    console.log(`    ${C.dim}amendment: ${v.amendment}${C.reset}`);
    console.log(`    ${C.yellow}code:${C.reset} ${v.codeDate}  ${C.dim}doc:${C.reset} ${v.docDate}  ${C.red}(${v.delta}d behind)${C.reset}`);

    if (fixMode) {
      console.log(`    ${C.cyan}Fix:${C.reset} Update "Last Updated: ${new Date().toISOString().slice(0, 10)}" in ${v.amendment}`);
    }
    console.log('');
  }
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`${C.dim}${'─'.repeat(55)}${C.reset}`);
console.log(`Checked: ${files.length} files | Clean: ${clean.length} | Violations: ${violations.length} | No tag: ${noTag.length}`);

if (violations.length === 0) {
  console.log(`\n${C.green}${C.bold}✔ All amendments are current${C.reset}\n`);
  process.exit(0);
} else {
  console.log(`\n${C.red}${C.bold}✘ ${violations.length} amendment(s) need updating${C.reset}`);
  if (warnOnly) {
    console.log(`${C.yellow}(--warn-only: exiting 0)${C.reset}\n`);
    process.exit(0);
  }
  console.log(`${C.dim}Run with --fix for remediation steps${C.reset}\n`);
  process.exit(1);
}
