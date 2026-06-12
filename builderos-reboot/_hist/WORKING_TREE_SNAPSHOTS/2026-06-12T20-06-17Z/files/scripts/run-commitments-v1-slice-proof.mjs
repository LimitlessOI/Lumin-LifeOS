#!/usr/bin/env node
/**
 * SLICE-001 — Conversation Commitments v1 API CRUD proof.
 * PASS = manual create → list → keep/break/snooze on production API.
 * @ssot builderos-reboot/MISSIONS/PRODUCT-CONVERSATION-COMMITMENTS-C2-0001/SLICE_001.json
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const RECEIPT = path.join(
  REPO_ROOT,
  'builderos-reboot/MISSIONS/PRODUCT-CONVERSATION-COMMITMENTS-C2-0001/SLICE_001_PROOF.json',
);

const base = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
const key = process.env.COMMAND_CENTER_KEY || process.env.COMMAND_KEY || '';

const report = {
  schema: 'slice_proof_v1',
  slice_id: 'SLICE-001',
  mission_id: 'PRODUCT-CONVERSATION-COMMITMENTS-C2-0001',
  started_at: new Date().toISOString(),
  base,
  steps: [],
  pass: false,
};

function step(name, ok, detail) {
  report.steps.push({ step: name, ok, detail, at: new Date().toISOString() });
}

async function api(method, urlPath, body) {
  const r = await fetch(`${base}${urlPath}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(key ? { 'x-command-key': key } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 300) };
  }
  return { status: r.status, json };
}

function finish(exitCode) {
  report.pass = report.steps.every((s) => s.ok);
  report.verdict = report.pass ? 'OBJECTIVE_COMPLETE' : 'OBJECTIVE_NOT_COMPLETE';
  report.completed_at = new Date().toISOString();
  fs.mkdirSync(path.dirname(RECEIPT), { recursive: true });
  fs.writeFileSync(RECEIPT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  process.exit(exitCode);
}

if (!base || !key) {
  step('env', false, { base: Boolean(base), key: Boolean(key) });
  finish(1);
}

const tag = `slice-proof-${Date.now()}`;
const titleA = `${tag}-A keep test`;
const titleB = `${tag}-B break test`;
const titleC = `${tag}-C snooze test`;

const createA = await api('POST', '/api/v1/lifeos/commitments', {
  user: 'adam',
  title: titleA,
  committed_to: 'self',
  weight: 1,
});
const idA = createA.json?.commitment?.id;
step('post_manual_a', createA.status === 201 && Boolean(idA), { http: createA.status, id: idA });

const createB = await api('POST', '/api/v1/lifeos/commitments', {
  user: 'adam',
  title: titleB,
  committed_to: 'partner',
  weight: 2,
});
const idB = createB.json?.commitment?.id;
step('post_manual_b', createB.status === 201 && idB, { http: createB.status, id: idB });

const createC = await api('POST', '/api/v1/lifeos/commitments', {
  user: 'adam',
  title: titleC,
  committed_to: 'self',
  due_at: new Date(Date.now() + 86400000).toISOString(),
});
const idC = createC.json?.commitment?.id;
step('post_manual_c', createC.status === 201 && idC, { http: createC.status, id: idC });

if (!idA || !idB || !idC) finish(1);

const list = await api('GET', '/api/v1/lifeos/commitments?user=adam&limit=200');
const ids = (list.json?.commitments || []).map((c) => c.id);
const listed = ids.includes(idA) && ids.includes(idB) && ids.includes(idC);
step('get_list_contains_created', list.status === 200 && listed, {
  http: list.status,
  found: { idA: ids.includes(idA), idB: ids.includes(idB), idC: ids.includes(idC) },
});

const keep = await api('POST', `/api/v1/lifeos/commitments/${idA}/keep`, {});
step('mark_kept_done', keep.status === 200 && keep.json?.commitment?.status === 'kept', {
  http: keep.status,
  status: keep.json?.commitment?.status,
});

const brk = await api('POST', `/api/v1/lifeos/commitments/${idB}/break`, { reason: 'slice-proof' });
step('mark_broken', brk.status === 200 && brk.json?.commitment?.status === 'broken', {
  http: brk.status,
  status: brk.json?.commitment?.status,
});

const snz = await api('POST', `/api/v1/lifeos/commitments/${idC}/snooze`, {});
step('mark_snooze_deferred_v1', snz.status === 200 && snz.json?.commitment?.snoozed_until, {
  http: snz.status,
  snoozed_until: snz.json?.commitment?.snoozed_until,
});

finish(report.steps.every((s) => s.ok) ? 0 : 1);
