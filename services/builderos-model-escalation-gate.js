/**
 * SYNOPSIS: Model Escalation Gate — free-first, capability-aware escalation with paid boundary receipts.
 * @ssot builderos-reboot/governance/INTELLIGENCE_ROUTING_CONTRACT.json
 * @ssot builderos-reboot/LOOP_ESCALATION_CONTRACT.json
 */
import { createDecision } from './decision-ledger.js';

export const VALUE_CATEGORIES = Object.freeze([
  'founder_value', 'revenue_value', 'reliability_value', 'production_unblock_value',
]);

export const INFRA_BLOCKER_PATTERNS = Object.freeze([
  /\bHTTP_5\d{2}\b/i, /\b502\b/, /\b503\b/, /\b504\b/, /\bstale[_ ]deploy\b/i,
  /\brailway_stale_deploy\b/i, /\breceipt_stale\b/i, /\bproof.*stale\b/i,
  /\bmissing[_ ]?(env|secret|credential|variable)\b/i, /\bMISSING_SECRET\b/i,
  /\bmigration\b.*\b(missing|not applied|absent)\b/i, /\brelation .* does not exist\b/i,
  /\bcolumn .* does not exist\b/i, /\bauth(_|\s)?fail/i, /\b401\b/, /\b403\b/,
  /\broute.*not mounted\b/i, /\b404\b.*\b(route|endpoint|api)\b/i, /\bschema mismatch\b/i,
  /\bsha drift\b/i, /\bgit.*drift\b/i, /\bzone3_patch_required\b/i, /\bzone4_blocked\b/i,
  /\bprompt_too_large\b/i, /\bnon_json_response\b/i, /\bservice_outage\b/i,
]);

export const REASONING_FAILURE_PATTERNS = Object.freeze([
  /\bstub\b/i, /\btruncat/i, /\bsyntax\b/i, /\bantipattern\b/i, /\bverifier\b/i,
  /\binstruction/i, /\bscope drift\b/i, /\bimport_merge\b/i, /\bcommonjs_bleed\b/i,
  /\bplaceholder\b/i, /\btoo short\b/i, /\breasoning\b/i, /\bplanning\b/i, /\bquality\b/i,
  /\bsentry[_ ]?fail/i, /\bcodegen_authoring_failed\b/i, /\bassertion\b/i,
  /\bexpected_exports?\b/i, /\bstatic_export\b/i, /\bbehavior_assertion\b/i,
  /\bverify_exit\b/i, /\bempty[_ ]?(content|codegen|output)\b/i,
]);

/**
 * Free pool comes first. Order is a provisional prior only; model-capability
 * receipts may reorder candidates elsewhere by task class. Unavailable/quota
 * exhausted members may fail over to the next FREE member without crossing
 * the paid boundary.
 */
export const FREE_ESCALATION_TIERS = Object.freeze([
  'gemini_flash',
  'groq_llama',
  'cerebras_llama',
  'mistral_free',
]);

/** Paid tiers are a separate boundary. They MUST NOT be appended to the normal
 * retry chain. A caller may use them only after a PAID_ESCALATION_RECEIPT proves
 * applicable free capacity was exhausted/unavailable/proven incapable and the
 * required 1+1=3 recovery was performed. */
export const PAID_ESCALATION_TIERS = Object.freeze([
  'openai_builder_mini',
  'deepseek',
  'openai_gpt',
  'openai_builder_standard',
  'claude_sonnet',
  'openai_builder_escalation',
]);

// Compatibility export for existing callers. It intentionally contains FREE tiers only.
export const GRADE_ESCALATION_TIERS = FREE_ESCALATION_TIERS;

export function authoringTiersForRetry({ last_error = '', attempts = 0, explicit_tiers = null } = {}) {
  if (Array.isArray(explicit_tiers) && explicit_tiers.length) return explicit_tiers;
  const err = String(last_error || '');
  const n = Number(attempts) || 0;
  if (n < 1 || !err) return null;
  if (isInfraBlockerFailure(err)) return null;
  if (isReasoningFailure(err) || /sentry|codegen|assertion|export|verify/i.test(err)) {
    return [...FREE_ESCALATION_TIERS];
  }
  return null;
}

const FREE_MODELS = new Set(FREE_ESCALATION_TIERS);
const PAID_MODELS = new Set(PAID_ESCALATION_TIERS);
function normalizeText(v) { return String(v || '').trim(); }
export function isCheaperModel(model) { return FREE_MODELS.has(normalizeText(model)); }
export function isPaidModel(model) { return PAID_MODELS.has(normalizeText(model)); }

export function isInfraBlockerFailure(failureReason, httpStatus = null) {
  const text = normalizeText(failureReason);
  if (httpStatus >= 500 || httpStatus === 401 || httpStatus === 403 || httpStatus === 404) return true;
  return INFRA_BLOCKER_PATTERNS.some((re) => re.test(text));
}
export function isReasoningFailure(failureReason) {
  const text = normalizeText(failureReason);
  if (!text || isInfraBlockerFailure(text)) return false;
  return REASONING_FAILURE_PATTERNS.some((re) => re.test(text));
}
export function hasValueCategory(valueCategories = []) {
  const set = new Set((valueCategories || []).map((c) => normalizeText(c).toLowerCase()));
  return VALUE_CATEGORIES.some((c) => set.has(c));
}

