/**
 * SYNOPSIS: Cognitive Core Era-3 "Extend Me" engine — proactive partner.
 * Missing-info detector (#16), consequence simulator (#15), value-drift check (#14),
 * curiosity engine (#18), energy/performance advisory (#13).
 * AI paths use the strong-model failover chain (SO-003). Everything is hypothesis (Law 1).
 * @ssot docs/products/memory-intelligence/PRODUCT_HOME.md
 */

import { createCognitiveCoreJudgment } from './cognitive-core-judgment.js';
import { createCognitiveCorePrograms } from './cognitive-core-programs.js';
import { createCognitiveCoreValues } from './cognitive-core-values.js';

function parseJson(raw) {
  const text = String(raw || '').trim();
  if (!text) return null;
  try { return JSON.parse(text); } catch { /* fallthrough */ }
  const s = text.indexOf('{');
  const e = text.lastIndexOf('}');
  if (s >= 0 && e > s) { try { return JSON.parse(text.slice(s, e + 1)); } catch { return null; } }
  return null;
}

function clamp01(n, fb = 0.4) {
  const v = Number(n);
  return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fb;
}

function arr(v) { return Array.isArray(v) ? v : []; }

const PART_OF_DAY = [
  { key: 'early_morning', from: 5, to: 8 },
  { key: 'morning', from: 8, to: 12 },
  { key: 'afternoon', from: 12, to: 17 },
  { key: 'evening', from: 17, to: 21 },
  { key: 'night', from: 21, to: 29 }, // wraps past midnight (24-4 => 24..28)
];

function bucketForHour(h) {
  const hour = ((Number(h) % 24) + 24) % 24;
  const adj = hour < 5 ? hour + 24 : hour;
  return (PART_OF_DAY.find((b) => adj >= b.from && adj < b.to) || PART_OF_DAY[0]).key;
}

/**
 * @param {{ pool: import('pg').Pool, logger?: Console, callAI?: Function }} deps
 */
