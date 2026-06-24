#!/usr/bin/env node
/**
 * SYNOPSIS: Lumin Chair direct-connection parity — live API must match execution truth.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectCounselTheater } from '../services/chair-direct-connection-truth.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = (process.env.LIFERE_ALPHA_BASE_URL || process.env.PUBLIC_BASE_URL || 'https://robust-magic-production.up.railway.app').replace(/\/$/, '');
const KEY = process.env.COMMAND_CENTER_KEY || process.env.COMMAND_KEY || process.env.LIFEOS_KEY || '';
const ENDPOINT = '/api/v1/lifeos/builderos/command-control/founder-interface/message';

const TESTS = [
  {
    id: 'T1_open_lifere',
    text: 'open LifeRE',
    expectChannel: 'system_action',
    expectTruth: 'COMMAND_RAN',
    requireShell: true,
  },
  {
    id: 'T2_point_b',
    text: 'what is point b',
    expectChannel: 'system_action',
    expectTruth: 'COMMAND_RAN',
  },
  {
    id: 'T3_alpha_cycle',
    text: 'run alpha cycle',
    expectChannel: 'system_action',
    expectTruth: 'COMMAND_RAN',
  },
  {
    id: 'T4_counsel_no_theater',
    text: 'should I get an oil change this week?',
    expectChannel: 'chair',
    expectTruth: 'NO_COMMAND_RAN',
    forbidTheaterInSummary: true,
    summaryMustInclude: 'Counsel only',
  },
  {
    id: 'T5_do_prefix_build',
    text: 'do: add HTML comment lumin parity test to lifeos-app.html',
    expectChannel: 'build_async',
    allowPassFail: ['RUNNING', 'FAIL', 'PASS'],
  },
];

const report = {
  schema: 'lumin_chair_direct_connection_parity_v1',
  at: new Date().toISOString(),
  base: BASE,
  passed: [],
  failed: [],
  results: {},
};

function fail(id, detail) {
  report.failed.push(id);
  report[`fail_${id}`] = detail;
}

async function postMessage(text) {
  const res = await fetch(`${BASE}${ENDPOINT}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(KEY ? { 'x-command-key': KEY } : {}),
    },
    body: JSON.stringify({ text, action: 'auto', conversational_mode: true }),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

for (const t of TESTS) {
  if (!KEY) {
    fail(t.id, 'COMMAND_CENTER_KEY missing — cannot probe live founder-interface');
    continue;
  }
  try {
    const { status, json } = await postMessage(t.text);
    report.results[t.id] = {
      status,
      chair_channel: json.chair_channel,
      command_truth: json.command_truth,
      pass_fail: json.pass_fail,
      theater_blocked: json.theater_blocked,
      summary_head: String(json.human_summary || '').slice(0, 200),
    };

    if (status !== 200 && status !== 202) {
      fail(t.id, `HTTP ${status}`);
      continue;
    }
    if (t.expectChannel && json.chair_channel !== t.expectChannel) {
      fail(t.id, `channel ${json.chair_channel} !== ${t.expectChannel}`);
      continue;
    }
    if (t.expectTruth && json.command_truth !== t.expectTruth) {
      fail(t.id, `command_truth ${json.command_truth} !== ${t.expectTruth}`);
      continue;
    }
    if (t.expectTruthNot && json.command_truth === t.expectTruthNot) {
      fail(t.id, `command_truth stayed ${t.expectTruthNot} — build did not attempt`);
      continue;
    }
    if (t.requireShell && !json.shell_action?.page) {
      fail(t.id, 'missing shell_action.page');
      continue;
    }
    if (t.allowPassFail && !t.allowPassFail.includes(json.pass_fail)) {
      fail(t.id, `pass_fail ${json.pass_fail} not in ${t.allowPassFail.join('|')}`);
      continue;
    }
    const summary = String(json.human_summary || '');
    if (t.summaryMustInclude && !summary.includes(t.summaryMustInclude)) {
      fail(t.id, `summary missing "${t.summaryMustInclude}"`);
      continue;
    }
    if (t.forbidTheaterInSummary) {
      const theater = detectCounselTheater(summary, json.command_truth);
      if (theater.violation) {
        fail(t.id, `theater in summary: ${theater.hits.slice(0, 2).join('; ')}`);
        continue;
      }
    }
    report.passed.push(t.id);
  } catch (err) {
    fail(t.id, err.message);
  }
}

const localOrchestrator = fs.readFileSync(path.join(ROOT, 'services/lumin-chair-orchestrator.js'), 'utf8');
if (!localOrchestrator.includes('tryLuminChairSystemAction')) {
  fail('LOCAL-wiring', 'orchestrator missing tryLuminChairSystemAction');
} else {
  report.passed.push('LOCAL-wiring');
}

if (!fs.existsSync(path.join(ROOT, 'services/chair-direct-connection-truth.js'))) {
  fail('LOCAL-truth', 'chair-direct-connection-truth.js missing');
} else {
  report.passed.push('LOCAL-truth');
}

report.ok = report.failed.length === 0;
const out = path.join(ROOT, 'products/receipts/LUMIN_CHAIR_DIRECT_CONNECTION_PARITY.json');
fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
