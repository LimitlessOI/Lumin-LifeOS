/**
 * SYNOPSIS: TSOS-G3 routing decision log — shadow/active infrastructure (G3.3: hypothetical deltas).
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

import { buildTsosEvidenceForPrefix } from './builderos-tsos-evidence.js';
import { getBuilderRoutingPolicy } from './builderos-routing-policy.js';

export const TSOS_ROUTING_METADATA_VERSION = 'tsos-g3.3';
export const TSOS_ROUTING_MODES = ['shadow', 'active'];
const BASELINE_POLICY_SOURCE = 'builderos_routing_policy + task_model_map + availability';

const MODEL_TIER_ORDER = [
  'openai_builder_mini',
  'groq_llama',
  'gemini_flash',
  'deepseek',
  'cerebras_llama',
  'openai_builder_standard',
  'openai_builder_escalation',
  'claude_sonnet',
  'gpt-5.1-codex',
  'gpt-5.2-codex',
  'ollama_qwen_coder_32b',
  'ollama_deepseek_coder_v2',
  'ollama_deepseek_coder_33b',
];

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

function normalizeTargetPath(targetFile) {
  return String(targetFile || '').trim().replace(/^[/\\]+/, '').toLowerCase();
}

function modelTierIndex(model) {
  const idx = MODEL_TIER_ORDER.indexOf(model);
  return idx === -1 ? null : idx;
}

function escalateOneTier(model, allowedModels) {
  const idx = modelTierIndex(model);
  if (idx === null) return null;
  const allowed = new Set(allowedModels || []);
  for (let i = idx + 1; i < MODEL_TIER_ORDER.length; i += 1) {
    if (allowed.has(MODEL_TIER_ORDER[i])) return MODEL_TIER_ORDER[i];
  }
  return null;
}

function downgradeOneTier(model, allowedModels) {
  const idx = modelTierIndex(model);
  if (idx === null) return null;
  const allowed = new Set(allowedModels || []);
  for (let i = idx - 1; i >= 0; i -= 1) {
    if (allowed.has(MODEL_TIER_ORDER[i])) return MODEL_TIER_ORDER[i];
  }
  return null;
}

function allowedModelsForTaskClass(taskClass, routingKey, targetFile) {
  const policy = getBuilderRoutingPolicy({
    routingKey: routingKey || 'council.builder.code',
    mode: 'code',
    executionOnly: false,
    targetFile: targetFile || 'services/example.js',
  });
  if (policy.taskClass === taskClass) {
    return uniqueStrings(policy.allowedModels);
  }
  if (taskClass === 'high_risk_repo_edit') {
    const hr = getBuilderRoutingPolicy({
      routingKey: 'council.builder.code',
      mode: 'code',
      executionOnly: false,
      targetFile: targetFile || 'services/example.js',
    });
    return uniqueStrings(hr.allowedModels);
  }
  return uniqueStrings(policy.allowedModels);
}

/**
 * Explicit baseline routing comparator — policy + task map + availability only (no memory, no TSOS).
 */
export function computeBaselineRouting({
  routingKey,
  taskClassBaseline,
  baselineModel,
  routingPolicy = null,
  operatorOverride = false,
}) {
  const taskClass = pickString(taskClassBaseline) || 'classification';
  const model = pickString(baselineModel) || 'openai_builder_mini';
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
    change_reason_detail: 'G3.3 shadow — actual dispatch uses baseline path only',
  };
}

/**
 * G3.3 — compute hypothetical TSOS routing delta (shadow only; never applied to dispatch).
 */
