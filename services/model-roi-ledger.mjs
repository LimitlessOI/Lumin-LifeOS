/**
 * SYNOPSIS: Model-cost ROI ledger — logs every model call (cost, lens, mission,
 * outcome) and reports per-lens / per-model ROI and trust-score deltas.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_LEDGER_PATH = path.join(ROOT, 'data', 'model-roi-ledger.jsonl');

export function logModelCall({
  ledgerPath = DEFAULT_LEDGER_PATH,
  model,
  lensId,
  responsibility,
  mission,
  promptTokens = 0,
  completionTokens = 0,
  estimatedUsd = 0,
  outcome = 'unknown',
} = {}) {
  const entry = {
    ts: new Date().toISOString(),
    model: model || 'unknown',
    lens_id: lensId || 'unknown',
    responsibility: responsibility || 'unknown',
    mission: mission || '',
    prompt_tokens: Number(promptTokens) || 0,
    completion_tokens: Number(completionTokens) || 0,
    estimated_usd: Number(estimatedUsd) || 0,
    outcome: outcome === 'pass' ? 'pass' : (outcome === 'fail' ? 'fail' : 'unknown'),
  };
  fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
  fs.appendFileSync(ledgerPath, `${JSON.stringify(entry)}\n`);
  return entry;
}

export function readLedger(ledgerPath = DEFAULT_LEDGER_PATH) {
  if (!fs.existsSync(ledgerPath)) return [];
  return fs.readFileSync(ledgerPath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try { return JSON.parse(line); } catch { return null; }
    })
    .filter(Boolean);
}

function summarize(agg) {
  const passRate = agg.calls ? agg.passes / agg.calls : 0;
  return {
    calls: agg.calls,
    passes: agg.passes,
    fails: agg.fails,
    unknown: agg.unknown,
    cost: Number(agg.cost.toFixed(6)),
    pass_rate: Number(passRate.toFixed(4)),
    cost_per_call: agg.calls ? Number((agg.cost / agg.calls).toFixed(6)) : 0,
    cost_per_pass: agg.passes ? Number((agg.cost / agg.passes).toFixed(6)) : null,
    // Bounded trust-score delta: a 100% pass rate yields +0.05, 0% yields -0.05.
    trust_score_delta: Number(((passRate - 0.5) * 0.1).toFixed(4)),
  };
}

export function computeRoiReport(entries) {
  const byModel = {};
  const byLens = {};
  const byLensModel = {};

  for (const e of entries) {
    const modelKey = e.model || 'unknown';
    const lensKey = e.lens_id || 'unknown';
    const comboKey = `${lensKey}::${modelKey}`;

    [byModel, byLens, byLensModel].forEach((bucket, idx) => {
      const key = idx === 0 ? modelKey : (idx === 1 ? lensKey : comboKey);
      if (!bucket[key]) bucket[key] = { calls: 0, passes: 0, fails: 0, unknown: 0, cost: 0 };
      bucket[key].calls += 1;
      bucket[key].cost += e.estimated_usd || 0;
      if (e.outcome === 'pass') bucket[key].passes += 1;
      else if (e.outcome === 'fail') bucket[key].fails += 1;
      else bucket[key].unknown += 1;
    });
  }

  return {
    generated_at: new Date().toISOString(),
    total_calls: entries.length,
    total_cost: Number(entries.reduce((s, e) => s + (e.estimated_usd || 0), 0).toFixed(6)),
    by_model: Object.fromEntries(Object.entries(byModel).map(([k, v]) => [k, summarize(v)])),
    by_lens: Object.fromEntries(Object.entries(byLens).map(([k, v]) => [k, summarize(v)])),
    by_lens_model: Object.fromEntries(Object.entries(byLensModel).map(([k, v]) => [k, summarize(v)])),
  };
}

export function formatRoiReport(report) {
  const lines = [
    '# Model ROI Report',
    `Generated: ${report.generated_at}`,
    `Total calls: ${report.total_calls}`,
    `Total cost (USD): ${report.total_cost}`,
    '',
    '## Per-model ROI',
    '| model | calls | passes | fails | cost | pass_rate | cost/pass | trust_delta |',
    '|---|---|---|---|---|---|---|---|',
  ];
  for (const [model, r] of Object.entries(report.by_model)) {
    lines.push(`| ${model} | ${r.calls} | ${r.passes} | ${r.fails} | ${r.cost} | ${r.pass_rate} | ${r.cost_per_pass ?? '-'} | ${r.trust_score_delta} |`);
  }
  lines.push('', '## Per-lens ROI');
  lines.push('| lens | calls | passes | fails | cost | pass_rate | cost/pass | trust_delta |');
  lines.push('|---|---|---|---|---|---|---|---|');
  for (const [lens, r] of Object.entries(report.by_lens)) {
    lines.push(`| ${lens} | ${r.calls} | ${r.passes} | ${r.fails} | ${r.cost} | ${r.pass_rate} | ${r.cost_per_pass ?? '-'} | ${r.trust_score_delta} |`);
  }
  return lines.join('\n');
}
