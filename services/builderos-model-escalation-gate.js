/**
 * SYNOPSIS: Model Escalation Gate — enforce cheaper-first, no infra-burn escalation.
 * @ssot prompts/00-MODEL-ESCALATION-GATE.md
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

import { createDecision } from './decision-ledger.js';

export const VALUE_CATEGORIES = Object.freeze([
  'founder_value',
  'revenue_value',
  'reliability_value',
  'production_unblock_value',
]);

/** Failures where stronger models are forbidden — fix platform first. */
export const INFRA_BLOCKER_PATTERNS = Object.freeze([
  /\bHTTP_5\d{2}\b/i,
  /\b502\b/,
  /\b503\b/,
  /\b504\b/,
  /\bstale[_ ]deploy\b/i,
  /\brailway_stale_deploy\b/i,
  /\breceipt_stale\b/i,
  /\bproof.*stale\b/i,
  /\bmissing[_ ]?(env|secret|credential|variable)\b/i,
  /\bMISSING_SECRET\b/i,
  /\bmigration\b.*\b(missing|not applied|absent)\b/i,
  /\brelation .* does not exist\b/i,
  /\bcolumn .* does not exist\b/i,
  /\bauth(_|\s)?fail/i,
  /\b401\b/,
  /\b403\b/,
  /\broute.*not mounted\b/i,
  /\b404\b.*\b(route|endpoint|api)\b/i,
  /\bschema mismatch\b/i,
  /\bsha drift\b/i,
  /\bgit.*drift\b/i,
  /\bzone3_patch_required\b/i,
  /\bzone4_blocked\b/i,
  /\bprompt_too_large\b/i,
  /\bnon_json_response\b/i,
  /\bservice_outage\b/i,
]);

/** Failures where escalation may be allowed after cheaper attempt. */
export const REASONING_FAILURE_PATTERNS = Object.freeze([
  /\bstub\b/i,
  /\btruncat/i,
  /\bsyntax\b/i,
  /\bantipattern\b/i,
  /\bverifier\b/i,
  /\binstruction/i,
  /\bscope drift\b/i,
  /\bimport_merge\b/i,
  /\bcommonjs_bleed\b/i,
  /\bplaceholder\b/i,
  /\btoo short\b/i,
  /\breasoning\b/i,
  /\bplanning\b/i,
  /\bquality\b/i,
  /\bsentry[_ ]?fail/i,
  /\bcodegen_authoring_failed\b/i,
  /\bassertion\b/i,
  /\bexpected_exports?\b/i,
  /\bstatic_export\b/i,
  /\bbehavior_assertion\b/i,
  /\bverify_exit\b/i,
  /\bempty[_ ]?(content|codegen|output)\b/i,
]);

/** Strong-first tier chain used when a prior attempt failed grade/SENTRY (not infra). */
export const GRADE_ESCALATION_TIERS = Object.freeze([
  'openai_builder_escalation',
  'claude_sonnet',
  'openai_builder_standard',
  'openai_gpt',
  'deepseek',
  'gemini_flash',
  'groq_llama',
  'openai_builder_mini',
]);

/**
 * Pick authoring tiers for a retry. Infra failures stay on default chain
 * (fix platform — do not burn stronger models). Grade/SENTRY failures bump up.
 */
export function authoringTiersForRetry({ last_error = '', attempts = 0, explicit_tiers = null } = {}) {
  if (Array.isArray(explicit_tiers) && explicit_tiers.length) return explicit_tiers;
  const err = String(last_error || '');
  const n = Number(attempts) || 0;
  if (n < 1 || !err) return null;
  if (isInfraBlockerFailure(err)) return null;
  if (isReasoningFailure(err) || /sentry|codegen|assertion|export|verify/i.test(err)) {
    return [...GRADE_ESCALATION_TIERS];
  }
  return null;
}

const CHEAP_MODELS = new Set([
  'openai_builder_mini',
  'groq_llama',
  'gemini_flash',
  'deepseek',
  'cerebras_llama',
  'mistral_free',
]);

function normalizeText(v) {
  return String(v || '').trim();
}

export function isCheaperModel(model) {
  return CHEAP_MODELS.has(normalizeText(model));
}