export function createCognitiveCoreExtend(deps = {}) {
  const pool = deps.pool;
  const logger = deps.logger || console;
  const journal = createCognitiveCoreJudgment({ pool, logger });
  const programs = createCognitiveCorePrograms({ pool, logger });
  const values = createCognitiveCoreValues({ pool, logger });

  let _callAI = deps.callAI || null;
  async function callAI(prompt, opts = {}) {
    if (!_callAI) {
      const mod = await import('./never-stop-product-factory.js');
      _callAI = mod.defaultPlannerCallModel?.() || null;
    }
    if (!_callAI) return { ok: false, reason: 'no_model_available', text: '' };
    try {
      const text = await _callAI('planner', prompt, { maxOutputTokens: opts.maxOutputTokens || 1200 });
      return { ok: true, text: String(text || '') };
    } catch (err) {
      return { ok: false, reason: err.message, text: '' };
    }
  }

  /** #16 Missing Information Detector. */
  async function detectMissingInfo({ decisionId }) {
    const pack = await journal.getDecision(decisionId);
    if (!pack) return { ok: false, reason: 'decision_not_found' };
    const prompt = `You are the LifeOS Cognitive Core missing-information detector (Era-3).
Before this decision is made, name the FEW most valuable facts that are missing — the ones that
would most change the answer if known. Then name the single cheapest way to learn the top one.

Decision: ${pack.decision.question}
Options: ${JSON.stringify(pack.decision.options)}
Domain: ${pack.decision.domain}

Return ONLY JSON:
{"missing_facts":["..."],"most_valuable":"the one fact worth getting first","cheapest_way_to_learn":"smallest experiment/lookup","confidence":0.5}`;
    const res = await callAI(prompt, { maxOutputTokens: 900 });
    const parsed = parseJson(res.text);
    if (!parsed) return { ok: false, reason: res.ok ? 'missing_info_parse_failed' : res.reason };
    const { rows } = await pool.query(
      `INSERT INTO missing_info_findings (decision_id, user_id, missing_facts, most_valuable, cheapest_way_to_learn, confidence)
       VALUES ($1,$2,$3::jsonb,$4,$5,$6) RETURNING *`,
      [decisionId, String(pack.decision.user_id), JSON.stringify(arr(parsed.missing_facts)),
        String(parsed.most_valuable || '').slice(0, 1000), String(parsed.cheapest_way_to_learn || '').slice(0, 1000),
        clamp01(parsed.confidence, 0.5)],
    );
    return { ok: true, finding: rows[0] };
  }

  /** #15 Consequence Simulator (prospective — an option on the table). */
  async function simulateConsequences({ decisionId, option, source = 'explicit' }) {
    const pack = await journal.getDecision(decisionId);
    if (!pack) return { ok: false, reason: 'decision_not_found' };
    const opt = String(option || pack.prediction?.predicted_option || '').trim();
    if (!opt) return { ok: false, reason: 'option_required' };
    const prompt = `You are the LifeOS Cognitive Core consequence simulator (Era-3). For the option BEING
CONSIDERED, sketch plausible second- and third-order effects, and the early signals to instrument now
so a bad outcome becomes visible early. Hedge; these are hypotheses.

Decision: ${pack.decision.question}
Option under consideration: ${opt}
Domain: ${pack.decision.domain}

Return ONLY JSON:
{"second_order":["..."],"third_order":["..."],"watch_signals":["early signals to instrument"],"confidence":0.4}`;
    const res = await callAI(prompt, { maxOutputTokens: 1100 });
    const parsed = parseJson(res.text);
    if (!parsed) return { ok: false, reason: res.ok ? 'consequence_parse_failed' : res.reason };
    const { rows } = await pool.query(
      `INSERT INTO consequence_maps (decision_id, user_id, option, second_order, third_order, watch_signals, confidence, source)
       VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6::jsonb,$7,$8) RETURNING *`,
      [decisionId, String(pack.decision.user_id), opt.slice(0, 500),
        JSON.stringify(arr(parsed.second_order)), JSON.stringify(arr(parsed.third_order)),
        JSON.stringify(arr(parsed.watch_signals)), clamp01(parsed.confidence, 0.4),
        ['judgment_turn', 'explicit'].includes(source) ? source : 'explicit'],
    );
    return { ok: true, consequence: rows[0] };
  }

  /** #14 Value Drift check — compare the ACTUAL choice against stated principles. */
  async function checkValueDrift({ decisionId }) {
    const pack = await journal.getDecision(decisionId);
    if (!pack) return { ok: false, reason: 'decision_not_found' };
    if (!pack.outcome) return { ok: false, reason: 'no_outcome_yet' };
    const principles = await values.listValues(pack.decision.user_id, { status: 'active' });
    if (!principles.length) return { ok: true, drift: [], note: 'no_principles_defined' };
    const prompt = `You are the LifeOS Cognitive Core value-drift monitor (Era-3). Compare the actual
decision to the stated long-term principles. Flag ONLY genuine divergences. A divergence is NOT
automatically bad — it may mean a value is changing (say so). Be conservative; no divergence is fine.

Decision: ${pack.decision.question}
Actual choice: ${pack.outcome.actual_option}
Stated reasons: ${JSON.stringify(pack.outcome.stated_reasons || [])}
Principles: ${JSON.stringify(principles.map((p) => ({ value_id: p.value_id, principle: p.principle })))}

Return ONLY JSON:
{"drift":[{"value_id":"...","principle":"...","drift_description":"how the choice diverged (or that the value may be shifting)","severity":"low|medium|high"}]}`;
    const res = await callAI(prompt, { maxOutputTokens: 900 });
    const parsed = parseJson(res.text);
    if (!parsed) return { ok: false, reason: res.ok ? 'drift_parse_failed' : res.reason };
    const recorded = [];
    for (const d of arr(parsed.drift)) {
      if (!d.drift_description) continue;
      const match = principles.find((p) => p.value_id === d.value_id || p.principle === d.principle);
      const row = await values.recordDriftEvent({
        userId: pack.decision.user_id,
        decisionId,
        valueId: match?.value_id || null,
        principle: d.principle || match?.principle || null,
        driftDescription: d.drift_description,
        severity: d.severity || 'low',
      }).catch(() => null);
      if (row) recorded.push({ drift_id: row.drift_id, principle: row.principle, severity: row.severity, drift_description: row.drift_description });
    }
    return { ok: true, drift: recorded };
  }

  /** #18 Curiosity Engine — learning targeted at current knowledge gaps. */
  async function suggestCuriosity({ userId, limit = 3 }) {
    if (!pool) return { ok: false, reason: 'no_pool' };
    const { rows: misses } = await pool.query(
      `SELECT m.failure_class, m.correction_hypothesis, d.domain, d.question
       FROM judgment_miss_reports m JOIN judgment_decisions d ON d.decision_id = m.decision_id
       WHERE d.user_id = $1 ORDER BY m.created_at DESC LIMIT 10`,
      [String(userId)],
    );
    const weakPrograms = (await programs.listPrograms(userId, { status: 'active' }))
      .filter((p) => Number(p.confidence) < 0.4)
      .map((p) => ({ label: p.label, hypothesis: p.hypothesis, confidence: Number(p.confidence) }));
    if (!misses.length && !weakPrograms.length) {
      return { ok: true, prompts: [], note: 'no_gaps_detected_yet' };
    }
    const prompt = `You are the LifeOS Cognitive Core curiosity engine (Era-3). From these knowledge GAPS
(recent prediction misses + low-confidence program hypotheses), suggest up to ${limit} concrete
learning targets — a topic, WHY it matters now, and one specific action (a book/paper/conversation/
experiment). Targeted, not generic.

Recent misses: ${JSON.stringify(misses)}
Weak program hypotheses: ${JSON.stringify(weakPrograms)}

Return ONLY JSON:
{"prompts":[{"topic":"...","why":"...","suggested_action":"...","gap_source":"miss|weak_program"}]}`;
    const res = await callAI(prompt, { maxOutputTokens: 1000 });
    const parsed = parseJson(res.text);
    if (!parsed || !Array.isArray(parsed.prompts)) {
      return { ok: false, reason: res.ok ? 'curiosity_parse_failed' : res.reason };
    }
    const created = [];
    for (const p of parsed.prompts.slice(0, limit)) {
      if (!p.topic) continue;
      const { rows } = await pool.query(
        `INSERT INTO curiosity_prompts (user_id, gap_source, topic, why, suggested_action)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [String(userId), String(p.gap_source || 'gap').slice(0, 80), String(p.topic).slice(0, 500),
          String(p.why || '').slice(0, 1000), String(p.suggested_action || '').slice(0, 1000)],
      );
      created.push(rows[0]);
    }
    return { ok: true, prompts: created };
  }

  async function listCuriosity(userId, { status = 'open' } = {}) {
    const { rows } = await pool.query(
      `SELECT * FROM curiosity_prompts WHERE user_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT 50`,
      [String(userId), status],
    );
    return rows;
  }

  /**
   * #13 Energy & Performance advisory — decision-quality by part-of-day, computed from the journal.
   * Pure stats (no AI): needs enough scored decisions before it will claim a window (honest N).
   */
  async function energyAdvisory({ userId }) {
    if (!pool) return { ok: false, reason: 'no_pool' };
    const { rows } = await pool.query(
      `SELECT EXTRACT(HOUR FROM d.created_at)::int AS hour,
              (LOWER(TRIM(p.predicted_option)) = LOWER(TRIM(o.actual_option))) AS hit
       FROM judgment_decisions d
       JOIN judgment_outcomes o ON o.decision_id = d.decision_id
       LEFT JOIN LATERAL (SELECT predicted_option FROM judgment_predictions
         WHERE decision_id = d.decision_id ORDER BY created_at DESC LIMIT 1) p ON TRUE
       WHERE d.user_id = $1`,
      [String(userId)],
    );
    const buckets = {};
    for (const r of rows) {
      const key = bucketForHour(r.hour);
      buckets[key] = buckets[key] || { n: 0, hits: 0 };
      buckets[key].n += 1;
      if (r.hit) buckets[key].hits += 1;
    }
    const windows = Object.entries(buckets).map(([key, v]) => ({
      window: key, n: v.n, hit_rate: v.n ? v.hits / v.n : 0,
    })).sort((a, b) => b.hit_rate - a.hit_rate);
    const n = rows.length;
    const scored = windows.filter((w) => w.n >= 2);
    const best = scored.slice(0, 2);
    const worst = scored.slice(-2).filter((w) => !best.includes(w));
    // Confidence grows with sample size; honest and low until real data accrues.
    const confidence = clamp01(Math.min(0.7, n / 40), 0.2);
    await pool.query(
      `INSERT INTO decision_energy_profile (user_id, best_windows, worst_windows, n, confidence, updated_at)
       VALUES ($1,$2::jsonb,$3::jsonb,$4,$5,NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         best_windows = EXCLUDED.best_windows, worst_windows = EXCLUDED.worst_windows,
         n = EXCLUDED.n, confidence = EXCLUDED.confidence, updated_at = NOW()`,
      [String(userId), JSON.stringify(best), JSON.stringify(worst), n, confidence],
    ).catch(() => null);
    return {
      ok: true,
      n,
      best_windows: best,
      worst_windows: worst,
      confidence,
      note: n < 8 ? 'insufficient_data_hypothesis_only' : 'hypothesis_from_decision_history',
    };
  }

  return {
    detectMissingInfo,
    simulateConsequences,
    checkValueDrift,
    suggestCuriosity,
    listCuriosity,
    energyAdvisory,
  };
}

export default createCognitiveCoreExtend;
