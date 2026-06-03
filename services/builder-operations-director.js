/**
 * Builder Operations Director — continuous factory health, not audit-by-hand.
 * Layers: (1) survival 502/syntax (2) utilization proof vs product (3) founder value.
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */

import fs from 'node:fs/promises';
import path from 'node:path';

/** Builder Reliability Initiative — north-star factory KPIs */
export const FACTORY_KPI_TARGETS = Object.freeze({
  proof_doc_start_pct_max: 10,
  http_502_failure_pct_max: 5,
  syntax_failure_pct_max: 5,
  product_build_start_pct_min: 50,
  product_build_success_pct_min: 40,
  founder_value_per_1000_starts_min: 5,
});

const PROOF_RE = /builderos-remediation\/.*proof|blueprint_proof/i;

/**
 * @param {object[]} events Parsed log events
 */
export function analyzeFactoryEvents(events = []) {
  const starts = events.filter((e) => e.event === 'task_start');
  const fails = events.filter((e) => e.event === 'task_failed');
  const wins = events.filter((e) => e.event === 'task_success');
  const fvWins = wins.filter((e) => e.oil_verified && e.token_verified);

  const proofStarts = starts.filter(
    (e) => e.category === 'blueprint_proof' || PROOF_RE.test(String(e.target_file || '')),
  );
  const productStarts = starts.filter((e) => e.category === 'blueprint_build');
  const productWins = wins.filter((e) => e.category === 'blueprint_build');

  const blockerCounts = {};
  for (const e of fails) {
    const b = e.blocker || 'UNKNOWN';
    blockerCounts[b] = (blockerCounts[b] || 0) + 1;
  }
  const failTotal = fails.length || 1;
  const http502 = fails.filter((e) => String(e.blocker || '').includes('502') || String(e.blocker || '').startsWith('HTTP_5')).length;
  const syntax = fails.filter((e) => String(e.blocker || '').includes('syntax')).length;

  const startTotal = starts.length || 1;
  const proofPct = (proofStarts.length / startTotal) * 100;
  const productStartPct = (productStarts.length / startTotal) * 100;
  const productSuccessPct = productStarts.length
    ? (productWins.length / productStarts.length) * 100
    : 0;
  const fvPer1000 = (fvWins.length / startTotal) * 1000;
  const overallSuccessPct = (wins.length / startTotal) * 100;

  const failedTargets = {};
  for (const e of fails) {
    if (!e.target_file) continue;
    failedTargets[e.target_file] = (failedTargets[e.target_file] || 0) + 1;
  }
  const topFailedTargets = Object.entries(failedTargets)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([target_file, count]) => ({ target_file, count }));

  const retries = events.filter((e) => e.event === 'task_retry').length;
  const skippedRetries = events.filter((e) => e.event === 'task_redirect_skip_retry').length;

  const layer1 = {
    name: 'factory_survival',
    http_502_failure_pct: round((http502 / failTotal) * 100),
    syntax_failure_pct: round((syntax / failTotal) * 100),
    combined_survival_blocker_pct: round(((http502 + syntax) / failTotal) * 100),
    healthy: (http502 / failTotal) * 100 <= FACTORY_KPI_TARGETS.http_502_failure_pct_max
      && (syntax / failTotal) * 100 <= FACTORY_KPI_TARGETS.syntax_failure_pct_max,
  };

  const layer2 = {
    name: 'factory_utilization',
    proof_doc_start_pct: round(proofPct),
    product_build_start_pct: round(productStartPct),
    enhancement_memo_starts: starts.filter((e) => e.category === 'blueprint_enhancement').length,
    healthy: proofPct <= FACTORY_KPI_TARGETS.proof_doc_start_pct_max
      && productStartPct >= FACTORY_KPI_TARGETS.product_build_start_pct_min,
  };

  const layer3 = {
    name: 'founder_value',
    founder_value_deliveries: fvWins.length,
    founder_value_per_1000_starts: round(fvPer1000, 2),
    product_build_success_pct: round(productSuccessPct),
    healthy: fvPer1000 >= FACTORY_KPI_TARGETS.founder_value_per_1000_starts_min,
  };

  const targets = FACTORY_KPI_TARGETS;
  const score = computeFactoryScore(layer1, layer2, layer3, targets);

  const recommendations = buildRecommendations(layer1, layer2, layer3, topFailedTargets);

  return {
    schema: 'builder_factory_health_v1',
    generated_at: new Date().toISOString(),
    window: { event_count: events.length, task_starts: starts.length },
    throughput: {
      task_starts: starts.length,
      task_successes: wins.length,
      task_failures: fails.length,
      overall_success_pct: round(overallSuccessPct),
      retries,
      skipped_retries: skippedRetries,
    },
    layers: { layer1, layer2, layer3 },
    factory_score: score,
    kpi_targets: targets,
    top_failed_targets: topFailedTargets,
    top_blockers: Object.entries(blockerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([blocker, count]) => ({ blocker, count, pct: round((count / failTotal) * 100) })),
    recommendations,
    initiative: 'Builder Reliability Initiative',
  };
}

