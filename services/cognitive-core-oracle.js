/**
 * SYNOPSIS: Cognitive Core — Outcome Oracle + calibration engine that CLOSES the loop.
 * Layer A (automatic): resolve a journaled decision's outcome from a real receipt
 * (deploy SHA / SENTRY pass-fail / revert / CI) — no human retype, full provenance.
 * Proper scoring math (Murphy decomposition, e-value, Platt recalibration, Chow's
 * decide gate) turns the scoreboard from a naive Brier average into a real mirror,
 * then the decide gate makes it load-bearing: proceed / verify / abstain by stake.
 * Subject is the PRINCIPAL's judgment (Adam's calls), never the builder's self-confidence.
 * @ssot docs/products/memory-intelligence/PRODUCT_HOME.md
 */

import { createCognitiveCoreJudgment } from './cognitive-core-judgment.js';

// ── Pure math (deterministic, no DB) ─────────────────────────────────────────

export function clamp01(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
}

/** logit with clamping so 0/1 never blow up. */
export function logit(p) {
  const c = Math.max(0.001, Math.min(0.999, clamp01(p)));
  return Math.log(c / (1 - c));
}

export function sigmoid(z) {
  if (z >= 0) return 1 / (1 + Math.exp(-z));
  const e = Math.exp(z);
  return e / (1 + e);
}

/** preds: [{ p:number in [0,1], o:0|1 }]. Mean squared error of probabilities. */
export function brierScore(preds) {
  const rows = normalizePreds(preds);
  if (!rows.length) return null;
  return rows.reduce((s, r) => s + (r.p - r.o) ** 2, 0) / rows.length;
}

function normalizePreds(preds) {
  return (Array.isArray(preds) ? preds : [])
    .map((r) => ({ p: clamp01(r.p), o: r.o ? 1 : 0 }))
    .filter((r) => Number.isFinite(r.p));
}

/**
 * Murphy's exact vector partition: Brier = Reliability − Resolution + Uncertainty.
 * Grouping by the EXACT forecast value makes the identity hold to f64 precision
 * (same trick Anamnesis uses), so `check` should equal `brier` within ~1e-9.
 */
export function murphyDecomposition(preds) {
  const rows = normalizePreds(preds);
  const N = rows.length;
  if (!N) return null;
  const obar = rows.reduce((s, r) => s + r.o, 0) / N;
  const groups = new Map();
  for (const r of rows) {
    const key = r.p.toFixed(6);
    const g = groups.get(key) || { p: r.p, n: 0, osum: 0 };
    g.n += 1;
    g.osum += r.o;
    groups.set(key, g);
  }
  let reliability = 0;
  let resolution = 0;
  for (const g of groups.values()) {
    const ok = g.osum / g.n;
    reliability += g.n * (g.p - ok) ** 2;
    resolution += g.n * (ok - obar) ** 2;
  }
  reliability /= N;
  resolution /= N;
  const uncertainty = obar * (1 - obar);
  const brier = brierScore(rows);
  return {
    n: N,
    base_rate: obar,
    reliability,
    resolution,
    uncertainty,
    brier,
    check: reliability - resolution + uncertainty,
    brier_skill: uncertainty > 0 ? 1 - brier / uncertainty : null,
  };
}

/** Reliability diagram: do your 70%s happen ~70% of the time? */
export function reliabilityBins(preds, nbins = 10) {
  const rows = normalizePreds(preds);
  const bins = [];
  const k = Math.max(2, Math.min(20, Number(nbins) || 10));
  for (let i = 0; i < k; i += 1) {
    const lo = i / k;
    const hi = (i + 1) / k;
    const inb = rows.filter((r) => r.p >= lo && (i === k - 1 ? r.p <= hi : r.p < hi));
    if (!inb.length) continue;
    const avgP = inb.reduce((s, r) => s + r.p, 0) / inb.length;
    const obs = inb.reduce((s, r) => s + r.o, 0) / inb.length;
    bins.push({ lo, hi, n: inb.length, avg_p: avgP, observed: obs, gap: avgP - obs });
  }
  return bins;
}

/** Positive => overconfident (you sound surer than you turn out to be). */
export function confidenceGap(preds) {
  const rows = normalizePreds(preds);
  if (!rows.length) return null;
  const boldness = rows.reduce((s, r) => s + Math.max(r.p, 1 - r.p), 0) / rows.length;
  const accuracy = rows.reduce((s, r) => s + (r.o === 1 ? r.p >= 0.5 : r.p < 0.5 ? 1 : 0), 0) / rows.length;
  return { boldness, accuracy, gap: boldness - accuracy };
}

