#!/usr/bin/env node
/**
 * SYNOPSIS: Dual-path CI — fail if Hist product shipping still competes with BP_PRIORITY.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BP = path.join(ROOT, 'builderos-reboot/BP_PRIORITY.json');
const MQ = path.join(ROOT, 'builderos-reboot/MISSION_QUEUE.json');

const failures = [];
const ACTIVE = new Set(['queued', 'in_progress', 'ready', 'running', 'active', 'recovery_in_progress']);

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

const bp = loadJson(BP);
const mq = loadJson(MQ);

const bpIncomplete = (bp.missions || bp.items || []).filter((m) => {
  const st = String(m.status || m.state || '').toLowerCase();
  return st && !['complete', 'completed', 'done', 'archived', 'scrapped', 'pass'].includes(st);
});

const histProductActive = (mq.missions || []).filter((m) => {
  const id = String(m.mission_id || m.id || '');
  const st = String(m.status || '').toLowerCase();
  return id.startsWith('PRODUCT-') && ACTIVE.has(st);
});

if (histProductActive.length) {
  failures.push(
    `Hist MISSION_QUEUE has ${histProductActive.length} active PRODUCT mission(s); demote/archive — BP_PRIORITY is canonical`,
  );
}

if (process.env.BUILDER_QUEUE_ENABLED === '1' && bpIncomplete.length) {
  failures.push('BUILDER_QUEUE_ENABLED=1 while BP_PRIORITY has incomplete work — dual path forbidden');
}

if (failures.length) {
  console.error('DUAL-PATH SPINE: FAIL');
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}

console.log(
  `DUAL-PATH SPINE: PASS (bp_incomplete=${bpIncomplete.length}, hist_product_active=0)`,
);
process.exit(0);
