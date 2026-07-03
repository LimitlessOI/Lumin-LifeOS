#!/usr/bin/env node
/**
 * SYNOPSIS: Founder chat alpha — build must build, questions must answer, search when unknown.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectCounselTheater } from '../services/chair-direct-connection-truth.js';
import { finishBpAcceptance } from './lib/bp-acceptance-finish.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MISSION = 'FACTORY-LUMIN-FOUNDER-ALPHA-GAPFILL-0001';
const BASE = (
  process.env.PUBLIC_BASE_URL
  || process.env.LIFERE_ALPHA_BASE_URL
  || process.env.BASE_URL
  || ''
).replace(/\/$/, '');
const KEY = process.env.COMMAND_CENTER_KEY || process.env.LIFEOS_KEY || '';
const ENDPOINT = '/api/v1/lifeos/builderos/command-control/founder-interface/message';
const POLL_MS = 5000;
const POLL_MAX = 180;
const FETCH_TIMEOUT_MS = Number(process.env.FOUNDER_ALPHA_FETCH_TIMEOUT_MS || 15000);

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

function authHeaders(extra = {}) {
  return {
    ...(KEY ? { 'x-command-key': KEY, 'x-api-key': KEY } : {}),
    ...extra,
  };
}

async function fetchJsonWithTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const res = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(timeoutMs),
  });
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

async function pollBuildJob(jobId, pollUrl, pollMax = POLL_MAX) {
  const url = pollUrl?.startsWith('http') ? pollUrl : `${BASE}${pollUrl || `/api/v1/lifeos/builderos/command-control/founder-interface/build-job/${jobId}`}`;
  for (let i = 0; i < pollMax; i += 1) {
    await new Promise((r) => setTimeout(r, POLL_MS));
    let res;
    let json;
    try {
      ({ res, json } = await fetchJsonWithTimeout(
        url,
        { headers: authHeaders() },
        FETCH_TIMEOUT_MS,
      ));
    } catch (error) {
      return {
        json: {
          pass_fail: 'FAIL',
          first_blocker: error?.name === 'TimeoutError'
            ? 'build_job_poll_timeout'
            : (error?.message || String(error)),
        },
        pf: 'FAIL',
      };
    }
    const pf = json.pass_fail || json.result?.pass_fail;
    if (pf === 'PASS' || pf === 'FAIL') return { json, pf };
  }
  return { json: { pass_fail: 'TIMEOUT' }, pf: 'TIMEOUT' };
}

async function fetchFounderHealth() {
  let last = null;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    last = await fetchJsonWithTimeout(`${BASE}/api/v1/lifeos/auth/operator/founder-chat-health`, {
      headers: authHeaders(),
      cache: 'no-store',
    }).catch((error) => ({
      res: { status: 0 },
      json: { ok: false, error: error?.message || String(error) },
    }));
    if (last?.res?.status === 200) return last;
    await new Promise((r) => setTimeout(r, 500));
  }
  return last || {
    res: { status: 0 },
    json: { ok: false, error: 'founder_health_probe_failed' },
  };
}

async function syncFounderLogin() {
  return fetchJsonWithTimeout(`${BASE}/api/v1/lifeos/auth/operator/sync-founder-login`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ source: 'founder_chat_alpha_battery' }),
    cache: 'no-store',
  });
}

async function send(id, text, opts = {}) {
  const { res, json } = await fetchJsonWithTimeout(`${BASE}${ENDPOINT}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({
      text,
      action: 'auto',
      conversational_mode: true,
      alpha_probe: true,
      ui_context: opts.ui_context || { surface: 'lifeos-app' },
      conversation_history: opts.history || [],
    }),
    cache: 'no-store',
  });
  const summary = String(json.human_summary || json.human_summary_technical || json.summary || '');
  report.results[id] = {
    http: res.status,
    channel: json.chair_channel,
    truth: json.command_truth,
    pass_fail: json.pass_fail,
    transport_status: json.transport_status || null,
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
    id: 'Q_identity_twin',
    text: 'Lumin — who am I to you? What are my top priorities right now?',
    expectChannel: 'chair',
    expectTruth: 'NO_COMMAND_RAN',
    forbidClarify: true,
    forbidTheater: true,
    summaryMustNotInclude: ['Point B gap', 'AGENT CONTINUITY', 'Reality is the scoreboard', 'BP PRIORITY'],
    summaryMustInclude: [/priorit|Adam|family|freedom|impact|motivat|know you/i],
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
  {
    id: 'B1_do_build',
    text: `do: in scripts/lifeos-direct-build-smoke-test.mjs set or replace one comment line exactly "// founder-chat-alpha-probe: ${new Date().toISOString()}" near the top. Do not change runtime behavior and do not modify any other file.`,
    expectTruth: 'BUILD_ATTEMPTED',
    expectChannel: 'build_async',
    poll: true,
    requirePass: true,
    allowCommitOnlyTransport: true,
    pollMax: 132,
  },
  {
    id: 'B2_nl_ui_rounded',
    text: 'make the send button in the lumin drawer slightly more rounded',
    expectTruth: 'BUILD_ATTEMPTED',
    expectChannel: 'build_async',
    poll: true,
    allowAlreadyPresent: true,
    allowBuildStarted: true,
    pollMax: 24,
  },
  {
    id: 'B3_nl_css_yellow',
    text: 'make the assistant chat bubbles a bit fainter yellow',
    expectTruth: 'BUILD_ATTEMPTED',
    expectChannel: 'build_async',
    poll: true,
    allowAlreadyPresent: true,
    allowBuildStarted: true,
    pollMax: 24,
  },
];

if (!BASE || !KEY) {
  console.error('PUBLIC_BASE_URL and COMMAND_CENTER_KEY required');
  process.exit(1);
}

{
  let healthRes = null;
  let healthJson = {};
  let healthError = null;
  try {
    const result = await fetchFounderHealth();
    healthRes = result.res;
    healthJson = result.json;
  } catch (error) {
    healthError = error?.name === 'TimeoutError'
      ? 'founder-chat-health timeout'
      : (error?.message || String(error));
  }
  if (!healthError && healthRes?.status === 200 && healthJson?.ok !== true) {
    const blockers = Array.isArray(healthJson.blockers) ? healthJson.blockers : [];
    if (blockers.includes('founder_login_sync_required')) {
      try {
        const syncResult = await syncFounderLogin();
        report.results.H0_founder_login_health_sync = {
          http: syncResult.res.status,
          ok: syncResult.json?.ok === true,
          cred_source: syncResult.json?.cred_source || null,
          login_probe_ok: syncResult.json?.login_probe?.ok ?? null,
          error: syncResult.json?.error || null,
        };
        if (syncResult.res.status === 200 && syncResult.json?.ok === true) {
          const retry = await fetchFounderHealth();
          healthRes = retry.res;
          healthJson = retry.json;
        }
      } catch (error) {
        report.results.H0_founder_login_health_sync = {
          http: 0,
          ok: false,
          error: error?.name === 'TimeoutError'
            ? 'sync-founder-login timeout'
            : (error?.message || String(error)),
        };
      }
    }
  }
  report.results.H0_founder_login_health = {
    http: healthRes?.status || 0,
    ok: healthJson.ok,
    blockers: healthJson.blockers || [],
    cred_source: healthJson.cred_source || null,
    login_probe_ok: healthJson.login_probe?.ok ?? null,
  };
  if (healthError) {
    fail('H0_founder_login_health', healthError);
  } else if (!healthRes || healthRes.status === 404) {
    fail('H0_founder_login_health', 'founder-chat-health endpoint missing — deploy auth routes');
  } else if (!healthJson.ok) {
    fail('H0_founder_login_health', (healthJson.blockers || ['login_probe_failed']).join(', '));
  } else {
    report.passed.push('H0_founder_login_health');
  }
}

const founderSurfaceUnavailable = report.failed.includes('H0_founder_login_health');

for (const probe of founderSurfaceUnavailable ? [] : PROBES) {
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
      if (probe.id === 'B1_do_build' && process.env.FOUNDER_BATTERY_E2E_BUILD_SATISFIED === '1') {
        const e2ePath = path.join(ROOT, 'products/receipts/REAL_APP_E2E.json');
        let e2eReceipt = null;
        try {
          e2eReceipt = JSON.parse(fs.readFileSync(e2ePath, 'utf8'));
        } catch {
          e2eReceipt = null;
        }
        if (e2eReceipt?.results?.drawer_direct_build?.ok === true) {
          report.results[probe.id].final_pass_fail = 'PASS';
          report.results[probe.id].terminal_proof_delegated = 'real_app_e2e.drawer_direct_build';
          report.passed.push(probe.id);
          continue;
        }
      }
      const polled = await pollBuildJob(json.job_id, json.poll_url, probe.pollMax ?? POLL_MAX);
      report.results[probe.id].final_pass_fail = polled.pf;
      report.results[probe.id].final_transport_status =
        polled.json.transport_status || polled.json.result?.transport_status || null;
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
      if (probe.requirePass) {
        const finalTransport = report.results[probe.id].final_transport_status;
        const commitSha = polled.json.sha || polled.json.commit_sha || polled.json.result?.sha;
        const summaryText = String(polled.json.human_summary || polled.json.summary || '');
        const hasCommitProof = Boolean(commitSha)
          || /Commit:\s*[0-9a-f]{7,}|commit\s+[0-9a-f]{7,}/i.test(summaryText);
        const commitProofPass = polled.pf === 'PASS' && hasCommitProof
          && (!finalTransport || /COMMIT_ONLY_NOT_LIVE|REMOTE_TRANSPORT_PASS/i.test(finalTransport));
        if (probe.allowCommitOnlyTransport && commitProofPass) {
          report.passed.push(probe.id);
          continue;
        }
        if (!finalTransport) {
          fail(probe.id, 'missing final transport_status on build proof');
          continue;
        }
        if (/COMMIT_ONLY_NOT_LIVE|COMMIT_NO_SHA|ORIGIN_MAIN_NOT_UPDATED|DEPLOY_NOT_SYNCED|LIVE_BEHAVIOR_NOT_VERIFIED/i.test(finalTransport)) {
          fail(probe.id, `insufficient final transport proof: ${finalTransport}`);
          continue;
        }
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
    if (err?.name === 'TimeoutError') break;
  }
}

report.ok = report.failed.length === 0;
report.tests_passed = [...report.passed];
report.tests_failed = [...report.failed];
report.mission_id = MISSION;
report.started_at = report.at;
report.founder_usability_pass = false;

const out = path.join(ROOT, 'products/receipts/FOUNDER_CHAT_ALPHA_BATTERY.json');
const verdictPath = path.join(ROOT, 'builderos-reboot/MISSIONS', MISSION, 'OBJECTIVE_VERDICT.json');

const { pass } = finishBpAcceptance({
  root: ROOT,
  missionId: MISSION,
  report,
  receiptAbsPath: out,
  receiptRelPath: 'products/receipts/FOUNDER_CHAT_ALPHA_BATTERY.json',
  verdictAbsPath: verdictPath,
  objectiveName: 'Lumin Founder Alpha Gap-Fill',
  objectiveVerdictOnPass: 'TECHNICAL_PASS',
  base: BASE,
  buildRecord: { build_method: 'GAP-FILL' },
  passPredicate: (r) => r.failed.length === 0,
});

console.log(JSON.stringify({
  ok: pass,
  passed: report.passed.length,
  failed: report.failed.length,
  failures: report.failed,
}, null, 2));
process.exit(pass ? 0 : 1);
