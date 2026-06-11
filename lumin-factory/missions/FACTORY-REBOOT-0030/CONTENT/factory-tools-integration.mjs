#!/usr/bin/env node
/** Integration: upstream gates, SENTRY depth, Historian, C2, truth reconcile. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
process.chdir(REPO_ROOT);

const historianPath = path.join(REPO_ROOT, 'factory-staging/data/historian-records.jsonl');
const sentryPath = path.join(REPO_ROOT, 'factory-staging/data/sentry-reviews.jsonl');
const beforeHist = fs.existsSync(historianPath) ? fs.statSync(historianPath).size : 0;
const beforeSentry = fs.existsSync(sentryPath) ? fs.statSync(sentryPath).size : 0;

const { runBpbIntakeGate } = await import('../../factory-staging/factory-core/bpb/intake-gate.js');
const { reconcileRemoteTruth } = await import('../../factory-staging/factory-core/readiness/remote-truth-reconciler.js');
const { getC2SurfaceStatus } = await import('../../factory-staging/factory-core/lifeos/c2-surface.js');
const { dispatchExecuteStep, resolveRepoPath } = await import('../../factory-staging/factory-core/builder/run-step.js');
const { summarizeHistorian } = await import('../../factory-staging/factory-core/historian/append-record.js');

const intake = runBpbIntakeGate('FACTORY-REBOOT-0005');
if (!intake.ok) {
  console.error('FAIL intake gate 0005', intake.violations);
  process.exit(1);
}

const c2 = getC2SurfaceStatus();
if (!c2.artifacts.charter || !c2.artifacts.state_model) {
  console.error('FAIL c2 surface', c2);
  process.exit(1);
}

const truth = reconcileRemoteTruth();
if (!truth.sources.readiness) {
  console.error('FAIL truth reconcile missing readiness');
  process.exit(1);
}

const sourceRel = 'builderos-reboot/MISSIONS/FACTORY-REBOOT-0005/CONTENT/proof-source.txt';
const targetRel = 'factory-staging/test-fixtures/tools-proof-output.txt';
const sourceBytes = fs.readFileSync(resolveRepoPath(sourceRel));
const expectedSha = crypto.createHash('sha256').update(sourceBytes).digest('hex');

const step = {
  step_id: 'TOOLS-INTEGRATION-001',
  action_type: 'write_file_exact',
  target_file: targetRel,
  sandbox_boundary: 'factory-staging/**',
  exact_inputs: { content_source_path: sourceRel },
  exact_output_contract: { type: 'byte_exact_copy', sha256: expectedSha },
};

if (fs.existsSync(resolveRepoPath(targetRel))) fs.unlinkSync(resolveRepoPath(targetRel));

const { httpStatus, body } = dispatchExecuteStep({
  mission_id: 'FACTORY-REBOOT-0005',
  blueprint_id: 'tools-integration',
  step,
});

if (httpStatus !== 200 || !body.historian?.recorded || !body.sentry?.review) {
  console.error('FAIL dispatch full pipeline', httpStatus, body);
  process.exit(1);
}

if (fs.statSync(historianPath).size <= beforeHist) {
  console.error('FAIL historian not appended');
  process.exit(1);
}

if (fs.statSync(sentryPath).size <= beforeSentry) {
  console.error('FAIL sentry review not appended');
  process.exit(1);
}

const summary = summarizeHistorian();
if (summary.total_records < 1) {
  console.error('FAIL historian summary');
  process.exit(1);
}

console.log('PASS factory tools integration');
console.log(`  historian=${summary.total_records} sentry_review=${body.sentry.review.implementation_status}`);
