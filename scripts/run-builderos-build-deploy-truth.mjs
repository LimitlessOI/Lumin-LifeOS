#!/usr/bin/env node
/**
 * SYNOPSIS: BuilderOS build/deploy truth receipt.
 * Explicit commit/origin/deploy/runtime proof; fails closed when live transport evidence is missing.
 * @ssot builderos-reboot/MISSIONS/FACTORY-BUILDEROS-AUTONOMY-CLOSURE-0001/BLUEPRINT.json
 */
import 'dotenv/config';
import './lib/load-builderos-env.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  BUILD_PROOF_STATES,
  createBuildProofRecord,
  deriveBuildProofVerdict,
  evaluateBuildProof,
} from '../services/build-proof-contract.js';
import { syncMissionFromTechnicalReceipt } from '../services/bp-priority-sync.js';
import { appendRealityRecordFromReceipt } from '../services/reality-ledger.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RECEIPT = path.join(ROOT, 'products/receipts/BUILDEROS_BUILD_DEPLOY_TRUTH.json');
const FETCH_TIMEOUT_MS = Number(process.env.BUILDEROS_PROOF_FETCH_TIMEOUT_MS || 15000);

function runGit(args) {
  return spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' });
}

function cmdOut(args) {
  const r = runGit(args);
  return r.status === 0 ? String(r.stdout || '').trim() : null;
}

function shaPrefix(a, b) {
  if (!a || !b) return false;
  return a.slice(0, 12) === b.slice(0, 12) || a.startsWith(b) || b.startsWith(a);
}

