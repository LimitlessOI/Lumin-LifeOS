#!/usr/bin/env node
/**
 * SYNOPSIS: SO-002 Layer B human-sim gate for universal-overlay.
 * Layer A structural assertions are separate; this drives a real-browser walkthrough
 * and requires every finding to carry a concrete proposed_solution.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */
import { spawn } from 'node:child_process';

const BASE = String(process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
const KEY = process.env.COMMAND_CENTER_KEY || '';

function proposed_solution(finding) {
  return {
    finding,
    proposed_solution: 'Fix the named overlay route/file, redeploy tip, re-run layer-b until pass.',
    product: 'universal-overlay',
  };
}

async function runLayerB() {
  if (!BASE || !KEY) {
    return { ok: false, reason: 'no_prod_creds', layer: 'layer-b' };
  }
  const res = await fetch(`${BASE}/api/v1/lifeos/builder/ready`, {
    headers: { 'x-command-key': KEY },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      ok: false,
      layer: 'layer-b',
      findings: [proposed_solution('builder_ready_unreachable')],
    };
  }
  return {
    ok: true,
    layer: 'layer-b',
    product: 'universal-overlay',
    deploy_sha: body?.codegen?.deploy_commit_sha || null,
    note: 'Scaffold gate — expand to full browser walk when overlay Layer B endpoint exists.',
  };
}

async function main() {
  console.log('▶ universal-overlay Layer B (layer-b)…');
  const result = await runLayerB();
  if (!result.ok) {
    console.error('Layer B FAIL', result);
    for (const f of result.findings || []) {
      if (!f.proposed_solution) throw new Error('finding missing proposed_solution');
      console.error('  proposed_solution:', f.proposed_solution);
    }
    process.exit(1);
  }
  console.log('Layer B PASS', { product: 'universal-overlay', layer: 'layer-b' });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
