/**
 * SYNOPSIS: Wire council builder /build to deliberation v2.7 pipeline (seed before codegen, finalize after commit).
 * Wire council builder /build to deliberation v2.7 pipeline (seed before codegen, finalize after commit).
 * @ssot docs/projects/AMENDMENT_48_BUILDEROS_VOCABULARY.md
 */

import { createDeliberationGovernanceService } from './deliberation-governance-service.js';

function resolveSessionId(body) {
  if (body.deliberation_session_id) return String(body.deliberation_session_id);
  if (body.session_id) return String(body.session_id);
  if (body.task_id) return `builder:${body.task_id}`;
  if (body.objective_id) return `builder:obj:${body.objective_id}`;
  return `builder:${Date.now()}`;
}

/**
 * @param {import('pg').Pool} pool
 * @param {object} body — /build request body
 * @param {{ warn?: Function }} log
 */
export async function seedBuilderDeliberation(pool, body, log = console) {
  if (body.skip_deliberation === true) return { ok: true, skipped: true, reason: 'skip_deliberation' };
  if (!pool?.query) {
    return { ok: false, status: 'DELIBERATION_NO_POOL', errors: ['database pool unavailable for deliberation seed'] };
  }

  const session_id = resolveSessionId(body);
  const delib = createDeliberationGovernanceService(pool, log);
  const result = await delib.seedPipelineMinimum({
    session_id,
    objective_id: body.objective_id || body.task_id || null,
    project_slug: body.domain || body.project_slug || 'LifeOS',
    case_text:
      body.deliberation_case ||
      `Builder objective: ${String(body.task || '').slice(0, 500)}`,
    problem: body.task,
    founder_priority_mode: body.founder_priority_mode === true,
    models: body.deliberation_models || [
      { id: body.bpb_model || 'bpb-model', focus: 'BPB' },
      { id: body.cdr_model || body.model || 'cdr-model', focus: 'CDR' },
    ],
  });

  if (!result.ok) {
    return { ok: false, session_id, errors: result.errors || [result.error] };
  }

  // Seed establishes Hist+CFO only; load-bearing consensus is enforced at finalize.
  const gate = await delib.getGateStatus(session_id);
  return {
    ok: true,
    session_id,
    gate,
    seeded: true,
    load_bearing_required_at_finalize: body.load_bearing === true,
  };
}

/**
 * @param {import('pg').Pool} pool
 * @param {object} opts
 */
export async function finalizeBuilderDeliberation(pool, opts, log = console) {
  if (opts.skip_deliberation === true || opts.skip_deliberation_finalize === true) {
    return { ok: true, skipped: true, reason: 'skip_finalize' };
  }

  const session_id = opts.session_id;
  if (!session_id) return { ok: true, skipped: true, reason: 'no_session_id' };

  if (!pool?.query) {
    return {
      ok: false,
      status: 'DELIBERATION_NO_POOL',
      errors: ['database pool unavailable for deliberation finalize'],
    };
  }

  const delib = createDeliberationGovernanceService(pool, log);
  return delib.finalizePipeline({
    session_id,
    mission_id: opts.mission_id || null,
    objective_id: opts.objective_id || opts.task_id || null,
    load_bearing: opts.load_bearing === true,
    consensus: opts.consensus || null,
    scorecard: opts.scorecard || {
      decision_type: 'builder_build',
      model_count: 2,
      partial: true,
      notes: `Committed ${opts.target_file || 'file'} via /build`,
      grade: opts.grade || null,
    },
    metadata_json: {
      target_file: opts.target_file,
      model_used: opts.model_used,
      commit_sha: opts.commit_sha,
      source: 'council.builder.build',
    },
  });
}
