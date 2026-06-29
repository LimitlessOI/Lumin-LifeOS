/**
 * SYNOPSIS: TSOS hook evidence quality aggregates — read-only, for routing readiness (TSOS-G2).
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
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

function normalizeTargetPrefix(targetFile) {
  const normalized = String(targetFile || '').trim().replace(/^[/\\]+/, '').toLowerCase();
  if (!normalized) return null;
  const slash = normalized.indexOf('/');
  if (slash === -1) return normalized.endsWith('.js') ? 'scripts/' : `${normalized}/`;
  return normalized.slice(0, slash + 1);
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

/**
 * Prefix-scoped TSOS evidence for pre-dispatch routing reads (TSOS-G3).
 * Fail-open: returns ok:false with empty aggregates when pool/prefix missing.
 * @param {import('pg').Pool} pool
 * @param {string|null|undefined} targetFile
 */
export async function buildTsosEvidenceForPrefix(pool, targetFile) {
  const prefix = normalizeTargetPrefix(targetFile);
  const empty = {
    ok: false,
    prefix,
    target_prefix: prefix,
    prefix_hook_count: 0,
    matching_prefix_hook_count: 0,
    total_hooks: 0,
    committed_hooks: 0,
    g2_metadata_completeness_pct: 0,
    verifier_linkage_pct: 0,
    avg_repair_count: null,
    matching_prefix_avg_repair_count: null,
    avg_duration_ms: null,
    matching_prefix_avg_duration_ms: null,
    avg_output_bytes: null,
    avg_token_estimate: null,
    token_estimate_availability_pct: 0,
    matching_prefix_token_estimate_availability_pct: 0,
    read_path: 'buildTsosEvidenceForPrefix',
    proof_source: `autonomous_telemetry_events WHERE task_type='${TSOS_HOOK_TASK_TYPE}' AND target_file prefix`,
  };

  if (!pool?.query) {
    return { ...empty, error: 'no_pool' };
  }

  try {
    const globalEvidence = await buildTsosEvidenceQuality(pool);
    if (!globalEvidence.ok) {
      return { ...empty, error: globalEvidence.error || 'global_evidence_failed' };
    }

    if (!prefix) {
      return {
        ok: true,
        prefix: null,
        target_prefix: null,
        prefix_hook_count: 0,
        matching_prefix_hook_count: 0,
        total_hooks: globalEvidence.total_hooks,
        committed_hooks: globalEvidence.committed_hooks,
        g2_metadata_completeness_pct: globalEvidence.g2_metadata_completeness_pct,
        verifier_linkage_pct: globalEvidence.verifier_linkage_pct,
        avg_repair_count: null,
        matching_prefix_avg_repair_count: null,
        avg_duration_ms: globalEvidence.avg_duration_ms,
        matching_prefix_avg_duration_ms: null,
        avg_output_bytes: globalEvidence.avg_output_bytes,
        avg_token_estimate: null,
        token_estimate_availability_pct: globalEvidence.token_estimate_availability_pct,
        matching_prefix_token_estimate_availability_pct: 0,
        read_path: 'buildTsosEvidenceForPrefix',
        proof_source: empty.proof_source,
        error: null,
      };
    }

    const prefixRes = await pool.query(
      `
        SELECT
          metadata,
          total_token_estimate,
          created_at
        FROM autonomous_telemetry_events
        WHERE task_type = $1
          AND LOWER(COALESCE(metadata->>'target_file', '')) LIKE $2
        ORDER BY created_at DESC
        LIMIT 20
      `,
      [TSOS_HOOK_TASK_TYPE, `${prefix}%`],
    );

    const globalTokenRes = await pool.query(
      `
        SELECT ROUND(AVG(NULLIF(
          COALESCE(total_token_estimate, (metadata->>'total_token_estimate')::int), 0
        )), 1) AS global_avg_token_estimate
        FROM autonomous_telemetry_events
        WHERE task_type = $1
      `,
      [TSOS_HOOK_TASK_TYPE],
    );
    const globalAvgToken = globalTokenRes.rows[0]?.global_avg_token_estimate != null
      ? Number(globalTokenRes.rows[0].global_avg_token_estimate)
      : null;

    const prefixHooks = prefixRes.rows || [];
    let repairSum = 0;
    let repairCount = 0;
    let durationSum = 0;
    let durationCount = 0;
    let tokenSum = 0;
    let tokenCount = 0;
    let g2Complete = 0;
    let prefixTokenEstimateCount = 0;
    let prefixCheaperVerifierSuccess = false;
    const cheaperModels = new Set(['groq_llama', 'deepseek', 'cerebras_llama']);

    for (const row of prefixHooks) {
      const meta = row.metadata || {};
      if (rowHasRequiredMetadata(meta)) g2Complete += 1;
      if (meta.verifier_ok === true || meta.verifier_ok === 'true') {
        const builderModel = String(meta.builder_model || meta.model_used || '').trim();
        if (builderModel && cheaperModels.has(builderModel)) {
          prefixCheaperVerifierSuccess = true;
        }
      }
      const repair = Number(meta.repair_count ?? meta.repair_attempts);
      if (Number.isFinite(repair)) {
        repairSum += repair;
        repairCount += 1;
      }
      const duration = Number(meta.duration_ms);
      if (Number.isFinite(duration) && duration > 0) {
        durationSum += duration;
        durationCount += 1;
      }
      const tokens = Number(row.total_token_estimate ?? meta.total_token_estimate);
      if (Number.isFinite(tokens) && tokens > 0) {
        tokenSum += tokens;
        tokenCount += 1;
        prefixTokenEstimateCount += 1;
      }
    }

    const matchingPrefixAvgRepair = repairCount ? Math.round((repairSum / repairCount) * 10) / 10 : null;
    const matchingPrefixAvgDuration = durationCount ? Math.round(durationSum / durationCount) : null;
    const matchingPrefixAvgToken = tokenCount ? Math.round(tokenSum / tokenCount) : null;

    return {
      ok: true,
      prefix,
      target_prefix: prefix,
      prefix_hook_count: prefixHooks.length,
      matching_prefix_hook_count: prefixHooks.length,
      total_hooks: globalEvidence.total_hooks,
      committed_hooks: globalEvidence.committed_hooks,
      g2_metadata_completeness_pct: pct(g2Complete, prefixHooks.length),
      verifier_linkage_pct: globalEvidence.verifier_linkage_pct,
      avg_repair_count: matchingPrefixAvgRepair,
      matching_prefix_avg_repair_count: matchingPrefixAvgRepair,
      avg_duration_ms: globalEvidence.avg_duration_ms,
      matching_prefix_avg_duration_ms: matchingPrefixAvgDuration,
      avg_output_bytes: globalEvidence.avg_output_bytes,
      avg_token_estimate: matchingPrefixAvgToken,
      matching_prefix_avg_token_estimate: matchingPrefixAvgToken,
      global_avg_token_estimate: globalAvgToken,
      prefix_cheaper_model_verifier_success: prefixCheaperVerifierSuccess,
      token_estimate_availability_pct: globalEvidence.token_estimate_availability_pct,
      matching_prefix_token_estimate_availability_pct: pct(prefixTokenEstimateCount, prefixHooks.length),
      read_path: 'buildTsosEvidenceForPrefix',
      proof_source: empty.proof_source,
      error: null,
    };
  } catch (error) {
    return { ...empty, error: error.message };
  }
}
