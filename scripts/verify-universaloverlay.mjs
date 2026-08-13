#!/usr/bin/env node
/**
 * SYNOPSIS: Acceptance harness for TALOA-OVERLAY-P1-0001 (Phase 1 foundation).
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { finishBpAcceptance } from './lib/bp-acceptance-finish.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MISSION = 'TALOA-OVERLAY-P1-0001';
const RECEIPT_REL = 'products/receipts/TALOA_OVERLAY_P1_ACCEPTANCE.json';
const RECEIPT = path.join(ROOT, RECEIPT_REL);
const VERDICT = path.join(ROOT, 'builderos-reboot/MISSIONS', MISSION, 'OBJECTIVE_VERDICT.json');

const report = {
  schema: 'taloa_overlay_p1_acceptance_v1',
  mission_id: MISSION,
  started_at: new Date().toISOString(),
  tests_passed: [],
  tests_failed: [],
  steps: [],
};

function step(name, ok, detail) {
  report.steps.push({ step: name, ok, detail, at: new Date().toISOString() });
  (ok ? report.tests_passed : report.tests_failed).push(name);
}

async function existsOnGitHub(filePath) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return false;
  try {
    const res = await fetch(`https://api.github.com/repos/LimitlessOI/Lumin-LifeOS/contents/${filePath}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.size > 10;
  } catch {
    return false;
  }
}

async function checkFile(filePath, validator) {
  const abs = path.join(ROOT, filePath);
  if (fs.existsSync(abs)) {
    return validator(abs);
  }
  if (await existsOnGitHub(filePath)) {
    step(filePath, true, 'exists on GitHub');
    return;
  }
  step(filePath, false, 'missing');
}

async function run() {
  await checkFile('db/migrations/20260704_initial_setup.sql', (abs) => {
    const c = fs.readFileSync(abs, 'utf8');
    step(abs, /CREATE\s+TABLE/i.test(c), /CREATE\s+TABLE/i.test(c) ? 'has CREATE TABLE' : 'no CREATE TABLE');
  });
  await checkFile('services/lifeos-extension-routes.js', (abs) => {
    try {
      execSync(`node -c "${abs}"`, { encoding: 'utf8', stdio: 'pipe' });
      step(abs, true, 'syntax OK');
    } catch (e) {
      step(abs, false, String(e.message || e).split('\n')[0]);
    }
  });
  await checkFile('public/overlay/lifeos-app.html', (abs) => {
    const c = fs.readFileSync(abs, 'utf8');
    step(abs, c.length > 50, `${c.length} bytes`);
  });
  await checkFile('public/overlay/extension/frame.html', (abs) => {
    const c = fs.readFileSync(abs, 'utf8');
    step(abs, c.length > 50, `${c.length} bytes`);
  });

  const { pass } = finishBpAcceptance({
    root: ROOT,
    missionId: MISSION,
    report,
    receiptAbsPath: RECEIPT,
    receiptRelPath: RECEIPT_REL,
    verdictAbsPath: VERDICT,
    objectiveName: 'Taloa Overlay Phase 1 foundation',
    objectiveVerdictOnPass: 'OBJECTIVE_COMPLETE',
    buildRecord: {
      build_method: 'system-build',
      note: 'Phase 1 foundation acceptance harness — structural file presence + syntax.',
    },
    verdictExtra: {
      acceptance_command: 'node scripts/verify-universaloverlay.mjs',
    },
  });

  console.log(`\nResults: ${report.tests_passed.length} passed, ${report.tests_failed.length} failed`);
  if (!pass) {
    console.error('FAILURES:', report.tests_failed.join('; '));
    process.exit(1);
  }
  console.log('ALL CHECKS PASSED');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
