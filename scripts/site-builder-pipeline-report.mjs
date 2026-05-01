#!/usr/bin/env node
/**
 * @ssot docs/projects/AMENDMENT_05_SITE_BUILDER.md
 * Pipeline analytics report — fetches live data from Railway and prints a
 * formatted performance summary.
 *
 * Usage:
 *   node scripts/site-builder-pipeline-report.mjs [--json]
 *   npm run site-builder:report
 *
 * --json: output raw API JSON instead of formatted report (for piping to jq)
 */

import 'dotenv/config';

const BASE = process.env.PUBLIC_BASE_URL;
const KEY = process.env.COMMAND_CENTER_KEY;

if (!BASE || !KEY) {
  console.error('Missing PUBLIC_BASE_URL or COMMAND_CENTER_KEY in env');
  process.exit(1);
}

const HEADERS = { 'x-command-key': KEY, 'Content-Type': 'application/json' };

async function apiFetch(path) {
  const res = await fetch(`${BASE}${path}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`${path} returned ${res.status}`);
  return res.json();
}

function pct(num, denom) {
  if (!denom || denom === 0) return '—';
  return ((num / denom) * 100).toFixed(1) + '%';
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
}

async function main() {
  const [dashData, prospectsData] = await Promise.all([
    apiFetch('/api/v1/sites/dashboard'),
    apiFetch('/api/v1/sites/prospects?limit=50'),
  ]);

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ dashboard: dashData, prospects: prospectsData }, null, 2));
    return;
  }

  // Dashboard returns { ok, pipeline: { total, built, qa_hold, sent, viewed, replied, converted, total_revenue } }
  const s = dashData.pipeline || dashData;
  const total     = Number(s.total     ?? 0);
  const built     = Number(s.built     ?? 0);
  const qaHold    = Number(s.qa_hold   ?? 0);
  const sent      = Number(s.sent      ?? 0);
  const viewed    = Number(s.viewed    ?? 0);
  const replied   = Number(s.replied   ?? 0);
  const converted = Number(s.converted ?? 0);
  const revenue   = Number(s.total_revenue ?? 0);

  // Prospects returns { ok, count, prospects: [...] }
  const prospects = Array.isArray(prospectsData) ? prospectsData
    : Array.isArray(prospectsData?.prospects) ? prospectsData.prospects : [];

  const BOLD  = '\x1b[1m';
  const DIM   = '\x1b[2m';
  const GREEN = '\x1b[32m';
  const CYAN  = '\x1b[36m';
  const YELLOW= '\x1b[33m';
  const RED   = '\x1b[31m';
  const RESET = '\x1b[0m';

  console.log(`\n${BOLD}Site Builder Pipeline Report${RESET}  ${DIM}${new Date().toLocaleString()}${RESET}`);
  console.log('─'.repeat(60));

  // Funnel
  console.log(`\n${BOLD}Pipeline Funnel${RESET}`);
  const funnel = [
    ['Total prospects',  total,     ''],
    ['Built',           built,     ''],
    ['QA Hold',         qaHold,    YELLOW],
    ['Sent',            sent,      CYAN],
    ['Viewed',          viewed,    GREEN],
    ['Replied',         replied,   GREEN],
    ['Converted',       converted, GREEN],
  ];
  for (const [label, count, color] of funnel) {
    const bar = '█'.repeat(Math.min(30, total > 0 ? Math.round((count / total) * 30) : 0));
    console.log(`  ${label.padEnd(18)} ${(color + String(count).padStart(4) + RESET)} ${DIM}${bar}${RESET}`);
  }

  // Conversion rates
  console.log(`\n${BOLD}Conversion Rates${RESET}`);
  console.log(`  Open rate      ${pct(viewed, sent).padStart(6)}   (viewed / sent)`);
  console.log(`  Reply rate     ${pct(replied, sent).padStart(6)}   (replied / sent)`);
  console.log(`  Close rate     ${pct(converted, sent).padStart(6)}   (converted / sent)`);
  console.log(`  Revenue        $${revenue.toLocaleString()}`);

  // Warm leads (viewed or replied — follow up now)
  const warm = prospects.filter(p => p.status === 'viewed' || p.status === 'replied');
  if (warm.length) {
    console.log(`\n${BOLD}${GREEN}Warm Leads — Follow Up Now (${warm.length})${RESET}`);
    for (const p of warm) {
      const badge = p.status === 'replied' ? `${GREEN}★ REPLIED${RESET}` : `${CYAN}viewed${RESET}`;
      console.log(`  ${badge}  ${(p.business_name || '—').padEnd(28)} ${p.contact_email || '—'}`);
    }
  } else {
    console.log(`\n${DIM}No warm leads yet (viewed/replied)${RESET}`);
  }

  // Recent prospects
  console.log(`\n${BOLD}Recent 10 Prospects${RESET}`);
  const recent = prospects.slice(0, 10);
  if (!recent.length) {
    console.log(`  ${DIM}No prospects yet${RESET}`);
  } else {
    for (const p of recent) {
      const statusColor = {
        converted: GREEN, replied: GREEN, viewed: CYAN,
        sent: '', built: DIM, qa_hold: YELLOW, lost: RED, expired: DIM,
      }[p.status] || '';
      console.log(
        `  ${formatDate(p.created_at).padEnd(10)} ` +
        `${(p.business_name || '—').substring(0, 28).padEnd(28)} ` +
        `${statusColor}${(p.status || 'built').padEnd(10)}${RESET}` +
        `${DIM}${p.contact_email || '—'}${RESET}`
      );
    }
  }

  console.log('\n' + '─'.repeat(60));
  if (converted === 0 && sent > 0) {
    console.log(`${YELLOW}Next action:${RESET} Follow up with ${warm.length} warm lead(s). Run day-3/7 follow-up cron.`);
  } else if (sent === 0) {
    console.log(`${YELLOW}Next action:${RESET} Set POSTMARK_SERVER_TOKEN + EMAIL_FROM + SITE_BASE_URL in Railway, then run POST /api/v1/sites/prospect.`);
  } else {
    console.log(`${GREEN}Revenue:${RESET} $${revenue.toLocaleString()} from ${converted} converted prospect(s).`);
  }
  console.log('');
}

main().catch(err => {
  console.error('Report failed:', err.message);
  process.exit(1);
});
