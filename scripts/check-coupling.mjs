#!/usr/bin/env node
/**
 * scripts/check-coupling.mjs
 * Enforces SSOT coupling policy: code changes must be paired with amendment updates.
 * Implements the same rules as policy/ssot-coupling.rego without requiring conftest.
 *
 * Usage:
 *   node scripts/check-coupling.mjs              (checks staged changes)
 *   node scripts/check-coupling.mjs --all        (checks all tracked files vs HEAD)
 *   node scripts/check-coupling.mjs --warn-only  (exit 0, just report)
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
const checkAll = process.argv.includes('--all');

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', cyan: '\x1b[36m',
};

// ── Get changed files from git ─────────────────────────────────────────────
function getChangedFiles() {
  try {
    if (checkAll) {
      // All tracked files
      const out = execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' });
      return out.trim().split('\n').filter(Boolean);
    }
    // Staged + unstaged changes vs HEAD
    const staged = execSync('git diff --cached --name-only', { cwd: ROOT, encoding: 'utf8' });
    const unstaged = execSync('git diff --name-only', { cwd: ROOT, encoding: 'utf8' });
    const all = [...staged.trim().split('\n'), ...unstaged.trim().split('\n')];
    return [...new Set(all.filter(Boolean))];
  } catch {
    return [];
  }
}

// ── Extract @ssot tag from a file ─────────────────────────────────────────
async function extractSsotTag(relPath) {
  try {
    const content = await fs.readFile(path.join(ROOT, relPath), 'utf8');
    const match = content.match(/@ssot\s+(docs\/projects\/[^\s*\n]+\.md)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

// ── Build ssot_map for all changed code files ──────────────────────────────
async function buildSsotMap(changedFiles) {
  const map = {};
  for (const f of changedFiles) {
    if (
      (f.startsWith('routes/') || f.startsWith('services/') || f.startsWith('core/')) &&
      (f.endsWith('.js') || f.endsWith('.mjs'))
    ) {
      const tag = await extractSsotTag(f);
      if (tag) map[f] = tag;
    }
  }
  return map;
}

// ── Run policy checks ──────────────────────────────────────────────────────
function runPolicy(changedFiles, ssotMap) {
  const violations = [];
  const warnings = [];

  for (const f of changedFiles) {
    const isCode = (f.startsWith('routes/') || f.startsWith('services/') || f.startsWith('core/')) &&
                   (f.endsWith('.js') || f.endsWith('.mjs'));
    const isAmendment = f.startsWith('docs/projects/AMENDMENT_') && f.endsWith('.md');

    if (isCode) {
      const amendment = ssotMap[f];
      if (!amendment) {
        warnings.push(`MISSING @ssot: ${f} has no @ssot tag`);
      } else if (!changedFiles.includes(amendment)) {
        violations.push({
          file: f,
          amendment,
          msg: `${f} changed but amendment ${amendment} was not updated`,
        });
      }
    }

    if (isAmendment) {
      const manifest = f.replace('.md', '.manifest.json');
      if (!changedFiles.includes(manifest)) {
        violations.push({
          file: f,
          amendment: manifest,
          msg: `Amendment ${f} changed but manifest ${manifest} was not updated`,
        });
      }
    }
  }

  return { violations, warnings };
}

// ── Main ───────────────────────────────────────────────────────────────────
console.log(`\n${C.bold}SSOT Coupling Check${C.reset} ${checkAll ? C.dim + '(all files)' : C.dim + '(staged changes)'}${C.reset}`);
console.log(`${C.dim}${'─'.repeat(50)}${C.reset}`);

const changedFiles = getChangedFiles();

if (changedFiles.length === 0) {
  console.log(`${C.dim}No changed files to check.${C.reset}\n`);
  process.exit(0);
}

console.log(`${C.dim}Checking ${changedFiles.length} file(s)...${C.reset}`);

const ssotMap = await buildSsotMap(changedFiles);
const { violations, warnings } = runPolicy(changedFiles, ssotMap);

if (warnings.length > 0) {
  console.log(`\n${C.yellow}Warnings (${warnings.length}):${C.reset}`);
  for (const w of warnings) console.log(`  ${C.yellow}⚠${C.reset} ${w}`);
}

if (violations.length === 0) {
  console.log(`\n${C.green}✔ All coupling rules satisfied${C.reset}\n`);
  process.exit(0);
}

console.log(`\n${C.red}✘ Coupling violations (${violations.length}):${C.reset}`);
for (const v of violations) {
  console.log(`\n  ${C.red}✗${C.reset} ${C.bold}${v.msg}${C.reset}`);
  console.log(`    ${C.cyan}Fix:${C.reset} Update the amendment's "Last Updated" date and add a change receipt entry.`);
}

console.log('');
if (warnOnly) {
  console.log(`${C.yellow}(--warn-only mode: exiting 0)${C.reset}\n`);
  process.exit(0);
}
process.exit(1);