/** Fail closed at the dollar boundary. */
export function evaluatePaidBoundary(input = {}) {
  const requested = normalizeText(input.stronger_model_requested);
  if (!isPaidModel(requested)) return { allowed: true, paid_boundary: false };
  const receipt = input.paid_escalation_receipt || null;
  const free = receipt?.free_pool || {};
  const checks = {
    receipt_present: Boolean(receipt),
    free_pool_exhausted_or_incapable: free.exhausted_or_unavailable_or_proven_incapable === true,
    synergy_completed: receipt?.one_plus_one_equals_three_completed === true,
    failure_history_preserved: receipt?.failure_history_preserved === true,
    lowest_cost_capable_paid_selected: receipt?.lowest_cost_capable_paid_selected === true,
    expected_value_justifies_spend: receipt?.expected_value_justifies_spend === true,
  };
  const allowed = Object.values(checks).every(Boolean);
  return { allowed, paid_boundary: true, checks, blocked_reason: allowed ? null : 'paid_boundary_receipt_incomplete' };
}

export function evaluateModelEscalationGate(input = {}) {
  const task_id = normalizeText(input.task_id) || null;
  const mission_id = input.mission_id || null;
  const cheaper_model_used = normalizeText(input.cheaper_model_used) || null;
  const stronger_model_requested = normalizeText(input.stronger_model_requested) || null;
  const failure_reason = normalizeText(input.failure_reason) || '';
  const value_categories = Array.isArray(input.value_categories) ? input.value_categories : [];
  const cheaper_attempt_count = Number(input.cheaper_attempt_count) || 0;
  const http_status = input.http_status != null ? Number(input.http_status) : null;
  const expected_outcome = normalizeText(input.expected_outcome) || null;
  const paidBoundary = evaluatePaidBoundary(input);

  const checks = {
    has_value: hasValueCategory(value_categories),
    cheaper_attempted: cheaper_attempt_count >= 1,
    not_infra: !isInfraBlockerFailure(failure_reason, http_status),
    reasoning_failure: isReasoningFailure(failure_reason),
    has_task_id: Boolean(task_id),
    has_cheaper_model: Boolean(cheaper_model_used),
    has_stronger_model: Boolean(stronger_model_requested),
    paid_boundary_satisfied: paidBoundary.allowed,
  };

  let blocked_reason = null;
  if (!checks.has_value) blocked_reason = 'no_value_category';
  else if (!checks.cheaper_attempted) blocked_reason = 'cheaper_model_not_attempted';
  else if (!checks.not_infra) blocked_reason = 'infra_blocker_fix_platform_before_model_escalation';
  else if (!checks.reasoning_failure) blocked_reason = 'failure_not_reasoning';
  else if (!checks.has_task_id || !checks.has_cheaper_model || !checks.has_stronger_model) blocked_reason = 'missing_escalation_context';
  else if (!checks.paid_boundary_satisfied) blocked_reason = paidBoundary.blocked_reason;

  const allowed = blocked_reason === null;
  return { allowed, blocked_reason, checks, paid_boundary: paidBoundary, task_id, mission_id, cheaper_model_used, stronger_model_requested, failure_reason, value_categories, expected_outcome, result: allowed ? 'approved' : 'denied' };
}

export async function writeModelEscalationReceipt(pool, verdict, extra = {}) {
  if (!pool?.query) return { ok: false, error: 'no_database_pool' };
  try {
    const row = await createDecision(pool, {
      mission_id: verdict.mission_id,
      actor: extra.actor || 'builderos_model_escalation_gate',
      decision_type: verdict.paid_boundary?.paid_boundary ? 'paid_model_escalation' : 'model_escalation',
      authority_source: 'builderos-reboot/governance/INTELLIGENCE_ROUTING_CONTRACT.json',
      options_considered: [verdict.cheaper_model_used, verdict.stronger_model_requested].filter(Boolean),
      chosen_option: verdict.allowed ? verdict.stronger_model_requested : 'no_escalation',
      reason: verdict.blocked_reason || verdict.failure_reason,
      evidence_links: [{ type: 'task_id', value: verdict.task_id }, { type: 'checks', value: verdict.checks }],
      reversibility: 'one_way_spend',
      metadata_json: { ...verdict, ...extra },
    });
    return { ok: true, receipt_id: row.decision_id, row };
  } catch (err) { return { ok: false, error: err.message }; }
}

export async function resolveEscalatedModel(pool, input) {
  const verdict = evaluateModelEscalationGate(input);
  await writeModelEscalationReceipt(pool, verdict, { expected_outcome: input.expected_outcome, actor: input.actor || 'builderos_routing' });
  return { model: verdict.allowed ? input.stronger_model_requested : null, verdict };
}
