/**
 * SYNOPSIS: TSOS guardrails — efficiency measurement only; never mission authority.
 * TSOS guardrails — efficiency measurement only; never mission authority.
 * @see factory-core/tsos/TSOS_HOOK_BOUNDARY.md
 * @see docs/C2_CANONICAL_DEFINITION.md (TSOS ≠ truth/strategy)
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

/** Fields TSOS records may include (measurement lane only). */
export const ALLOWED_METRIC_FIELDS = new Set([
  'recorded_at',
  'mission_id',
  'blueprint_id',
  'step_id',
  'target_file',
  'token_cost',
  'estimated_usd',
  'latency_ms',
  'retries',
  'waste',
  'bytes_written',
  'input_mode',
  'model_tier',
  'cache_hit',
  'prompt_compression_ratio',
  'json_efficiency_score',
  'routing_lane',
  'note',
]);

/** Forbidden — would let TSOS declare truth, strategy, or weaken SENTRY. */
export const FORBIDDEN_AUTHORITY_FIELDS = new Set([
  'verdict',
  'ready',
  'done',
  'implementation_status',
  'declares_truth',
  'strategy',
  'skip_sentry',
  'skip_verification',
  'lower_scrutiny',
  'mission_authority',
  'staging_ready',
  'fully_machine_ready',
  'approved',
  'consensus',
]);

/**
 * Validate a TSOS metrics entry. Returns { ok, violations }.
 * Does not throw — caller decides whether to block append.
 */
export function validateTsosMetricsEntry(entry) {
  const violations = [];

  if (!entry || typeof entry !== 'object') {
    return { ok: false, violations: ['entry must be an object'] };
  }

  for (const key of Object.keys(entry)) {
    if (FORBIDDEN_AUTHORITY_FIELDS.has(key)) {
      violations.push(`forbidden authority field: ${key}`);
    }
  }

  if (entry.skip_sentry === true || entry.skip_verification === true || entry.lower_scrutiny === true) {
    violations.push('TSOS may not lower scrutiny to save tokens');
  }

  if (entry.waste === true && entry.declares_truth) {
    violations.push('waste flag cannot co-exist with truth declaration');
  }

  if (!entry.step_id) {
    violations.push('step_id required');
  }

  return { ok: violations.length === 0, violations };
}

/** Strip unknown fields; keep only allowed measurement fields. */
export function sanitizeTsosMetricsEntry(entry) {
  const out = {};
  for (const key of Object.keys(entry)) {
    if (ALLOWED_METRIC_FIELDS.has(key)) {
      out[key] = entry[key];
    }
  }
  return out;
}