/**
 * Anytime-valid calibration e-value (mixture betting martingale).
 * ~1 => no evidence of miscalibration (or too few samples); >=3 meaningful; >=20 strong.
 * Honest by design: it will NOT flag small-n noise, so a correction is only ever
 * "earned" once the evidence actually accrues. |lambda|<=0.6 keeps 1+λ(o−p) > 0.
 */
export function calibrationEValue(preds) {
  const rows = normalizePreds(preds);
  if (!rows.length) return 1;
  const grid = [-0.6, -0.4, -0.2, 0.2, 0.4, 0.6];
  let sum = 0;
  for (const lam of grid) {
    let prod = 1;
    for (const r of rows) prod *= 1 + lam * (r.o - r.p);
    sum += prod;
  }
  const e = sum / grid.length;
  return Number.isFinite(e) ? Math.max(0, e) : 1;
}

/**
 * Platt recalibration (ridge-shrunk logistic of outcome on logit(p)).
 * Returns {a,b,applied}. Stays the identity (a=0,b=1) until a correction is EARNED
 * (n >= minN AND e-value >= minEValue) — never correct on noise. Deterministic:
 * fixed iterations, fixed learning rate, shrink toward (0,1).
 */
export function recalibrationMap(preds, opts = {}) {
  const rows = normalizePreds(preds);
  const minN = opts.minN ?? 6;
  const minEValue = opts.minEValue ?? 3;
  const identity = { a: 0, b: 1, applied: false, n: rows.length };
  if (rows.length < minN) return { ...identity, reason: `n<${minN}` };
  const e = calibrationEValue(rows);
  if (e < minEValue) return { ...identity, e_value: e, reason: `e_value<${minEValue}` };

  const zs = rows.map((r) => logit(r.p));
  let a = 0;
  let b = 1;
  const lr = 0.1;
  const reg = 0.02;
  for (let iter = 0; iter < 800; iter += 1) {
    let ga = 0;
    let gb = 0;
    for (let i = 0; i < rows.length; i += 1) {
      const yhat = sigmoid(a + b * zs[i]);
      const err = yhat - rows[i].o;
      ga += err;
      gb += err * zs[i];
    }
    ga = ga / rows.length + 2 * reg * a;
    gb = gb / rows.length + 2 * reg * (b - 1);
    a -= lr * ga;
    b -= lr * gb;
  }
  return {
    a,
    b,
    applied: true,
    n: rows.length,
    e_value: e,
    shape: b < 1 ? 'too_extreme' : b > 1 ? 'too_timid' : 'ok',
  };
}

export function applyRecalibration(p, map) {
  if (!map || !map.applied) return clamp01(p);
  return clamp01(sigmoid(map.a + map.b * logit(p)));
}

const STAKE_BY_LABEL = { low: 1, medium: 2, high: 5 };

/**
 * Chow's reject rule as a decide gate: correct p by track record, then threshold
 * by stakes. τ = 1 − verify_cost/stake, so an irreversible call demands near-certainty.
 * verdict: p̂ >= τ → proceed · ½ <= p̂ < τ → verify · p̂ < ½ → abstain.
 */
export function decideGate({ p, stake = 1, stakesLabel = null, verifyCost = 0.2, recal = null } = {}) {
  const stakeNum = stakesLabel && STAKE_BY_LABEL[stakesLabel] != null
    ? STAKE_BY_LABEL[stakesLabel]
    : Math.max(0.5, Number(stake) || 1);
  const vc = Math.max(0.01, Math.min(stakeNum, Number(verifyCost) || 0.2));
  const threshold = Math.max(0.5, Math.min(0.999, 1 - vc / stakeNum));
  const pRaw = clamp01(p);
  const pHat = applyRecalibration(pRaw, recal);
  let verdict = 'abstain';
  if (pHat >= threshold) verdict = 'proceed';
  else if (pHat >= 0.5) verdict = 'verify';
  return {
    stated_p: pRaw,
    p_hat: pHat,
    correction_applied: !!(recal && recal.applied),
    stake: stakeNum,
    verify_cost: vc,
    threshold,
    verdict,
    rationale:
      verdict === 'proceed'
        ? `corrected confidence ${pHat.toFixed(2)} clears the ${threshold.toFixed(2)} bar for this stake`
        : verdict === 'verify'
          ? `corrected confidence ${pHat.toFixed(2)} is above ½ but below the ${threshold.toFixed(2)} bar — verify before acting`
          : `corrected confidence ${pHat.toFixed(2)} is below ½ — abstain`,
  };
}

