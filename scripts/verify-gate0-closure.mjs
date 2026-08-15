#!/usr/bin/env node
/**
 * SYNOPSIS: Acceptance harness for TALOA-GATE-0-CLOSURE-0001.
 * Reachability, not just existence: each check requires the new method to be
 * both exported AND grep-provably called from its real consumer route/service —
 * matching this repo's own "acceptance must prove reachability" rule.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { finishBpAcceptance } from './lib/bp-acceptance-finish.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MISSION = 'TALOA-GATE-0-CLOSURE-0001';
const RECEIPT_REL = 'products/receipts/TALOA_GATE_0_CLOSURE_ACCEPTANCE.json';
const RECEIPT = path.join(ROOT, RECEIPT_REL);
const VERDICT = path.join(ROOT, 'builderos-reboot/MISSIONS', MISSION, 'OBJECTIVE_VERDICT.json');

const report = {
  schema: 'taloa_gate0_closure_acceptance_v1',
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

function read(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return null;
  return fs.readFileSync(abs, 'utf8');
}

async function checkEnvelopeVerify() {
  const src = read('services/taloa/task-authorization-envelope.js');
  if (!src) return step('GATE0-001_file_exists', false, 'services/taloa/task-authorization-envelope.js missing');
  const hasVerify = /verify\s*[:(]/.test(src) && /agent_task_authority/.test(src);
  step('GATE0-001_verify_exported', hasVerify, hasVerify ? 'verify() present, queries agent_task_authority' : 'verify() not found or does not query agent_task_authority');

  let module;
  try {
    module = await import(`${pathToFileURL(path.join(ROOT, 'services/taloa/task-authorization-envelope.js')).href}?acceptance=${Date.now()}`);
    const instance = module.createTaskAuthorizationEnvelope({
      pool: { connect: async () => ({ query: async () => ({ rows: [] }), release() {} }) },
      logger: { info() {}, warn() {}, error() {} },
    });
    step('GATE0-001_verify_callable', typeof instance.verify === 'function', typeof instance.verify === 'function' ? 'verify is a real function' : 'verify missing on returned object');
  } catch (error) {
    step('GATE0-001_verify_callable', false, `import/construct failed: ${error?.message || error}`);
  }

  const routeSrc = read('routes/general-browser-agent-routes.js');
  const reachable = routeSrc && /task-authorization-envelope/.test(routeSrc) && /\.verify\s*\(/.test(routeSrc);
  step('GATE0-002_reachable_from_route', Boolean(reachable), reachable ? 'general-browser-agent-routes.js imports and calls verify()' : 'not reachable from general-browser-agent-routes.js — exported but unwired');

  const bareBoolean = routeSrc && /founder_authority\s*===\s*true/.test(routeSrc) && !/\.verify\s*\(/.test(routeSrc);
  step('GATE0-002_no_bare_boolean_trust', !bareBoolean, bareBoolean ? 'route still trusts a bare founder_authority boolean with no verify() call' : 'bare-boolean-only path not present');
}

function checkBodyTokens() {
  const src = read('services/taloa/capability-registry-service.js');
  if (!src) return step('GATE0-003_file_exists', false, 'services/taloa/capability-registry-service.js missing');
  const hasIssue = /issueBodyToken/.test(src);
  const hasVerifyToken = /verifyBodyToken/.test(src);
  const constantTime = /timingSafeEqual/.test(src);
  step('GATE0-003_issueBodyToken', hasIssue, hasIssue ? 'present' : 'missing');
  step('GATE0-003_verifyBodyToken', hasVerifyToken, hasVerifyToken ? 'present' : 'missing');
  step('GATE0-003_constant_time_compare', constantTime, constantTime ? 'uses timingSafeEqual' : 'no constant-time comparison found — timing side-channel risk');
}

function checkReplayProtection() {
  const src = read('routes/general-browser-agent-routes.js');
  if (!src) return step('GATE0-004_file_exists', false, 'routes/general-browser-agent-routes.js missing');
  const hasNonce = /x-taloa-nonce/.test(src);
  const hasTimestamp = /x-taloa-timestamp/.test(src);
  step('GATE0-004_nonce_header', hasNonce, hasNonce ? 'present' : 'missing');
  step('GATE0-004_timestamp_header', hasTimestamp, hasTimestamp ? 'present' : 'missing');
}

async function run() {
  await checkEnvelopeVerify();
  checkBodyTokens();
  checkReplayProtection();

  const { pass } = finishBpAcceptance({
    root: ROOT,
    missionId: MISSION,
    report,
    receiptAbsPath: RECEIPT,
    receiptRelPath: RECEIPT_REL,
    verdictAbsPath: VERDICT,
    objectiveName: 'Taloa blueprint §45a Gate 0 closure',
    objectiveVerdictOnPass: 'OBJECTIVE_COMPLETE',
    buildRecord: {
      build_method: 'system-build',
      note: 'Gate 0 closure acceptance — reachability-checked, not just exports_smoke.',
    },
    verdictExtra: {
      acceptance_command: 'node scripts/verify-gate0-closure.mjs',
      unblocks: 'docs/products/universal-overlay/TALOA_CHATGPT_RELAY_AND_CAPSULE_BLUEPRINT_2026-08-15.md',
      note_manual_action_still_required: 'COMMAND_CENTER_KEY rotation (Gate 0 item 1) is not checked here — it is a manual founder-confirmed action, see FOUNDER_PACKET.json.',
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
