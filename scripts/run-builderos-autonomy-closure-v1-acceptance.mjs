#!/usr/bin/env node
/**
 * SYNOPSIS: BuilderOS autonomy closure v1 acceptance.
 * Local closure gate for canonical mission contracts; live founder/deploy proofs run separately.
 * @ssot builderos-reboot/MISSIONS/FACTORY-BUILDEROS-AUTONOMY-CLOSURE-0001/BLUEPRINT.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getCompletionState } from '../services/bp-priority-completion.js';
import { buildAttemptCarryForwardContext } from '../services/self-repair-attempt-context.js';
import { buildSelfRepairAttemptRequirements } from '../services/self-repair-escalation-policy.js';
import { buildImprovementDeltaContract } from '../services/builderos-improvement-contract.js';
import { syncMissionFromTechnicalReceipt } from '../services/bp-priority-sync.js';
import { createBuildProofRecord, deriveBuildProofVerdict } from '../services/build-proof-contract.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RECEIPT = path.join(ROOT, 'products/receipts/BUILDEROS_AUTONOMY_CLOSURE_V1_ACCEPTANCE.json');
const MISSION_ROOT = 'builderos-reboot/MISSIONS/FACTORY-BUILDEROS-AUTONOMY-CLOSURE-0001';
const CANONICAL_FOUNDER_USABILITY_CONTRACT = 'docs/products/lifere/FOUNDER_USABILITY_CONTRACT.md';
const LEGACY_FOUNDER_USABILITY_CONTRACT = 'docs/products/PRODUCT-LIFERE-OS-V1-0001/FOUNDER_USABILITY_CONTRACT.md';

function readJson(relPath) {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf8'));
  } catch {
    return null;
  }
}

function readText(relPath) {
  try {
    return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  } catch {
    return '';
  }
}

function exists(relPath) {
  return fs.existsSync(path.join(ROOT, relPath));
}

function grepMissing(pattern, relPath) {
  const text = readText(relPath);
  return !pattern.test(text);
}

function makeCheck(ok, detail, evidence = {}) {
  return { ok, detail, evidence };
}

function checkArchitectSntPromotion() {
  const packet = readText('builderos-reboot/MISSIONS/FACTORY-BUILDEROS-AUTONOMY-CLOSURE-0001/ARCHITECT_HANDOFF_PROMPT.md');
  const snt = readText('builderos-reboot/MISSIONS/FACTORY-BUILDEROS-AUTONOMY-CLOSURE-0001/SNT_HANDOFF_PROMPT.md');
  const consensus = readJson('builderos-reboot/MISSIONS/FACTORY-BUILDEROS-AUTONOMY-CLOSURE-0001/CHAIR_SNT_ARC_CONSENSUS_RECEIPT.json');
  const signoff = readJson('builderos-reboot/MISSIONS/FACTORY-BUILDEROS-AUTONOMY-CLOSURE-0001/ARC_SIGNOFF_RECEIPT.json');
  const ok = packet.includes('machine-execution')
    && /founder-surface deception/i.test(snt)
    && /transport truth/i.test(snt)
    && /stale authority/i.test(snt)
    && /soft[- ]acceptance/i.test(snt)
    && Array.isArray(signoff?.promoted_contributions)
    && signoff.promoted_contributions.includes('mandatory architect machine-execution output')
    && signoff.promoted_contributions.includes('mandatory SNT attack categories')
    && signoff.promoted_contributions.includes('receipted promotion law')
    && Array.isArray(consensus?.consensus_points)
    && consensus.consensus_points.length >= 4;
  return makeCheck(ok, ok ? 'architect handoff, SNT attack categories, and promotion receipts are frozen' : 'architect/SNT/promotion contract missing or weakened', {
    architect_handoff_prompt: exists('builderos-reboot/MISSIONS/FACTORY-BUILDEROS-AUTONOMY-CLOSURE-0001/ARCHITECT_HANDOFF_PROMPT.md'),
    snt_handoff_prompt: exists('builderos-reboot/MISSIONS/FACTORY-BUILDEROS-AUTONOMY-CLOSURE-0001/SNT_HANDOFF_PROMPT.md'),
    arc_signoff_receipt: signoff?.promoted_contributions || null,
    chair_snt_arc_consensus_actions: consensus?.consensus_points || null,
  });
}

function checkQueueTruth() {
  const bp = readJson('builderos-reboot/BP_PRIORITY.json');
  const pointB = readJson('builderos-reboot/POINT_B_TARGET.json');
  const item = bp?.items?.find((entry) => entry.mission_id === pointB?.target?.mission_id);
  const objectiveVerdict = item?.objective_verdict ? readJson(item.objective_verdict) : null;
  const state = item ? getCompletionState(item, {
    pointBTarget: pointB?.target || null,
    objectiveVerdict,
  }) : null;
  const ok = Boolean(
    state
    && state.technical_pass === true
    && state.founder_usability_pass === false
    && state.point_b_complete === false
    && state.queue_complete_for_scheduler === false
    && state.readiness_state === 'TECHNICAL_PASS_ONLY',
  );
  return makeCheck(ok, ok ? 'Point B target remains incomplete while founder usability is false' : 'queue truth drift: Point B target collapsed into complete/idle state', {
    target_mission_id: pointB?.target?.mission_id || null,
    state,
  });
}

function checkRepairCarryForward() {
  const requirements = buildSelfRepairAttemptRequirements(3);
  const good = buildAttemptCarryForwardContext({
    attemptNumber: 3,
    priorAttempts: [{ attempt: 1 }, { attempt: 2 }],
    lessonsLoaded: ['deploy-proof-gap', 'target-file-gap'],
    researchCompleted: true,
    consensusParticipants: ['gemini_flash', 'claude_sonnet'],
    proposedFix: 'retry with explicit target_file and transport proof gate',
    outcome: 'retry',
  });
  const bad = buildAttemptCarryForwardContext({
    attemptNumber: 3,
    priorAttempts: [],
    lessonsLoaded: [],
    researchCompleted: false,
    consensusParticipants: [],
    proposedFix: null,
    outcome: 'retry',
  });
  const ok = requirements.require_prior_lessons === true
    && requirements.require_research === true
    && requirements.require_consensus_context === true
    && good.ok === true
    && good.attempt_context.research_completed === true
    && good.attempt_context.prior_attempts_consulted.length === 2
    && good.attempt_context.lessons_loaded.length === 2
    && bad.ok === false
    && bad.blocked_return?.code === 'BLOCKED_CARRY_FORWARD_CONTEXT_MISSING';
  return makeCheck(ok, ok ? 'repair retries must carry prior attempts, lessons, and proposed fix' : 'carry-forward context weakened or not enforced', {
    requirements,
    good_context: good.attempt_context,
    bad_blocked_return: bad.blocked_return,
  });
}

function checkImprovementContract() {
  const delta = buildImprovementDeltaContract({
    source: 'sentry',
    sourceCode: 'POINT_B_QUEUE_SYNC',
    priority: 'P1',
    owner: 'Chair',
    title: 'Keep Point B founder false visible',
    whyNow: 'QUEUE POINT_B READINESS SYNC proof must be deterministic',
  });
  const ok = delta.mission_id === 'FACTORY-BUILDEROS-AUTONOMY-CLOSURE-0001'
    && delta.step_id === 'BAC-002'
    && delta.canonical_promotion_required === true
    && delta.secondary_queue_created === false
    && Array.isArray(delta.proof_required)
    && delta.proof_required.includes('artifact_sync_receipt')
    && ['AUTO_APPLY_MISSION_DELTA', 'RETURN_TO_ARC'].includes(delta.disposition);
  return makeCheck(ok, ok ? 'improvement loop emits deterministic blueprint deltas' : 'improvement loop can still degrade into advisory prose', {
    delta,
  });
}

function checkBuildProofVerdicts() {
  const pass = createBuildProofRecord({
    jobId: 'bp-pass',
    commitSha: 'abc123',
    originContainsCommit: true,
    deployIdentifier: 'railway',
    deployShaSeen: 'abc123',
    expectedDeploySha: 'abc123',
    deployMatchesOriginMain: true,
  });
  const waiting = createBuildProofRecord({
    jobId: 'bp-wait',
    commitSha: 'abc123',
    originContainsCommit: true,
    deployIdentifier: 'railway',
    deployShaSeen: 'def456',
    expectedDeploySha: 'abc123',
    deployMatchesOriginMain: false,
  });
  const fail = createBuildProofRecord({
    jobId: 'bp-fail',
    commitSha: null,
    originContainsCommit: false,
  });
  const ok = deriveBuildProofVerdict(pass) === 'PASS'
    && deriveBuildProofVerdict(waiting) === 'WAITING_FOR_PROOF'
    && deriveBuildProofVerdict(fail) === 'FAIL';
  return makeCheck(ok, ok ? 'build-proof contract freezes PASS, WAITING_FOR_PROOF, and FAIL mapping' : 'build-proof verdict mapping is missing or inconsistent', {
    pass,
    waiting,
    fail,
  });
}

function checkArtifactSyncModule() {
  const modulePath = 'services/builderos-artifact-sync.js';
  const text = readText(modulePath);
  const serviceFiles = fs.readdirSync(path.join(ROOT, 'services'))
    .filter((name) => /artifact-sync/i.test(name));
  const ok = exists(modulePath)
    && serviceFiles.length === 1
    && /syncTechnicalAcceptanceArtifacts/.test(text)
    && /syncFounderUsabilityArtifacts/.test(text)
    && /syncMissionFromTechnicalReceipt/.test(text)
    && /buildProductReadinessReport/.test(text);
  return makeCheck(ok, ok ? 'one canonical artifact-sync module is present and wired' : 'artifact-sync module path is duplicated or incomplete', {
    canonical_module: modulePath,
    service_files: serviceFiles,
  });
}

function checkReceiptSync() {
  const bp = readJson('builderos-reboot/BP_PRIORITY.json');
  const readiness = readJson('builderos-reboot/PRODUCT_READINESS_REPORT.json');
  const item = bp?.items?.find((entry) => entry.mission_id === 'PRODUCT-LIFERE-OS-V1-0001');
  const row = readiness?.products?.find((entry) => entry.product_id === 'lifere');
  const rowItem = row?.bp_priority?.find((entry) => entry.mission_id === 'PRODUCT-LIFERE-OS-V1-0001');
  const allowedModes = new Set(['technical_acceptance', 'founder_usability']);
  const ok = item?.artifact_sync?.status === 'CURRENT'
    && allowedModes.has(String(item?.artifact_sync?.mode || ''))
    && rowItem?.artifact_sync?.status === 'CURRENT'
    && allowedModes.has(String(rowItem?.artifact_sync?.mode || ''))
    && rowItem?.founder_usability_pass === false
    && row?.readiness_state === 'TECHNICAL_PASS_ONLY';
  return makeCheck(ok, ok ? 'artifact sync keeps BP item, readiness report, and founder false aligned' : 'artifact sync is stale or incomplete', {
    bp_item: item?.artifact_sync || null,
    readiness_objective: rowItem || null,
    readiness_state: row?.readiness_state || null,
  });
}

function checkUiTruth() {
  const uiGate = readJson('products/receipts/UI_ALPHA_GATE.json');
  const founderAudit = readJson('products/receipts/FOUNDER_ALPHA_READINESS_AUDIT.json');
  const uiGateScript = readText('scripts/run-ui-alpha-gate.mjs');
  const founderAuditScript = readText('scripts/audit-founder-alpha-ready.mjs');
  const lifereReadinessScript = readText('scripts/run-lifere-alpha-readiness.mjs');
  const ok = exists(CANONICAL_FOUNDER_USABILITY_CONTRACT)
    && uiGate?.ok === true
    && uiGate?.founder_usability_pass === false
    && uiGate?.verdict !== 'ALPHA_GATE_CLOSED'
    && founderAudit?.founder_usability_pass === false
    && founderAudit?.ready_for_adam_alpha === true
    && /technical_pass_only/.test(uiGateScript)
    && /founder_usability_contract/.test(uiGateScript)
    && /technical_pass_only/.test(founderAuditScript)
    && !grepMissing(new RegExp(CANONICAL_FOUNDER_USABILITY_CONTRACT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), 'scripts/run-ui-alpha-gate.mjs')
    && !grepMissing(new RegExp(CANONICAL_FOUNDER_USABILITY_CONTRACT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), 'scripts/audit-founder-alpha-ready.mjs')
    && !grepMissing(new RegExp(CANONICAL_FOUNDER_USABILITY_CONTRACT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), 'scripts/run-lifere-alpha-readiness.mjs')
    && !/PRODUCT-LIFERE-OS-V1-0001\/FOUNDER_USABILITY_CONTRACT\.md/.test(uiGateScript)
    && !/PRODUCT-LIFERE-OS-V1-0001\/FOUNDER_USABILITY_CONTRACT\.md/.test(founderAuditScript)
    && !/PRODUCT-LIFERE-OS-V1-0001\/FOUNDER_USABILITY_CONTRACT\.md/.test(lifereReadinessScript);
  return makeCheck(ok, ok ? 'UI alpha truth distinguishes technical pass from founder completion' : 'UI alpha gate is overclaiming or missing founder-usability authority', {
    ui_gate: uiGate ? {
      verdict: uiGate.verdict,
      founder_usability_pass: uiGate.founder_usability_pass,
      technical_pass_only: uiGate.technical_pass_only ?? 'script_enforced_next_run',
      founder_usability_contract: uiGate.founder_usability_contract,
    } : null,
    founder_alpha_audit: founderAudit ? {
      verdict: founderAudit.verdict,
      founder_usability_pass: founderAudit.founder_usability_pass,
      ready_for_adam_alpha: founderAudit.ready_for_adam_alpha,
      technical_pass_only: founderAudit.technical_pass_only ?? 'script_enforced_next_run',
    } : null,
    canonical_contract: CANONICAL_FOUNDER_USABILITY_CONTRACT,
  });
}

function checkSoftAcceptanceLanguage() {
  const founderBattery = readText('scripts/run-founder-chat-alpha-battery.mjs');
  const directAction = readText('scripts/run-lifeos-direct-action-v1-acceptance.mjs');
  const ok = /detectCounselTheater/.test(founderBattery)
    && /expectTruth/.test(founderBattery)
    && /expectChannel/.test(founderBattery)
    && /final_transport_status/.test(founderBattery)
    && /proof_record_id/.test(directAction)
    && /readback_verified/.test(directAction);
  return makeCheck(ok, ok ? 'founder-surface checks use structured truth and receipt fields' : 'acceptance still leans on loose wording instead of structured assertions', {
    founder_battery_structured_fields: {
      detectCounselTheater: /detectCounselTheater/.test(founderBattery),
      expectTruth: /expectTruth/.test(founderBattery),
      expectChannel: /expectChannel/.test(founderBattery),
      finalTransport: /final_transport_status/.test(founderBattery),
    },
    direct_action_structured_fields: {
      proof_record_id: /proof_record_id/.test(directAction),
      readback_verified: /readback_verified/.test(directAction),
    },
  });
}

function checkStaleAuthorityCleanup() {
  const targetFiles = [
    'services/builderos-bp-priority-scheduler.js',
    'scripts/bp-priority-never-stop.mjs',
    'services/builderos-improvement-loop.js',
    'scripts/lifeos-builder-continuous-queue.mjs',
    'builderos-reboot/AGENTS.md',
  ];
  const forbidden = [
    'builderos-reboot/MISSION_QUEUE.json',
    LEGACY_FOUNDER_USABILITY_CONTRACT,
  ];
  const evidence = targetFiles.map((relPath) => {
    const text = readText(relPath);
    return {
      path: relPath,
      has_mission_queue: text.includes(forbidden[0]),
      has_legacy_founder_contract: text.includes(forbidden[1]),
      has_builderos_product_home: text.includes('docs/products/builderos/PRODUCT_HOME.md'),
    };
  });
  const ok = evidence.every((row) => row.has_mission_queue === false && row.has_legacy_founder_contract === false);
  return makeCheck(ok, ok ? 'stale authority references are removed while canonical product-home authority remains allowed' : 'stale authority still leaks into active autonomy files', {
    forbidden,
    scanned: evidence,
  });
}

function checkCertificationGateTruth() {
  const certification = readJson('builderos-reboot/PROJECT_CERTIFICATION.json');
  const pointBItem = readJson('builderos-reboot/BP_PRIORITY.json')?.items?.find((entry) => entry.mission_id === 'PRODUCT-LIFERE-OS-V1-0001') || null;
  const founderReceipt = readJson('builderos-reboot/MISSIONS/PRODUCT-LIFERE-OS-V1-0001/FOUNDER_USABILITY_CONFIRM.json');
  const buildDeploy = readJson('products/receipts/BUILDEROS_BUILD_DEPLOY_TRUTH.json');
  const founderUi = readJson('products/receipts/BUILDEROS_FOUNDER_UI_PROOF.json');
  const sameTier = readJson('products/receipts/BUILDEROS_SAME_TIER_DETERMINISM.json');
  const founderPassed = pointBItem?.founder_usability_pass === true || founderReceipt?.pass === true;
  const liveProofsPass = buildDeploy?.verdict === 'PASS' && founderUi?.verdict === 'PASS';
  const sameTierPass = sameTier?.verdict === 'PASS';
  const fullyMachineReadyExpected = founderPassed && liveProofsPass && sameTierPass;
  const fullyMachineReadyActual = certification?.levels?.FULLY_MACHINE_READY === true;
  const ok = fullyMachineReadyExpected === fullyMachineReadyActual
    && certification?.levels?.FULLY_MACHINE_READY === false
    && Array.isArray(certification?.autonomy_closure_v1?.blockers)
    && certification.autonomy_closure_v1.blockers.includes('point_b_founder_confirmation_required');
  return makeCheck(ok, ok ? 'FULLY_MACHINE_READY stays false until founder confirmation and live proof gates are truly closed' : 'certification truth does not match the proof gate formula', {
    founder_passed: founderPassed,
    live_proofs_pass: liveProofsPass,
    same_tier_pass: sameTierPass,
    fully_machine_ready_expected: fullyMachineReadyExpected,
    fully_machine_ready_actual: fullyMachineReadyActual,
  });
}

const CHECKS = {
  'architect-snt-promotion': checkArchitectSntPromotion,
  'build-proof-verdicts': checkBuildProofVerdicts,
  'queue-truth': checkQueueTruth,
  'repair-carry-forward': checkRepairCarryForward,
  'improvement-contract': checkImprovementContract,
  'artifact-sync-module': checkArtifactSyncModule,
  'receipt-sync': checkReceiptSync,
  'ui-truth': checkUiTruth,
  'stale-authority-cleanup': checkStaleAuthorityCleanup,
  'soft-acceptance-language': checkSoftAcceptanceLanguage,
  'certification-gate-truth': checkCertificationGateTruth,
};

const requestedCheck = (() => {
  const idx = process.argv.indexOf('--check');
  return idx >= 0 ? process.argv[idx + 1] : null;
})();

const selected = requestedCheck ? [requestedCheck] : Object.keys(CHECKS);
if (selected.some((name) => !CHECKS[name])) {
  console.error(`Unknown check. Allowed: ${Object.keys(CHECKS).join(', ')}`);
  process.exit(1);
}

const report = {
  schema: 'builderos_autonomy_closure_v1_acceptance',
  mission_id: 'FACTORY-BUILDEROS-AUTONOMY-CLOSURE-0001',
  at: new Date().toISOString(),
  mode: requestedCheck ? 'single_check' : 'full_suite',
  requested_check: requestedCheck,
  ok: true,
  passed: [],
  failed: [],
  checks: {},
};

for (const name of selected) {
  const result = CHECKS[name]();
  report.checks[name] = result;
  if (result.ok) {
    report.passed.push(name);
  } else {
    report.ok = false;
    report.failed.push(name);
  }
}

report.verdict = report.ok ? 'PASS' : 'FAIL';
report.completed_at = report.at;
report.git_sha = readJson('products/receipts/BUILDEROS_BUILD_DEPLOY_TRUTH.json')?.proof?.commit_sha || null;
report.production_base = process.env.PUBLIC_BASE_URL || 'https://lumin-web-production-e3a9.up.railway.app';
if (report.verdict === 'PASS') {
  report.bp_sync = syncMissionFromTechnicalReceipt({
    missionId: 'FACTORY-BUILDEROS-AUTONOMY-CLOSURE-0001',
    receipt: report,
    root: ROOT,
    buildRecord: {
      build_method: 'system-build',
      note: 'Internal BuilderOS closure acceptance proof.',
    },
  });
}
fs.mkdirSync(path.dirname(RECEIPT), { recursive: true });
fs.writeFileSync(RECEIPT, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
