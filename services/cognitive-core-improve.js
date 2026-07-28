/**
 * SYNOPSIS: Cognitive Core Era-2 "Improve Me" engine — the meta-learning loop made real.
 * Miss classification+correction (Law 5), program induction, decision replay (#4),
 * counterfactual engine (#7), relationship twins (#11), learning-style model (#12).
 * All AI output is treated as hypothesis (Law 1); confidence never fabricated to 0.99.
 * callAI is injected; falls back to the strong-model failover chain (SO-003, never idle).
 * @ssot docs/products/memory-intelligence/PRODUCT_HOME.md
 */

import { createCognitiveCoreJudgment } from './cognitive-core-judgment.js';
import { createCognitiveCorePrograms } from './cognitive-core-programs.js';

function parseJson(raw) {
  const text = String(raw || '').trim();
  if (!text) return null;
  try { return JSON.parse(text); } catch { /* fallthrough */ }
  const s = text.indexOf('{');
  const e = text.lastIndexOf('}');
  if (s >= 0 && e > s) {
    try { return JSON.parse(text.slice(s, e + 1)); } catch { return null; }
  }
  return null;
}

function clamp01(n, fb = 0.4) {
  const v = Number(n);
  return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fb;
}

function sameOption(a, b) {
  return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
}

/**
 * @param {{ pool: import('pg').Pool, logger?: Console, callAI?: Function }} deps
 */
