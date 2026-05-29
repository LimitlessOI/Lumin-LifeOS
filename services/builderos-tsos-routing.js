/**
 * TSOS-G3 routing decision log — shadow/active infrastructure (G3.1: shadow only).
 *
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */

import { buildTsosEvidenceForPrefix } from './builderos-tsos-evidence.js';

export const TSOS_ROUTING_METADATA_VERSION = 'tsos-g3';
export const TSOS_ROUTING_MODES = ['shadow', 'active'];

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

/**
 * G3.1 stub — returns unchanged baseline (no routing adjustments yet).
 * @param {object} input
 * @returns {object}
 */
export function computeTsosRoutingAdjustment({
  baselineTaskClass,
  baselineModel,
  evidence = null,
}) {
  const taskClass = pickString(baselineTaskClass) || 'classification';
  const model = pickString(baselineModel) || 'gemini_flash';
  const evidenceOk = evidence?.ok === true && !evidence?.error;

  return {
    taskClassSelected: taskClass,
    selectedModel: model,
    decisionChanged: false,
    changeReasonCode: null,
    changeReasonDetail: evidenceOk
      ? 'G3.1 stub — TSOS evidence read; no adjustment applied'
      : 'G3.1 stub — baseline unchanged (evidence missing or unreadable)',
    evidenceReadOk: evidenceOk,
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
          $14,
          $15,
          $16,
          $17,
          $18,
          $19,
          $20,
          $21,
          $22::uuid,
          $23,
          $24,
          $25,
          $26
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
            evidence_read_ok, evidence_hook_count, evidence_g2_pct, evidence_verifier_link_pct,
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
      decisions: rowsRes.rows,
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
}) {
  const started = Date.now();
  let evidence = null;
  try {
    evidence = await buildTsosEvidenceForPrefix(pool, targetFile);
  } catch {
    evidence = { ok: false, error: 'evidence_read_failed' };
  }

  const adjustment = computeTsosRoutingAdjustment({
    baselineTaskClass: taskClassBaseline,
    baselineModel,
    evidence,
  });

  const snapshot = evidence?.ok
    ? {
        prefix: evidence.prefix,
        prefix_hook_count: evidence.prefix_hook_count,
        total_hooks: evidence.total_hooks,
        g2_metadata_completeness_pct: evidence.g2_metadata_completeness_pct,
        verifier_linkage_pct: evidence.verifier_linkage_pct,
        avg_repair_count: evidence.avg_repair_count,
        avg_duration_ms: evidence.avg_duration_ms,
        avg_token_estimate: evidence.avg_token_estimate,
      }
    : null;

  return insertRoutingDecision(pool, {
    mode: 'shadow',
    routingKey,
    targetFile,
    taskClassBaseline,
    taskClassSelected: adjustment.taskClassSelected,
    baselineModel,
    selectedModel: adjustment.selectedModel,
    decisionChanged: adjustment.decisionChanged,
    changeReasonCode: adjustment.changeReasonCode,
    changeReasonDetail: adjustment.changeReasonDetail,
    evidenceReadOk: adjustment.evidenceReadOk,
    evidenceSnapshotJson: snapshot,
    evidenceHookCount: evidence?.prefix_hook_count ?? evidence?.total_hooks ?? null,
    evidenceG2Pct: evidence?.g2_metadata_completeness_pct ?? null,
    evidenceVerifierLinkPct: evidence?.verifier_linkage_pct ?? null,
    durationMs: Date.now() - started,
    metadataVersion: TSOS_ROUTING_METADATA_VERSION,
  });
}
