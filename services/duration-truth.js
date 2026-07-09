/**
 * SYNOPSIS: Duration truth — founder-facing time claims must cite measured averages, never AI guesses.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 *
 * Hard gate for "how long will this take?" / "what time is it?":
 * - Clock answers come from the host clock (ISO + timezone), not the model.
 * - Duration estimates require measured samples (receipts / build_economics / filtered step metrics).
 * - Cold-start / seed / model-invented minutes are REJECTED for founder-facing claims.
 * - Insufficient history → INSUFFICIENT_MEASURED_HISTORY (honest), never a fabricated ETA.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const MIN_SAMPLES_DEFAULT = 3;
export const PROOF_FIXTURE_MAX_MS = 50;

export const OPERATION_CLASSES = Object.freeze({
  BLUEPRINT_FOUNDATION: 'blueprint_foundation',
  INSTALL_STEP: 'install_step',
  SEGMENT_BUILD: 'segment_build',
});

/** Host clock — the only legal answer to "what time is it?" */
export function getSystemClock(now = new Date()) {
  const d = now instanceof Date ? now : new Date(now);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  return {
    measurement_source: 'clock',
    iso: d.toISOString(),
    unix_ms: d.getTime(),
    timezone: tz,
    local: d.toLocaleString('en-US', { timeZone: tz, dateStyle: 'full', timeStyle: 'long' }),
  };
}