async function fetchReady(baseUrl, key) {
  const paths = ['/api/v1/lifeos/builder/ready', '/ready'];
  const errors = [];
  for (const route of paths) {
    try {
      const res = await fetch(`${baseUrl}${route}`, {
        headers: key ? { 'x-command-key': key } : {},
        cache: 'no-store',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (res.status === 404) continue;
      const body = await res.json().catch(() => ({}));
      const deploySha =
        body?.codegen?.deploy_commit_sha
        || body?.builder?.deploy_commit_sha
        || body?.deploy_commit_sha
        || null;
      return { status: res.status, route, body, deploySha, timeout: false, error: null };
    } catch (error) {
      errors.push({
        route,
        timeout: error?.name === 'TimeoutError',
        error: error?.message || String(error),
      });
    }
  }
  const first = errors[0] || null;
  return {
    status: 404,
    route: first?.route || null,
    body: null,
    deploySha: null,
    timeout: errors.some((entry) => entry.timeout === true),
    error: errors.map((entry) => `${entry.route}:${entry.error}`).join('; ') || null,
  };
}

const baseUrl = String(process.env.PUBLIC_BASE_URL || process.env.BUILDER_BASE_URL || '').replace(/\/$/, '');
const commandKey = process.env.COMMAND_CENTER_KEY || process.env.LIFEOS_KEY || process.env.API_KEY || '';
const localHead = cmdOut(['rev-parse', 'HEAD']);
runGit(['fetch', 'origin', 'main']);
const originMain = cmdOut(['rev-parse', 'origin/main']);
const originContainsCommit = Boolean(localHead) && runGit(['merge-base', '--is-ancestor', localHead, 'origin/main']).status === 0;

const report = {
  schema: 'builderos_build_deploy_truth_v1',
  at: new Date().toISOString(),
  ok: false,
  verdict: 'FAIL',
  blocker: null,
  proof: {
    commit_sha: localHead,
    origin_main_sha: originMain,
    origin_contains_commit: originContainsCommit,
    deploy_required: true,
    deploy_sha: null,
    deploy_matches_origin_main: false,
    runtime_probe_url: null,
    runtime_probe_ok: false,
    runtime_behavior_verified: false,
    transport_status: null,
  },
};

if (!baseUrl || !commandKey) {
  report.blocker = 'LIVE_ENV_MISSING';
  fs.mkdirSync(path.dirname(RECEIPT), { recursive: true });
  fs.writeFileSync(RECEIPT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  process.exit(1);
}

const ready = await fetchReady(baseUrl, commandKey);
report.proof.deploy_sha = ready.deploySha;
report.proof.runtime_probe_url = ready.route ? `${baseUrl}${ready.route}` : null;
report.proof.runtime_probe_ok = ready.status === 200;
report.proof.deploy_matches_origin_main = shaPrefix(ready.deploySha, originMain);
report.proof.runtime_behavior_verified = ready.status === 200 && report.proof.deploy_matches_origin_main === true;
report.proof.runtime_probe_timeout = ready.timeout === true;
report.proof.runtime_probe_error = ready.error || null;

const proof = evaluateBuildProof({
  codeChanging: true,
  alreadyPresent: false,
  commitSha: localHead,
  originContainsCommit,
  deployIdentifier: 'railway',
  deployShaSeen: ready.deploySha,
  expectedDeploySha: originMain,
  deployRequired: true,
  deployMatchesOriginMain: report.proof.deploy_matches_origin_main,
  runtimeBehaviorVerified: report.proof.runtime_behavior_verified,
});
const buildRecord = createBuildProofRecord({
  jobId: 'FACTORY-BUILDEROS-AUTONOMY-CLOSURE-0001-DEPLOY-TRUTH',
  codeChanging: true,
  alreadyPresent: false,
  commitSha: localHead,
  originContainsCommit,
  deployRequired: true,
  deployIdentifier: 'railway',
  deployShaSeen: ready.deploySha,
  expectedDeploySha: originMain,
  deployMatchesOriginMain: report.proof.deploy_matches_origin_main,
  runtimeBehaviorVerified: report.proof.runtime_behavior_verified,
});
const proofVerdict = deriveBuildProofVerdict(buildRecord);

report.proof.transport_status = proof.transport_status;
report.proof.record = buildRecord;
report.ok = proofVerdict === BUILD_PROOF_STATES.PASS;
report.verdict = proofVerdict;
if (!report.ok) {
  report.blocker = proof.fail_code || proof.transport_status || proofVerdict || 'BUILD_DEPLOY_TRUTH_FAILED';
  if (ready.timeout) {
    report.blocker = 'READY_ENDPOINT_TIMEOUT';
  }
}
report.ready_snapshot = ready.body ? {
  route: ready.route,
  status: ready.status,
  deploy_commit_sha: ready.deploySha,
} : null;
report.completed_at = report.at;
report.git_sha = localHead;
report.production_base = baseUrl;
if (report.verdict === BUILD_PROOF_STATES.PASS) {
  report.bp_sync = syncMissionFromTechnicalReceipt({
    missionId: 'FACTORY-BUILDEROS-AUTONOMY-CLOSURE-0001-DEPLOY-TRUTH',
    receipt: report,
    root: ROOT,
    buildRecord: {
      ...buildRecord,
      build_method: 'system-build',
      note: 'Internal BuilderOS build/deploy/runtime proof.',
    },
  });
}

fs.mkdirSync(path.dirname(RECEIPT), { recursive: true });
fs.writeFileSync(RECEIPT, `${JSON.stringify(report, null, 2)}\n`);
try {
  appendRealityRecordFromReceipt('products/receipts/BUILDEROS_BUILD_DEPLOY_TRUTH.json', {
    owner: 'build-deploy-truth',
    expected_outcome: 'DEPLOY_SYNC_PASS or LIVE_BEHAVIOR_PASS',
    actual_outcome: report.proof.transport_status || report.verdict,
    statement: `Build/deploy truth ${report.verdict} at ${report.at}`,
  });
} catch (ledgerErr) {
  report.reality_ledger_warning = ledgerErr.message;
  fs.writeFileSync(RECEIPT, `${JSON.stringify(report, null, 2)}\n`);
}
console.log(JSON.stringify(report, null, 2));
process.exit(0);
