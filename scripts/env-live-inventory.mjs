#!/usr/bin/env node
/**
 * SYNOPSIS: Snapshot live Railway process.env presence (names only) into docs/ENV_LIVE_INVENTORY.json.
 * @ssot docs/ENV_REGISTRY.md
 *
 * Usage:
 *   PUBLIC_BASE_URL=… COMMAND_CENTER_KEY=… npm run env:inventory
 *
 * Never writes secret values — only names + present boolean + summary.
 * Re-run after any Railway variable add/remove/rename so the operator mirror stays current.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs/ENV_LIVE_INVENTORY.json');
const BASE = String(process.env.PUBLIC_BASE_URL || process.env.APP_URL || '').replace(/\/$/, '');
const KEY = process.env.COMMAND_CENTER_KEY || process.env.LIFEOS_KEY || process.env.API_KEY || '';

if (!BASE || !KEY) {
  console.error('Need PUBLIC_BASE_URL (or APP_URL) and COMMAND_CENTER_KEY');
  process.exit(1);
}

const res = await fetch(`${BASE}/api/v1/railway/managed-env/registry`, {
  headers: { 'x-command-key': KEY },
});
if (!res.ok) {
  console.error(`registry HTTP ${res.status}`);
  process.exit(1);
}
const body = await res.json();
const vars = Array.isArray(body.vars) ? body.vars : [];
const present = vars.filter((v) => v.present).map((v) => v.name).sort();
const absent = vars.filter((v) => !v.present).map((v) => v.name).sort();

const placesApi = present.includes('GOOGLE_PLACES_API_KEY');
const placesKey = present.includes('GOOGLE_PLACES_KEY');

const inventory = {
  schema: 'env_live_inventory_v1',
  captured_at: new Date().toISOString(),
  source: 'GET /api/v1/railway/managed-env/registry',
  tip_note: 'names + present boolean only — never secret values',
  update_rule:
    'Re-run npm run env:inventory after any Railway variable add/remove/rename. Same session: update docs/ENV_REGISTRY.md Deploy inventory + Changelog.',
  summary: body.summary || null,
  present,
  absent_tracked: absent,
  revenue_blockers: (body.revenueBlockers || []).map((x) => x.name),
  missing_critical: (body.missingCritical || []).map((x) => x.name),
  google_places: {
    GOOGLE_PLACES_KEY: placesKey ? 'PRESENT' : 'ABSENT',
    GOOGLE_PLACES_API_KEY: placesApi ? 'PRESENT' : 'ABSENT',
    go_vegas_discover_ready: placesKey || placesApi,
  },
  email_path: {
    EMAIL_FROM: present.includes('EMAIL_FROM') ? 'PRESENT' : 'ABSENT',
    EMAIL_PROVIDER: present.includes('EMAIL_PROVIDER') ? 'PRESENT' : 'ABSENT',
    POSTMARK_SERVER_TOKEN: present.includes('POSTMARK_SERVER_TOKEN') ? 'PRESENT' : 'ABSENT',
  },
};

fs.writeFileSync(OUT, `${JSON.stringify(inventory, null, 2)}\n`);
console.log(`wrote ${path.relative(ROOT, OUT)}`);
console.log(`present=${present.length} absent_tracked=${absent.length}`);
console.log(
  `GOOGLE_PLACES_KEY=${inventory.google_places.GOOGLE_PLACES_KEY} GOOGLE_PLACES_API_KEY=${inventory.google_places.GOOGLE_PLACES_API_KEY}`,
);
console.log(
  `EMAIL_FROM=${inventory.email_path.EMAIL_FROM} EMAIL_PROVIDER=${inventory.email_path.EMAIL_PROVIDER} POSTMARK=${inventory.email_path.POSTMARK_SERVER_TOKEN}`,
);
process.exit(0);
