#!/usr/bin/env node
/**
 * SYNOPSIS: Acceptance harness for TALOA-CHATGPT-RELAY-0001 (server-side orchestration only).
 * This does NOT and cannot verify the live ChatGPT relay -- it verifies the
 * Node orchestration service exists, exports the right shape, and routes
 * authorization through the real envelope.verify() primitive. See
 * FOUNDER_PACKET.json non_goals.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { finishBpAcceptance } from './lib/bp-acceptance-finish.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MISSION = 'TALOA-CHATGPT-RELAY-0001';
const RECEIPT_REL = 'products/receipts/TALOA_CHATGPT_RELAY_ACCEPTANCE.json';
const RECEIPT = path.join(ROOT, RECEIPT_REL);
const VERDICT = path.join(ROOT, 'builderos-reboot/MISSIONS', MISSION, 'OBJECTIVE_VERDICT.json');

const report = {
  schema: 'taloa_chatgpt_relay_acceptance_v1',
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
  return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null;
}

async function checkRelayService() {
  const src = read('services/taloa/chatgpt-relay-service.js');
  if (!src) return step('RELAY-001_file_exists', false, 'services/taloa/chatgpt-relay-service.js missing');
  step('RELAY-001_file_exists', true, 'present');

  const methods = ['startRelayTask', 'recordTurn', 'getRelayState', 'authorizeAction'];
  for (const m of methods) {
    step(`RELAY-001_${m}_declared`, src.includes(m), src.includes(m) ? 'present' : 'missing from source');
  }
  const usesEnvelope = /envelope\.verify\s*\(/.test(src);
  step('RELAY-001_authorization_uses_envelope_verify', usesEnvelope, usesEnvelope ? 'authorizeAction calls envelope.verify()' : 'no envelope.verify() call found -- authorization may be a bare boolean');

  let module;
  try {
    module = await import(`${pathToFileURL(path.join(ROOT, 'services/taloa/chatgpt-relay-service.js')).href}?acceptance=${Date.now()}`);
    const stubPool = { connect: async () => ({ query: async () => ({ rows: [] }), release() {} }), query: async () => ({ rows: [] }) };
    const stubEnvelope = { create: async () => 'stub-id', verify: async () => ({ authorized: true, reason: 'stub', envelope_id: 'stub-id' }) };
    const instance = module.createChatGptRelayService({ pool: stubPool, logger: { info() {}, warn() {}, error() {} }, envelope: stubEnvelope });
    for (const m of methods) {
      step(`RELAY-001_${m}_callable`, typeof instance[m] === 'function', typeof instance[m] === 'function' ? 'real function' : 'not a function on returned object');
    }
  } catch (error) {
    step('RELAY-001_constructs', false, `import/construct failed: ${error?.message || error}`);
  }
}

function checkMigration() {
  const src = read('db/migrations/20260816000001_create_taloa_chatgpt_relay_turns_table.sql');
  if (!src) return step('RELAY-002_file_exists', false, 'migration missing');
  step('RELAY-002_file_exists', true, 'present');
  step('RELAY-002_creates_table', /CREATE TABLE IF NOT EXISTS\s+taloa_chatgpt_relay_turns/i.test(src), 'checked for idempotent CREATE TABLE');
}

async function run() {
  await checkRelayService();
  checkMigration();

  const { pass } = finishBpAcceptance({
    root: ROOT,
    missionId: MISSION,
    report,
    receiptAbsPath: RECEIPT,
    receiptRelPath: RECEIPT_REL,
    verdictAbsPath: VERDICT,
    objectiveName: 'Taloa ChatGPT relay -- server-side orchestration',
    objectiveVerdictOnPass: 'OBJECTIVE_COMPLETE',
    buildRecord: {
      build_method: 'system-build',
      note: 'Orchestration-layer acceptance only. Does not verify the live relay -- see FOUNDER_PACKET.json non_goals.',
    },
    verdictExtra: {
      acceptance_command: 'node scripts/verify-chatgpt-relay-service.mjs',
      scope_note: 'Server-side orchestration + authorization only. Native macOS UI-control code is separate, unbuilt-by-this-mission work verifiable only on a real Mac.',
    },
  });

  console.log(`\nResults: ${report.tests_passed.length} passed, ${report.tests_failed.length} failed`);
  if (!pass) {
    console.error('FAILURES:', report.tests_failed.join('; '));
    process.exit(1);
  }
  console.log('ALL CHECKS PASSED (orchestration layer only -- see scope note)');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
