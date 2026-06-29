/**
 * SYNOPSIS: PB execution authority — no unnecessary Adam bottlenecks inside approved PB boundary.
 * PB execution authority — no unnecessary Adam bottlenecks inside approved PB boundary.
 *
 * @ssot docs/SSOT_COMPANION.md §0.5J
 * @ssot docs/constitution/NORTH_STAR_SSOT.md Article II §2.16
 */

/** True stop conditions — Human Guardian required (§2.16). */
export const ADAM_REQUIRED_CONDITIONS = [
  'EXPOSED_SECRET',
  'DESTRUCTIVE_DB',
  'MONEY_LEGAL_MEDICAL',
  'AUTONOMY_ESCALATION',
  'IRREVERSIBLE_LAUNCH',
  'PRODUCT_INTENT_AMBIGUOUS',
  'PROOF_CHAIN_UNREPAIRABLE',
  'OUTSIDE_PB_BOUNDARY',
  'MISSING_SECRET_CREDENTIAL',
];

/** Routine internal work authorized when PB/amendment/build objective is approved. */
export const SYSTEM_AUTHORIZED_UNDER_PB_CODES = new Set([
  'PF-001',
  'PF-002',
  'PF-003',
  'DR-001-LOCAL-GITHUB',
  'DR-003-RECEIPT-STALE',
  'RECEIPT_STALE_RUNTIME_SHA',
  'RAILWAY_STALE_DEPLOY',
  'LOCAL_VS_GITHUB_MAIN',
  'GEMINI_PROOF_REFRESH',
  'PHASE14_RUN_PROOFS',
  'SELF_REPAIR_AUDIT_RUN',
  'OIL_MISSED_ACTIVE',
  'REPAIR_QUEUE_OPEN',
  'DEPLOY_VERIFY',
  'RECEIPT_WRITE',
  'IMPORT_FIX',
  'ENDPOINT_GAP_FILL',
  'RUNTIME_PROOF_STALE',
]);

const ADAM_REQUIRED_BY_CODE = new Set([
  'GITHUB_TOKEN_MISSING',
  'EXPOSED_SECRET',
  'DESTRUCTIVE_DB',
  'MONEY_LEGAL_MEDICAL',
  'AUTONOMY_ESCALATION',
  'IRREVERSIBLE_LAUNCH',
  'PRODUCT_INTENT_AMBIGUOUS',
  'PROOF_CHAIN_UNREPAIRABLE',
  'OUTSIDE_PB_BOUNDARY',
]);

/** Map readiness/repair signals to execution authority. */
export function classifyExecutionAuthority(entry = {}) {
  const code = entry.code || entry.rule || entry.issue_id || entry.finding_id || '';
  if (ADAM_REQUIRED_BY_CODE.has(code)) {
    return {
      authority: 'ADAM_REQUIRED',
      reason: ADAM_REQUIRED_CONDITIONS.includes(code) ? code : 'MISSING_SECRET_CREDENTIAL',
    };
  }
  if (code === 'PF-001' || entry.rule === 'PF-001') {
    return { authority: 'SYSTEM_AUTHORIZED_UNDER_PB', reason: 'routine_proof_refresh' };
  }
  if (code === 'PF-002' || entry.rule === 'PF-002') {
    return { authority: 'SYSTEM_AUTHORIZED_UNDER_PB', reason: 'routine_phase14_re_cert' };
  }
  if (
    SYSTEM_AUTHORIZED_UNDER_PB_CODES.has(code) ||
    entry.source === 'repair_queue' ||
    entry.source === 'proof_freshness' ||
    (entry.source === 'oil_misses' && code === 'OIL_MISSED_ACTIVE')
  ) {
    return { authority: 'SYSTEM_AUTHORIZED_UNDER_PB', reason: 'inside_approved_pb' };
  }
  if (entry.severity === 'P0' && code === 'DEPLOY_SHA_MISSING') {
    return { authority: 'SYSTEM_AUTHORIZED_UNDER_PB', reason: 'deploy_verify_gap_fill' };
  }
  if (entry.severity === 'P0') {
    return { authority: 'ADAM_REQUIRED', reason: 'PROOF_CHAIN_UNREPAIRABLE' };
  }
  return { authority: 'SYSTEM_AUTHORIZED_UNDER_PB', reason: 'inside_approved_pb' };
}

