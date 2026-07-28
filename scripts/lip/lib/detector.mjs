/**
 * SYNOPSIS: Pump-like anomaly detection (public tape only — not organizing pumps)
 * @ssot docs/products/lip/PRODUCT_HOME.md
 * Pump-like anomaly detection (public tape only — not organizing pumps)
 */

/**
 * Score a candle window for pump-like behavior.
 * @param {{ close: number, volume: number }[]} bars chronological
 * @param {{ lookback?: number, volMult?: number, retThresh?: number }} opts
 */
export function scorePumpWindow(bars, opts = {}) {
  const lookback = opts.lookback ?? 24;
  const volMult = opts.volMult ?? 4;
  const retThresh = opts.retThresh ?? 0.12;
  if (!bars || bars.length < lookback + 2) {
    return { is_candidate: false, score: 0, reason: 'insufficient_bars' };
  }

  const i = bars.length - 1;
  const cur = bars[i];
  const prev = bars.slice(i - lookback, i);
  const avgVol = prev.reduce((s, b) => s + (b.volume || 0), 0) / lookback;
  const base = bars[i - 1]?.close || cur.close;
  const ret = base > 0 ? (cur.close - base) / base : 0;
  const volRatio = avgVol > 0 ? cur.volume / avgVol : 0;

  let score = 0;
  if (volRatio >= volMult) score += Math.min(50, volRatio * 5);
  if (ret >= retThresh) score += Math.min(50, ret * 100);
  const is_candidate = volRatio >= volMult && ret >= retThresh && score >= 40;

  return {
    is_candidate,
    score: Math.round(score * 10) / 10,
    vol_ratio: Math.round(volRatio * 100) / 100,
    ret: Math.round(ret * 10000) / 10000,
    reason: is_candidate ? 'volume_price_spike' : 'below_threshold',
  };
}

/**
 * Estimate typical upward swing from prior detected peaks in series (blind: only past).
 * @param {number[]} peakReturns prior peak fractional returns e.g. 0.4 = +40%
 */
export function typicalSwing(peakReturns, fallback = 0.35) {
  if (!peakReturns?.length) return fallback;
  const sorted = [...peakReturns].sort((a, b) => a - b);
  const mid = sorted[Math.floor(sorted.length / 2)];
  return Math.max(0.08, Math.min(2.5, mid || fallback));
}

/**
 * Walk series; fire when scorePumpWindow is true; measure forward peak (for labeling only after).
 */
export function detectEvents(bars, opts = {}) {
  const lookback = opts.lookback ?? 24;
  const events = [];
  const priorPeaks = [];

  for (let i = lookback + 1; i < bars.length; i++) {
    const window = bars.slice(0, i + 1);
    const scored = scorePumpWindow(window, opts);
    if (!scored.is_candidate) continue;

    // cooldown: skip if last event within 12 bars
    if (events.length && i - events[events.length - 1].index < 12) continue;

    const entry = bars[i].close;
    let peak = entry;
    let peakIdx = i;
    const horizon = Math.min(bars.length - 1, i + (opts.horizon ?? 48));
    for (let j = i + 1; j <= horizon; j++) {
      if (bars[j].close > peak) {
        peak = bars[j].close;
        peakIdx = j;
      }
    }
    const peakRet = entry > 0 ? (peak - entry) / entry : 0;
    const swingEst = typicalSwing(priorPeaks, opts.fallbackSwing ?? 0.35);
    priorPeaks.push(peakRet);
    if (priorPeaks.length > 50) priorPeaks.shift();

    events.push({
      index: i,
      entry,
      peak,
      peak_idx: peakIdx,
      peak_ret: peakRet,
      swing_est: swingEst,
      ...scored,
    });
  }
  return events;
}