function computeFactoryScore(l1, l2, l3) {
  let score = 10;
  if (l1.combined_survival_blocker_pct > 50) score -= 4;
  else if (l1.combined_survival_blocker_pct > 20) score -= 2;
  if (l2.proof_doc_start_pct > 50) score -= 3;
  else if (l2.proof_doc_start_pct > 10) score -= 1;
  if (l2.product_build_start_pct < 5) score -= 2;
  if (l3.founder_value_per_1000_starts < 1) score -= 1;
  return Math.max(1, Math.min(10, score));
}

function buildRecommendations(l1, l2, l3, topFailed) {
  const recs = [];
  if (l1.http_502_failure_pct > 5) {
    recs.push({ priority: 'P0', layer: 1, action: 'Fix HTTP_502 on builder execute path; deploy pipeline fixes before new product work' });
  }
  if (l1.syntax_failure_pct > 5) {
    recs.push({ priority: 'P0', layer: 1, action: 'Calibrate syntax/governance gates; reject proof-doc targets from builder' });
  }
  if (l2.proof_doc_start_pct > 10) {
    recs.push({ priority: 'P0', layer: 2, action: 'BUILDER_ALLOW_PROOF_DOCS=0 (default); product-only queue until KPI met' });
  }
  if (l2.product_build_start_pct < 50) {
    recs.push({ priority: 'P1', layer: 2, action: 'Prioritize blueprint_build rows from P1 missions (MarketingOS Am 41)' });
  }
  if (l3.product_build_success_pct < 40 && l2.product_build_start_pct > 0) {
    recs.push({ priority: 'P1', layer: 1, action: 'Small-patch mode for Zone 3 routes; mount verifier post-commit' });
  }
  if (topFailed[0]?.target_file?.includes('proof')) {
    recs.push({ priority: 'P0', layer: 2, action: 'Stop proof-doc targets — 0 historical successes, highest churn' });
  }
  return recs;
}

function round(n, d = 1) {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

/**
 * @param {object} [opts]
 * @param {string} [opts.logPath]
 * @param {number} [opts.sinceHours] — 0 = full log
 * @param {string} [opts.root]
 */
export async function analyzeFactoryHealth(opts = {}) {
  const root = opts.root || process.cwd();
  const logPath = opts.logPath || path.join(root, 'data', 'governed-autonomy-overnight-log.jsonl');
  const sinceHours = opts.sinceHours ?? 0;

  let text;
  try {
    text = await fs.readFile(logPath, 'utf8');
  } catch {
    return {
      schema: 'builder_factory_health_v1',
      generated_at: new Date().toISOString(),
      error: 'log_missing',
      log_path: logPath,
      factory_score: null,
    };
  }

  const cutoff = sinceHours > 0
    ? new Date(Date.now() - sinceHours * 3600 * 1000).toISOString()
    : null;

  const events = text
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .filter((e) => !cutoff || (e.ts && e.ts >= cutoff));

  return analyzeFactoryEvents(events);
}

/**
 * @param {object} report
 * @param {string} outPath
 */
export async function writeFactoryHealthReport(report, outPath) {
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
  return outPath;
}
