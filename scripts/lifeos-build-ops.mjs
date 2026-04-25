#!/usr/bin/env node
/**
 * Fetches read-only Lumin build ops aggregates (no AI, no council).
 *
 *   LUMIN_SMOKE_BASE_URL=https://... COMMAND_CENTER_KEY=... node scripts/lifeos-build-ops.mjs
 *   LUMIN_OPS_HOURS=48 node scripts/lifeos-build-ops.mjs
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

const base = (process.env.LUMIN_SMOKE_BASE_URL || process.env.PUBLIC_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const key = process.env.COMMAND_CENTER_KEY || process.env.COMMAND_KEY || '';
const user = process.env.LUMIN_OPS_USER || 'adam';
const hours = process.env.LUMIN_OPS_HOURS || '24';

const headers = {
  ...(key ? { 'x-command-key': key } : {}),
};

async function main() {
  if (!key) {
    console.error('Missing COMMAND_CENTER_KEY (or COMMAND_KEY)');
    process.exit(2);
  }
  const url = `${base}/api/v1/lifeos/chat/build/ops?user=${encodeURIComponent(user)}&hours=${encodeURIComponent(hours)}`;
  const r = await fetch(url, { headers });
  const text = await r.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    console.error('Non-JSON', r.status, text.slice(0, 600));
    process.exit(1);
  }
  console.log(JSON.stringify(json, null, 2));
  if (r.status !== 200 || !json.ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
