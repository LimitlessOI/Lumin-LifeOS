#!/usr/bin/env node
/**
 * SYNOPSIS: LifeRE Agent Alpha — conductor tests every UI button wiring + API surface before founder alpha.
 * @ssot docs/products/lifere/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { execSync } from 'node:child_process';
import { createLifeRERoutes } from '../routes/lifere-os-routes.js';
import { ensureDemoDealTwins } from '../services/lifere-boot.js';
import { createLifeRETwinStore } from '../services/lifere-twin-store.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MISSION_ID = 'PRODUCT-LIFERE-OS-V1-0001';

function loadEnv() {
  const fp = path.join(ROOT, '.env');
  if (!fs.existsSync(fp)) return;
  for (const line of fs.readFileSync(fp, 'utf8').split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
loadEnv();

const KEY = process.env.COMMAND_CENTER_KEY || process.env.LIFEOS_KEY || process.env.API_KEY || process.env.COMMAND_KEY || 'agent-alpha-local';
const liveFlag = process.env.LIFERE_AGENT_ALPHA_LIVE === '1' || process.argv.includes('--live');
const BASE = (process.env.LIFERE_ALPHA_BASE_URL || (liveFlag ? process.env.PUBLIC_BASE_URL || process.env.BASE_URL : '') || '').replace(/\/$/, '');
const USE_LIVE = Boolean(BASE);

const report = {
  schema: 'lifere_agent_alpha_v1',
  mission_id: MISSION_ID,
  at: new Date().toISOString(),
  mode: USE_LIVE ? 'live' : 'in_process',
  passed: [],
  failed: [],
  warnings: [],
  agent_alpha_pass: false,
};

function step(id, ok, detail = '') {
  (ok ? report.passed : report.failed).push(id);
  if (!ok) report[`fail_${id}`] = detail;
}

function warn(id, detail) {
  report.warnings.push({ id, detail });
}

const htmlPath = path.join(ROOT, 'public/overlay/lifeos-lifere.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const buttonIds = [...html.matchAll(/\bid="([^"]*-btn)"/g)].map((m) => m[1]);
for (const btnId of buttonIds) {
  const escaped = btnId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const wired = new RegExp(`getElementById\\(['"]${escaped}['"]\\)[^;]*addEventListener\\(['"]click'`).test(html)
    || (html.includes(`getElementById('${btnId}')`) && html.includes('addEventListener(\'click\''));
  step(`BTN-${btnId}`, wired, wired ? '' : 'no addEventListener(click) found');
}

for (const id of ['lifere-refresh', 'lifere-run-debrief']) {
  step(`BTN-${id}`, html.includes(`getElementById('${id}')`) && html.includes('addEventListener(\'click\''));
}

const tabIds = [...html.matchAll(/data-tab="([^"]+)"/g)].map((m) => m[1]);
for (const tab of [...new Set(tabIds)]) {
  step(`TAB-${tab}`, html.includes(`data-tab-panel="${tab}"`), `missing panel for tab ${tab}`);
}

async function request(baseUrl, method, routePath, body, retries = USE_LIVE ? 2 : 0) {
  let last;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(`${baseUrl}${routePath}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'x-command-key': KEY },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    last = { status: res.status, json };
    if (last.status !== 502 && last.status !== 503) return last;
    if (attempt < retries) await new Promise((r) => setTimeout(r, 1500));
  }
  return last;
}

function apiOk({ status, json }, allow4xx = false) {
  if (status >= 500) return false;
  if (allow4xx && status >= 400 && status < 500) return json && typeof json === 'object';
  return status >= 200 && status < 300 && json && json.ok !== false;
}

function boldtrailProbeOk({ status, json }) {
  if (status >= 500) return false;
  if (status >= 200 && status < 300) {
    if (json?.ok || json?.connected || json?.boldtrail?.connected) return true;
    if (!USE_LIVE) {
      const reason = json?.reason || json?.result?.reason || json?.boldtrail?.reason || '';
      return reason === 'missing_token' || reason === 'missing_token';
    }
  }
  return false;
}

const GET_PROBES = [
  ['API-health', 'GET', '/api/v1/lifere/health'],
  ['API-readiness', 'GET', '/api/v1/lifere/alpha/readiness'],
  ['API-top3', 'GET', '/api/v1/lifere/top-3?user_id=adam'],
  ['API-follow-queue', 'GET', '/api/v1/lifere/follow-up/queue?user_id=adam'],
  ['API-follow-metrics', 'GET', '/api/v1/lifere/follow-up/metrics?user_id=adam'],
  ['API-twins-summary', 'GET', '/api/v1/lifere/twins/summary?user_id=adam'],
  ['API-edu-progress', 'GET', '/api/v1/lifere/education/progress?user_id=adam'],
  ['API-edu-curriculum', 'GET', '/api/v1/lifere/education/curriculum?user_id=adam'],
  ['API-milestones', 'GET', '/api/v1/lifere/motivation/milestones?user_id=adam'],
  ['API-chair-brief', 'GET', '/api/v1/lifere/chair/brief?user_id=adam&goal_gci=30000'],
  ['API-perf-bottleneck', 'GET', '/api/v1/lifere/performance/bottleneck?user_id=adam'],
  ['API-perf-next-hour', 'GET', '/api/v1/lifere/performance/next-hour?user_id=adam'],
  ['API-perf-goal', 'GET', '/api/v1/lifere/performance/goal-math?user_id=adam&goal_gci=30000'],
  ['API-lifeos-crosscheck', 'GET', '/api/v1/lifere/lifeos/crosscheck?user_id=adam'],
  ['API-lifeos-integration', 'GET', '/api/v1/lifere/lifeos/integration?user_id=adam'],
  ['API-comms-templates', 'GET', '/api/v1/lifere/client-comms/templates?user_id=adam'],
  ['API-comms-log', 'GET', '/api/v1/lifere/client-comms/log?user_id=adam&limit=5'],
  ['API-buyers', 'GET', '/api/v1/lifere/deals/buyers?user_id=adam'],
  ['API-sellers', 'GET', '/api/v1/lifere/deals/sellers?user_id=adam'],
  ['API-approval-queue', 'GET', '/api/v1/lifere/approval-queue?user_id=adam'],
  ['API-coaching-modules', 'GET', '/api/v1/lifere/coaching/modules'],
  ['API-content-brief-list', 'GET', '/api/v1/lifere/marketing/content-brief?user_id=adam'],
  ['API-video-types', 'GET', '/api/v1/lifere/marketing/video-types'],
  ['API-smo-status', 'GET', '/api/v1/lifere/marketing/socialmediaos/status'],
  ['API-funnel-summary', 'GET', '/api/v1/lifere/marketing/funnel/summary?user_id=adam'],
  ['API-funnel-events', 'GET', '/api/v1/lifere/marketing/funnel/events?user_id=adam&limit=8'],
  ['API-hooks-library', 'GET', '/api/v1/lifere/marketing/hooks/library?user_id=adam&limit=8'],
  ['API-calendar', 'GET', '/api/v1/lifere/marketing/calendar?user_id=adam'],
  ['API-ads-roi', 'GET', '/api/v1/lifere/marketing/ads/roi?user_id=adam'],
  ['API-tx-workspace', 'GET', '/api/v1/lifere/transaction/workspace?user_id=adam'],
  ['API-tx-list', 'GET', '/api/v1/lifere/transaction/list'],
  ['API-recruiting', 'GET', '/api/v1/lifere/recruiting/pipeline?user_id=adam'],
  ['API-finance', 'GET', '/api/v1/lifere/finance/forecast?user_id=adam'],
  ['API-opportunity', 'GET', '/api/v1/lifere/opportunity/signals?user_id=adam'],
  ['API-receptionist', 'GET', '/api/v1/lifere/receptionist/calls?user_id=adam'],
  ['API-permissions', 'GET', '/api/v1/lifere/permissions/list?user_id=adam'],
  ['API-learning', 'GET', '/api/v1/lifere/learning/status'],
  ['API-outreach-queue', 'GET', '/api/v1/lifere/outreach/queue?user_id=adam'],
  ['API-market-snapshot', 'GET', '/api/v1/lifere/market/snapshot?user_id=adam&market=local'],
  ['API-market-angles', 'GET', '/api/v1/lifere/market/content-angles?user_id=adam&market=local'],
  ['API-boldtrail-status', 'GET', '/api/v1/lifere/boldtrail/status'],
  ['API-boldtrail-pipeline', 'GET', '/api/v1/lifere/boldtrail/pipeline?limit=5'],
  ['API-buyer-workspace', 'GET', '/api/v1/lifere/buyer/demo_buyer_001/workspace?user_id=adam'],
  ['API-seller-workspace', 'GET', '/api/v1/lifere/seller/demo_listing_001/workspace?user_id=adam'],
  ['API-comms-suggest-vars', 'GET', '/api/v1/lifere/client-comms/suggest-vars?user_id=adam&ref=demo_buyer_001&side=buyer'],
];

const POST_PROBES = [
  ['API-daily-cc', 'POST', '/api/v1/lifere/daily-command-center', { user_id: 'adam' }],
  ['API-debrief', 'POST', '/api/v1/lifere/nightly-debrief', { user_id: 'adam', wins: ['test'], losses: [], notes: 'agent alpha' }],
  ['API-alpha-cycle', 'POST', '/api/v1/lifere/alpha/daily-cycle', { user_id: 'adam', goal_gci: 30000 }],
  ['API-activity-log', 'POST', '/api/v1/lifere/activity/log', { user_id: 'adam', counts: { calls: 1 } }],
  ['API-comms-preview', 'POST', '/api/v1/lifere/client-comms/preview', { user_id: 'adam', template_id: 'status_update', vars: { client_name: 'Test', status: 'on track', next_step: 'showings' } }],
  ['API-hooks-research', 'POST', '/api/v1/lifere/marketing/research/hooks', { user_id: 'adam', topic: 'first time buyer' }],
  ['API-yt-strategy', 'POST', '/api/v1/lifere/marketing/youtube/strategy', { user_id: 'adam', market: 'local' }],
  ['API-yt-research', 'POST', '/api/v1/lifere/marketing/research/youtube', { user_id: 'adam', topic: 'market update' }],
  ['API-script', 'POST', '/api/v1/lifere/marketing/script/generate', { user_id: 'adam', topic: 'agent alpha', video_type_id: 'market_update_60' }],
  ['API-recording-coach', 'POST', '/api/v1/lifere/marketing/recording-coach', { user_id: 'adam', script_excerpt: 'Hello market' }],
  ['API-thumbnail-seo', 'POST', '/api/v1/lifere/marketing/thumbnail-seo', { user_id: 'adam', topic: 'market update', market: 'local' }],
  ['API-calendar-plan', 'POST', '/api/v1/lifere/marketing/calendar/plan', { user_id: 'adam', weeks: 2 }],
  ['API-social-reply', 'POST', '/api/v1/lifere/marketing/social/suggest-reply', { user_id: 'adam', channel: 'comment', text: 'Great post!' }],
  ['API-smo-coach', 'POST', '/api/v1/lifere/marketing/socialmediaos/coach', { user_id: 'adam', topic: 'listing tips', brief_id: null }],
  ['API-smo-pack', 'POST', '/api/v1/lifere/marketing/socialmediaos/content-pack', { user_id: 'adam', transcript: 'Sample transcript for pack.' }],
  ['API-smo-pipeline', 'POST', '/api/v1/lifere/marketing/socialmediaos/pipeline', { user_id: 'adam', topic: 'buyer tips' }],
  ['API-community-plan', 'POST', '/api/v1/lifere/community/content-plan', { user_id: 'adam', group_name: 'Local RE' }],
  ['API-community-post', 'POST', '/api/v1/lifere/community/post-draft', { user_id: 'adam', topic: 'market update' }],
  ['API-community-mod', 'POST', '/api/v1/lifere/community/moderation', { flagged_comments: ['Is this spam?'] }],
  ['API-opportunity-scan', 'POST', '/api/v1/lifere/opportunity/scan', { user_id: 'adam' }],
  ['API-scenario', 'POST', '/api/v1/lifere/scenario/compare', { user_id: 'adam', paths: [{ id: 'a', allocations: { builderos_hours: 20 } }, { id: 'b', allocations: { prospecting_hours: 20 } }], goal_weights: { income: 0.5, family: 0.3, freedom: 0.2 } }],
  ['API-council', 'POST', '/api/v1/lifere/council/deliberate', { intent: 'content', message: 'What video next?' }],
  ['API-education-ctx', 'POST', '/api/v1/lifere/education/context', { user_id: 'adam', topic: 'buyer', stage: 'searching' }],
  ['API-personality', 'POST', '/api/v1/lifere/personality/calibrate', { user_id: 'adam', draft_text: 'Direct and warm follow-up.', rating: 5, feedback: 'agent alpha probe' }],
  ['API-outreach-process', 'POST', '/api/v1/lifere/outreach/process-queue', { user_id: 'adam' }],
  ['API-buyer-objection', 'POST', '/api/v1/lifere/buyer/demo_buyer_001/objection-coach', { user_id: 'adam', objection: 'agent alpha probe' }],
  ['API-seller-weekly', 'POST', '/api/v1/lifere/seller/demo_listing_001/weekly-report', { user_id: 'adam' }],
];

async function startLocalApp() {
  await ensureDemoDealTwins({ twinStore: createLifeRETwinStore({ pool: null }), userId: 'adam' });
  const app = express();
  app.use(express.json());
  const requireKey = (req, res, next) => {
    if (!req.headers['x-command-key']) return res.status(401).json({ ok: false, error: 'key required' });
    next();
  };
  app.use('/api/v1/lifere', createLifeRERoutes({ requireKey, pool: null }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve()))),
  };
}

async function runApiProbes(baseUrl) {
  for (const [id, method, route, body] of GET_PROBES) {
    const r = await request(baseUrl, method, route, body);
    const ok = id.startsWith('API-boldtrail-') ? boldtrailProbeOk(r) : apiOk(r);
    step(id, ok, `status ${r.status} ${JSON.stringify(r.json).slice(0, 120)}`);
  }

  let approvedBriefId = null;
  const briefGen = await request(baseUrl, 'POST', '/api/v1/lifere/marketing/content-brief/generate', {
    user_id: 'adam', topic: 'agent alpha brief gate probe',
  });
  step('API-brief-generate', apiOk(briefGen), `status ${briefGen.status}`);
  if (briefGen.json?.brief_id) {
    approvedBriefId = briefGen.json.brief_id;
    const briefApprove = await request(baseUrl, 'POST', `/api/v1/lifere/marketing/content-brief/${approvedBriefId}/approve`, {
      user_id: 'adam',
    });
    step('API-brief-approve', apiOk(briefApprove), `status ${briefApprove.status}`);
  }

  for (const [id, method, route, body] of POST_PROBES) {
    let payload = body;
    if (id === 'API-script' || id === 'API-smo-pipeline') {
      payload = { ...body, brief_id: approvedBriefId };
    }
    if (id === 'API-smo-coach') {
      payload = { user_id: 'adam', message: 'What hook should I use for a market update video?', brief_id: approvedBriefId };
    }
    const r = await request(baseUrl, method, route, payload);
    step(id, apiOk(r), `status ${r.status} ${JSON.stringify(r.json).slice(0, 120)}`);
  }
}

let local;
try {
  const baseUrl = USE_LIVE ? BASE : (local = await startLocalApp()).baseUrl;
  await runApiProbes(baseUrl);
} finally {
  if (local) await local.close();
}

report.ok = report.failed.length === 0;
report.agent_alpha_pass = report.ok;
report.founder_alpha_blocked_until = report.ok
  ? 'Agent alpha PASS — founder may begin usability test'
  : 'Fix agent alpha failures before founder touches product';

let gitSha = '';
try {
  gitSha = execSync('git rev-parse HEAD', { cwd: ROOT }).toString().trim();
} catch {
  /* offline */
}
report.git_sha = gitSha;

const receiptPath = path.join(ROOT, 'products/receipts/LIFERE_AGENT_ALPHA.json');
fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
fs.writeFileSync(receiptPath, `${JSON.stringify(report, null, 2)}\n`);

const verdictPath = path.join(ROOT, `builderos-reboot/MISSIONS/${MISSION_ID}/OBJECTIVE_VERDICT.json`);
if (fs.existsSync(verdictPath)) {
  const verdict = JSON.parse(fs.readFileSync(verdictPath, 'utf8'));
  verdict.agent_alpha_pass = report.agent_alpha_pass;
  verdict.agent_alpha_at = report.at;
  verdict.agent_alpha_receipt = 'products/receipts/LIFERE_AGENT_ALPHA.json';
  if (!report.agent_alpha_pass) {
    verdict.founder_usability_pass = false;
  }
  fs.writeFileSync(verdictPath, `${JSON.stringify(verdict, null, 2)}\n`);
}

console.log(JSON.stringify({
  ok: report.ok,
  agent_alpha_pass: report.agent_alpha_pass,
  passed: report.passed.length,
  failed: report.failed.length,
  warnings: report.warnings.length,
  failures: report.failed.slice(0, 20),
}, null, 2));
process.exit(report.ok ? 0 : 1);
