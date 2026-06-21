#!/usr/bin/env node
/**
 * SYNOPSIS: Mission spend snapshot — Railway production telemetry (honest estimates).
 * Mission spend snapshot — Railway production telemetry (honest estimates).
 * Splits raw tokens into buckets so 720h idle churn ≠ value.
 * Writes builderos-reboot/MISSION_SPEND_SNAPSHOT.json
 *
 * @ssot builderos-reboot/SNT_TELEMETRY_DOCTRINE.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const base = (
  process.env.PUBLIC_BASE_URL ||
  process.env.BUILDER_BASE_URL ||
  'https://robust-magic-production.up.railway.app'
).replace(/\/$/, '');
const key =
  process.env.COMMAND_CENTER_KEY ||
  process.env.COMMAND_KEY ||
  process.env.LIFEOS_KEY ||
  '';

/** First-priority free-tier routing — not "only free", but default when appropriate. */
const FREE_TIER_MODELS = new Set(['gemini_flash', 'groq_llama']);

const IDLE_CHURN_PATTERNS = [
  'verify-gap',
  'verify-oc',
  'verify-runner-telemetry',
  'queue_idle',
  'preflight',
];

async function getJson(endpoint) {
  const res = await fetch(`${base}${endpoint}`, {
    headers: { accept: 'application/json', ...(key ? { 'x-command-key': key } : {}) },
  });
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, json: JSON.parse(text) };
  } catch {
    return { ok: false, status: res.status, json: null, text: text.slice(0, 300) };
  }
}

function estimateUsd(tokens, model = 'gemini_flash') {
  if (!tokens) return { usd: 0, method: 'zero_tokens' };
  if (FREE_TIER_MODELS.has(model)) {
    return { usd: 0, method: `free_tier_first_priority:${model} (marginal cash ~$0)` };
  }
  const rates = { deepseek: 0.00000014, claude_sonnet: 0.000003 };
  const rate = rates[model] ?? 0.0000001;
  return {
    usd: Math.round(tokens * rate * 10000) / 10000,
    method: `GUESS: paid ${model} @ $${rate}/token on char/4 estimates`,
  };
}

function classifyEvent(event) {
  const goal = String(event.task_goal || '').toLowerCase();
  const useful = Number(event.useful_work_score ?? 0);
  const tokens = Number(event.total_token_estimate || 0);
  const model = event.model_used || 'unknown';
  const isIdlePattern = IDLE_CHURN_PATTERNS.some((p) => goal.includes(p));
  const isLowUseful = useful > 0 && useful < 0.35;
  const isUseful = useful >= 0.5 && (event.success === true || event.audit_result === 'committed');

  if (isIdlePattern || isLowUseful || (tokens > 0 && useful === 0 && !event.success)) {
    return 'idle_churn_tokens';
  }
  if (isUseful) return 'mission_attributed_useful_tokens';
  if (!FREE_TIER_MODELS.has(model) && tokens > 0) return 'paid_railway_tokens';
  return 'unclassified_railway_tokens';
}

const MISSION_KEYWORDS = {
  'FACTORY-DELIBERATION-SENTRY-REGRESSION-0001': [
    'sentry-regression', 'regression-0001', 'run-sentry-bp', 'sentry bp audit', 'deliberation-sentry-regression',
  ],
  'FACTORY-DELIBERATION-V27-0001': [
    'deliberation-v27', 'deliberation v2.7', 'deliberation-governance', 'deliberation-snt-live',
  ],
  PLATFORM_BUILDEROS_ALPHA: [
    'builder-safe', 'safe-scope', 'builderos-reboot', 'tier1', 'telemetry doctrine',
  ],
};

function matchesMission(event, keywords) {
  const blob = JSON.stringify(event).toLowerCase();
  return keywords.some((k) => blob.includes(k.toLowerCase()));
}

const sinceHours = Number(process.env.SPEND_SINCE_HOURS || 720);

const [metricsRes, effRes, eventsRes] = await Promise.all([
  getJson(`/api/v1/lifeos/autonomous-telemetry/metrics?since_hours=${sinceHours}`),
  getJson(`/api/v1/lifeos/autonomous-telemetry/efficiency?since_hours=${sinceHours}`),
  getJson(`/api/v1/lifeos/autonomous-telemetry/events?limit=200&since_hours=${sinceHours}`),
]);

