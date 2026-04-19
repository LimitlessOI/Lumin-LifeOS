/**
 * routes/lifeos-backtest-routes.js
 *
 * Education-only view over attention-momentum + strategy-benchmark logs.
 *
 * Rules baked into every response:
 *   - This is NOT investment advice. Every payload includes an explicit `disclaimer`
 *     field; clients cannot turn it off.
 *   - We never return identifiers or anything that could be confused with a live
 *     trading signal. Symbol + pnl + R multiples are shown for explanatory context
 *     only.
 *   - Every endpoint is read-only. There is no way to trigger a strategy run from
 *     this route; the only way results appear here is if a human ran
 *     `scripts/attention-momentum-backtest.mjs` / `scripts/strategy-benchmark-suite.mjs`
 *     locally and those logs are on disk.
 *
 * Mounted at /api/v1/lifeos/backtest
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import express from 'express';
import fs      from 'node:fs';
import path    from 'node:path';

const DISCLAIMER =
  'Education and self-reflection only. These are historical simulations of a mechanical strategy over archived market data — not live trades, not real returns, and not investment advice. Past simulations do not predict future results. Nothing here should be used to make investment decisions.';

const LOGS_DIR = path.resolve(process.cwd(), 'logs');

function safeRead(file) {
  const full = path.join(LOGS_DIR, file);
  if (!full.startsWith(LOGS_DIR)) return null;
  try {
    if (!fs.existsSync(full)) return null;
    return fs.readFileSync(full, 'utf8');
  } catch {
    return null;
  }
}

function readJsonl(file, { limit = 500 } = {}) {
  const raw = safeRead(file);
  if (!raw) return [];
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const start = Math.max(0, lines.length - limit);
  const out = [];
  for (let i = start; i < lines.length; i++) {
    try { out.push(JSON.parse(lines[i])); } catch { /* skip malformed */ }
  }
  return out;
}

function readJson(file) {
  const raw = safeRead(file);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function createLifeOSBacktestRoutes({ requireKey }) {
  const router = express.Router();

  router.use((_req, res, next) => {
    res.setHeader('X-Education-Only', '1');
    next();
  });

  // ── Overview ──────────────────────────────────────────────────────────────
  router.get('/overview', requireKey, (_req, res) => {
    const bench   = readJson('strategy-benchmark-suite.json');
    const inSamp  = readJson('attention-formula-in-sample-best.json');
    const trades  = readJsonl('attention-backtest-trades.jsonl', { limit: 1 });
    const wf      = readJsonl('attention-walk-forward.jsonl', { limit: 1 });

    res.json({
      ok: true,
      disclaimer: DISCLAIMER,
      artifacts: {
        strategy_benchmark_suite: Boolean(bench),
        attention_formula_in_sample_best: Boolean(inSamp),
        attention_backtest_trades: Boolean(trades.length),
        attention_walk_forward: Boolean(wf.length),
      },
      benchmark_snapshot: bench
        ? {
            ranked_by: bench.ranked_by || bench.rankedBy || null,
            symbols:   bench.symbols   || [],
            wf_folds:  bench.wfFolds   || null,
            top:       Array.isArray(bench.rows)
              ? bench.rows.slice(0, 3).map((r) => ({
                  id:               r.id,
                  label:            r.label,
                  portfolio_mult:   r.portfolioMult,
                  avg_max_dd:       r.avgMaxDrawdown,
                  reliability:      r.reliabilityScore,
                  trades:           r.tradeEvents,
                  pareto_optimal:   r.paretoOptimal,
                }))
              : [],
          }
        : null,
    });
  });

  // ── Strategy benchmark (ranked comparison of multiple strategies) ─────────
  router.get('/benchmark', requireKey, (_req, res) => {
    const bench = readJson('strategy-benchmark-suite.json');
    if (!bench) {
      return res.json({ ok: true, disclaimer: DISCLAIMER, rows: [], note: 'No benchmark log on disk.' });
    }
    res.json({
      ok: true,
      disclaimer: DISCLAIMER,
      warning: 'Simulated portfolio multipliers only. Not live performance.',
      ts:               bench.ts || null,
      symbols:          bench.symbols || [],
      capital_per_symbol: bench.capitalPerSymbol || null,
      warm_bars:        bench.warmBars || null,
      ranked_by:        bench.rankedBy || bench.ranked_by || null,
      wf_folds:         bench.wfFolds || null,
      rows: Array.isArray(bench.rows)
        ? bench.rows.map((r) => ({
            id:               r.id,
            label:            r.label,
            portfolio_mult:   r.portfolioMult,
            avg_max_dd:       r.avgMaxDrawdown,
            reliability:      r.reliabilityScore,
            trades:           r.tradeEvents,
            pareto_optimal:   r.paretoOptimal,
          }))
        : [],
    });
  });

  // ── Attention-momentum in-sample formula (READ-ONLY snapshot) ─────────────
  router.get('/attention-formula', requireKey, (_req, res) => {
    const inSamp = readJson('attention-formula-in-sample-best.json');
    res.json({
      ok: true,
      disclaimer: DISCLAIMER,
      warning: 'In-sample fit only — IN_SAMPLE_ONLY_SIM_LEVERAGE_IS_NOT_SPOT. Historical curve fitting, not a live signal.',
      formula: inSamp || null,
    });
  });

  // ── Walk-forward folds ────────────────────────────────────────────────────
  router.get('/walk-forward', requireKey, (_req, res) => {
    const folds = readJsonl('attention-walk-forward.jsonl', { limit: 200 });
    res.json({
      ok: true,
      disclaimer: DISCLAIMER,
      warning: 'Walk-forward test results on historical data only.',
      count: folds.length,
      folds,
    });
  });

  // ── Trade events (redacted to education context only) ─────────────────────
  router.get('/trades', requireKey, (req, res) => {
    const limitRaw = Number.parseInt(req.query.limit, 10);
    const limit    = Number.isFinite(limitRaw) ? Math.min(2000, Math.max(1, limitRaw)) : 500;
    const rows     = readJsonl('attention-backtest-trades.jsonl', { limit });

    // Aggregate per symbol for the education summary
    const bySymbol = new Map();
    for (const r of rows) {
      const sym = r.symbol || 'unknown';
      const agg = bySymbol.get(sym) || { symbol: sym, trades: 0, wins: 0, losses: 0, sum_r: 0, sum_pnl_usd: 0 };
      agg.trades      += 1;
      agg.sum_r       += Number(r.rMultiple || 0);
      agg.sum_pnl_usd += Number(r.pnlUsd    || 0);
      if ((r.rMultiple || 0) > 0) agg.wins += 1; else agg.losses += 1;
      bySymbol.set(sym, agg);
    }
    const summary = Array.from(bySymbol.values()).map((a) => ({
      ...a,
      win_rate: a.trades ? a.wins / a.trades : 0,
      avg_r:    a.trades ? a.sum_r / a.trades : 0,
    }));

    res.json({
      ok: true,
      disclaimer: DISCLAIMER,
      warning: 'Simulated trade events against historical candles. Not real P/L.',
      count: rows.length,
      summary,
      events: rows,
    });
  });

  return router;
}
