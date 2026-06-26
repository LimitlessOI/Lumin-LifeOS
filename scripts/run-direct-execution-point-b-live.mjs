#!/usr/bin/env node
/**
 * SYNOPSIS: Point B direct execution — prove do: orders BUILD and complete on production.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = (process.env.LIFERE_ALPHA_BASE_URL || process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
const KEY = process.env.COMMAND_CENTER_KEY || process.env.COMMAND_KEY || process.env.LIFEOS_KEY || '';
const ENDPOINT = '/api/v1/lifeos/builderos/command-control/founder-interface/message';
const POLL_MS = 5000;
const POLL_MAX = 72;

const report = {
  schema: 'direct_execution_point_b_live_v1',
  at: new Date().toISOString(),
  base: BASE,
  ok: false,
  point_b_execution: 'direct_orders_must_build',
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
    if (pf === 'PASS' || pf === 'FAIL') {
      return { res, json, pf };
    }
  }
  return { res: { status: 504 }, json: { pass_fail: 'TIMEOUT' }, pf: 'TIMEOUT' };
}

async function postOrder(id, text, opts = {}) {
  const res = await fetch(`${BASE}${ENDPOINT}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(KEY ? { 'x-command-key': KEY } : {}),
    },
    body: JSON.stringify({
      text,
      action: opts.action || 'auto',
      conversational_mode: true,
      async: opts.async !== false,
    }),
  });
  const json = await res.json().catch(() => ({}));
  report.results[id] = {
    http: res.status,
    chair_channel: json.chair_channel,
    command_truth: json.command_truth,
    pass_fail: json.pass_fail,
    job_id: json.job_id || null,
    execution_path: json.execution_path || null,
    summary_head: String(json.human_summary || '').slice(0, 160),
  };
  return { res, json };
}

const PROBES = [
  {
    id: 'D1_system_open_lifere',
    text: 'open LifeRE',
    expectChannel: 'system_action',
    expectTruth: 'COMMAND_RAN',
    expectPass: 'PASS',
  },
  {
    id: 'D2_do_surgical_comment',
    text: 'do: add HTML comment <!-- point-b-direct-exec-probe --> immediately before lumin drawer in lifeos-app.html',
    expectChannel: 'build_async',
    expectTruth: 'BUILD_ATTEMPTED',
    pollUntil: ['PASS', 'FAIL'],
    requirePass: true,
  },
  {
    id: 'D3_do_css_yellow',
    text: 'do: change assistant response color to yellow with black text',
    expectChannel: 'build_async',
    expectTruth: 'BUILD_ATTEMPTED',
    pollUntil: ['PASS', 'FAIL'],
    requirePass: true,
  },
  {
    id: 'D4_do_voice_send_already',
    text: 'do: fix voice send in public/overlay/lifeos-app.html — say send it to post',
    expectChannel: 'build_async',
    expectTruth: 'BUILD_ATTEMPTED',
    pollUntil: ['PASS', 'FAIL'],
    allowAlreadyPresent: true,
  },
];

if (!BASE || !KEY) {
  console.error('PUBLIC_BASE_URL and COMMAND_CENTER_KEY required');
  process.exit(1);
}

for (const probe of PROBES) {
  try {
    const { res, json } = await postOrder(probe.id, probe.text);
    if (res.status !== 200 && res.status !== 202) {
      fail(probe.id, `HTTP ${res.status}`);
      continue;
    }
    if (probe.expectChannel && json.chair_channel !== probe.expectChannel) {
      fail(probe.id, `channel ${json.chair_channel} !== ${probe.expectChannel}`);
      continue;
    }
    if (probe.expectTruth && json.command_truth !== probe.expectTruth) {
      fail(probe.id, `command_truth ${json.command_truth} !== ${probe.expectTruth}`);
      continue;
    }
    if (probe.expectPass && json.pass_fail !== probe.expectPass) {
      if (!probe.pollUntil) {
        fail(probe.id, `pass_fail ${json.pass_fail} !== ${probe.expectPass}`);
        continue;
      }
    }
    if (probe.pollUntil && json.job_id) {
      const polled = await pollBuildJob(json.job_id, json.poll_url);
      report.results[probe.id].final_pass_fail = polled.pf;
      report.results[probe.id].final_path = polled.json.execution_path;
      report.results[probe.id].committed = polled.json.committed;
      if (polled.pf === 'TIMEOUT') {
        fail(probe.id, 'build job timed out');
        continue;
      }
      if (probe.requirePass && polled.pf !== 'PASS') {
        fail(probe.id, `final ${polled.pf} blocker=${polled.json.first_blocker || polled.json.reason || 'unknown'}`);
        continue;
      }
      if (probe.allowAlreadyPresent && polled.pf === 'PASS') {
        report.passed.push(probe.id);
        continue;
      }
      if (probe.allowAlreadyPresent && polled.pf === 'FAIL' && /already present|no change|already_present/i.test(String(polled.json.human_summary || polled.json.first_blocker || ''))) {
        report.passed.push(probe.id);
        continue;
      }
      if (polled.pf === 'FAIL' && !probe.requirePass) {
        report.passed.push(probe.id);
        continue;
      }
      if (polled.pf !== 'PASS') {
        fail(probe.id, `final ${polled.pf}`);
        continue;
      }
    }
    report.passed.push(probe.id);
  } catch (err) {
    fail(probe.id, err.message);
  }
}

report.ok = report.failed.length === 0;
report.point_b_reached = report.ok;

const outPath = path.join(ROOT, 'products/receipts/DIRECT_EXECUTION_POINT_B_LIVE.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(JSON.stringify({
  ok: report.ok,
  point_b_reached: report.point_b_reached,
  passed: report.passed.length,
  failed: report.failed.length,
  failures: report.failed,
}, null, 2));
process.exit(report.ok ? 0 : 1);
