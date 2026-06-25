#!/usr/bin/env node
/**
 * SYNOPSIS: Verify conversation never misroutes to display — structural + optional live T4.
 * Usage: node scripts/verify-lumin-conversation-routing.mjs [--live]
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import 'dotenv/config';
import dotenv from 'dotenv';
dotenv.config({ path: new URL('../.env.local', import.meta.url).pathname, override: true });

import { auditLuminConversationRoutingWiring } from '../services/lumin-conversation-routing.js';

const live = process.argv.includes('--live');
const wiring = auditLuminConversationRoutingWiring();

const report = {
  schema: 'lumin_conversation_routing_verify_v1',
  generated_at: new Date().toISOString(),
  wiring,
  live_t4: null,
  ok: wiring.ok,
};

if (live) {
  const BASE = (process.env.PUBLIC_BASE_URL || 'https://robust-magic-production.up.railway.app').replace(/\/$/, '');
  const KEY = process.env.COMMAND_CENTER_KEY || process.env.LIFEOS_KEY || '';
  const text = 'should I get an oil change this week?';
  if (!KEY) {
    report.live_t4 = { ok: false, error: 'COMMAND_CENTER_KEY missing' };
    report.ok = false;
  } else {
    const res = await fetch(`${BASE}/api/v1/lifeos/builderos/command-control/founder-interface/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-command-key': KEY },
      body: JSON.stringify({ text, action: 'auto', conversational_mode: true }),
    });
    const json = await res.json().catch(() => ({}));
    const summary = String(json.human_summary || json.human_summary_technical || '').toLowerCase();
    report.live_t4 = {
      http: res.status,
      chair_channel: json.chair_channel,
      command_truth: json.command_truth,
      not_display: json.chair_channel !== 'display',
      not_queue_theater: !summary.includes('rendered queue display'),
      summary_head: summary.slice(0, 200),
    };
    report.live_t4.ok = res.status === 200
      && json.chair_channel === 'chair'
      && json.command_truth === 'NO_COMMAND_RAN';
    report.ok = report.ok && report.live_t4.ok;
  }
}

console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);
