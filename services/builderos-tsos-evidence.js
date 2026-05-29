/**
 * TSOS hook evidence quality aggregates — read-only, for routing readiness (TSOS-G2).
 *
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */

import { REQUIRED_METADATA_KEYS, TSOS_HOOK_TASK_TYPE } from './builderos-tsos-hook-service.js';

function pct(numerator, denominator) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function rowHasRequiredMetadata(metadata = {}) {
  if (!metadata || typeof metadata !== 'object') return false;
  return REQUIRED_METADATA_KEYS.every((key) => {
    const value = metadata[key];
    if (value === null || value === undefined || value === '') return false;
    return true;
  });
}

/**
 * @returns {Promise<object>} TSOS evidence quality snapshot
 */
export async function buildTsosEvidenceQuality(pool) {
  const empty = {
    ok: true,
    total_hooks: 0,
    committed_hooks: 0,
    verifier_linked_hooks: 0,
    g2_metadata_hooks: 0,
    avg_duration_ms: null,
    avg_output_bytes: null,
    hook_failures: 0,
    missing_metadata_count: 0,
    metadata_completeness_pct: 0,
    verifier_linkage_pct: 0,
    token_estimate_availability_pct: 0,
    read_path: 'GET /api/v1/lifeos/builderos/tsos-evidence',
    proof_source: `autonomous_telemetry_events WHERE task_type='${TSOS_HOOK_TASK_TYPE}'`,
    hook_failure_source: 'emit failures not persisted — count is 0 unless failure rows added later',
  };

  if (!pool) return { ...empty, ok: false, error: 'no_pool' };

  try {
    const [aggregateRes, linkedRes, hooksRes] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)::int AS total_hooks,
          COUNT(*) FILTER (WHERE metadata->>'committed' = 'true')::int AS committed_hooks,
          COUNT(*) FILTER (WHERE metadata->>'metadata_version' = 'tsos-g2')::int AS g2_metadata_hooks,
          ROUND(AVG(NULLIF((metadata->>'duration_ms')::numeric, 0)), 1) AS avg_duration_ms,
          ROUND(AVG(NULLIF((metadata->>'output_bytes')::numeric, 0)), 1) AS avg_output_bytes,
          COUNT(*) FILTER (
            WHERE COALESCE(total_token_estimate, 0) > 0
               OR COALESCE((metadata->>'total_token_estimate')::int, 0) > 0
          )::int AS token_estimate_hooks
        FROM autonomous_telemetry_events
        WHERE task_type = $1
      `, [TSOS_HOOK_TASK_TYPE]),
      pool.query(`
        SELECT COUNT(DISTINCT j.id)::int AS verifier_linked_hooks
        FROM builderos_command_control_jobs j
        INNER JOIN autonomous_telemetry_events e
          ON e.run_id = j.id::text AND e.task_type = $1
        WHERE j.status = 'committed'
          AND (j.result_json->'oil_audit_result'->>'ok') = 'true'
          AND (j.result_json->'oil_audit_result'->'gates'->>'syntax') = 'true'
          AND (j.result_json->'oil_audit_result'->'gates'->>'antipattern') = 'true'
          AND (j.result_json->'oil_audit_result'->'gates'->>'stub') = 'true'
      `, [TSOS_HOOK_TASK_TYPE]),
      pool.query(`
        SELECT id, run_id, metadata, total_token_estimate, created_at
        FROM autonomous_telemetry_events
        WHERE task_type = $1
        ORDER BY created_at DESC
        LIMIT 200
      `, [TSOS_HOOK_TASK_TYPE]),
    ]);

    const agg = aggregateRes.rows[0];
    const totalHooks = agg.total_hooks || 0;
    const committedHooks = agg.committed_hooks || 0;
    const verifierLinkedHooks = linkedRes.rows[0]?.verifier_linked_hooks || 0;
    const hooks = hooksRes.rows || [];

    let completeCount = 0;
    let missingMetadataCount = 0;
    for (const row of hooks) {
      const meta = row.metadata || {};
      if (rowHasRequiredMetadata(meta)) completeCount += 1;
      else missingMetadataCount += 1;
    }

    const g2Hooks = hooks.filter((r) => r.metadata?.metadata_version === 'tsos-g2');
    const g2Complete = g2Hooks.filter((r) => rowHasRequiredMetadata(r.metadata)).length;

    return {
      ...empty,
      total_hooks: totalHooks,
      committed_hooks: committedHooks,
      verifier_linked_hooks: verifierLinkedHooks,
      g2_metadata_hooks: agg.g2_metadata_hooks || 0,
      avg_duration_ms: agg.avg_duration_ms != null ? Number(agg.avg_duration_ms) : null,
      avg_output_bytes: agg.avg_output_bytes != null ? Number(agg.avg_output_bytes) : null,
      hook_failures: 0,
      missing_metadata_count: missingMetadataCount,
      metadata_completeness_pct: pct(completeCount, hooks.length || totalHooks),
      g2_metadata_completeness_pct: pct(g2Complete, g2Hooks.length),
      verifier_linkage_pct: pct(verifierLinkedHooks, totalHooks),
      token_estimate_availability_pct: pct(agg.token_estimate_hooks || 0, totalHooks),
      latest_hooks: hooks.slice(0, 5).map((r) => ({
        id: r.id,
        run_id: r.run_id,
        created_at: r.created_at,
        metadata_version: r.metadata?.metadata_version || null,
        has_required_metadata: rowHasRequiredMetadata(r.metadata),
        verifier_ok: r.metadata?.verifier_ok ?? null,
        target_file: r.metadata?.target_file ?? null,
      })),
    };
  } catch (error) {
    return { ...empty, ok: false, error: error.message };
  }
}