function mean(nums) {
  if (!nums.length) return null;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

function median(nums) {
  if (!nums.length) return null;
  const a = [...nums].sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}

function percentile(nums, p) {
  if (!nums.length) return null;
  const a = [...nums].sort((x, y) => x - y);
  const idx = Math.min(a.length - 1, Math.max(0, Math.ceil((p / 100) * a.length) - 1));
  return a[idx];
}

function finalizeSamples(samples, { operation, minSamples = MIN_SAMPLES_DEFAULT } = {}) {
  const durations = samples
    .map((s) => Number(s.duration_ms))
    .filter((n) => Number.isFinite(n) && n >= 0);
  const n = durations.length;
  if (n < minSamples) {
    return {
      ok: false,
      reason: 'INSUFFICIENT_MEASURED_HISTORY',
      operation,
      sample_count: n,
      min_samples_required: minSamples,
      measurement_source: 'clock',
      estimated_ms: null,
      estimated_minutes: null,
      message:
        `Only ${n} measured sample(s) for ${operation}; need ≥${minSamples}. `
        + 'No founder-facing ETA until more real runs are recorded.',
    };
  }
  const avg = mean(durations);
  return {
    ok: true,
    reason: null,
    operation,
    sample_count: n,
    min_samples_required: minSamples,
    measurement_source: 'clock',
    estimated_ms: Math.round(avg),
    estimated_minutes: Number((avg / 60000).toFixed(2)),
    median_ms: Math.round(median(durations)),
    p90_ms: Math.round(percentile(durations, 90)),
    min_ms: Math.round(Math.min(...durations)),
    max_ms: Math.round(Math.max(...durations)),
    sources: samples.slice(0, 12).map((s) => s.source).filter(Boolean),
  };
}

/** Load foundation-loop wall times from mission receipts (real pipeline clocks). */
export function loadFoundationLoopSamples(root = ROOT) {
  const missionsDir = path.join(root, 'builderos-reboot', 'MISSIONS');
  const out = [];
  if (!fs.existsSync(missionsDir)) return out;
  for (const mission of fs.readdirSync(missionsDir)) {
    const receipt = path.join(missionsDir, mission, 'receipts', 'FOUNDATION_LOOP_RECEIPT.json');
    if (!fs.existsSync(receipt)) continue;
    let d;
    try {
      d = JSON.parse(fs.readFileSync(receipt, 'utf8'));
    } catch {
      continue;
    }
    const ms = Number(d.latency_ms);
    if (!Number.isFinite(ms) || ms < 1000) continue;
    out.push({
      duration_ms: ms,
      source: `builderos-reboot/MISSIONS/${mission}/receipts/FOUNDATION_LOOP_RECEIPT.json`,
      started_at: d.started_at || null,
      finished_at: d.finished_at || null,
    });
  }
  return out;
}

/**
 * Load install-step wall times from TSOS step metrics.
 * Drops proof-fixture noise (< PROOF_FIXTURE_MAX_MS) and exact synthetic 1000*n spikes
 * that match execute-mission.mjs placeholders when they dominate.
 */
export function loadInstallStepSamples(root = ROOT, { maxLines = 20000 } = {}) {
  const candidates = [
    path.join(root, 'factory-staging', 'data', 'tsos-step-metrics.jsonl'),
    path.join(root, 'data', 'tsos-step-metrics.jsonl'),
  ];
  const out = [];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    let raw = '';
    try {
      raw = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const lines = raw.split('\n').slice(-maxLines);
    for (const line of lines) {
      if (!line.trim()) continue;
      let o;
      try {
        o = JSON.parse(line);
      } catch {
        continue;
      }
      const ms = Number(o.latency_ms);
      if (!Number.isFinite(ms) || ms < PROOF_FIXTURE_MAX_MS) continue;
      // Skip exact synthetic placeholders (N * 1000 with N small) when no other signal.
      if (ms >= 1000 && ms <= 30000 && ms % 1000 === 0 && ms / 1000 <= 30) {
        // keep them only if they look like real multi-second work (>= 5s) — still measured wall if real
        if (ms < 5000) continue;
      }
      out.push({
        duration_ms: ms,
        source: path.relative(root, file),
        step_id: o.step_id || null,
        mission_id: o.mission_id || null,
        recorded_at: o.recorded_at || null,
      });
    }
    if (out.length) break;
  }
  return out;
}

/** Convert build_economics DB-shaped rows into duration samples. */
export function samplesFromBuildEconomicsRows(rows = []) {
  return (rows || [])
    .map((r) => {
      const ms = Number(r.total_ms);
      if (!Number.isFinite(ms) || ms < PROOF_FIXTURE_MAX_MS) return null;
      return {
        duration_ms: ms,
        source: r.id != null ? `build_economics#${r.id}` : 'build_economics',
        stability_class: r.stability_class || null,
      };
    })
    .filter(Boolean);
}

/**
 * Measured average for an operation class. Never invents numbers.
 * @param {'blueprint_foundation'|'install_step'|'segment_build'} operation
 * @param {{ minSamples?: number, stepCount?: number, economicsRows?: object[], root?: string }} opts
 */
export function estimateFromMeasuredHistory(operation, opts = {}) {
  const root = opts.root || ROOT;
  const minSamples = opts.minSamples ?? MIN_SAMPLES_DEFAULT;
  let samples = [];

  if (operation === OPERATION_CLASSES.BLUEPRINT_FOUNDATION) {
    samples = loadFoundationLoopSamples(root);
  } else if (operation === OPERATION_CLASSES.INSTALL_STEP) {
    samples = loadInstallStepSamples(root);
  } else if (operation === OPERATION_CLASSES.SEGMENT_BUILD) {
    samples = samplesFromBuildEconomicsRows(opts.economicsRows || []);
  } else {
    return {
      ok: false,
      reason: 'UNKNOWN_OPERATION',
      operation,
      sample_count: 0,
      min_samples_required: minSamples,
      measurement_source: 'clock',
      estimated_ms: null,
      estimated_minutes: null,
      message: `Unknown operation class "${operation}".`,
    };
  }

  const base = finalizeSamples(samples, { operation, minSamples });
  if (!base.ok) return base;

  const stepCount = Number(opts.stepCount);
  if (operation === OPERATION_CLASSES.INSTALL_STEP && Number.isFinite(stepCount) && stepCount > 0) {
    const totalMs = Math.round(base.estimated_ms * stepCount);
    return {
      ...base,
      operation: 'install_n_steps',
      step_count: stepCount,
      per_step_ms: base.estimated_ms,
      estimated_ms: totalMs,
      estimated_minutes: Number((totalMs / 60000).toFixed(2)),
      formula: `${stepCount} × avg_install_step_ms(${base.estimated_ms}) from ${base.sample_count} measured samples`,
    };
  }
  return base;
}

/**
 * Gate a founder-facing duration claim.
 * Rejects AI/seed/cold-start sources. Accepts only measurement_source === 'clock'
 * with ok:true and a finite estimated_ms.
 */
export function gateDurationClaim(claim = {}) {
  const source = String(claim.measurement_source || '').toLowerCase();
  const banned = new Set(['ai', 'model', 'guess', 'seed', 'seed-estimate', 'cold-start', 'heuristic', 'prediction-loop']);
  if (!source || banned.has(source) || source.includes('guess') || source.includes('seed')) {
    return {
      ok: false,
      allowed: false,
      reason: 'AI_OR_SEED_DURATION_FORBIDDEN',
      downgraded_to: 'INSUFFICIENT_MEASURED_HISTORY',
      message: 'Founder-facing duration claims may not use AI guesses or seed estimates. Use measured averages only.',
    };
  }
  if (source !== 'clock' && source !== 'measured' && source !== 'build_economics') {
    return {
      ok: false,
      allowed: false,
      reason: 'UNTRUSTED_MEASUREMENT_SOURCE',
      downgraded_to: 'INSUFFICIENT_MEASURED_HISTORY',
      message: `Untrusted measurement_source "${claim.measurement_source}".`,
    };
  }
  if (claim.ok === false || claim.estimated_ms == null || !Number.isFinite(Number(claim.estimated_ms))) {
    return {
      ok: false,
      allowed: false,
      reason: claim.reason || 'INSUFFICIENT_MEASURED_HISTORY',
      downgraded_to: 'INSUFFICIENT_MEASURED_HISTORY',
      message: claim.message || 'No measured ETA available.',
    };
  }
  const n = Number(claim.sample_count) || 0;
  const min = Number(claim.min_samples_required) || MIN_SAMPLES_DEFAULT;
  if (n < min) {
    return {
      ok: false,
      allowed: false,
      reason: 'INSUFFICIENT_MEASURED_HISTORY',
      downgraded_to: 'INSUFFICIENT_MEASURED_HISTORY',
      message: `Need ≥${min} samples; have ${n}.`,
    };
  }
  return {
    ok: true,
    allowed: true,
    reason: null,
    claim: {
      ...claim,
      measurement_source: 'clock',
      grade: n >= 20 ? 'KNOW' : n >= 5 ? 'THINK' : 'THINK',
    },
  };
}

/**
 * Harden a build-economics estimateSegments result for founder-facing use.
 * Cold-start / seed-estimate segments are stripped; if nothing remains → fail closed.
 */
export function enforceMeasuredEconomicsEstimate(estimate = {}) {
  const per = Array.isArray(estimate.perSegment) ? estimate.perSegment : [];
  const measured = per.filter((s) => s.source && s.source !== 'cold-start');
  const cold = per.filter((s) => s.source === 'cold-start');

  if (estimate.confidence === 'seed-estimate' || (per.length > 0 && measured.length === 0)) {
    return {
      ok: false,
      allowed: false,
      reason: 'INSUFFICIENT_MEASURED_HISTORY',
      measurement_source: 'clock',
      estimated_ms: null,
      estimated_minutes: null,
      estimated_usd: null,
      sample_hint: estimate.historyBackedSegments || 0,
      cold_start_segments_rejected: cold.length,
      message:
        'No measured build_economics history for these segments. '
        + 'Refusing seed/cold-start ETA. Run real builds so averages exist, then ask again.',
    };
  }

  if (cold.length > 0) {
    const usd = measured.reduce((s, x) => s + (Number(x.estimatedUsd) || 0), 0);
    const minutes = measured.reduce((s, x) => s + (Number(x.estimatedMinutes) || 0), 0);
    return {
      ok: true,
      allowed: true,
      partial: true,
      reason: 'PARTIAL_MEASURED_ONLY',
      measurement_source: 'build_economics',
      estimated_usd: Number(usd.toFixed(4)),
      estimated_minutes: Number(minutes.toFixed(1)),
      estimated_ms: Math.round(minutes * 60000),
      history_backed_segments: measured.length,
      cold_start_segments_rejected: cold.length,
      perSegment: measured,
      message:
        `ETA covers ${measured.length} history-backed segment(s) only; `
        + `${cold.length} cold-start segment(s) excluded (no measured average yet).`,
    };
  }

  return {
    ok: true,
    allowed: true,
    partial: false,
    reason: null,
    measurement_source: 'build_economics',
    estimated_usd: estimate.estimatedUsd,
    estimated_minutes: estimate.estimatedMinutes,
    estimated_ms: Math.round((Number(estimate.estimatedMinutes) || 0) * 60000),
    confidence: estimate.confidence,
    history_backed_segments: estimate.historyBackedSegments,
    cold_start_segments_rejected: 0,
    perSegment: measured,
    sample_count: estimate.historyBackedSegments,
    min_samples_required: 1,
  };
}

/** Bundle: clock + measured averages the founder can ask for. */
export function buildDurationTruthSnapshot(opts = {}) {
  const root = opts.root || ROOT;
  const clock = getSystemClock(opts.now);
  const blueprint = estimateFromMeasuredHistory(OPERATION_CLASSES.BLUEPRINT_FOUNDATION, {
    root,
    minSamples: opts.minSamples ?? 1,
  });
  const installStep = estimateFromMeasuredHistory(OPERATION_CLASSES.INSTALL_STEP, {
    root,
    minSamples: opts.minSamples ?? MIN_SAMPLES_DEFAULT,
  });
  const installN = Number.isFinite(Number(opts.stepCount)) && Number(opts.stepCount) > 0
    ? estimateFromMeasuredHistory(OPERATION_CLASSES.INSTALL_STEP, {
      root,
      stepCount: Number(opts.stepCount),
      minSamples: opts.minSamples ?? MIN_SAMPLES_DEFAULT,
    })
    : null;

  return {
    schema: 'duration_truth_v1',
    clock,
    averages: {
      blueprint_foundation: blueprint,
      install_step: installStep,
      install_n_steps: installN,
    },
    law: {
      founder_facing_eta: 'measured_averages_only',
      ai_guess_eta: 'forbidden',
      cold_start_seed: 'forbidden_for_founder_claims',
      insufficient_history: 'say_INSUFFICIENT_MEASURED_HISTORY',
    },
  };
}
