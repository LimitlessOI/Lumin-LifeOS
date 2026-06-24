#!/usr/bin/env node
/**
 * SYNOPSIS: Live builder gap failure-family report (classifier-enriched).
 * Usage: node scripts/builderos-gap-families.mjs [--limit=50] [--domain=]
 * @ssot services/builderos-gap-classifier.js
 */
import 'dotenv/config';
import { classifyBuilderGap, summarizeGapFamilies } from '../services/builderos-gap-classifier.js';

const args = process.argv.slice(2);
let limit = 50;
let domain = '';
for (const arg of args) {
  if (arg.startsWith('--limit=')) limit = Math.min(100, parseInt(arg.split('=')[1], 10) || 50);
  if (arg.startsWith('--domain=')) domain = arg.split('=')[1] || '';
}

function resolveBaseUrl() {
  return (process.env.PUBLIC_BASE_URL || process.env.BUILDER_BASE_URL || '').replace(/\/$/, '');
}

function resolveCommandKey() {
  return process.env.COMMAND_CENTER_KEY || process.env.LIFEOS_KEY || process.env.API_KEY || '';
}

const baseUrl = resolveBaseUrl();
const commandKey = resolveCommandKey();
if (!baseUrl || !commandKey) {
  console.error(JSON.stringify({ ok: false, error: 'PUBLIC_BASE_URL or COMMAND_CENTER_KEY missing' }, null, 2));
  process.exit(1);
}

const qs = new URLSearchParams({ limit: String(limit) });
if (domain) qs.set('domain', domain);

const res = await fetch(`${baseUrl}/api/v1/lifeos/builder/gaps?${qs}`, {
  headers: { 'x-command-key': commandKey },
});
const json = await res.json().catch(() => ({}));
const rows = (json.gaps || []).map((row) => ({
  ...row,
  ...(row.failure_family && row.failure_family !== 'other' ? {} : classifyBuilderGap(row)),
}));
const stats = json.gap_families || summarizeGapFamilies(rows);

const report = {
  schema: 'builderos_gap_families_v1',
  generated_at: new Date().toISOString(),
  http_ok: res.ok,
  count: json.count ?? rows.length,
  stats,
  max_other_pct: Number(process.env.BUILDEROS_MAX_GAP_OTHER_PCT || 25),
  other_ok: stats.otherPct <= Number(process.env.BUILDEROS_MAX_GAP_OTHER_PCT || 25),
  sample: rows.slice(0, 8).map((r) => ({
    id: r.id,
    failure_family: r.failure_family,
    failure_stage: r.failure_stage,
    failure_reason: String(r.failure_reason || '').slice(0, 120),
  })),
};

console.log(JSON.stringify(report, null, 2));
process.exit(report.other_ok && res.ok ? 0 : 1);