export function isInfraBlockerFailure(failureReason, httpStatus = null) {
  const text = normalizeText(failureReason);
  if (httpStatus >= 500) return true;
  if (httpStatus === 401 || httpStatus === 403 || httpStatus === 404) return true;
  return INFRA_BLOCKER_PATTERNS.some((re) => re.test(text));
}

export function isReasoningFailure(failureReason) {
  const text = normalizeText(failureReason);
  if (!text) return false;
  if (isInfraBlockerFailure(text)) return false;
  return REASONING_FAILURE_PATTERNS.some((re) => re.test(text));
}

export function hasValueCategory(valueCategories = []) {
  const set = new Set((valueCategories || []).map((c) => normalizeText(c).toLowerCase()));
  return VALUE_CATEGORIES.some((c) => set.has(c));
}

/**
 * Evaluate whether model escalation is allowed.
 * Does not write receipt — call writeModelEscalationReceipt after dispatch.
 */
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

  const checks = {
    has_value: hasValueCategory(value_categories),
    cheaper_attempted: cheaper_attempt_count >= 1,
    not_infra: !isInfraBlockerFailure(failure_reason, http_status),
    reasoning_failure: isReasoningFailure(failure_reason),
    has_task_id: Boolean(task_id),
    has_cheaper_model: Boolean(cheaper_model_used),
    has_stronger_model: Boolean(stronger_model_requested),
  };

  let blocked_reason = null;
  if (!checks.has_value) {
    blocked_reason = 'no_value_category — task must have founder/revenue/reliability/production_unblock value';
  } else if (!checks.cheaper_attempted) {
    blocked_reason = 'cheaper_model_not_attempted — require one full cheaper attempt before escalation';
  } else if (!checks.not_infra) {
    blocked_reason = 'infra_blocker — fix platform (502/deploy/env/migration/auth/route/schema) before escalating model';
  } else if (!checks.reasoning_failure) {
    blocked_reason = 'failure_not_reasoning — escalation only for reasoning/code-quality/instruction limits';
  } else if (!checks.has_task_id || !checks.has_cheaper_model) {
    blocked_reason = 'missing_escalation_context — task_id and cheaper_model_used required';
  }

  const allowed = blocked_reason === null;

  return {
    allowed,
    blocked_reason,
    checks,
    task_id,
    mission_id,
    cheaper_model_used,
    stronger_model_requested,
    failure_reason,
    value_categories,
    expected_outcome,
    result: allowed ? 'approved' : 'denied',
  };
}

export async function writeModelEscalationReceipt(pool, verdict, extra = {}) {
  if (!pool?.query) {
    return { ok: false, error: 'no_database_pool' };
  }
  try {
    const row = await createDecision(pool, {
      mission_id: verdict.mission_id,
      actor: extra.actor || 'builderos_model_escalation_gate',
      decision_type: 'model_escalation',
      authority_source: 'prompts/00-MODEL-ESCALATION-GATE.md',
      options_considered: [verdict.cheaper_model_used, verdict.stronger_model_requested].filter(Boolean),
      chosen_option: verdict.allowed ? verdict.stronger_model_requested : 'no_escalation',
      reason: verdict.blocked_reason || verdict.failure_reason,
      evidence_links: [
        { type: 'task_id', value: verdict.task_id },
        { type: 'value_category', value: (verdict.value_categories || [])[0] || null },
        { type: 'checks', value: verdict.checks },
      ],
      reversibility: 'one_way_spend',
      metadata_json: {
        task_id: verdict.task_id,
        mission_id: verdict.mission_id,
        cheaper_model_used: verdict.cheaper_model_used,
        stronger_model_requested: verdict.stronger_model_requested,
        failure_reason: verdict.failure_reason,
        value_category: (verdict.value_categories || [])[0] || null,
        value_categories: verdict.value_categories,
        expected_outcome: verdict.expected_outcome || extra.expected_outcome || null,
        result: verdict.result,
        blocked_reason: verdict.blocked_reason,
        ...extra,
      },
    });
    return { ok: true, receipt_id: row.decision_id, row };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Returns stronger model if gate allows; otherwise null + verdict.
 */
export async function resolveEscalatedModel(pool, input) {
  const verdict = evaluateModelEscalationGate(input);
  await writeModelEscalationReceipt(pool, verdict, {
    expected_outcome: input.expected_outcome,
    actor: input.actor || 'builderos_routing',
  });
  return {
    model: verdict.allowed ? input.stronger_model_requested : null,
    verdict,
  };
}
