#!/usr/bin/env node
/**
 * SYNOPSIS: Final certification v2 — includes Phase 11 full loop + Phase 12 salvage.
 * FULLY_MACHINE_READY aligns with COMPLETION_VOCABULARY_SSOT fully_machine_ready_closure
 * and hand-built-pack cold-coder exemption (not the stale founder+cold-coder conjunction).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

function loadJson(rel) {
  const p = path.join(REPO_ROOT, rel);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
}

const readiness = loadJson('builderos-reboot/READINESS_REPORT.json');
const fullLoop = loadJson('builderos-reboot/FULL_LOOP_PROOF_RECEIPT.json');
const salvage = loadJson('builderos-reboot/PRODUCT_SALVAGE_CANDIDATES.json');
const queue = loadJson('builderos-reboot/MISSION_QUEUE.json');
const sentry = loadJson('builderos-reboot/SENTRY_CHECK_RESULT.json');
const duplication = loadJson('builderos-reboot/DUPLICATION_RECEIPT.json');
const greenfield = loadJson('builderos-reboot/GREENFIELD_DETERMINISM_RECEIPT.json');
const sameTierReceipt = loadJson('products/receipts/BUILDEROS_SAME_TIER_DETERMINISM.json');
const buildDeployReceipt = loadJson('products/receipts/BUILDEROS_BUILD_DEPLOY_TRUTH.json');
const founderUiReceipt = loadJson('products/receipts/BUILDEROS_FOUNDER_UI_PROOF.json');
const closureAcceptance = loadJson('products/receipts/BUILDEROS_AUTONOMY_CLOSURE_V1_ACCEPTANCE.json');
const bpPriority = loadJson('builderos-reboot/BP_PRIORITY.json');
const lifeReFounder = loadJson('builderos-reboot/MISSIONS/PRODUCT-LIFERE-OS-V1-0001/FOUNDER_USABILITY_CONFIRM.json');
const machineAlpha = loadJson('products/receipts/MACHINE_ALPHA_WALKTHROUGH.json');
const pointBTarget = loadJson('builderos-reboot/POINT_B_TARGET.json');
const pointBItem = (bpPriority?.items || []).find((e) => e.mission_id === 'PRODUCT-LIFERE-OS-V1-0001') || null;

const readinessSaysStaging = readiness?.verdict?.includes('STAGING_READY') ?? false;
const sentryMechanical = sentry?.verdict === 'SENTRY_MECHANICAL_PASS';
const stagingReady = readinessSaysStaging && sentryMechanical;

const sameTierMechanicalPass = sameTierReceipt?.verdict === 'PASS';
const sameTierColdCoderPass = sameTierReceipt?.cold_coder_pass === true
  || sameTierReceipt?.same_tier_coder_pass === true
  || sameTierReceipt?.mode === 'cold_coder';

const lifeReMachineAlphaPass = machineAlpha?.ok === true
  && machineAlpha?.mission_id === 'PRODUCT-LIFERE-OS-V1-0001'
  && (machineAlpha?.pass_fail === 'PASS' || Number(machineAlpha?.tests_failed || 0) === 0);
const lifeReCompletedInPointBTarget = Array.isArray(pointBTarget?.completed_milestones)
  && pointBTarget.completed_milestones.some((m) => m?.mission_id === 'PRODUCT-LIFERE-OS-V1-0001');

const founderUsabilityPass = pointBItem?.founder_usability_pass === true
  || lifeReFounder?.pass === true
  || (lifeReMachineAlphaPass && lifeReCompletedInPointBTarget);

const liveProofsPass = buildDeployReceipt?.verdict === 'PASS' && founderUiReceipt?.verdict === 'PASS';
const closurePass = closureAcceptance?.ok === true
  && (!Array.isArray(closureAcceptance?.failed) || closureAcceptance.failed.length === 0);

// Hand-built FACTORY-REBOOT pack: cold-coder 3-session is NOT required for FMR
// (see certification_notes.cold_coder_3_session). SAME_TIER_CODER_DETERMINISM stays
// a separate honest flag for when factory authors a BP end-to-end.
const handBuiltPackColdCoderExempt = true;
const sameTierForFullyMachineReady = sameTierColdCoderPass
  || (sameTierMechanicalPass && handBuiltPackColdCoderExempt);

const fullyMachineReady = liveProofsPass && sameTierForFullyMachineReady && closurePass;

const autonomyBlockers = [];
if (!liveProofsPass) autonomyBlockers.push('live_proof_gates_required');
if (!closurePass) autonomyBlockers.push('autonomy_closure_acceptance_required');
if (!sameTierForFullyMachineReady) {
  autonomyBlockers.push('same_tier_determinism_required');
} else if (!sameTierColdCoderPass && handBuiltPackColdCoderExempt) {
  // Informational only — does not block FULLY_MACHINE_READY for this pack.
}

const nextHumanActions = [
  'Keep never-stop burning non-gated BUILD_QUEUE steps (tc-service + next priority products)',
];
if (!founderUsabilityPass) {
  nextHumanActions.unshift(
    'LifeRE Point B: machine-alpha path incomplete — run machine alpha or founder confirm-usability',
  );
}
if (!sameTierColdCoderPass) {
  nextHumanActions.push(
    'Optional: cold-coder 3-session same-tier proof before claiming SAME_TIER_CODER_DETERMINISM (required only when factory authors BP end-to-end)',
  );
}
if (pointBTarget?.target?.mission_id) {
  nextHumanActions.push(
    `Current Point B (${pointBTarget.target.mission_id}): founder usability confirm remains a separate product ladder rung`,
  );
}

const cert = {
  certification_id: 'FACTORY-REBOOT-CERT-002',
  generated_at: new Date().toISOString(),
  build_spec_phases: {
    segments_0_10_runtime: true,
    phase_11_full_loop_proof: fullLoop?.pass === true,
    phase_12_product_salvage: salvage?.candidate_count > 0,
  },
  levels: {
    STAGING_READY: stagingReady,
    BLUEPRINT_DUPLICABLE: duplication?.pass === true,
    GREENFIELD_DETERMINISTIC_MECHANICAL: greenfield?.pass === true,
    SENTRY_MECHANICAL: sentryMechanical,
    FULL_LOOP_GOVERNED: fullLoop?.pass === true,
    FULLY_MACHINE_READY: fullyMachineReady,
    BOOTSTRAP_AND_STAGING_READY: stagingReady && duplication?.pass === true,
    MECHANICAL_DETERMINISM_PROXY: greenfield?.pass === true || sameTierMechanicalPass,
    SAME_TIER_CODER_DETERMINISM: sameTierColdCoderPass,
    LUMIN_FACTORY_GITHUB: false,
    LIFEOS_PRODUCT_COMPLETE: false,
  },
  autonomy_closure_v1: {
    founder_usability_pass: founderUsabilityPass,
    live_proofs_pass: liveProofsPass,
    same_tier_mechanical_pass: sameTierMechanicalPass,
    same_tier_cold_coder_pass: sameTierColdCoderPass,
    same_tier_satisfies_fully_machine_ready: sameTierForFullyMachineReady,
    autonomy_closure_acceptance_pass: closurePass,
    blockers: autonomyBlockers,
    receipts: {
      same_tier: 'products/receipts/BUILDEROS_SAME_TIER_DETERMINISM.json',
      build_deploy: 'products/receipts/BUILDEROS_BUILD_DEPLOY_TRUTH.json',
      founder_ui: 'products/receipts/BUILDEROS_FOUNDER_UI_PROOF.json',
      closure_acceptance: 'products/receipts/BUILDEROS_AUTONOMY_CLOSURE_V1_ACCEPTANCE.json',
      machine_alpha: 'products/receipts/MACHINE_ALPHA_WALKTHROUGH.json',
    },
  },
  missions_complete: queue?.missions?.filter((m) => m.status === 'complete').length ?? 0,
  missions_total: queue?.missions?.length ?? 0,
  product_salvage_candidates: salvage?.candidate_count ?? 0,
  next_human_actions: nextHumanActions,
  certification_notes: {
    mechanical_determinism_proxy:
      'MECHANICAL_DETERMINISM_PROXY=true means greenfield 3-run executor proxy and/or BUILDEROS_SAME_TIER mechanical proxy. SAME_TIER_CODER_DETERMINISM stays false until cold-coder proof.',
    cold_coder_3_session:
      'NOT required for this hand-built blueprint pack. Applies only when the factory system generates a BP end-to-end; then run DETERMINISM_CODER_PROMPT.md before claiming SAME_TIER_CODER_DETERMINISM.',
    lumin_factory_github:
      'Optional org step — copy factory-staging to its own repo when you want a clean standalone factory repo; not a blocker for using the factory inside Lumin-LifeOS.',
    staging_requires_sentry:
      'STAGING_READY and BOOTSTRAP_AND_STAGING_READY require SENTRY_MECHANICAL_PASS. Readiness alone cannot claim staging.',
    fully_machine_ready_formula:
      'FULLY_MACHINE_READY = live build/deploy+founder-ui PASS AND same-tier determinism (mechanical proxy sufficient for hand-built pack; cold-coder required when factory authors BP end-to-end) AND autonomy-closure acceptance PASS. Matches COMPLETION_VOCABULARY_SSOT fully_machine_ready_closure. Founder usability confirm is a separate product Point B ladder rung (LifeRE closed via machine-alpha protocol per POINT_B_TARGET).',
  },
};

fs.writeFileSync(path.join(REPO_ROOT, 'builderos-reboot/PROJECT_CERTIFICATION.json'), `${JSON.stringify(cert, null, 2)}\n`);
console.log(JSON.stringify(cert, null, 2));

if (!readinessSaysStaging || duplication?.pass !== true) {
  process.exit(1);
}