export function computeTsosHypotheticalRouting({
  baselineComparator,
  evidence = null,
  targetFile = null,
  routingKey = null,
}) {
  const baselineTaskClass = pickString(baselineComparator?.task_class_baseline) || 'classification';
  const baselineModel = pickString(baselineComparator?.baseline_model) || 'openai_builder_mini';
  const allowedBaseline = uniqueStrings(baselineComparator?.baseline_allowed_models || []);

  const unchanged = (detail) => ({
    hypothetical_task_class: baselineTaskClass,
    hypothetical_model: baselineModel,
    hypothetical_decision_changed: false,
    hypothetical_change_reason_code: null,
    hypothetical_change_reason_detail: detail,
    hypothetical_policy_allowed: allowedBaseline,
  });

  if (!evidence?.ok || evidence.error) {
    return unchanged('G3.3 shadow — no hypothetical delta (evidence missing or unreadable)');
  }
  if (!allowedBaseline.length) {
    return unchanged('G3.3 shadow — no hypothetical delta (allowed model list missing)');
  }

  let hypotheticalTaskClass = baselineTaskClass;
  let hypotheticalModel = baselineModel;
  let reasonCode = null;
  let reasonDetail = null;
  let modelRuleApplied = null;

  const path = normalizeTargetPath(targetFile);
  const repairCount = Number(evidence.matching_prefix_avg_repair_count ?? 0);
  const verifierPct = Number(evidence.verifier_linkage_pct ?? 0);

  if ((path.startsWith('services/') || path.startsWith('routes/')) && repairCount > 0) {
    hypotheticalTaskClass = 'high_risk_repo_edit';
    reasonCode = 'tsos_target_prefix_risk';
    reasonDetail = `Target prefix ${evidence.target_prefix || path.split('/')[0] + '/'} has repair_count ${repairCount} > 0`;
  }

  let hypotheticalAllowed = hypotheticalTaskClass === baselineTaskClass
    ? allowedBaseline
    : allowedModelsForTaskClass(hypotheticalTaskClass, routingKey, targetFile);

  if (!hypotheticalAllowed.length) {
    return unchanged('G3.3 shadow — no hypothetical delta (hypothetical allowed model list empty)');
  }

  const avgRepair = Number(evidence.matching_prefix_avg_repair_count ?? 0);
  if (avgRepair >= 1.5 && verifierPct >= 80) {
    const escalated = escalateOneTier(hypotheticalModel, hypotheticalAllowed);
    if (escalated && escalated !== hypotheticalModel) {
      hypotheticalModel = escalated;
      reasonCode = 'tsos_repair_rate_escalation';
      reasonDetail = `Prefix avg repair ${avgRepair} >= 1.5 with verifier linkage ${verifierPct}%`;
      modelRuleApplied = 'escalation';
    }
  }

  if (modelRuleApplied !== 'escalation') {
    const prefixTok = evidence.matching_prefix_avg_token_estimate ?? evidence.avg_token_estimate;
    const globalTok = evidence.global_avg_token_estimate;
    const cheaperSuccess = evidence.prefix_cheaper_model_verifier_success === true;
    if (
      prefixTok != null &&
      globalTok != null &&
      Number(prefixTok) > Number(globalTok) &&
      cheaperSuccess
    ) {
      const downgraded = downgradeOneTier(hypotheticalModel, hypotheticalAllowed);
      if (downgraded && downgraded !== hypotheticalModel) {
        hypotheticalModel = downgraded;
        reasonCode = 'tsos_token_efficiency_downgrade';
        reasonDetail = `Prefix token ${prefixTok} > global ${globalTok} with cheaper verifier-passed success`;
      }
    }
  }

  if (!hypotheticalAllowed.includes(hypotheticalModel)) {
    hypotheticalModel = baselineModel;
    hypotheticalTaskClass = baselineTaskClass;
    return unchanged('G3.3 shadow — hypothetical model rejected (violates policy allowed set)');
  }

  const hypotheticalChanged =
    hypotheticalTaskClass !== baselineTaskClass || hypotheticalModel !== baselineModel;

  return {
    hypothetical_task_class: hypotheticalTaskClass,
    hypothetical_model: hypotheticalModel,
    hypothetical_decision_changed: hypotheticalChanged,
    hypothetical_change_reason_code: hypotheticalChanged ? reasonCode : null,
    hypothetical_change_reason_detail: hypotheticalChanged
      ? reasonDetail
      : 'G3.3 shadow — no hypothetical delta (evidence thresholds not met)',
    hypothetical_policy_allowed: hypotheticalAllowed,
  };
}

/**
 * Actual dispatch path unchanged; hypothetical delta computed for shadow audit only.
 */
