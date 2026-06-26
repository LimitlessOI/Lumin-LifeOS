#!/usr/bin/env node
/**
 * SYNOPSIS: Founder chat alpha — build must build, questions must answer, search when unknown.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectCounselTheater } from '../services/chair-direct-connection-truth.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = (process.env.PUBLIC_BASE_URL || process.env.LIFERE_ALPHA_BASE_URL || '').replace(/\/$/, '');
const KEY = process.env.COMMAND_CENTER_KEY || process.env.LIFEOS_KEY || '';
const ENDPOINT = '/api/v1/lifeos/builderos/command-control/founder-interface/message';
const POLL_MS = 5000;
const POLL_MAX = 90;

const report = {
  schema: 'founder_chat_alpha_battery_v1',
  at: new Date().toISOString(),
  base: BASE,
  ok: false,
  passed: [],
  failed: [],
  results: {},
};

function fail(id, detail) {
  report.failed.push(id);
  report[`fail_${id}`] = detail;
}

async function pollBuildJob(jobId, pollUrl) {
  const url = pollUrl?.startsWith('http') ? pollUrl : `${BASE}${pollUrl || `/api/v1/lifeos/builderos/command-control/founder-interface/build-job/${jobId}`}`;
  for (let i = 0; i < POLL_MAX; i += 1) {
    await new Promise((r) => setTimeout(r, POLL_MS));
    const res = await fetch(url, { headers: KEY ? { 'x-command-key': KEY } : {} });
    const json = await res.json().catch(() => ({}));
    const pf = json.pass_fail || json.result?.pass_fail;
    if (pf === 'PASS' || pf === 'FAIL') return { json, pf };
  }
  return { json: { pass_fail: 'TIMEOUT' }, pf: 'TIMEOUT' };
}

async function send(id, text, opts = {}) {
  const res = await fetch(`${BASE}${ENDPOINT}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(KEY ? { 'x-command-key': KEY } : {}),
    },
    body: JSON.stringify({
      text,
      action: 'auto',
      conversational_mode: true,
      alpha_probe: true,
      ui_context: opts.ui_context || { surface: 'lifeos-app' },
      conversation_history: opts.history || [],
    }),
  });
  const json = await res.json().catch(() => ({}));
  const summary = String(json.human_summary || json.human_summary_technical || json.summary || '');
  report.results[id] = {
    http: res.status,
    channel: json.chair_channel,
    truth: json.command_truth,
    pass_fail: json.pass_fail,
    action: json.action || json.action_type,
    job_id: json.job_id,
    summary_head: summary.slice(0, 220),
    has_verified_search: Boolean(json.chair_native_facts?.verified_search || summary.includes('search')),
    has_system_knowledge: Boolean(json.chair_native_facts?.system_knowledge),
    program_context: json.chair_native_facts?.program_context || null,
  };
  return { res, json, summary };
}

const PROBES = [
  {
    id: 'B1_do_build',
    text: 'do: add HTML comment <!-- founder-chat-alpha-probe --> as first line inside <body> in public/overlay/lifeos-app.html',
    expectTruth: 'BUILD_ATTEMPTED',
    expectChannel: 'build_async',
    poll: true,
    requirePass: true,
  },
  {
    id: 'B2_nl_ui_rounded',
    text: 'make the send button in the lumin drawer slightly more rounded',
    expectTruth: 'BUILD_ATTEMPTED',
    expectChannel: 'build_async',
    poll: true,
    allowAlreadyPresent: true,
    allowBuildStarted: true,
  },
  {
    id: 'B3_nl_css_yellow',
    text: 'make the assistant chat bubbles a bit fainter yellow',
    expectTruth: 'BUILD_ATTEMPTED',
    expectChannel: 'build_async',
    poll: true,
    allowAlreadyPresent: true,
  },
  {
    id: 'Q1_counsel_no_clarify',
    text: 'should I prioritize follow-ups or prospecting today?',
    expectChannel: 'chair',
    expectTruth: 'NO_COMMAND_RAN',
    forbidClarify: true,
    forbidTheater: true,
  },
  {
    id: 'Q2_smos_workflow_question',
    text: 'what does our Social Media OS workflow look like for relocation content?',
    expectChannel: 'chair',
    expectTruth: 'NO_COMMAND_RAN',
    forbidClarify: true,
    requireSystemKnowledge: true,
    summaryMustInclude: [/brief|coach|record|publish|content_brief/i],
    summaryMustNotInclude: ['5-video package', 'you want'],
  },
  {
    id: 'Q2b_smos_steps',
    text: 'walk me through our SMOS process step by step',
    expectChannel: 'chair',
    expectTruth: 'NO_COMMAND_RAN',
    forbidClarify: true,
    requireSystemKnowledge: true,
    summaryMustInclude: [/coach|brief|record|post|publish/i],
  },
  {
    id: 'Q_chair_builder',
    text: 'explain how you as Lumin the chair implement a lifeos-app change through BuilderOS — counsel only, do not run a build',
    expectChannel: 'chair',
    expectTruth: 'NO_COMMAND_RAN',
    summaryMustInclude: [/build|builder|build_async|do:/i],
  },
  {
    id: 'Q3_factual_search',
    text: 'what is the current federal funds rate?',
    expectChannel: 'chair',
    expectTruth: 'NO_COMMAND_RAN',
    forbidClarify: true,
    requireAnswerLike: true,
  },
  {
    id: 'Q4_connection_truth',
    text: 'are you connected to the LifeOS system APIs right now?',
    expectChannel: 'chair',
    expectTruth: 'NO_COMMAND_RAN',
    summaryMustNotInclude: ['not connected to the real system', 'I am not connected'],
  },
];

if (!BASE || !KEY) {
  console.error('PUBLIC_BASE_URL and COMMAND_CENTER_KEY required');
  process.exit(1);
}

for (const probe of PROBES) {
  try {
    const { res, json, summary } = await send(probe.id, probe.text, probe);
    if (res.status !== 200 && res.status !== 202) {
      fail(probe.id, `HTTP ${res.status}`);
      continue;
    }
    if (probe.expectChannel && json.chair_channel !== probe.expectChannel) {
      fail(probe.id, `channel ${json.chair_channel} !== ${probe.expectChannel}`);
      continue;
    }
    if (probe.expectTruth && json.command_truth !== probe.expectTruth) {
      fail(probe.id, `truth ${json.command_truth} !== ${probe.expectTruth}`);
      continue;
    }
    if (probe.forbidClarify && (json.pass_fail === 'CLARIFY' || json.chair_channel === 'intent_clarify')) {
      fail(probe.id, 'got CLARIFY on question');
      continue;
    }
    if (probe.forbidTheater) {
      const theater = detectCounselTheater(summary, json.command_truth);
      if (theater.violation) {
        fail(probe.id, `theater: ${theater.hits.join('; ')}`);
        continue;
      }
    }
    if (probe.requireSystemKnowledge && !report.results[probe.id].has_system_knowledge) {
      fail(probe.id, 'missing system_knowledge in chair_native_facts');
      continue;
    }
    if (probe.summaryMustInclude?.length) {
      const ok = probe.summaryMustInclude.some((p) => {
        const re = p instanceof RegExp ? p : new RegExp(p, 'i');
        return re.test(summary);
      });
      if (!ok) {
        fail(probe.id, `missing required answer content: ${summary.slice(0, 120)}`);
        continue;
      }
    }
    if (probe.summaryMustNotInclude?.some((p) => {
      const re = p instanceof RegExp ? p : new RegExp(p, 'i');
      return re.test(summary);
    })) {
      fail(probe.id, 'forbidden summary pattern');
      continue;
    }
    if (probe.requireAnswerLike) {
      const lower = summary.toLowerCase();
      const looksLikeAnswer = lower.length > 40
        && !lower.startsWith('🔍 clarify')
        && (lower.includes('rate') || lower.includes('%') || lower.includes('search') || lower.includes('fed'));
      if (!looksLikeAnswer) {
        fail(probe.id, `no answer-like content: ${summary.slice(0, 120)}`);
        continue;
      }
    }
    if (probe.poll && json.job_id) {
      const polled = await pollBuildJob(json.job_id, json.poll_url);
      report.results[probe.id].final_pass_fail = polled.pf;
      if (polled.pf === 'TIMEOUT') {
        if (probe.allowBuildStarted && json.job_id) {
          report.passed.push(probe.id);
          continue;
        }
        fail(probe.id, 'build timeout');
        continue;
      }
      if (probe.requirePass && polled.pf !== 'PASS') {
        fail(probe.id, `final ${polled.pf}: ${polled.json.first_blocker || ''}`);
        continue;
      }
      if (polled.pf === 'FAIL') {
        const already = /already|no change|already_present/i.test(String(polled.json.human_summary || polled.json.first_blocker || ''));
        if (!(probe.allowAlreadyPresent && already)) {
          fail(probe.id, `final FAIL: ${polled.json.first_blocker || 'unknown'}`);
          continue;
        }
      }
    }
    report.passed.push(probe.id);
  } catch (err) {
    fail(probe.id, err.message);
  }
}

report.ok = report.failed.length === 0;
const out = path.join(ROOT, 'products/receipts/FOUNDER_CHAT_ALPHA_BATTERY.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);

console.log(JSON.stringify({
  ok: report.ok,
  passed: report.passed.length,
  failed: report.failed.length,
  failures: report.failed,
}, null, 2));
process.exit(report.ok ? 0 : 1);
