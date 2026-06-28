/**
 * SYNOPSIS: Deterministic blueprint-delta contract for BuilderOS improvement findings.
 * @ssot builderos-reboot/MISSIONS/FACTORY-BUILDEROS-AUTONOMY-CLOSURE-0001/BLUEPRINT.json
 */

const ACTIVE_MISSION_ID = 'FACTORY-BUILDEROS-AUTONOMY-CLOSURE-0001';

function inferStepId(code = '') {
  if (/PROOF|DEPLOY|ORIGIN|TRANSPORT/i.test(code)) return 'BAC-000A';
  if (/POINT_B|FOUNDER_USABILITY|QUEUE|SCHEDULER/i.test(code)) return 'BAC-002';
  if (/REPAIR|LESSON|MEMORY|CONTEXT/i.test(code)) return 'BAC-004';
  if (/IMPROVEMENT|PROMOTION|CONSENSUS/i.test(code)) return 'BAC-005';
  if (/READINESS|ARTIFACT|SYNC|FRESH/i.test(code)) return 'BAC-006';
  if (/ALPHA|UI|STUDIO|COUNSEL|KNOWLEDGE|THEATER/i.test(code)) return 'BAC-007';
  if (/LEGACY|AUTHORITY/i.test(code)) return 'BAC-008';
  return 'BAC-005';
}

function inferProofRequired(code = '', detail = '') {
  const text = `${code} ${detail}`.toUpperCase();
  const proof = [];
  if (/DEPLOY|PROOF|ORIGIN|SHA|TRANSPORT/.test(text)) proof.push('commit_sha', 'origin_main_or_remote_transport', 'deploy_or_runtime_proof');
  if (/UI|FOUNDER|ALPHA|COUNSEL|THEATER/.test(text)) proof.push('founder_surface_receipt');
  if (/QUEUE|POINT_B|READINESS|SYNC/.test(text)) proof.push('artifact_sync_receipt');
  if (!proof.length) proof.push('governed_mission_receipt');
  return [...new Set(proof)];
}

export function buildImprovementDeltaContract({
  source = 'unknown',
  sourceCode = 'UNKNOWN',
  priority = 'P2',
  owner = 'Chair',
  title = '',
  whyNow = '',
} = {}) {
  const step_id = inferStepId(sourceCode);
  const proof_required = inferProofRequired(sourceCode, whyNow);
  const auto_applicable = priority !== 'P0' && owner !== 'ARC';
  return {
    delta_id: `delta:${source}:${sourceCode}`,
    mission_id: ACTIVE_MISSION_ID,
    step_id,
    authority_owner: owner,
    source,
    source_code: sourceCode,
    title,
    why_now: whyNow,
    priority,
    proof_required,
    auto_applicable,
    disposition: auto_applicable ? 'AUTO_APPLY_MISSION_DELTA' : 'RETURN_TO_ARC',
    canonical_promotion_required: true,
    rejection_requires_owner: 'ARC',
    rejection_requires_reason: true,
    secondary_queue_created: false,
  };
}
