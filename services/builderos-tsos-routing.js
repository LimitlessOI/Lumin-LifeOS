/**
 * TSOS-G3 routing decision log — shadow/active infrastructure (G3.2: comparator refinement).
 *
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */

import { buildTsosEvidenceForPrefix } from './builderos-tsos-evidence.js';

export const TSOS_ROUTING_METADATA_VERSION = 'tsos-g3.2';
export const TSOS_ROUTING_MODES = ['shadow', 'active'];
const BASELINE_POLICY_SOURCE = 'builderos_routing_policy + task_model_map + availability';

function routingModeFromEnv() {
  const raw = String(process.env.BUILDEROS_TSOS_ROUTING_MODE || 'shadow').trim().toLowerCase();
  return TSOS_ROUTING_MODES.includes(raw) ? raw : 'shadow';
}

function pickString(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text.length ? text : null;
}

function pickBool(value) {
  if (value === true || value === false) return value;
  return null;
}

function pickInt(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function uniqueStrings(values = []) {
  return [...new Set((values || []).filter(Boolean).map(String))];
}

/**
 * Explicit baseline routing comparator — policy + task map + availability only (no memory, no TSOS).
 * G3.2: selected path always equals baseline path; observability only.
 * @param {object} input
 * @returns {object}
 */
export function computeBaselineRouting({
  routingKey,
  taskClassBaseline,
  baselineModel,
  routingPolicy = null,
  operatorOverride = false,
}) {
  const taskClass = pickString(taskClassBaseline) || 'classification';
  const model = pickString(baselineModel) || 'gemini_flash';
  const allowedModels = uniqueStrings(routingPolicy?.policy?.allowedModels || []);

  return {
    routing_key: pickString(routingKey) || 'unknown',
    task_class_baseline: taskClass,
    task_class_selected: taskClass,
    baseline_model: model,
    selected_model: model,
    baseline_allowed_models: allowedModels,
    selected_allowed_models: allowedModels,
    baseline_policy_source: BASELINE_POLICY_SOURCE,
    selected_policy_source: BASELINE_POLICY_SOURCE,
    operator_override: operatorOverride === true,
    decision_changed: false,
    change_reason_code: null,
    change_reason_detail: 'G3.2 shadow — baseline comparator observability only; selected path equals baseline path',
  };
}

/**
 * G3.2 stub — returns unchanged baseline (no TSOS routing adjustments yet).
 * @param {object} input
 * @returns {object}
 */
export function computeTsosRoutingAdjustment({
  baselineComparator,
  evidence = null,
}) {
  const baseline = baselineComparator || {};
  const taskClass = pickString(baseline.task_class_baseline) || 'classification';
  const model = pickString(baseline.baseline_model) || 'gemini_flash';
  const evidenceOk = evidence?.ok === true && !evidence?.error;

  return {
    taskClassSelected: taskClass,
    selectedModel: model,
    decisionChanged: false,
    changeReasonCode: null,
    changeReasonDetail: evidenceOk
      ? 'G3.2 shadow — TSOS evidence read; comparator records baseline only'
      : 'G3.2 shadow — baseline unchanged (evidence missing or unreadable)',
    evidenceReadOk: evidenceOk,
  };
}

function buildEvidenceSnapshot(evidence) {
  if (!evidence || evidence.ok !== true) return null;

  return {
    total_hooks: evidence.total_hooks ?? null,
    committed_hooks: evidence.committed_hooks ?? null,
    verifier_linkage_pct: evidence.verifier_linkage_pct ?? null,
    g2_metadata_completeness_pct: evidence.g2_metadata_completeness_pct ?? null,
    avg_duration_ms: evidence.avg_duration_ms ?? null,
    avg_output_bytes: evidence.avg_output_bytes ?? null,
    token_estimate_availability_pct: evidence.token_estimate_availability_pct ?? null,
    target_prefix: evidence.target_prefix ?? evidence.prefix ?? null,
    matching_prefix_hook_count: evidence.matching_prefix_hook_count ?? evidence.prefix_hook_count ?? null,
    matching_prefix_avg_duration_ms: evidence.matching_prefix_avg_duration_ms ?? evidence.avg_duration_ms ?? null,
    matching_prefix_avg_repair_count: evidence.matching_prefix_avg_repair_count ?? evidence.avg_repair_count ?? null,
    matching_prefix_token_estimate_availability_pct:
      evidence.matching_prefix_token_estimate_availability_pct ?? null,
  };
}

/**
 * Persist one routing decision row (fail-open on DB errors).
 * @param {import('pg').Pool} pool
 * @param {object} payload
 * @returns {Promise<{ ok: boolean, id?: number, dispatch_id?: string, error?: string }>}
 */
export async function insertRoutingDecision(pool, payload = {}) {
  if (!pool?.query) {
    return { ok: false, error: 'no_pool' };
  }

  const mode = pickString(payload.mode) || routingModeFromEnv();
  const safeMode = TSOS_ROUTING_MODES.includes(mode) ? mode : 'shadow';

  try {
    const { rows } = await pool.query(
      `
        INSERT INTO builderos_tsos_routing_decisions (
          dispatch_id,
          mode,
          routing_key,
          target_file,
          task_class_baseline,
          task_class_selected,
          baseline_model,
          selected_model,
          decision_changed,
          change_reason_code,
          change_reason_detail,
          evidence_read_ok,
          evidence_snapshot_json,
          comparator_snapshot_json,
          evidence_hook_count,
          evidence_g2_pct,
          evidence_verifier_link_pct,
          token_estimate_baseline,
          token_estimate_selected,
          token_estimate_source,
          cost_estimate_baseline_usd,
          cost_estimate_selected_usd,
          job_id,
          builder_committed,
          verifier_ok,
          duration_ms,
          metadata_version
        ) VALUES (
          COALESCE($1::uuid, gen_random_uuid()),
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12,
          $13::jsonb,
          $14::jsonb,
          $15,
          $16,
          $17,
          $18,
          $19,
          $20,
          $21,
          $22,
          $23::uuid,
          $24,
          $25,
          $26,
          $27
        )
        RETURNING id, dispatch_id
      `,
      [
        payload.dispatchId || null,
        safeMode,
        pickString(payload.routingKey) || 'unknown',
        pickString(payload.targetFile),
        pickString(payload.taskClassBaseline) || 'classification',
        pickString(payload.taskClassSelected) || pickString(payload.taskClassBaseline) || 'classification',
        pickString(payload.baselineModel) || 'gemini_flash',
        pickString(payload.selectedModel) || pickString(payload.baselineModel) || 'gemini_flash',
        payload.decisionChanged === true,
        pickString(payload.changeReasonCode),
        pickString(payload.changeReasonDetail),
        payload.evidenceReadOk === true,
        payload.evidenceSnapshotJson ? JSON.stringify(payload.evidenceSnapshotJson) : null,
        payload.comparatorSnapshotJson ? JSON.stringify(payload.comparatorSnapshotJson) : null,
        pickInt(payload.evidenceHookCount),
        payload.evidenceG2Pct != null ? Number(payload.evidenceG2Pct) : null,
        payload.evidenceVerifierLinkPct != null ? Number(payload.evidenceVerifierLinkPct) : null,
        pickInt(payload.tokenEstimateBaseline),
        pickInt(payload.tokenEstimateSelected),
        pickString(payload.tokenEstimateSource),
        payload.costEstimateBaselineUsd != null ? Number(payload.costEstimateBaselineUsd) : null,
        payload.costEstimateSelectedUsd != null ? Number(payload.costEstimateSelectedUsd) : null,
        payload.jobId || null,
        pickBool(payload.builderCommitted),
        pickBool(payload.verifierOk),
        pickInt(payload.durationMs),
        pickString(payload.metadataVersion) || TSOS_ROUTING_METADATA_VERSION,
      ],
    );

    return { ok: true, id: rows[0]?.id, dispatch_id: rows[0]?.dispatch_id };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function mergeComparatorIntoDecision(row = {}) {
  const comparator = row.comparator_snapshot_json || {};
  const { comparator_snapshot_json: _drop, ...rest } = row;
  return {
    ...rest,
    ...comparator,
    comparator_snapshot_json: comparator,
  };
}

/**
 * Read recent routing decisions (read-only audit surface).
 * @param {import('pg').Pool} pool
 * @param {{ limit?: number, changedOnly?: boolean, mode?: string }} options
 */
export async function listRoutingDecisions(pool, options = {}) {
  const limit = Math.min(Math.max(Number(options.limit) || 50, 1), 200);
  const changedOnly = options.changedOnly === true || options.changed_only === 'true';
  const mode = pickString(options.mode);

  if (!pool?.query) {
    return { ok: false, error: 'no_pool', decisions: [], total: 0 };
  }

  try {
    const params = [];
    const where = [];
    if (changedOnly) {
      where.push('decision_changed = true');
    }
    if (mode && TSOS_ROUTING_MODES.includes(mode)) {
      params.push(mode);
      where.push(`mode = $${params.length}`);
    }
    params.push(limit);
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [countRes, rowsRes] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS total FROM builderos_tsos_routing_decisions ${whereSql}`, params.slice(0, -1)),
      pool.query(
        `
          SELECT
            id, created_at, dispatch_id, mode, routing_key, target_file,
            task_class_baseline, task_class_selected, baseline_model, selected_model,
            decision_changed, change_reason_code, change_reason_detail,
            evidence_read_ok, evidence_snapshot_json, comparator_snapshot_json,
            evidence_hook_count, evidence_g2_pct, evidence_verifier_link_pct,
            metadata_version
          FROM builderos_tsos_routing_decisions
          ${whereSql}
          ORDER BY created_at DESC
          LIMIT $${params.length}
        `,
        params,
      ),
    ]);

    return {
      ok: true,
      total: countRes.rows[0]?.total || 0,
      limit,
      changed_only: changedOnly,
      mode: mode || null,
      read_path: 'GET /api/v1/lifeos/builderos/tsos-routing-decisions',
      metadata_version: TSOS_ROUTING_METADATA_VERSION,
      decisions: rowsRes.rows.map(mergeComparatorIntoDecision),
    };
  } catch (error) {
    return { ok: false, error: error.message, decisions: [], total: 0 };
  }
}

/**
 * Shadow-mode decision log after baseline policy path (fail-open, non-blocking).
 */
export async function logShadowRoutingDecision(pool, {
  routingKey,
  targetFile,
  taskClassBaseline,
  baselineModel,
  routingPolicy = null,
  operatorOverride = false,
}) {
  const started = Date.now();
  let evidence = null;
  try {
    evidence = await buildTsosEvidenceForPrefix(pool, targetFile);
  } catch {
    evidence = { ok: false, error: 'evidence_read_failed' };
  }

  const baselineComparator = computeBaselineRouting({
    routingKey,
    taskClassBaseline,
    baselineModel,
    routingPolicy,
    operatorOverride,
  });

  const adjustment = computeTsosRoutingAdjustment({
    baselineComparator,
    evidence,
  });

  const comparatorSnapshot = {
    ...baselineComparator,
    task_class_selected: adjustment.taskClassSelected,
    selected_model: adjustment.selectedModel,
    decision_changed: adjustment.decisionChanged,
    change_reason_code: adjustment.changeReasonCode,
    change_reason_detail: adjustment.changeReasonDetail,
  };

  const evidenceSnapshot = buildEvidenceSnapshot(evidence);

  return insertRoutingDecision(pool, {
    mode: 'shadow',
    routingKey,
    targetFile,
    taskClassBaseline: baselineComparator.task_class_baseline,
    taskClassSelected: adjustment.taskClassSelected,
    baselineModel: baselineComparator.baseline_model,
    selectedModel: adjustment.selectedModel,
    decisionChanged: adjustment.decisionChanged,
    changeReasonCode: adjustment.changeReasonCode,
    changeReasonDetail: adjustment.changeReasonDetail,
    evidenceReadOk: adjustment.evidenceReadOk,
    evidenceSnapshotJson: evidenceSnapshot,
    comparatorSnapshotJson: comparatorSnapshot,
    evidenceHookCount: evidence?.matching_prefix_hook_count ?? evidence?.prefix_hook_count ?? evidence?.total_hooks ?? null,
    evidenceG2Pct: evidence?.g2_metadata_completeness_pct ?? null,
    evidenceVerifierLinkPct: evidence?.verifier_linkage_pct ?? null,
    durationMs: Date.now() - started,
    metadataVersion: TSOS_ROUTING_METADATA_VERSION,
  });
}
