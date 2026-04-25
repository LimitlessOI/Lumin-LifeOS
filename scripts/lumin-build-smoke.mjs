#!/usr/bin/env node
/**
 * Operator smoke test for the Lumin programming bridge — calls GET /build/health and optionally
 * POST /build/plan (costs a council/AI run; opt-in only).
 *
 * Usage:
 *   LUMIN_SMOKE_BASE_URL=http://localhost:3000 COMMAND_CENTER_KEY=... node scripts/lumin-build-smoke.mjs
 *   LUMIN_SMOKE_PLAN=1 node scripts/lumin-build-smoke.mjs   # also POST /build/plan (tiny goal)
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

const base = (process.env.LUMIN_SMOKE_BASE_URL || process.env.PUBLIC_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const key = process.env.COMMAND_CENTER_KEY || process.env.COMMAND_KEY || '';
const user = process.env.LUMIN_SMOKE_USER || 'adam';

const headers = {
  'content-type': 'application/json',
  ...(key ? { 'x-command-key': key } : {}),
};
const ERROR_HINTS = {
  '28P01': 'database_auth_failed: runtime DATABASE_URL credentials rejected',
  '42P01': 'missing_table: run migrations to create lumin_programming_jobs',
  'ECONNREFUSED': 'database_unreachable: cannot connect to database host',
};

async function main() {
  if (!key) {
    console.error('Missing COMMAND_CENTER_KEY (or COMMAND_KEY) — required for /api/v1/lifeos/chat/build/*');
    process.exit(2);
  }

  const healthUrl = `${base}/api/v1/lifeos/chat/build/health`;
  const r = await fetch(healthUrl, { headers });
  const text = await r.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    console.error('Non-JSON response', r.status, text.slice(0, 500));
    process.exit(1);
  }
  console.log('GET /build/health', r.status, JSON.stringify(json, null, 2));

  if (r.status !== 200 || !json.ok) {
    process.exit(1);
  }
  if (!json.build?.lumin_programming_jobs_reachable) {
    const code = json.build?.lumin_programming_jobs_error;
    const diagnosis = json.build?.lumin_programming_jobs_diagnosis || ERROR_HINTS[code] || code || 'unknown';
    console.error(`Build bridge unhealthy: ${diagnosis}`);
    console.error('Fix runtime DATABASE_URL / migration state before expecting /build/plan to succeed.');
    process.exit(1);
  }

  if (process.env.LUMIN_SMOKE_PLAN === '1' || process.env.LUMIN_SMOKE_PLAN === 'true') {
    if (!json.build?.luminBuildReady) {
      console.error('Lumin build not ready (missing pool, council, or table). Skipping /build/plan.');
      process.exit(1);
    }
    const planUrl = `${base}/api/v1/lifeos/chat/build/plan`;
    const pr = await fetch(planUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        user,
        goal: 'Smoke test: return a one-line acknowledgment only.',
      }),
    });
    const ptext = await pr.text();
    let pjson;
    try {
      pjson = JSON.parse(ptext);
    } catch {
      console.error('Plan non-JSON', pr.status, ptext.slice(0, 800));
      process.exit(1);
    }
    console.log('POST /build/plan', pr.status, JSON.stringify(pjson, null, 2));
    if (pr.status !== 200 || !pjson.ok) process.exit(1);
  } else {
    console.log('(Set LUMIN_SMOKE_PLAN=1 to also run POST /build/plan — uses council/AI.)');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