export function createCognitiveCoreImprove(deps = {}) {
  const pool = deps.pool;
  const logger = deps.logger || console;
  const journal = createCognitiveCoreJudgment({ pool, logger });
  const programs = createCognitiveCorePrograms({ pool, logger });

  let _callAI = deps.callAI || null;
  async function callAI(prompt, opts = {}) {
    if (!_callAI) {
      // Lazy strong-model failover chain — never idle because one provider is dry (SO-003).
      const mod = await import('./never-stop-product-factory.js');
      _callAI = mod.defaultPlannerCallModel?.() || null;
    }
    if (!_callAI) return { ok: false, reason: 'no_model_available', text: '' };
    try {
      const text = await _callAI('planner', prompt, { maxOutputTokens: opts.maxOutputTokens || 1600 });
      return { ok: true, text: String(text || '') };
    } catch (err) {
      return { ok: false, reason: err.message, text: '' };
    }
  }

  /**
   * Law 5: a miss updates the compiler, not just the surface. Classify the miss across the
   * five failure points, propose a correction, and move program confidence on that evidence.
   */
  async function classifyMissAndCorrect({ decisionId }) {
    const pack = await journal.getDecision(decisionId);
    if (!pack) return { ok: false, reason: 'decision_not_found' };
    if (!pack.outcome) return { ok: false, reason: 'no_outcome_yet' };
    const predicted = pack.prediction?.predicted_option || null;
    const actual = pack.outcome.actual_option;
    if (predicted && sameOption(predicted, actual)) {
      return { ok: true, miss: false, note: 'prediction_correct_no_miss' };
    }

    const activePrograms = await programs.activeProgramBriefs(pack.decision.user_id, pack.decision.domain, 8);
    const prompt = `You are the LifeOS Cognitive Core miss analyst (Era-2). A prediction missed.
Do NOT only say why the prediction was wrong — say what CAUSAL variable the model failed to
represent, retrieve, weight, or notice. Classify into exactly one failure_class:
- missing_program: a deep pattern existed that the model never modeled
- known_not_activated: pattern known but not retrieved for this situation (routing failure)
- activated_underweighted: pattern appeared but rational goals were over-weighted vs the deeper driver
- situation_misread: person understood, but stakes/timing/fatigue/pressure/relationship misread
- novel_change: the person genuinely changed (old program weakened / new value emerged)

Decision: ${pack.decision.question}
Options: ${JSON.stringify(pack.decision.options)}
Domain: ${pack.decision.domain}
Predicted option: ${predicted}
Predicted reasons: ${JSON.stringify(pack.prediction?.predicted_reasons || [])}
ACTUAL option chosen: ${actual}
Stated reasons: ${JSON.stringify(pack.outcome.stated_reasons || [])}
Known program hypotheses: ${JSON.stringify(activePrograms)}

Return ONLY JSON:
{
  "failure_class": "one of the five",
  "earliest_divergence": "the earliest point the model's picture diverged from reality",
  "correction_hypothesis": "the concrete correction: what to retrieve/weight/model next time",
  "program_adjustments": [
    {"program_id_or_label":"...", "supports": true, "delta": 0.1, "note":"why this evidence moves it", "explained_outcome": true}
  ],
  "new_program_hypothesis": {"label":"short name","hypothesis":"phrased as hypothesis","triggers":["..."],"typical_behavior":"...","protective_purpose":"...","current_cost":"..."}
}
new_program_hypothesis may be null unless failure_class is missing_program.`;

    const res = await callAI(prompt, { maxOutputTokens: 1400 });
    const parsed = parseJson(res.text);
    if (!parsed || !parsed.failure_class) {
      return { ok: false, reason: res.ok ? 'miss_parse_failed' : res.reason, miss: true };
    }

    const validClass = journal.FAILURE_CLASSES.includes(parsed.failure_class)
      ? parsed.failure_class
      : 'situation_misread';

    const miss = await journal.buildMissReport({
      decisionId,
      predictionId: pack.prediction?.prediction_id || null,
      failureClass: validClass,
      earliestDivergence: parsed.earliest_divergence || null,
      correctionHypothesis: parsed.correction_hypothesis || null,
    }).catch((e) => { logger.warn?.(`[improve] miss write failed: ${e.message}`); return null; });

    const adjustments = [];
    for (const adj of Array.isArray(parsed.program_adjustments) ? parsed.program_adjustments : []) {
      const matched = await programs.matchProgramsByRefs(pack.decision.user_id, [adj.program_id_or_label]);
      if (matched.length) {
        const updated = await programs.adjustConfidence({
          programId: matched[0].program_id,
          delta: Number(adj.delta) || (adj.supports ? 0.08 : -0.08),
          evidenceNote: adj.note || `decision ${decisionId}`,
          supports: adj.supports !== false,
        }).catch(() => null);
        if (updated) {
          adjustments.push({ program_id: updated.program_id, label: updated.label, confidence: updated.confidence });
          if (adj.explained_outcome) {
            await programs.recordActivation({
              programId: updated.program_id,
              decisionId,
              userId: pack.decision.user_id,
              weight: 0.7,
              source: 'miss_loop',
              explainedOutcome: true,
            }).catch(() => null);
          }
        }
      }
    }

    let createdProgram = null;
    if (validClass === 'missing_program' && parsed.new_program_hypothesis?.label) {
      const np = parsed.new_program_hypothesis;
      createdProgram = await programs.createProgram({
        userId: pack.decision.user_id,
        label: np.label,
        hypothesis: np.hypothesis || np.label,
        triggers: np.triggers || [],
        typicalBehavior: np.typical_behavior || null,
        protectivePurpose: np.protective_purpose || null,
        currentCost: np.current_cost || null,
        confidence: 0.25,
        evidenceFor: [{ note: `induced from miss on decision ${decisionId}`, at: new Date().toISOString() }],
        domain: pack.decision.domain,
      }).catch((e) => { logger.warn?.(`[improve] program create failed: ${e.message}`); return null; });
      if (createdProgram) {
        await programs.recordActivation({
          programId: createdProgram.program_id,
          decisionId,
          userId: pack.decision.user_id,
          weight: 0.6,
          source: 'miss_loop',
          explainedOutcome: true,
        }).catch(() => null);
      }
    }

    return {
      ok: true,
      miss: true,
      failure_class: validClass,
      earliest_divergence: parsed.earliest_divergence || null,
      correction_hypothesis: parsed.correction_hypothesis || null,
      miss_id: miss?.miss_id || null,
      program_adjustments: adjustments,
      created_program: createdProgram ? { program_id: createdProgram.program_id, label: createdProgram.label } : null,
    };
  }

  /** Induce candidate program hypotheses from recent decision/outcome history (low confidence). */
  async function induceProgramsFromHistory({ userId, lookback = 25 }) {
    if (!pool) return { ok: false, reason: 'no_pool' };
    const { rows } = await pool.query(
      `SELECT d.decision_id, d.domain, d.question, d.options,
              p.predicted_option, o.actual_option, o.stated_reasons
       FROM judgment_decisions d
       LEFT JOIN LATERAL (SELECT predicted_option FROM judgment_predictions
         WHERE decision_id = d.decision_id ORDER BY created_at DESC LIMIT 1) p ON TRUE
       LEFT JOIN judgment_outcomes o ON o.decision_id = d.decision_id
       WHERE d.user_id = $1
       ORDER BY d.created_at DESC LIMIT $2`,
      [String(userId), Math.min(100, Math.max(3, Number(lookback) || 25))],
    );
    if (rows.length < 3) return { ok: true, created: [], note: 'not_enough_history' };

    const existing = await programs.listPrograms(userId, { status: 'active' });
    const prompt = `You are the LifeOS Cognitive Core program inductor (Era-2, Law 1: hypotheses only).
From this decision history, propose 1-3 DEEP recurring patterns (programs) that may drive this
person. Not personality labels — mechanisms with triggers and protective purpose. Keep confidence
LOW (0.2-0.4); these are unproven. Do not duplicate existing programs.

Existing programs: ${JSON.stringify(existing.map((p) => p.label))}
History: ${JSON.stringify(rows.slice(0, 40))}

Return ONLY JSON:
{"programs":[{"label":"...","hypothesis":"phrased as a hypothesis","origin":"maybe","triggers":["..."],"typical_behavior":"...","protective_purpose":"...","current_cost":"...","confidence":0.3,"domain":null}]}`;

    const res = await callAI(prompt, { maxOutputTokens: 1500 });
    const parsed = parseJson(res.text);
    if (!parsed || !Array.isArray(parsed.programs)) {
      return { ok: false, reason: res.ok ? 'induce_parse_failed' : res.reason };
    }
    const existingLabels = new Set(existing.map((p) => p.label.toLowerCase()));
    const created = [];
    for (const p of parsed.programs.slice(0, 3)) {
      if (!p.label || existingLabels.has(String(p.label).toLowerCase())) continue;
      const row = await programs.createProgram({
        userId,
        label: p.label,
        hypothesis: p.hypothesis || p.label,
        origin: p.origin || null,
        triggers: p.triggers || [],
        typicalBehavior: p.typical_behavior || null,
        protectivePurpose: p.protective_purpose || null,
        currentCost: p.current_cost || null,
        confidence: clamp01(p.confidence, 0.3),
        domain: p.domain || null,
      }).catch((e) => { logger.warn?.(`[improve] induce create failed: ${e.message}`); return null; });
      if (row) created.push({ program_id: row.program_id, label: row.label, confidence: row.confidence });
    }
    return { ok: true, created };
  }

  /** #4 Decision Replay — re-run a past decision with today's programs/knowledge. */
  async function replayDecision({ decisionId }) {
    const pack = await journal.getDecision(decisionId);
    if (!pack) return { ok: false, reason: 'decision_not_found' };
    const activePrograms = await programs.activeProgramBriefs(pack.decision.user_id, pack.decision.domain, 8);
    const prompt = `You are the LifeOS Cognitive Core replay engine (Era-2). Re-run this PAST decision
with today's program hypotheses and knowledge. Would today's compiler predict differently? Be honest;
"no change" is a valid, useful answer.

Question: ${pack.decision.question}
Options: ${JSON.stringify(pack.decision.options)}
Original predicted option: ${pack.prediction?.predicted_option || 'n/a'}
Actual option (if known): ${pack.outcome?.actual_option || 'unknown'}
Today's program hypotheses: ${JSON.stringify(activePrograms)}

Return ONLY JSON:
{"todays_prediction":"...","would_change":true,"what_changed":"what today's model sees that the old one missed","confidence":0.5}`;
    const res = await callAI(prompt, { maxOutputTokens: 1000 });
    const parsed = parseJson(res.text);
    if (!parsed) return { ok: false, reason: res.ok ? 'replay_parse_failed' : res.reason };
    const { rows } = await pool.query(
      `INSERT INTO judgment_replays
         (decision_id, user_id, todays_prediction, would_change, what_changed, programs_now, confidence)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7) RETURNING *`,
      [
        decisionId, String(pack.decision.user_id),
        String(parsed.todays_prediction || '').slice(0, 2000),
        Boolean(parsed.would_change),
        String(parsed.what_changed || '').slice(0, 2000),
        JSON.stringify(activePrograms),
        clamp01(parsed.confidence, 0.5),
      ],
    );
    return { ok: true, replay: rows[0] };
  }

  /** #7 Counterfactual Engine — plausible 2nd/3rd-order effects of the road not taken. */
  async function counterfactual({ decisionId, alternativeOption }) {
    const pack = await journal.getDecision(decisionId);
    if (!pack) return { ok: false, reason: 'decision_not_found' };
    const alt = String(alternativeOption || '').trim();
    if (!alt) return { ok: false, reason: 'alternative_option_required' };
    const prompt = `You are the LifeOS Cognitive Core counterfactual engine (Era-2). Explore the road NOT
taken. Simulate plausible second- and third-order effects. Label uncertainty; these are hypotheses,
not forecasts.

Decision: ${pack.decision.question}
Chosen (actual/likely): ${pack.outcome?.actual_option || pack.prediction?.predicted_option || 'unknown'}
Alternative to simulate: ${alt}

Return ONLY JSON:
{"second_order":["..."],"third_order":["..."],"net_assessment":"was the alternative plausibly better/worse and why","confidence":0.4}`;
    const res = await callAI(prompt, { maxOutputTokens: 1100 });
    const parsed = parseJson(res.text);
    if (!parsed) return { ok: false, reason: res.ok ? 'cf_parse_failed' : res.reason };
    const { rows } = await pool.query(
      `INSERT INTO judgment_counterfactuals
         (decision_id, user_id, alternative_option, second_order, third_order, net_assessment, confidence)
       VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7) RETURNING *`,
      [
        decisionId, String(pack.decision.user_id), alt.slice(0, 500),
        JSON.stringify(Array.isArray(parsed.second_order) ? parsed.second_order : []),
        JSON.stringify(Array.isArray(parsed.third_order) ? parsed.third_order : []),
        String(parsed.net_assessment || '').slice(0, 2000),
        clamp01(parsed.confidence, 0.4),
      ],
    );
    return { ok: true, counterfactual: rows[0] };
  }

  /** #11 Relationship Twin — hypotheses about a person the user interacts with. */
  async function inferRelationshipTwin({ userId, personLabel, relationship = null, observations = '' }) {
    if (!pool) return { ok: false, reason: 'no_pool' };
    if (!personLabel) return { ok: false, reason: 'person_label_required' };
    const prompt = `You are the LifeOS Cognitive Core relationship modeler (Era-2, Law 1: hypotheses only,
never claims of certainty about a real person). From these observations, propose a working model to
improve communication and collaboration — clearly hedged.

Person: ${personLabel}${relationship ? ` (${relationship})` : ''}
Observations: ${String(observations).slice(0, 3000) || '(none provided)'}

Return ONLY JSON:
{"communication_style":"...","values_hypotheses":["..."],"triggers":["..."],"what_works":["..."],"confidence":0.3}`;
    const res = await callAI(prompt, { maxOutputTokens: 1000 });
    const parsed = parseJson(res.text);
    if (!parsed) return { ok: false, reason: res.ok ? 'rel_parse_failed' : res.reason };
    const { rows } = await pool.query(
      `INSERT INTO relationship_twins
         (user_id, person_label, relationship, communication_style, values_hypotheses, triggers, what_works, confidence, evidence, last_confirmed_at)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8,$9::jsonb,NOW())
       ON CONFLICT (user_id, person_label) DO UPDATE SET
         relationship = COALESCE(EXCLUDED.relationship, relationship_twins.relationship),
         communication_style = EXCLUDED.communication_style,
         values_hypotheses = EXCLUDED.values_hypotheses,
         triggers = EXCLUDED.triggers,
         what_works = EXCLUDED.what_works,
         confidence = EXCLUDED.confidence,
         updated_at = NOW()
       RETURNING *`,
      [
        String(userId), String(personLabel).slice(0, 200), relationship,
        String(parsed.communication_style || '').slice(0, 1000),
        JSON.stringify(Array.isArray(parsed.values_hypotheses) ? parsed.values_hypotheses : []),
        JSON.stringify(Array.isArray(parsed.triggers) ? parsed.triggers : []),
        JSON.stringify(Array.isArray(parsed.what_works) ? parsed.what_works : []),
        clamp01(parsed.confidence, 0.3),
        JSON.stringify(observations ? [{ note: String(observations).slice(0, 500), at: new Date().toISOString() }] : []),
      ],
    );
    return { ok: true, twin: rows[0] };
  }

  /** #12 Learning-Style Model — how the user actually learns best (modality hypotheses). */
  async function inferLearningStyle({ userId, signals = '' }) {
    if (!pool) return { ok: false, reason: 'no_pool' };
    const prompt = `You are the LifeOS Cognitive Core learning-style modeler (Era-2, Law 1: hypotheses only).
From these signals, hypothesize how this person learns best (visual, narrative/story, examples,
repetition, experimentation, debate, diagrams). Keep confidence modest.

Signals: ${String(signals).slice(0, 3000) || '(none provided)'}

Return ONLY JSON:
{"modality_hypotheses":{"visual":0.6,"narrative":0.4,"examples":0.5,"repetition":0.3,"experimentation":0.5,"debate":0.6,"diagrams":0.5},"best_via":"one-sentence hypothesis","confidence":0.3}`;
    const res = await callAI(prompt, { maxOutputTokens: 800 });
    const parsed = parseJson(res.text);
    if (!parsed) return { ok: false, reason: res.ok ? 'learn_parse_failed' : res.reason };
    const { rows } = await pool.query(
      `INSERT INTO learning_style_profile (user_id, modality_hypotheses, best_via, confidence, updated_at)
       VALUES ($1,$2::jsonb,$3,$4,NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         modality_hypotheses = EXCLUDED.modality_hypotheses,
         best_via = EXCLUDED.best_via,
         confidence = EXCLUDED.confidence,
         updated_at = NOW()
       RETURNING *`,
      [
        String(userId),
        JSON.stringify(parsed.modality_hypotheses && typeof parsed.modality_hypotheses === 'object' ? parsed.modality_hypotheses : {}),
        String(parsed.best_via || '').slice(0, 1000),
        clamp01(parsed.confidence, 0.3),
      ],
    );
    return { ok: true, profile: rows[0] };
  }

  async function getRelationshipTwins(userId) {
    const { rows } = await pool.query(
      `SELECT * FROM relationship_twins WHERE user_id = $1 ORDER BY confidence DESC, updated_at DESC`,
      [String(userId)],
    );
    return rows;
  }

  async function getLearningStyle(userId) {
    const { rows } = await pool.query(`SELECT * FROM learning_style_profile WHERE user_id = $1`, [String(userId)]);
    return rows[0] || null;
  }

  return {
    classifyMissAndCorrect,
    induceProgramsFromHistory,
    replayDecision,
    counterfactual,
    inferRelationshipTwin,
    inferLearningStyle,
    getRelationshipTwins,
    getLearningStyle,
  };
}

export default createCognitiveCoreImprove;