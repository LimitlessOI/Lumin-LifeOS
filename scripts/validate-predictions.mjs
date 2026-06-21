#!/usr/bin/env node
/**
 * SYNOPSIS: S5 Prediction Loop v0 — validator / report script
 * S5 Prediction Loop v0 — validator / report script
 *
 * Scans data/prediction-loop.jsonl and reports:
 *   - total predictions recorded
 *   - total evaluations
 *   - matches vs misses
 *   - miss reason breakdown
 *
 * Warn-only: never exits non-zero due to misses.
 * If no records exist yet, reports 0 and exits 0.
 *
 * @ssot docs/projects/AMENDMENT_36_ZERO_DRIFT_HANDOFF_PROTOCOL.md
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PREDICTION_LOG = path.join(ROOT, 'data/prediction-loop.jsonl');

export async function validatePredictions() {
  let raw;
  try {
    raw = await fs.readFile(PREDICTION_LOG, 'utf8');
  } catch {
    return { exists: false, predictions: 0, evaluations: 0, matches: 0, misses: 0, miss_reasons: {} };
  }

  const lines = raw.split('\n').filter((l) => l.trim());
  let predictions = 0;
  let evaluations = 0;
  let matches = 0;
  let misses = 0;
  const miss_reasons = {};

  for (const line of lines) {
    let obj;
    try { obj = JSON.parse(line); } catch { continue; }
    if (obj.event === 'prediction_recorded') {
      predictions++;
    } else if (obj.event === 'prediction_evaluated') {
      evaluations++;
      if (obj.prediction_match === true) {
        matches++;
      } else {
        misses++;
        const reason = obj.miss_reason || 'unknown';
        miss_reasons[reason] = (miss_reasons[reason] || 0) + 1;
      }
    }
  }

  return { exists: true, predictions, evaluations, matches, misses, miss_reasons };
}

export function formatPredictionReport(report) {
  if (!report.exists) {
    return '[prediction-loop] No prediction records yet — data/prediction-loop.jsonl not found.\n  (warn-only)';
  }
  const matchPct = report.evaluations > 0 ? Math.round((report.matches / report.evaluations) * 100) : 0;
  const lines = [
    '[prediction-loop] S5 Prediction Loop v0 — coverage report',
    '',
    `  Predictions recorded: ${report.predictions}`,
    `  Evaluations:          ${report.evaluations}`,
    `  Matches:              ${report.matches} (${matchPct}%)`,
    `  Misses:               ${report.misses}`,
  ];
  if (Object.keys(report.miss_reasons).length > 0) {
    lines.push('  Miss reasons:');
    for (const [reason, count] of Object.entries(report.miss_reasons)) {
      lines.push(`    ${count}x ${reason}`);
    }
  }
  lines.push('  (warn-only — misses do not block queue execution)');
  return lines.join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const report = await validatePredictions();
  console.log(formatPredictionReport(report));
}