const platform = {
  since_hours: sinceHours,
  source: base,
  metrics: metricsRes.json?.metrics ?? null,
  efficiency_summary: effRes.json?.by_task_type?.find((t) => t.task_type === 'builder.build') ?? null,
  by_model: effRes.json?.by_model ?? [],
  data_quality: metricsRes.ok ? 'KNOW: Railway API' : `DON'T KNOW: metrics HTTP ${metricsRes.status}`,
};

const events = eventsRes.json?.events ?? [];

const spendBuckets = {
  idle_churn_tokens: 0,
  mission_attributed_useful_tokens: 0,
  paid_railway_tokens: 0,
  unclassified_railway_tokens: 0,
  unknown_external_tokens: null,
  note: 'Sample-based split from last 200 events; platform total is NOT split without full DB query',
};

for (const e of events) {
  const bucket = classifyEvent(e);
  spendBuckets[bucket] = (spendBuckets[bucket] || 0) + Number(e.total_token_estimate || 0);
}

spendBuckets.unknown_external_tokens = {
  cursor_conductor: 'NOT IN TELEMETRY',
  claude_openai_direct: 'NOT IN TELEMETRY',
  human_supervision_hours: 'NOT IN TELEMETRY',
  opportunity_cost: 'NOT IN TELEMETRY',
};

const missionAttribution = {};
for (const [missionId, keywords] of Object.entries(MISSION_KEYWORDS)) {
  const hits = events.filter((e) => matchesMission(e, keywords));
  let tokens = 0;
  let usefulTokens = 0;
  const byModel = {};
  for (const e of hits) {
    const t = Number(e.total_token_estimate || 0);
    tokens += t;
    if (classifyEvent(e) === 'mission_attributed_useful_tokens') usefulTokens += t;
    const m = e.model_used || 'unknown';
    byModel[m] = (byModel[m] || 0) + t;
  }
  const primaryModel = Object.entries(byModel).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'gemini_flash';
  missionAttribution[missionId] = {
    events_in_sample: hits.length,
    token_estimate_sum: tokens,
    useful_token_estimate_sum: usefulTokens,
    cost_estimate: estimateUsd(tokens, primaryModel),
    note: 'Sample = last 200 events; undercounts full mission history',
    successes: hits.filter((e) => e.success).length,
    failures: hits.filter((e) => !e.success).length,
  };
}

const platformTotal = platform.metrics?.total_token_estimate_sum ?? null;

const snapshot = {
  generated_at: new Date().toISOString(),
  classification: {
    platform_totals: 'KNOW: Railway 720h aggregate — mostly historical idle/autonomous churn, NOT founder-value proof',
    spend_buckets: 'GUESS: proportional split from 200-event sample only',
    mission_attribution: 'GUESS: keyword match on same sample',
  },
  free_tier_policy: 'Free-tier models first priority daily for appropriate tasks; paid when task class requires',
  platform_window: platform,
  spend_buckets: {
    ...spendBuckets,
    platform_total_token_est_720h: platformTotal,
    warning: 'Do NOT treat platform_total as learning ROI — use useful + mission buckets',
  },
  mission_attribution_sample: missionAttribution,
  nine_questions_Q8_unknowns: [
    'Cursor / Conductor usage',
    'Claude / OpenAI outside BuilderOS',
    'Human supervision time',
    'Opportunity cost',
    'Full idle vs useful split (needs DB query, not 200-event cap)',
  ],
  founder_summary: {
    platform_builder_token_est_720h: platformTotal,
    platform_builder_events_720h: platform.efficiency_summary?.count ?? null,
    sample_idle_churn_tokens: spendBuckets.idle_churn_tokens,
    sample_useful_tokens: spendBuckets.mission_attributed_useful_tokens,
    sample_paid_railway_tokens: spendBuckets.paid_railway_tokens,
    primary_model: platform.by_model?.[0]?.model_used ?? 'gemini_flash',
  },
};

const out = path.join(ROOT, 'builderos-reboot/MISSION_SPEND_SNAPSHOT.json');
fs.writeFileSync(out, `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(JSON.stringify(snapshot, null, 2));
console.error(`\nWrote ${out}`);
