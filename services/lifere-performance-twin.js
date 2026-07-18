/**
 * SYNOPSIS: LifeRE Performance Twin — funnel math, bottleneck, goal reverse calculator.
 * @ssot docs/products/lifere/PRODUCT_HOME.md
 */
import { fetchBoldTrailPipeline } from './lifere-boldtrail-bridge.js';

const FUNNEL_STAGES = [
  'conversations',
  'calls',
  'appointments_set',
  'appointments_held',
  'signed_clients',
  'closings',
];

const STAGE_PAIRS = [
  ['conversations', 'calls'],
  ['calls', 'appointments_set'],
  ['appointments_set', 'appointments_held'],
  ['appointments_held', 'signed_clients'],
  ['signed_clients', 'closings'],
];

function sumActivities(rows) {
  const totals = {
    conversations: 0,
    calls: 0,
    texts: 0,
    emails: 0,
    appointments_set: 0,
    appointments_held: 0,
    buyer_consults: 0,
    listing_appointments: 0,
    signed_clients: 0,
    signed_listings: 0,
    offers_written: 0,
    contracts: 0,
    closings: 0,
    commission_gci: 0,
    skill_practice_minutes: 0,
  };
  for (const row of rows) {
    for (const key of Object.keys(totals)) {
      totals[key] += Number(row[key]) || 0;
    }
  }
  return totals;
}

export function computeConversionRates(funnel) {
  const rates = {};
  for (const [from, to] of STAGE_PAIRS) {
    const base = funnel[from] || 0;
    rates[`${from}_to_${to}`] = base >= 1 ? (funnel[to] || 0) / base : 0;
  }
  return rates;
}

export function findBottleneck(rates, funnel, minVolume = 5) {
  let weakest = { stage: 'conversations', rate: 1, recommendation: 'Log more activity to detect bottleneck.' };
  for (const [from, to] of STAGE_PAIRS) {
    const key = `${from}_to_${to}`;
    const volume = funnel[from] || 0;
    const rate = rates[key] ?? 0;
    if (volume >= minVolume && rate < weakest.rate) {
      weakest = {
        stage: key,
        rate,
        from,
        to,
        recommendation: `Improve ${from} → ${to} conversion (currently ${(rate * 100).toFixed(1)}%).`,
      };
    }
  }
  return weakest;
}

export function activitiesToGoal({ rates, goalGci = 30000, avgCommission = 8500 }) {
  const closeRate = rates.signed_clients_to_closings || 0.5;
  const signRate = rates.appointments_held_to_signed_clients || 0.25;
  const heldRate = rates.appointments_set_to_appointments_held || 0.7;
  const apptRate = rates.calls_to_appointments_set || 0.15;
  const callRate = rates.conversations_to_calls || 0.6;

  const closingsNeeded = Math.ceil(goalGci / avgCommission);
  let signed = closeRate > 0 ? Math.ceil(closingsNeeded / closeRate) : closingsNeeded * 2;
  let held = signRate > 0 ? Math.ceil(signed / signRate) : signed * 4;
  let appts = heldRate > 0 ? Math.ceil(held / heldRate) : held * 2;
  let calls = apptRate > 0 ? Math.ceil(appts / apptRate) : appts * 5;
  let conversations = callRate > 0 ? Math.ceil(calls / callRate) : calls * 2;

  return {
    goal_gci: goalGci,
    avg_commission: avgCommission,
    closings_needed: closingsNeeded,
    signed_clients_needed: signed,
    appointments_held_needed: held,
    appointments_set_needed: appts,
    calls_needed: calls,
    conversations_needed: conversations,
    label: 'THINK',
  };
}

export function skillDeltaImpact({ baselineRate, improvedRate, goalGci = 30000, avgCommission = 8500 }) {
  const base = activitiesToGoal({ rates: { signed_clients_to_closings: 0.5, appointments_held_to_signed_clients: baselineRate, appointments_set_to_appointments_held: 0.7, calls_to_appointments_set: 0.15, conversations_to_calls: 0.6 }, goalGci, avgCommission });
  const improved = activitiesToGoal({ rates: { signed_clients_to_closings: 0.5, appointments_held_to_signed_clients: improvedRate, appointments_set_to_appointments_held: 0.7, calls_to_appointments_set: 0.15, conversations_to_calls: 0.6 }, goalGci, avgCommission });
  return {
    conversations_saved: Math.max(0, base.conversations_needed - improved.conversations_needed),
    baseline_rate: baselineRate,
    improved_rate: improvedRate,
    label: 'THINK',
  };
}

export function recommendNextHour({ bottleneck, boldtrailTop3 = [], calendarFreeBlocks = [] }) {
  if (boldtrailTop3?.length) {
    const lead = boldtrailTop3[0];
    return {
      action: 'follow_up_lead',
      reason: `Bottleneck at ${bottleneck.stage}; speed-to-lead on ${lead.name || lead.lead || 'top CRM lead'}.`,
      eta_minutes: 15,
      target: lead,
    };
  }
  if (bottleneck.from === 'conversations' || bottleneck.from === 'calls') {
    return { action: 'prospecting_block', reason: bottleneck.recommendation, eta_minutes: 60 };
  }
  return { action: 'skill_practice', reason: bottleneck.recommendation, eta_minutes: 20 };
}