const RECEIPT_KINDS = new Set(['deploy', 'sentry', 'revert', 'ci', 'manual']);
const VERDICTS = new Set(['pass', 'fail', 'mixed', 'reverted']);

/** Map a real receipt payload to a resolved verdict. Never infers silently. */
export function verdictFromReceipt(receiptKind, raw = {}) {
  const kind = String(receiptKind || '').toLowerCase();
  if (kind === 'revert') return 'reverted';
  const r = raw || {};
  const explicit = String(r.verdict || r.result || r.status || '').toLowerCase();
  if (VERDICTS.has(explicit)) return explicit;
  if (kind === 'sentry') {
    if (r.passed === true || explicit === 'passed' || explicit === 'green') return 'pass';
    if (r.passed === false || explicit === 'failed' || explicit === 'red') return 'fail';
  }
  if (kind === 'deploy' || kind === 'ci') {
    if (r.success === true || explicit === 'success' || explicit === 'succeeded') return 'pass';
    if (r.success === false || explicit === 'failure' || explicit === 'error') return 'fail';
  }
  return null;
}

/**
 * @param {{ pool: import('pg').Pool, logger?: Console }} deps
 */
export function createCognitiveCoreOracle(deps = {}) {
  const pool = deps.pool;
  const logger = deps.logger || console;
  const judgment = pool ? createCognitiveCoreJudgment({ pool, logger }) : null;

  async function loadResolvedPreds(userId, domain = null) {
    const params = [String(userId)];
    let domainClause = '';
    if (domain) {
      params.push(String(domain));
      domainClause = 'AND d.domain = $2';
    }
    const { rows } = await pool.query(
      `SELECT d.domain, p.predicted_option, p.confidence, o.actual_option
       FROM judgment_decisions d
       JOIN judgment_outcomes o ON o.decision_id = d.decision_id
       JOIN LATERAL (
         SELECT predicted_option, confidence
         FROM judgment_predictions
         WHERE decision_id = d.decision_id
         ORDER BY created_at DESC LIMIT 1
       ) p ON TRUE
       WHERE d.user_id = $1 ${domainClause}`,
      params,
    );
    return rows.map((r) => ({
      domain: r.domain,
      p: clamp01(r.confidence),
      o:
        String(r.predicted_option || '').trim().toLowerCase()
        === String(r.actual_option || '').trim().toLowerCase()
          ? 1
          : 0,
    }));
  }

  /**
   * Layer A: resolve an open decision from a real receipt, with provenance.
   * Reuses the judgment service so domain-trust refresh + miss classification
   * fire exactly as they do for a hand-typed outcome — but no human retyped it.
   */
  async function resolveFromReceipt({
    userId = '1',
    decisionId,
    receiptKind,
    receiptRef = null,
    verdict = null,
    raw = {},
    observedAt = null,
    outcomeVocab = null,
  }) {
    if (!pool) throw new Error('cognitive_core_requires_pool');
    if (!decisionId) throw new Error('decision_id_required');
    const kind = String(receiptKind || '').toLowerCase();
    if (!RECEIPT_KINDS.has(kind)) throw new Error(`invalid_receipt_kind:${receiptKind}`);
    const resolvedVerdict = verdict && VERDICTS.has(String(verdict).toLowerCase())
      ? String(verdict).toLowerCase()
      : verdictFromReceipt(kind, raw);
    if (!resolvedVerdict || !VERDICTS.has(resolvedVerdict)) {
      throw new Error('receipt_verdict_unresolvable'); // fail-closed: never guess an outcome
    }

    const { rows: linkRows } = await pool.query(
      `INSERT INTO judgment_receipt_links
         (user_id, decision_id, receipt_kind, receipt_ref, verdict, observed_at, raw)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)
       RETURNING *`,
      [
        String(userId),
        decisionId,
        kind,
        receiptRef ? String(receiptRef).slice(0, 400) : null,
        resolvedVerdict,
        observedAt ? new Date(observedAt) : new Date(),
        JSON.stringify(raw || {}),
      ],
    );

    // actualOption uses the same vocabulary the prediction was made in (default: the verdict itself)
    const actualOption = outcomeVocab && outcomeVocab[resolvedVerdict]
      ? outcomeVocab[resolvedVerdict]
      : resolvedVerdict;

    const outcome = await judgment.recordOutcome({
      decisionId,
      actualOption,
      statedReasons: [`receipt:${kind}:${receiptRef || 'n/a'} → ${resolvedVerdict}`],
      capturedHow: 'receipt_verified',
      receiptLinkId: linkRows[0]?.link_id || null,
    });

    return { ok: true, receipt_link: linkRows[0], outcome, verdict: resolvedVerdict };
  }

  /** The rich mirror — every proper-scoring metric, computed on real resolved rows. */
  async function calibrationReport({ userId = '1', domain = null } = {}) {
    if (!pool) throw new Error('cognitive_core_requires_pool');
    const preds = await loadResolvedPreds(userId, domain);
    const n = preds.length;
    const decomp = murphyDecomposition(preds);
    const gap = confidenceGap(preds);
    const eValue = calibrationEValue(preds);
    const recal = recalibrationMap(preds);
    const bins = reliabilityBins(preds, 10);

    let verdict = 'warming_up';
    let plain = 'Not enough resolved decisions yet to judge calibration honestly.';
    if (n >= 6 && gap) {
      if (gap.gap > 0.1) {
        verdict = 'overconfident';
        plain = 'You sound surer than you turn out to be — shade confidence down.';
      } else if (gap.gap < -0.1) {
        verdict = 'underconfident';
        plain = 'You are more right than you claim — you can trust yourself more here.';
      } else {
        verdict = 'calibrated';
        plain = 'Your stated confidence broadly matches reality.';
      }
    }

    return {
      ok: true,
      subject: 'principal_judgment',
      user_id: String(userId),
      domain: domain || 'all',
      n,
      decomposition: decomp,
      confidence_gap: gap,
      e_value: eValue,
      e_value_note:
        eValue >= 20 ? 'strong evidence of real miscalibration'
          : eValue >= 3 ? 'meaningful evidence'
            : 'no evidence yet (or too few samples) — correction not earned',
      recalibration: recal,
      reliability_bins: bins,
      verdict,
      plain,
      loop_closed: n > 0,
    };
  }

  /** Load track record, correct the stated prob, gate by stake, and log it. */
  async function decide({
    userId = '1',
    domain = 'general',
    statedProb,
    stake = null,
    stakesLabel = null,
    verifyCost = 0.2,
    decisionId = null,
  }) {
    if (!pool) throw new Error('cognitive_core_requires_pool');
    if (statedProb == null) throw new Error('stated_prob_required');
    const preds = await loadResolvedPreds(userId, domain);
    const recal = recalibrationMap(preds);
    const gate = decideGate({
      p: statedProb,
      stake: stake != null ? Number(stake) : 1,
      stakesLabel,
      verifyCost,
      recal,
    });

    const { rows } = await pool.query(
      `INSERT INTO judgment_decide_log
         (user_id, domain, stated_prob, recalibrated_prob, stake, threshold, verdict,
          n, e_value, applied_correction, rationale, decision_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        String(userId),
        String(domain).slice(0, 80),
        gate.stated_p,
        gate.p_hat,
        gate.stake,
        gate.threshold,
        gate.verdict,
        preds.length,
        recal.e_value ?? null,
        gate.correction_applied,
        gate.rationale,
        decisionId,
      ],
    );

    return { ok: true, ...gate, track_record_n: preds.length, recalibration: recal, log: rows[0] };
  }

  async function listReceiptLinks(userId, { limit = 50 } = {}) {
    if (!pool) throw new Error('cognitive_core_requires_pool');
    const { rows } = await pool.query(
      `SELECT * FROM judgment_receipt_links WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [String(userId), Math.min(200, Math.max(1, Number(limit) || 50))],
    );
    return rows;
  }

  async function listDecideLog(userId, { limit = 50 } = {}) {
    if (!pool) throw new Error('cognitive_core_requires_pool');
    const { rows } = await pool.query(
      `SELECT * FROM judgment_decide_log WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [String(userId), Math.min(200, Math.max(1, Number(limit) || 50))],
    );
    return rows;
  }

  return {
    resolveFromReceipt,
    calibrationReport,
    decide,
    listReceiptLinks,
    listDecideLog,
    verdictFromReceipt,
    RECEIPT_KINDS: [...RECEIPT_KINDS],
    VERDICTS: [...VERDICTS],
  };
}

export default createCognitiveCoreOracle;