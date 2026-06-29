#!/usr/bin/env node
/**
 * SYNOPSIS: SNT live verification — deliberation governance pass-3 doctrine checks on Railway.
 * SNT live verification — deliberation governance pass-3 doctrine checks on Railway.
 * Usage: node --import dotenv/config scripts/deliberation-snt-live-verify.mjs
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

const base = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
const key =
  process.env.COMMAND_CENTER_KEY ||
  process.env.COMMAND_KEY ||
  process.env.LIFEOS_KEY ||
  '';

if (!base || !key) {
  console.error('PUBLIC_BASE_URL and COMMAND_CENTER_KEY required');
  process.exit(1);
}

const checks = [];
let failed = 0;

function record(id, name, pass, detail = '') {
  checks.push({ id, name, pass, detail });
  if (pass) console.log(`PASS: ${id} — ${name}`);
  else {
    console.error(`FAIL: ${id} — ${name}${detail ? ` (${detail})` : ''}`);
    failed += 1;
  }
}

async function api(method, path, body) {
  const r = await fetch(`${base}${path}`, {
    method,
    headers: { 'content-type': 'application/json', 'x-command-key': key },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { status: r.status, json };
}

const SUBSTANTIVE_CASE =
  'Substantive historian case text for SNT live gate verification.';

const validConsensus = {
  final_synthesis: 'Position E synthesis after future-back scan for SNT verify.',
  participants: [{ id: 'bpb' }, { id: 'cdr' }],
  original_positions: [{ stance: 'ship' }],
  future_back_horizons: { '1y': 'scale', '5y': 'platform' },
  vote_counts: { ship: 2 },
};

console.log('=== SNT live deliberation verification ===');
console.log('Base:', base);

{
  const ready = await fetch(`${base}/api/v1/lifeos/builder/ready`, {
    headers: { 'x-command-key': key },
  }).then((r) => r.json());
  const sha = ready?.codegen?.deploy_commit_sha || 'unknown';
  record('SNT-DEPLOY', 'Builder ready + deploy SHA present', Boolean(sha && sha.length >= 8), sha);
}

{
  const { status } = await api('POST', '/api/v1/lifeos/deliberation/cfo-receipt', {
    session_id: `snt-live-cfo-${Date.now()}`,
    role: 'CFO',
    cost_usd: -1,
    tokens: -10,
  });
  record('SNT-N1', 'Negative CFO rejected (400)', status === 400, `HTTP ${status}`);
}

{
  const { status } = await api('POST', '/api/v1/lifeos/deliberation/consensus', {
    session_id: `snt-live-cons-${Date.now()}`,
    ...validConsensus,
    future_back_horizons: { '100y': 'bad' },
  });
  record('SNT-N2', 'Invalid horizon rejected (400)', status === 400, `HTTP ${status}`);
}

{
  const { status } = await api('POST', '/api/v1/lifeos/deliberation/consensus', {
    session_id: `snt-live-votes-${Date.now()}`,
    ...validConsensus,
    vote_counts: { ship: -1 },
  });
  record('SNT-N3', 'Negative vote_counts rejected (400)', status === 400, `HTTP ${status}`);
}

{
  const { status } = await api('POST', '/api/v1/lifeos/deliberation/scorecard', {
    decision_type: 'snt_verify',
    cost_usd: -5,
    token_count: -1,
    latency_ms: -1,
  });
  record('SNT-N11', 'Negative scorecard rejected (400)', status === 400, `HTTP ${status}`);
}

{
  const sid = `snt-live-noroster-${Date.now()}`;
  await api('POST', '/api/v1/lifeos/deliberation/hist-case', {
    session_id: sid,
    case_text: SUBSTANTIVE_CASE,
  });
  await api('POST', '/api/v1/lifeos/deliberation/cfo-receipt', {
    session_id: sid,
    role: 'CFO',
    cost_usd: 0.01,
  });
  const { status, json } = await api('POST', '/api/v1/lifeos/deliberation/gate/pass', {
    session_id: sid,
  });
  const violations = json.violations || [];
  record(
    'SNT-ROSTER',
    'Gate pass without roster fails (422 + ROSTER_MISSING)',
    status === 422 && violations.includes('ROSTER_MISSING'),
    `HTTP ${status} violations=${JSON.stringify(violations)}`
  );
}

{
  const sid = `snt-live-lb-${Date.now()}`;
  await api('POST', '/api/v1/lifeos/deliberation/roster', {
    session_id: sid,
    authorities: ['SNT'],
    reps: [{ name: 'LifeOS' }],
    models: [{ id: 'm1', focus: 'SNT' }],
  });
  await api('POST', '/api/v1/lifeos/deliberation/hist-case', {
    session_id: sid,
    case_text: SUBSTANTIVE_CASE,
  });
  await api('POST', '/api/v1/lifeos/deliberation/cfo-receipt', {
    session_id: sid,
    role: 'CFO',
    cost_usd: 0.01,
  });
  const fail1 = await api('POST', '/api/v1/lifeos/deliberation/gate/pass', {
    session_id: sid,
    load_bearing: true,
  });
  const fail2 = await api('POST', '/api/v1/lifeos/deliberation/gate/pass', { session_id: sid });
  const pass3 = await api('POST', '/api/v1/lifeos/deliberation/gate/pass', { session_id: sid });
  record(
    'SNT-LB-STICKY',
    'Sticky load_bearing blocks downgrade pass',
    fail1.status === 422 && fail2.status === 422 && pass3.status === 422,
    `statuses ${fail1.status}/${fail2.status}/${pass3.status}`
  );
}

{
  const sid = `snt-live-expand-${Date.now()}`;
  await api('POST', '/api/v1/lifeos/deliberation/roster', {
    session_id: sid,
    authorities: ['SNT'],
    reps: [{ name: 'LifeOS' }],
    models: [{ id: 'm1', focus: 'SNT' }],
  });
  await api('POST', `/api/v1/lifeos/deliberation/roster/${sid}/expand`, {
    audit_expanded_roster: [{ rep: 'LifeOS', role: 'primary' }],
    expand_reason: 'initial expand',
  });
  const wipe = await api('POST', `/api/v1/lifeos/deliberation/roster/${sid}/expand`, {
    expand_reason: 'wipe attempt',
  });
  record(
    'SNT-N6B',
    'Expand without audit_expanded_roster rejected (400)',
    wipe.status === 400,
    `HTTP ${wipe.status}`
  );
}

{
  const sid = `snt-live-happy-${Date.now()}`;
  await api('POST', '/api/v1/lifeos/deliberation/roster', {
    session_id: sid,
    authorities: ['BPB', 'CDR'],
    reps: [{ name: 'LifeOS' }, { name: 'Founder' }],
    models: [
      { id: 'bpb-m', focus: 'BPB' },
      { id: 'cdr-m', focus: 'CDR' },
    ],
  });
  await api('POST', '/api/v1/lifeos/deliberation/hist-case', {
    session_id: sid,
    case_text: SUBSTANTIVE_CASE,
  });
  await api('POST', '/api/v1/lifeos/deliberation/cfo-receipt', {
    session_id: sid,
    role: 'CFO',
    cost_usd: 0.01,
  });
  await api('POST', '/api/v1/lifeos/deliberation/consensus', { session_id: sid, ...validConsensus });
  const gate = await api('POST', '/api/v1/lifeos/deliberation/gate/pass', {
    session_id: sid,
    load_bearing: true,
  });
  const meta = gate.json?.gate?.metadata_json || {};
  record(
    'SNT-LB-META',
    'Load-bearing PASS persists metadata_json.load_bearing',
    gate.status === 200 && meta.load_bearing === true,
    `HTTP ${gate.status} meta=${JSON.stringify(meta)}`
  );
}

const verdict = failed === 0 ? 'SNT_LIVE_PASS' : 'SNT_LIVE_FAIL';
const out = {
  generated_at: new Date().toISOString(),
  role: 'SNT',
  mission_id: 'FACTORY-DELIBERATION-V27-0001',
  base_url: base,
  verdict,
  checks,
  failed,
  passed: checks.length - failed,
  total: checks.length,
};

const outPath = new URL('../builderos-reboot/MISSIONS/FACTORY-DELIBERATION-V27-0001/SNT_LIVE_VERIFY.json', import.meta.url);
await import('node:fs/promises').then((fs) =>
  fs.writeFile(outPath, `${JSON.stringify(out, null, 2)}\n`)
);

console.log(`\n=== ${verdict} (${checks.length - failed}/${checks.length}) ===`);
process.exit(failed ? 1 : 0);
