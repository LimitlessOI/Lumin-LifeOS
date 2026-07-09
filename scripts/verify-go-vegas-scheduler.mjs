#!/usr/bin/env node
/**
 * SYNOPSIS: Verify Go Vegas revenue scheduler is live — exports + GET /api/v1/go-vegas/scheduler.
 * @ssot docs/products/limitlessos/PRODUCT_HOME.md
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
const KEY = process.env.COMMAND_CENTER_KEY || '';

async function main() {
  const failures = [];
  const modPath = path.join(ROOT, 'services/go-vegas-outreach-scheduler.js');
  if (!fs.existsSync(modPath)) failures.push('missing services/go-vegas-outreach-scheduler.js');
  else {
    const mod = await import(pathToFileURL(modPath).href);
    for (const name of ['startGoVegasOutreachScheduler', 'getGoVegasOutreachSchedulerStatus']) {
      if (typeof mod[name] !== 'function') failures.push(`missing export ${name}`);
    }
    const src = fs.readFileSync(modPath, 'utf8');
    if (!/createUsefulWorkGuard\s*\(/.test(src)) failures.push('scheduler does not use createUsefulWorkGuard');
    if (/\.shouldRun\b/.test(src)) failures.push('scheduler invents createUsefulWorkGuard.shouldRun (broken contract)');
  }

  const boot = fs.readFileSync(path.join(ROOT, 'startup/register-founder-runtime-routes.js'), 'utf8');
  if (!boot.includes('startGoVegasOutreachScheduler')) {
    failures.push('startup/register-founder-runtime-routes.js missing startGoVegasOutreachScheduler wire');
  }

  const routes = fs.readFileSync(path.join(ROOT, 'routes/go-vegas-outreach-routes.js'), 'utf8');
  if (!routes.includes('/api/v1/go-vegas/scheduler')) {
    failures.push('routes/go-vegas-outreach-routes.js missing /api/v1/go-vegas/scheduler');
  }

  if (BASE && KEY) {
    const res = await fetch(`${BASE}/api/v1/go-vegas/scheduler`, {
      headers: { 'x-command-key': KEY },
    });
    const body = await res.json().catch(() => ({}));
    if (res.status === 404) failures.push('live GET /api/v1/go-vegas/scheduler → 404 (not mounted)');
    else if (!body?.ok) failures.push(`live scheduler status not ok: HTTP ${res.status}`);
  }

  if (failures.length) {
    console.error(JSON.stringify({ ok: false, failures }, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true, detail: 'go_vegas_scheduler_verified' }));
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err.message }));
  process.exit(1);
});