function withAuthority(entry, actionText) {
  const { authority, reason } = classifyExecutionAuthority(entry);
  return {
    priority: entry.priority || entry.severity || 'P2',
    action: actionText,
    source: entry.source,
    code: entry.code || entry.rule || entry.issue_id || entry.finding_id || null,
    authority,
    authority_reason: reason,
  };
}

/**
 * Split execution actions — routine PB work vs true Adam stops.
 * Replaces "Approve …" language for system-authorized paths.
 */
export function deriveExecutionActions({ blockers, warnings, oilMisses, freshness, repairQueue }) {
  const system_authorized_actions = [];
  const adam_required_actions = [];

  if (freshness?.proofs?.gemini_runtime?.status === 'STALE') {
    system_authorized_actions.push(
      withAuthority(
        { code: 'PF-001', rule: 'PF-001', source: 'proof_freshness', severity: 'P1' },
        'POST /api/v1/gemini/proof — refresh runtime proof at current deploy SHA'
      )
    );
  }

  if (freshness?.proofs?.phase14?.status === 'STALE') {
    system_authorized_actions.push(
      withAuthority(
        { code: 'PF-002', rule: 'PF-002', source: 'proof_freshness', severity: 'P1' },
        'POST /api/v1/lifeos/command-center/phase14/run-proofs (Railway-canonical) after gemini proof refresh'
      )
    );
  }

  for (const miss of oilMisses?.active || []) {
    system_authorized_actions.push(
      withAuthority(
        {
          code: 'OIL_MISSED_ACTIVE',
          finding_id: miss.finding_id,
          source: 'oil_misses',
          severity: miss.severity,
        },
        `Execute tracked repair for ${miss.finding_id}: ${miss.required_repair || miss.what_oil_missed}`
      )
    );
  }

  for (const item of (repairQueue?.items || []).filter((i) => i.status === 'OPEN')) {
    system_authorized_actions.push(
      withAuthority(
        {
          code: item.detectRule || item.issueId,
          issue_id: item.issueId,
          source: 'repair_queue',
          severity: item.severity,
        },
        `Repair queue — ${item.issueId}: ${item.recommendedBuilderTask}`
      )
    );
  }

  for (const b of blockers.filter((x) => x.severity === 'P0')) {
    const row = withAuthority(
      b,
      `Resolve P0 blocker ${b.code}: ${b.detail}`
    );
    if (row.authority === 'ADAM_REQUIRED') adam_required_actions.push(row);
    else system_authorized_actions.push(row);
  }

  if (blockers.some((b) => b.code === 'GITHUB_TOKEN_MISSING')) {
    adam_required_actions.push(
      withAuthority(
        { code: 'GITHUB_TOKEN_MISSING', source: 'builder', severity: 'P0' },
        'Set or rotate GITHUB_TOKEN on Railway — system cannot self-authorize secret values'
      )
    );
  }

  for (const w of warnings.filter((x) => x.code === 'LOCAL_PROOF_ONLY')) {
    system_authorized_actions.push(
      withAuthority(
        w,
        'Operator shell: use Railway-canonical paths (oil-phase14-railway-canonical.mjs) or align DATABASE_URL'
      )
    );
  }

  return {
    system_authorized_actions,
    adam_required_actions,
    pb_boundary: 'approved_builder_oil_self_repair_pb',
    governance_rule: 'SSOT_NORTH_STAR §2.16 / SSOT_COMPANION §0.5J',
  };
}

/** @deprecated use deriveExecutionActions — kept for callers expecting old name */
export function deriveAdamDecisions(ctx) {
  const { adam_required_actions } = deriveExecutionActions(ctx);
  return adam_required_actions;
}