export function createLifeREPerformanceTwin({ pool = null } = {}) {
  async function fetchActivityRows({ tenantId = 'default', userId, windowDays = 30 }) {
    if (!pool) return [];
    const { rows } = await pool.query(
      `SELECT * FROM lifere_activity_log
       WHERE tenant_id = $1 AND user_id = $2
         AND activity_date >= CURRENT_DATE - ($3::int || ' days')::interval
       ORDER BY activity_date DESC`,
      [tenantId, userId, windowDays]
    );
    return rows;
  }

  async function recordActivity({ tenantId = 'default', userId, date, counts = {} }) {
    if (!pool) {
      return { ok: true, row: { tenant_id: tenantId, user_id: userId, activity_date: date, ...counts }, persisted: false };
    }
    const cols = Object.keys(counts);
    const sets = cols.map((c, i) => `${c} = EXCLUDED.${c}`).join(', ');
    const { rows } = await pool.query(
      `INSERT INTO lifere_activity_log (tenant_id, user_id, activity_date, ${cols.join(', ')})
       VALUES ($1, $2, $3, ${cols.map((_, i) => `$${i + 4}`).join(', ')})
       ON CONFLICT (tenant_id, user_id, activity_date)
       DO UPDATE SET ${sets}
       RETURNING *`,
      [tenantId, userId, date || new Date().toISOString().slice(0, 10), ...cols.map((c) => counts[c])]
    );
    return { ok: true, row: rows[0], persisted: true };
  }

  async function computeFunnel({ tenantId, userId, windowDays = 30 }) {
    const rows = await fetchActivityRows({ tenantId, userId, windowDays });
    return sumActivities(rows);
  }

  async function ingestFromBoldTrail({ tenantId = 'default', userId, date } = {}) {
    const pipeline = await fetchBoldTrailPipeline({ limit: 50 });
    if (!pipeline.ok) {
      return {
        ok: false,
        error: pipeline.reason || 'boldtrail_unavailable',
        persisted: false,
        label: 'THINK',
      };
    }
    const summary = pipeline.summary || {};
    const contacts = pipeline.contacts || [];
    const counts = {
      conversations: Math.max(summary.total || contacts.length, 0),
      calls: Math.max(summary.new || 0, Math.round((summary.total || 0) * 0.4)),
      appointments_set: Math.max(summary.prospect || 0, 0),
      appointments_held: Math.max(summary.active || 0, 0),
      signed_clients: Math.max(summary.client || contacts.filter((c) => c.status_label === 'client').length, 0),
      closings: Math.max(summary.closed || contacts.filter((c) => c.status_label === 'closed').length, 0),
    };
    const recorded = await recordActivity({
      tenantId,
      userId,
      date: date || new Date().toISOString().slice(0, 10),
      counts,
    });
    return {
      ok: true,
      counts,
      boldtrail_summary: summary,
      persisted: recorded.persisted,
      source: 'boldtrail_auto_ingest',
      label: 'THINK',
      note: 'Stage counts mapped heuristically from CRM statuses until activity logging is native.',
    };
  }

  async function buildSnapshot({ tenantId = 'default', userId, windowDays = 30, goalGci = 30000, autoIngest = true } = {}) {
    let ingest = null;
    if (autoIngest) {
      try {
        ingest = await ingestFromBoldTrail({ tenantId, userId });
      } catch {
        ingest = null;
      }
    }
    const funnel = await computeFunnel({ tenantId, userId, windowDays });
    const conversion_rates = computeConversionRates(funnel);
    const bottleneck = findBottleneck(conversion_rates, funnel);
    const goal = activitiesToGoal({ rates: conversion_rates, goalGci });
    const next_hour = recommendNextHour({ bottleneck });

    const snapshot = {
      funnel,
      conversion_rates,
      bottleneck_stage: bottleneck.stage,
      income_goal_monthly: goalGci,
      activities_to_goal: goal,
      next_hour_recommendation: next_hour,
      boldtrail_ingest: ingest,
      label: ingest?.ok ? 'THINK' : 'THINK',
    };

    if (pool) {
      try {
        await pool.query(
          `INSERT INTO lifere_performance_snapshot
           (tenant_id, user_id, funnel, conversion_rates, bottleneck_stage, income_goal_monthly, activities_to_goal, next_hour_recommendation, label)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [tenantId, userId, funnel, conversion_rates, bottleneck.stage, goalGci, goal, next_hour, 'THINK']
        );
      } catch {
        /* optional */
      }
    }

    return snapshot;
  }

  return {
    recordActivity,
    ingestFromBoldTrail,
    computeFunnel,
    computeConversionRates,
    findBottleneck,
    activitiesToGoal,
    skillDeltaImpact,
    recommendNextHour,
    buildSnapshot,
    FUNNEL_STAGES,
  };
}
