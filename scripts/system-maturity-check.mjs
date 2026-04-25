#!/usr/bin/env node
/**
 * One-shot: run the main repo quality gates in order. Exit 1 on first failure.
 *
 * Modes:
 *   Default: runs `lifeos-verify` only if DATABASE_URL + COMMAND_CENTER_KEY + (any AI key) are set; otherwise skip with a message.
 *   CI (`CI=true` or `GITHUB_ACTIONS`): skips `lifeos-verify` (needs secrets) — run full verify locally.
 *
 * @ssot docs/SYSTEM_MATURITY_PROGRAM.md
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const inCi = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
const steps = [];

function run(name, file, fileArgs) {
  const r = spawnSync(process.execPath, [file, ...fileArgs], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  const ok = r.status === 0;
  steps.push({ name, ok, status: r.status });
  return ok;
}

function runNpm(scriptName) {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const r = spawnSync(npm, ['run', scriptName, '--silent'], { cwd: ROOT, stdio: 'inherit' });
  const ok = r.status === 0;
  steps.push({ name: `npm run ${scriptName}`, ok, status: r.status });
  return ok;
}

function main() {
  console.log(
    inCi
      ? '=== system-maturity-check (CI mode) ===\n'
      : '=== system-maturity-check (local) ===\n',
  );

  if (!runNpm('test')) {
    process.exit(1);
  }
  if (!run('handoff self-test', path.join(ROOT, 'scripts', 'handoff-self-test.mjs'), [])) {
    process.exit(1);
  }

  const preflight = path.join(ROOT, 'scripts', 'council-builder-preflight.mjs');
  const canBuilderProbe =
    !inCi &&
    existsSync(preflight) &&
    (process.env.PUBLIC_BASE_URL || process.env.BUILDER_BASE_URL) &&
    (process.env.COMMAND_CENTER_KEY || process.env.LIFEOS_KEY);
  if (canBuilderProbe) {
    const r = spawnSync(process.execPath, [preflight], { cwd: ROOT, stdio: 'inherit' });
    if (r.status !== 0) {
      console.log(
        '\n[warn] builder:preflight — system build path not verified this run. See: npm run builder:preflight, CLAUDE.md §2.11',
      );
    }
  } else if (!inCi) {
    console.log(
      '\n[info] Maturity: skipped builder:preflight (set PUBLIC_BASE_URL or BUILDER_BASE_URL + COMMAND_CENTER_KEY to run).',
    );
  }

  if (inCi) {
    console.log(
      '\n[CI] Skipping lifeos-verify — set DATABASE_URL + keys on an operator machine and run: node scripts/lifeos-verify.mjs',
    );
  } else {
    const canLifeos = Boolean(
      process.env.DATABASE_URL?.trim() && process.env.COMMAND_CENTER_KEY?.trim()
    );
    const hasAi = [
      'ANTHROPIC_API_KEY',
      'GEMINI_API_KEY',
      'GROQ_API_KEY',
      'CEREBRAS_API_KEY',
      'GOOGLE_AI_KEY',
    ].some((k) => process.env[k]?.trim());
    if (canLifeos && hasAi) {
      if (!run('lifeos-verify', path.join(ROOT, 'scripts', 'lifeos-verify.mjs'), [])) {
        process.exit(1);
      }
    } else {
      console.log(
        '\n[skip] lifeos-verify — export DATABASE_URL, COMMAND_CENTER_KEY, and at least one AI key for full pass.',
      );
    }
  }

  const validate = path.join(ROOT, 'scripts', 'ssot-validate.mjs');
  if (existsSync(validate)) {
    if (!run('ssot:validate', validate, [])) process.exit(1);
  } else if (!run('ssot-check', path.join(ROOT, 'scripts', 'ssot-check.js'), [])) {
    process.exit(1);
  }

  const overlay = path.join(ROOT, 'scripts', 'check-overlay-syntax.js');
  if (existsSync(overlay)) {
    if (!run('check-overlay', overlay, [])) process.exit(1);
  }

  for (const rel of ['scripts/council-gate-change-run.mjs', 'scripts/system-maturity-check.mjs']) {
    const abs = path.join(ROOT, rel);
    const c = spawnSync(process.execPath, ['--check', abs], { encoding: 'utf8' });
    if (c.status !== 0) {
      console.error(c.stderr || rel);
      process.exit(1);
    }
  }

  const sjs = path.join(ROOT, 'server.js');
  try {
    if (statSync(sjs).isFile()) {
      const n = readFileSync(sjs, 'utf8').split('\n').length;
      if (n > 1800) {
        console.log(
          `\n[warn] server.js is ~${n} lines — keep composition root thin (North Star / CLAUDE.md).`,
        );
      }
    }
  } catch {
    // ignore
  }

  console.log('\nOK — system-maturity-check passed this run.\n');
  process.exit(0);
}

main();
