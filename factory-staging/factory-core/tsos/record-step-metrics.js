/**
 * SYNOPSIS: Pure transform — no persistence. For tests and full-loop proof.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sanitizeTsosMetricsEntry, validateTsosMetricsEntry } from './tsos-guardrails.js';

const FACTORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const METRICS_PATH = path.join(FACTORY_ROOT, 'data/tsos-step-metrics.jsonl');

/**
 * Pure transform — no persistence. For tests and full-loop proof.
 */
export function recordStepMetrics(entry) {
  const validation = validateTsosMetricsEntry(entry);
  if (!validation.ok) {
    return {
      ok: false,
      status: 'TSOS_GUARDRAIL_VIOLATION',
      violations: validation.violations,
    };
  }

  const sanitized = sanitizeTsosMetricsEntry({
    ...entry,
    recorded_at: entry.recorded_at || new Date().toISOString(),
  });

  return {
    ok: true,
    status: 'RECORDED',
    metrics: {
      step_id: sanitized.step_id,
      token_cost: sanitized.token_cost ?? 0,
      latency_ms: sanitized.latency_ms ?? 0,
      retries: sanitized.retries ?? 0,
      waste: sanitized.waste ?? false,
      mission_id: sanitized.mission_id,
      blueprint_id: sanitized.blueprint_id,
    },
  };
}

/**
 * Validate, sanitize, append append-only JSONL. Fail-closed on guardrail violation.
 */
export function appendStepMetrics(entry) {
  const result = recordStepMetrics(entry);
  if (!result.ok) {
    return result;
  }

  fs.mkdirSync(path.dirname(METRICS_PATH), { recursive: true });
  const line = `${JSON.stringify(sanitizeTsosMetricsEntry({
    ...entry,
    recorded_at: new Date().toISOString(),
  }))}\n`;
  fs.appendFileSync(METRICS_PATH, line, 'utf8');

  return {
    ...result,
    path: 'factory-staging/data/tsos-step-metrics.jsonl',
  };
}

export function getTsosMetricsPath() {
  return METRICS_PATH;
}
