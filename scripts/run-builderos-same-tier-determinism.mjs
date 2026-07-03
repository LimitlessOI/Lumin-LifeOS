#!/usr/bin/env node
/**
 * SYNOPSIS: BuilderOS same-tier determinism proof.
 * Fails closed unless the determinism run is explicitly locked to the same intended coder tier.
 * @ssot builderos-reboot/MISSIONS/FACTORY-BUILDEROS-AUTONOMY-CLOSURE-0001/BLUEPRINT.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolveBuilderTierLock } from '../config/builderos-tier-lock.js';
import { syncMissionFromTechnicalReceipt } from '../services/bp-priority-sync.js';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RECEIPT = path.join(ROOT, 'products/receipts/BUILDEROS_SAME_TIER_DETERMINISM.json');

function readJson(relPath) {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf8'));
  } catch {
    return null;
  }
}

const { intended: intendedTier, test: testTier, stronger: strongerTier } = resolveBuilderTierLock();

const report = {
  schema: 'builderos_same_tier_determinism_v1',
  at: new Date().toISOString(),
  ok: false,
  verdict: 'FAIL',
  blocker: null,
  intended_coder_tier: intendedTier || null,
  determinism_test_tier: testTier || null,
  stronger_model_tier: strongerTier || null,
  mechanical_proxy: null,
  note: 'Full cold-coder same-tier proof is distinct from mechanical determinism proxy.',
};

if (!intendedTier || !testTier) {
  report.blocker = 'MISSING_TIER_LOCK';
} else if (strongerTier && strongerTier === testTier) {
  report.blocker = 'STRONGER_TIER_SELECTED';
} else if (intendedTier !== testTier) {
  report.blocker = 'TEST_TIER_DIFFERS_FROM_INTENDED_CODER_TIER';
} else {
  const run = spawnSync('node', ['builderos-reboot/scripts/run-determinism-mechanical.mjs'], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: 'pipe',
    timeout: 2 * 60 * 1000,
  });
  const mechanical = readJson('builderos-reboot/DETERMINISM_RECEIPT.json');
  report.mechanical_proxy = {
    exit: run.status,
    pass: mechanical?.pass === true,
    mission_id: mechanical?.mission_id || null,
    note: mechanical?.note || null,
  };
  if (run.status === 0 && mechanical?.pass === true) {
    report.ok = true;
    report.verdict = 'PASS';
  } else {
    report.blocker = 'MECHANICAL_PROXY_FAILED';
  }
}

report.completed_at = report.at;
try {
  report.git_sha = execSync('git rev-parse HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
} catch {
  report.git_sha = null;
}
report.production_base = process.env.PUBLIC_BASE_URL || 'https://lumin-web-production-e3a9.up.railway.app';
if (report.verdict === 'PASS') {
  report.bp_sync = syncMissionFromTechnicalReceipt({
    missionId: 'FACTORY-BUILDEROS-AUTONOMY-CLOSURE-0001-SAME-TIER',
    receipt: report,
    root: ROOT,
    buildRecord: {
      build_method: 'system-build',
      note: 'Internal BuilderOS same-tier determinism mechanical proxy.',
    },
  });
}

fs.mkdirSync(path.dirname(RECEIPT), { recursive: true });
fs.writeFileSync(RECEIPT, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
