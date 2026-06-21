/**
 * SYNOPSIS: Exports readTsosMetrics — lumin-factory/missions/FACTORY-REBOOT-0029/CONTENT/tsos-summary.js.
 */
import fs from 'node:fs';
import { getTsosMetricsPath } from './record-step-metrics.js';

export function readTsosMetrics(limit = 100) {
  const p = getTsosMetricsPath();
  if (!fs.existsSync(p)) {
    return { count: 0, records: [] };
  }
  const lines = fs.readFileSync(p, 'utf8').trim().split('\n').filter(Boolean);
  const records = lines.slice(-limit).map((line) => JSON.parse(line));
  return { count: records.length, records };
}

export function summarizeTsosMetrics() {
  const { records } = readTsosMetrics(500);
  let totalTokens = 0;
  let totalLatency = 0;
  let wasteCount = 0;
  const byMission = {};

  for (const r of records) {
    totalTokens += Number(r.token_cost) || 0;
    totalLatency += Number(r.latency_ms) || 0;
    if (r.waste) wasteCount++;
    const m = r.mission_id || 'unknown';
    byMission[m] = (byMission[m] || 0) + 1;
  }

  return {
    total_records: records.length,
    total_token_cost: totalTokens,
    total_latency_ms: totalLatency,
    waste_events: wasteCount,
    by_mission: byMission,
    last: records[records.length - 1] || null,
    authority_note: 'TSOS measures efficiency only — not truth or readiness',
  };
}
