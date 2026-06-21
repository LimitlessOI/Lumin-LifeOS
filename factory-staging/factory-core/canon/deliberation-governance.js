/**
 * SYNOPSIS: Deliberation governance v2.7 — constants and validation helpers.
 * @ssot docs/projects/AMENDMENT_48_BUILDEROS_VOCABULARY.md
 */

/** Seven permanent departments (hard cap). */
export const VALID_AUTHORITIES = Object.freeze([
  'ChC',
  'Hist',
  'SNT',
  'CFO',
  'BPB',
  'SDO',
  'CDR',
]);

/** Starter REP catalog — expand via AM48 receipt. */
export const VALID_REP_CATALOG = Object.freeze([
  'LifeOS',
  'LimitlessOS',
  'Marketing',
  'Relationship',
  'Health',
  'Founder',
  'Customer',
  'Revenue',
  'Scalability',
  'Privacy',
  'Education',
]);

export const GRADES = Object.freeze(['A', 'B', 'C', 'D', 'F']);

export const PROTOCOL_VERSION = 'v2.7';

export const FUTURE_BACK_HORIZONS = Object.freeze(['1y', '2y', '4y', '5y']);

export const VALID_EVIDENCE_SOURCE_TYPES = Object.freeze([
  'session_doc',
  'blueprint',
  'commit',
  'external_scan',
  'council_output',
  'manual',
]);

export const MIN_HIST_CASE_TEXT_CHARS = 20;
export const MAX_REPS_PER_ROSTER = 20;
export const MAX_MODELS_PER_ROSTER = 10;

/** Safe LIMIT for list queries — rejects negative/zero/NaN. */
export function clampQueryLimit(limit, { min = 1, max = 200, fallback = 50 } = {}) {
  const raw = Number(limit);
  const n = Number.isFinite(raw) && raw > 0 ? raw : fallback;
  return Math.max(min, Math.min(n, max));
}

/**
 * @param {unknown} roster
 * @returns {{ ok: boolean, errors: string[], roster?: object }}
 */
export function validateCnclRoster(roster) {
  const errors = [];
  if (!roster || typeof roster !== 'object') {
    return { ok: false, errors: ['roster must be an object'] };
  }

  const session_id = roster.session_id || roster.sessionId;
  if (!session_id || typeof session_id !== 'string') {
    errors.push('session_id required');
  }

  const authorities = roster.authorities || [];
  const reps = roster.reps || [];
  const models = roster.models || [];

  if (!Array.isArray(authorities)) errors.push('authorities must be array');
  if (!Array.isArray(reps)) errors.push('reps must be array');
  if (!Array.isArray(models)) errors.push('models must be array');

  if (authorities.length > VALID_AUTHORITIES.length) {
    errors.push(`authorities cannot exceed ${VALID_AUTHORITIES.length} (seven departments)`);
  }
  if (reps.length > MAX_REPS_PER_ROSTER) {
    errors.push(`reps array must not exceed ${MAX_REPS_PER_ROSTER} entries`);
  }
  if (models.length > MAX_MODELS_PER_ROSTER) {
    errors.push(`models array must not exceed ${MAX_MODELS_PER_ROSTER} entries`);
  }

  for (const a of authorities) {
    if (!VALID_AUTHORITIES.includes(a)) {
      errors.push(`unknown authority: ${a}`);
    }
  }

  for (const r of reps) {
    const name = typeof r === 'string' ? r : r?.name;
    if (!name) {
      errors.push('rep entry requires name');
      continue;
    }
    if (!VALID_REP_CATALOG.includes(name)) {
      errors.push(`unknown REP: ${name}`);
    }
  }

  for (const m of models) {
    if (!m?.id && !m?.model) errors.push('each model entry requires id or model');
    if (m?.focus && !VALID_AUTHORITIES.includes(m.focus)) {
      errors.push(`model focus must be a valid authority: ${m.focus}`);
    }
  }

  /** BPB + CDR same session — distinct models with explicit BPB/CDR focus required. */
  const hasBpb = authorities.includes('BPB');
  const hasCdr = authorities.includes('CDR');
  if (hasBpb && hasCdr) {
    if (models.length < 2) {
      errors.push('BPB and CDR in same session require at least two models (session law)');
    } else {
      const bpbModel = models.find((m) => m.focus === 'BPB');
      const cdrModel = models.find((m) => m.focus === 'CDR');
      if (!bpbModel || !cdrModel) {
        errors.push('BPB and CDR in same session require models with focus BPB and CDR');
      } else if ((bpbModel.id || bpbModel.model) === (cdrModel.id || cdrModel.model)) {
        errors.push('BPB and CDR cannot share the same model in one session');
      }
      const modelIds = models.map((m) => m.id || m.model).filter(Boolean);
      if (modelIds.length >= 2 && new Set(modelIds).size < modelIds.length) {
        errors.push('BPB and CDR session requires distinct model ids');
      }
    }
  }

  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    errors: [],
    roster: {
      session_id,
      objective_id: roster.objective_id || roster.objectiveId || null,
      project_slug: roster.project_slug || roster.projectSlug || null,
      decision_type: roster.decision_type || roster.decisionType || 'general',
      authorities,
      reps: reps.map((r) => (typeof r === 'string' ? { name: r } : r)),
      models,
      partial: roster.partial !== false,
      roster_used: roster.roster_used || null,
      audit_expanded_roster: roster.audit_expanded_roster || null,
      expand_reason: roster.expand_reason || null,
      founder_priority_mode: Boolean(roster.founder_priority_mode),
      metadata_json: roster.metadata_json || roster.metadata || {},
    },
  };
}