export function computeTsosRoutingAdjustment({
  baselineComparator,
  evidence = null,
  targetFile = null,
  routingKey = null,
}) {
  const baseline = baselineComparator || {};
  const taskClass = pickString(baseline.task_class_baseline) || 'classification';
  const model = pickString(baseline.baseline_model) || 'gemini_flash';
  const evidenceOk = evidence?.ok === true && !evidence?.error;

  const hypothetical = computeTsosHypotheticalRouting({
    baselineComparator,
    evidence,
    targetFile,
    routingKey,
  });

  return {
    taskClassSelected: taskClass,
    selectedModel: model,
    decisionChanged: false,
    changeReasonCode: null,
    changeReasonDetail: 'G3.3 shadow — actual dispatch unchanged; see hypothetical_* fields',
    evidenceReadOk: evidenceOk,
    ...hypothetical,
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
    matching_prefix_avg_token_estimate: evidence.matching_prefix_avg_token_estimate ?? null,
    global_avg_token_estimate: evidence.global_avg_token_estimate ?? null,
    prefix_cheaper_model_verifier_success: evidence.prefix_cheaper_model_verifier_success ?? false,
  };
}

function buildEvidenceSummary(evidenceSnapshot) {
  if (!evidenceSnapshot) return null;
  return {
    total_hooks: evidenceSnapshot.total_hooks,
    target_prefix: evidenceSnapshot.target_prefix,
    matching_prefix_hook_count: evidenceSnapshot.matching_prefix_hook_count,
    matching_prefix_avg_repair_count: evidenceSnapshot.matching_prefix_avg_repair_count,
    verifier_linkage_pct: evidenceSnapshot.verifier_linkage_pct,
    g2_metadata_completeness_pct: evidenceSnapshot.g2_metadata_completeness_pct,
  };
}

/**
 * Persist one routing decision row (fail-open on DB errors).
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
  const evidence = row.evidence_snapshot_json || {};
  const { comparator_snapshot_json: _c, evidence_snapshot_json: _e, ...rest } = row;

  return {
    ...rest,
    ...comparator,
    comparator_snapshot_json: comparator,
    evidence_snapshot_json: evidence,
    evidence_summary: buildEvidenceSummary(evidence),
    shadow_only: true,
    actual_dispatch_changed: rest.decision_changed === true,
  };
}

/**
 * Read recent routing decisions (read-only audit surface).
 */
export async function listRoutingDecisions(pool, options = {}) {
  const limit = Math.min(Math.max(Number(options.limit) || 50, 1), 200);
  const changedOnly = options.changedOnly === true || options.changed_only === 'true';
  const hypotheticalOnly = options.hypotheticalOnly === true || options.hypothetical_only === 'true';
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
    if (hypotheticalOnly) {
      where.push("(comparator_snapshot_json->>'hypothetical_decision_changed') = 'true'");
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
      hypothetical_only: hypotheticalOnly,
      mode: mode || null,
      read_path: 'GET /api/v1/lifeos/builderos/tsos-routing-decisions',
      metadata_version: TSOS_ROUTING_METADATA_VERSION,
      shadow_only: true,
      actual_dispatch_changed: false,
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
    targetFile,
    routingKey,
  });

  const comparatorSnapshot = {
    ...baselineComparator,
    task_class_selected: baselineComparator.task_class_baseline,
    selected_model: baselineComparator.baseline_model,
    decision_changed: false,
    change_reason_code: null,
    change_reason_detail: adjustment.changeReasonDetail,
    hypothetical_task_class: adjustment.hypothetical_task_class,
    hypothetical_model: adjustment.hypothetical_model,
    hypothetical_decision_changed: adjustment.hypothetical_decision_changed,
    hypothetical_change_reason_code: adjustment.hypothetical_change_reason_code,
    hypothetical_change_reason_detail: adjustment.hypothetical_change_reason_detail,
    hypothetical_policy_allowed: adjustment.hypothetical_policy_allowed,
  };

  const evidenceSnapshot = buildEvidenceSnapshot(evidence);

  return insertRoutingDecision(pool, {
    mode: 'shadow',
    routingKey,
    targetFile,
    taskClassBaseline: baselineComparator.task_class_baseline,
    taskClassSelected: baselineComparator.task_class_baseline,
    baselineModel: baselineComparator.baseline_model,
    selectedModel: baselineComparator.baseline_model,
    decisionChanged: false,
    changeReasonCode: null,
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
