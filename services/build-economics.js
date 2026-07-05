/**
 * SYNOPSIS: services/build-economics.js — record + predict build cost and time.
 * @ssot docs/products/project-governance/PRODUCT_HOME.md
 *
 * The builder should be able to answer "how much will this cost and how long
 * will it take?" before it starts, and prove its accuracy afterward. This module
 * (1) records per-segment build economics (phase timings, tokens, USD, code
 * volume) into `build_economics`, and (2) predicts a project/blueprint's total
 * cost + time from historical averages of similar segments, degrading to a
 * labeled seed-estimate when there is no history yet.
 *
 * The estimation math is exposed as pure functions (summarizeHistory,
 * estimateSegments) so it is unit-testable without a database.
 */
import { estimateCostUsd } from '../scripts/autonomy/builder-agents.mjs';

// Cold-start assumptions (no history): a typical segment ≈ these tokens on the
// cheap default model, and takes ~ its estimated_hours. Overridable via env.
const DEFAULT_PROMPT_TOKENS = Number(process.env.BUILDER_DEFAULT_PROMPT_TOKENS) || 12000;
const DEFAULT_COMPLETION_TOKENS = Number(process.env.BUILDER_DEFAULT_COMPLETION_TOKENS) || 3000;
const DEFAULT_MODEL = process.env.BUILDER_OPENAI_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';
const DEFAULT_SEGMENT_HOURS = Number(process.env.BUILDER_DEFAULT_SEGMENT_HOURS) || 0.5;

export async function recordBuildEconomics(pool, row = {}) {
  try {
    await pool.query(
      `INSERT INTO build_economics
        (segment_id, project_id, project_slug, stability_class, agent, model, outcome,
         review_ms, agent_ms, verify_ms, total_ms,
         prompt_tokens, completion_tokens, total_tokens, estimated_usd,
         files_changed, lines_added, lines_deleted)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
      [
        row.segmentId ?? null,
        row.projectId ?? null,
        row.projectSlug ?? null,
        row.stabilityClass ?? null,
        row.agent ?? null,
        row.model ?? null,
        row.outcome ?? null,
        int(row.reviewMs),
        int(row.agentMs),
        int(row.verifyMs),
        int(row.totalMs),
        int(row.promptTokens),
        int(row.completionTokens),
        int(row.totalTokens),
        Number(row.estimatedUsd) || 0,
        int(row.filesChanged),
        int(row.linesAdded),
        int(row.linesDeleted),
      ],
    );
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function int(v) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Aggregate historical rows into per-class and overall averages.
 * @param {Array} rows  build_economics rows (ideally successful ones)
 */
export function summarizeHistory(rows = []) {
  const byClass = {};
  const overall = accumulator();
  for (const r of rows) {
    const cls = r.stability_class || 'unknown';
    byClass[cls] = byClass[cls] || accumulator();
    add(byClass[cls], r);
    add(overall, r);
  }
  const finalizeAll = (acc) => finalize(acc);
  return {
    byClass: Object.fromEntries(Object.entries(byClass).map(([k, v]) => [k, finalizeAll(v)])),
    overall: finalize(overall),
  };
}

function accumulator() {
  return { samples: 0, usd: 0, totalMs: 0, totalTokens: 0, lines: 0 };
}
function add(acc, r) {
  acc.samples += 1;
  acc.usd += Number(r.estimated_usd) || 0;
  acc.totalMs += Number(r.total_ms) || 0;
  acc.totalTokens += Number(r.total_tokens) || 0;
  acc.lines += (Number(r.lines_added) || 0) + (Number(r.lines_deleted) || 0);
}
function finalize(acc) {
  if (!acc.samples) return { samples: 0, avgUsd: 0, avgMinutes: 0, avgTokens: 0, avgLines: 0 };
  return {
    samples: acc.samples,
    avgUsd: parseFloat((acc.usd / acc.samples).toFixed(5)),
    avgMinutes: parseFloat((acc.totalMs / acc.samples / 60000).toFixed(2)),
    avgTokens: Math.round(acc.totalTokens / acc.samples),
    avgLines: Math.round(acc.lines / acc.samples),
  };
}

function confidenceFor(samples) {
  if (samples >= 20) return 'high';
  if (samples >= 5) return 'medium';
  if (samples >= 1) return 'low';
  return 'seed-estimate';
}

/**
 * Predict cost + time for a set of segments using history summary.
 * Pure function — no DB. Falls back per-segment: class avg → overall avg →
 * cold-start default derived from estimated_hours + default token assumption.
 */
export function estimateSegments(segments = [], summary = { byClass: {}, overall: { samples: 0 } }, opts = {}) {
  const env = opts.env || process.env;
  const coldUsd = estimateCostUsd(DEFAULT_MODEL, DEFAULT_PROMPT_TOKENS, DEFAULT_COMPLETION_TOKENS, env);
  let usd = 0;
  let minutes = 0;
  let historyBackedCount = 0;
  const perSegment = [];

  for (const seg of segments) {
    const cls = seg.stability_class || 'unknown';
    const classStat = summary.byClass?.[cls];
    const overall = summary.overall;
    let source;
    let segUsd;
    let segMinutes;

    if (classStat && classStat.samples > 0) {
      source = `class:${cls}`;
      segUsd = classStat.avgUsd;
      segMinutes = classStat.avgMinutes;
      historyBackedCount += 1;
    } else if (overall && overall.samples > 0) {
      source = 'overall';
      segUsd = overall.avgUsd;
      segMinutes = overall.avgMinutes;
      historyBackedCount += 1;
    } else {
      source = 'cold-start';
      segUsd = coldUsd;
      segMinutes = (Number(seg.estimated_hours) || DEFAULT_SEGMENT_HOURS) * 60;
    }

    usd += segUsd;
    minutes += segMinutes;
    perSegment.push({
      segmentId: seg.id ?? null,
      title: seg.title ?? null,
      stabilityClass: cls,
      estimatedUsd: parseFloat(segUsd.toFixed(5)),
      estimatedMinutes: parseFloat(segMinutes.toFixed(2)),
      source,
    });
  }

  const totalSamples = summary.overall?.samples || 0;
  return {
    segmentCount: segments.length,
    estimatedUsd: parseFloat(usd.toFixed(4)),
    estimatedMinutes: parseFloat(minutes.toFixed(1)),
    confidence: segments.length === 0 ? 'none' : confidenceFor(historyBackedCount ? totalSamples : 0),
    historyBackedSegments: historyBackedCount,
    perSegment,
  };
}

export async function getHistoryStats(pool) {
  const { rows } = await pool.query(
    `SELECT stability_class, estimated_usd, total_ms, total_tokens, lines_added, lines_deleted
       FROM build_economics
      WHERE outcome = 'done'`,
  );
  return summarizeHistory(rows);
}

/**
 * Estimate a whole project's remaining build (segments not yet done).
 */
export async function estimateProjectBuild(pool, { projectId, includeDone = false } = {}) {
  const statusClause = includeDone ? '' : "AND ps.status <> 'done'";
  const { rows: segments } = await pool.query(
    `SELECT ps.id, ps.title, ps.stability_class, ps.estimated_hours, ps.status
       FROM project_segments ps
      WHERE ps.project_id = $1 ${statusClause}
      ORDER BY ps.sort_order ASC, ps.id ASC`,
    [projectId],
  );
  const summary = await getHistoryStats(pool);
  const estimate = estimateSegments(segments, summary);
  return { projectId, ...estimate, historySummary: summary };
}