/**
 * @param {unknown} payload
 */
export function validateHistCase(payload) {
  const errors = [];
  if (!payload?.session_id) errors.push('session_id required');
  if (typeof payload?.case_text !== 'string' || !payload.case_text.trim()) {
    errors.push('case_text required and must be non-blank');
  } else if (payload.case_text.trim().length < MIN_HIST_CASE_TEXT_CHARS) {
    errors.push(`case_text must contain substantive content (min ${MIN_HIST_CASE_TEXT_CHARS} chars)`);
  }
  return { ok: errors.length === 0, errors };
}

/**
 * @param {unknown} payload
 */
function nonNegativeNumberError(value, label, { integer = false } = {}) {
  if (value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    return `${label} must be a non-negative ${integer ? 'integer' : 'number'}`;
  }
  if (integer && !Number.isInteger(n)) {
    return `${label} must be a non-negative integer`;
  }
  return null;
}

export function validateCfoReceipt(payload) {
  const errors = [];
  if (!payload?.session_id) errors.push('session_id required');
  const role = payload?.role || payload?.dept;
  if (typeof role !== 'string' || role.trim().length < 3) {
    errors.push('role or dept required (min 3 non-whitespace chars)');
  }
  for (const msg of [
    nonNegativeNumberError(payload?.tokens, 'tokens', { integer: true }),
    nonNegativeNumberError(payload?.cost_usd, 'cost_usd'),
  ]) {
    if (msg) errors.push(msg);
  }
  return { ok: errors.length === 0, errors };
}

/**
 * @param {unknown} payload
 */
export function validateEvidenceVaultEntry(payload) {
  const errors = [];
  if (!payload?.source_type) errors.push('source_type required');
  else if (!VALID_EVIDENCE_SOURCE_TYPES.includes(String(payload.source_type))) {
    errors.push(`source_type must be one of: ${VALID_EVIDENCE_SOURCE_TYPES.join(', ')}`);
  }
  if (payload?.storage_path && /\.\./.test(String(payload.storage_path))) {
    errors.push('storage_path must not contain path traversal sequences');
  }
  return { ok: errors.length === 0, errors };
}

/**
 * Minimum substantive consensus — empty {} cannot satisfy load-bearing gate.
 * @param {unknown} payload
 */
export function validateConsensusSession(payload) {
  const errors = [];
  if (!payload?.session_id) errors.push('session_id required');

  const synthesis = payload.final_synthesis ?? payload.finalSynthesis;
  if (typeof synthesis !== 'string' || !synthesis.trim()) {
    errors.push('final_synthesis required');
  }

  const participants = payload.participants || [];
  if (!Array.isArray(participants) || participants.length < 2) {
    errors.push('participants must include at least 2 entries');
  }

  const positions = payload.original_positions || payload.originalPositions || [];
  const brainstorm = payload.brainstorm_ids || payload.brainstormIds || [];
  if (
    (!Array.isArray(positions) || positions.length < 1) &&
    (!Array.isArray(brainstorm) || brainstorm.length < 1)
  ) {
    errors.push('original_positions or brainstorm_ids required');
  }

  const horizons = payload.future_back_horizons || payload.futureBackHorizons || {};
  if (!horizons || typeof horizons !== 'object' || Object.keys(horizons).length < 1) {
    errors.push('future_back_horizons required');
  } else {
    const invalidHorizons = Object.keys(horizons).filter((k) => !FUTURE_BACK_HORIZONS.includes(k));
    if (invalidHorizons.length) {
      errors.push(
        `future_back_horizons keys must be from: ${FUTURE_BACK_HORIZONS.join(', ')}`
      );
    }
  }

  const voteCounts = payload.vote_counts ?? payload.voteCounts;
  if (!voteCounts || typeof voteCounts !== 'object' || Object.keys(voteCounts).length < 1) {
    errors.push('vote_counts required');
  } else {
    for (const [key, value] of Object.entries(voteCounts)) {
      if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
        errors.push(`vote_counts.${key} must be a non-negative integer`);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

/**
 * @param {unknown} payload
 */
export function validateScorecardEntry(payload) {
  const errors = [];
  if (!payload?.decision_type) errors.push('decision_type required');
  for (const msg of [
    nonNegativeNumberError(payload?.model_count, 'model_count', { integer: true }),
    nonNegativeNumberError(payload?.cost_usd, 'cost_usd'),
    nonNegativeNumberError(payload?.token_count, 'token_count', { integer: true }),
    nonNegativeNumberError(payload?.latency_ms, 'latency_ms'),
  ]) {
    if (msg) errors.push(msg);
  }
  if (payload?.outcome_grade != null && payload.outcome_grade !== '') {
    const g = String(payload.outcome_grade).toUpperCase().charAt(0);
    if (!GRADES.includes(g)) errors.push(`outcome_grade must be one of: ${GRADES.join(', ')}`);
  }
  return { ok: errors.length === 0, errors };
}
