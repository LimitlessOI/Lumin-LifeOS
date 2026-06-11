#!/usr/bin/env node
/** Post-restart factory metrics — no deps beyond log file. */
import fs from 'node:fs';

const restart = fs.readFileSync('data/bri-runner-restart-ts.txt', 'utf8').trim();
const lines = fs.readFileSync('data/governed-autonomy-overnight-log.jsonl', 'utf8').trim().split('\n');

const m = {
  restart,
  starts: 0,
  product: 0,
  support: 0,
  proof: 0,
  patch: 0,
  fails: 0,
  http502: 0,
  syntax: 0,
  fv: 0,
  successes: 0,
  async_accepted: 0,
  product_only_skip_support: 0,
};

for (const line of lines) {
  let e;
  try {
    e = JSON.parse(line);
  } catch {
    continue;
  }
  if ((e.ts || '') < restart) continue;
  const ev = e.event || '';
  if (ev === 'task_execute_async_accepted') m.async_accepted++;
  if (ev === 'task_skip_support_product_only') m.product_only_skip_support++;
  if (ev === 'task_job_created') {
    m.starts++;
    const cat = e.category || '';
    const tid = (e.task_id || '').toLowerCase();
    const tgt = (e.target_file || '').toLowerCase();
    if (tid.includes('proof') || tgt.includes('proof')) m.proof++;
    else if (tid.includes('patch-plan') || cat === 'blueprint_patch_plan') m.patch++;
    else if (cat.startsWith('support_') || tid.includes('verify') || tid.includes('infra-health')) m.support++;
    else if (cat === 'blueprint_build') m.product++;
    else m.support++;
  }
  if (ev === 'task_success') m.successes++;
  if (ev === 'task_failed') {
    m.fails++;
    const blob = JSON.stringify(e).toUpperCase();
    if (blob.includes('HTTP_502') || String(e.blocker || '').includes('502')) m.http502++;
    else if (blob.includes('SYNTAX') || String(e.blocker || '').includes('syntax')) m.syntax++;
  }
  if (ev === 'status_summary_written') m.founder_value_deliveries = e.founder_value_deliveries;
}

const pct = (n, d) => (d ? Math.round((1000 * n) / d) / 10 : 0);
const out = {
  ...m,
  product_build_pct: pct(m.product, m.starts),
  support_verify_pct: pct(m.support, m.starts),
  proof_doc_pct: pct(m.proof, m.starts),
  http_502_pct: pct(m.http502, m.fails),
  syntax_pct: pct(m.syntax, m.fails),
};
console.log(JSON.stringify(out, null, 2));
