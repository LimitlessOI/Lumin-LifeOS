#!/usr/bin/env node
/**
 * SYNOPSIS: Blocks a large hand-authored services/routes/middleware change from
 * riding through on a bare GAP-FILL: label with no real justification, and
 * durably logs every such change to an audit ledger.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 *
 * Root cause this closes: SO-001 requires load-bearing services/routes/middleware
 * modules to be built through the governed factory so SENTRY proves them
 * independently. Hand-authoring is a DRIFT VIOLATION. The existing §2.11 gate
 * (githooks/commit-msg) only checks that a commit message CONTAINS "GAP-FILL:" —
 * it never checks how much production logic that label is covering, or records
 * it anywhere durable. A 2026-07-20 independent audit rated this gap 4/10 and
 * explicitly flagged it as still open: "nothing stops an agent from hand-authoring
 * real working services/routes code with an honest GAP-FILL: message." This adds
 * a deterministic size threshold (new file, or a real-code diff over the line
 * threshold) that requires an explicit HAND-AUTHORED-JUSTIFICATION: line and
 * appends every such commit to docs/products/builderos/GAP_FILL_LEDGER.json —
 * turning an unenforceable prevention into at minimum an unfakeable audit trail
 * the Architect/Chair can review after the fact (the Observer Principle).
 *
 * Deliberately NOT solved by this script (labeled honestly, not oversold): true
 * semantic classification of "orchestration/glue" (allowed to hand-write) vs
 * "load-bearing logic" (must go through the factory) is a judgment call, not a
 * deterministic one. This gate uses a line-count proxy, which is gameable by
 * splitting a large change into several small commits. Closing that fully would
 * need either a cross-model judgment gate (SO-003: never cheap-tier) or diffing
 * against the actual governed-factory exact-seal artifacts to prove non-factory
 * provenance -- both real, harder follow-ups, not done here.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LEDGER_PATH = path.join(ROOT, 'docs/products/builderos/GAP_FILL_LEDGER.json');
const LOAD_BEARING_PATTERN = /^(services|routes|middleware)\/.*\.js$/;
const REAL_LINE_THRESHOLD = 15;
const JUSTIFICATION_MARKER = /HAND-AUTHORED-JUSTIFICATION:\s*(.{20,})/s;

function readCommitMessage() {
  const file = process.argv[2];
  if (file && fs.existsSync(file)) return fs.readFileSync(file, 'utf8');
  return fs.readFileSync(0, 'utf8');
}

function countRealAddedLines(diffText) {
  return diffText
    .split('\n')
    .filter((line) => line.startsWith('+') && !line.startsWith('+++'))
    .map((line) => line.slice(1).trim())
    .filter((line) => line.length > 0 && !line.startsWith('//') && !line.startsWith('*') && !line.startsWith('/*'))
    .length;
}

function appendToLedger(entries) {
  let ledger = { entries: [] };
  if (fs.existsSync(LEDGER_PATH)) {
    try {
      ledger = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));
    } catch {
      ledger = { entries: [] };
    }
  }
  if (!Array.isArray(ledger.entries)) ledger.entries = [];
  ledger.entries.push(...entries);
  fs.mkdirSync(path.dirname(LEDGER_PATH), { recursive: true });
  fs.writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, 2) + '\n');
  execSync(`git add ${JSON.stringify(path.relative(ROOT, LEDGER_PATH))}`, { cwd: ROOT });
}

function main() {
  const message = readCommitMessage();
  const isSystemBuild = /\[system-build\]/.test(message);
  if (isSystemBuild) {
    // Factory-authored commits are exempt -- SENTRY already independently proved these.
    process.exit(0);
  }
  const isGapFill = /GAP-FILL:/.test(message);
  if (!isGapFill) {
    process.exit(0); // not a hand-authored claim at all -- out of scope for this gate
  }

  let stagedFiles;
  try {
    const out = execSync('git diff --cached --name-only --diff-filter=ACM', { cwd: ROOT, encoding: 'utf8' });
    stagedFiles = out.split('\n').map((l) => l.trim()).filter(Boolean);
  } catch {
    process.exit(0); // can't verify -- fail open rather than block on tooling error
  }

  const loadBearingFiles = stagedFiles.filter((f) => LOAD_BEARING_PATTERN.test(f));
  if (loadBearingFiles.length === 0) {
    process.exit(0);
  }

  let headFiles = new Set();
  try {
    const out = execSync('git ls-tree -r --name-only HEAD', { cwd: ROOT, encoding: 'utf8' });
    headFiles = new Set(out.split('\n').map((l) => l.trim()));
  } catch {
    /* first commit or detached weirdness -- treat everything as new below */
  }

  const flagged = [];
  for (const file of loadBearingFiles) {
    const isNewFile = !headFiles.has(file);
    let addedLines = 0;
    try {
      const diff = execSync(`git diff --cached -- ${JSON.stringify(file)}`, { cwd: ROOT, encoding: 'utf8' });
      addedLines = countRealAddedLines(diff);
    } catch {
      addedLines = 0;
    }
    if (isNewFile || addedLines > REAL_LINE_THRESHOLD) {
      flagged.push({ file, isNewFile, addedLines });
    }
  }

  if (flagged.length === 0) {
    process.exit(0); // small glue edits stay frictionless, matching SO-001's own "orchestration/glue" allowance
  }

  const justificationMatch = message.match(JUSTIFICATION_MARKER);
  if (!justificationMatch) {
    process.stderr.write('\n');
    process.stderr.write('❌ SO-001 SIZE GATE — COMMIT BLOCKED\n\n');
    process.stderr.write('   This GAP-FILL commit hand-authors substantial load-bearing code:\n\n');
    for (const f of flagged) {
      process.stderr.write(`     ${f.file}${f.isNewFile ? ' (new file)' : ` (+${f.addedLines} real lines)`}\n`);
    }
    process.stderr.write('\n');
    process.stderr.write('   SO-001: new services/routes/middleware modules that codegen could author\n');
    process.stderr.write('   MUST be built through the governed factory. If this really is an allowed\n');
    process.stderr.write('   hand-write (orchestration/glue, not load-bearing logic), say exactly why\n');
    process.stderr.write('   by adding to the commit message:\n\n');
    process.stderr.write('     HAND-AUTHORED-JUSTIFICATION: <specific reason this is glue, not logic,\n');
    process.stderr.write('     and why the factory could not or should not build it instead>\n\n');
    process.stderr.write('   This gets logged permanently to docs/products/builderos/GAP_FILL_LEDGER.json\n');
    process.stderr.write('   for later Architect/Chair review -- it does not silently disappear into git log.\n\n');
    process.exit(1);
  }

  const nowIso = new Date().toISOString();
  const entries = flagged.map((f) => ({
    at: nowIso,
    file: f.file,
    is_new_file: f.isNewFile,
    added_real_lines: f.addedLines,
    justification: justificationMatch[1].trim().slice(0, 2000),
    commit_message_excerpt: message.split('\n')[0].slice(0, 200),
  }));
  appendToLedger(entries);
  process.exit(0);
}

main();
