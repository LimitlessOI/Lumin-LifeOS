#!/usr/bin/env node
/**
 * Triggers Railway redeploy via the RUNNING app.
 * Tries two paths in order:
 *   1. POST /api/v1/railway/deploy          — standard command-key auth
 *   2. POST /api/v1/railway/managed-env/self-redeploy — railway-token auth
 *      (works when COMMAND_CENTER_KEY is out of sync but RAILWAY_TOKEN is known)
 *
 * Env:
 *   PUBLIC_BASE_URL | BUILDER_BASE_URL | LUMIN_SMOKE_BASE_URL
 *   COMMAND_CENTER_KEY | COMMAND_KEY | LIFEOS_KEY | API_KEY
 *   RAILWAY_TOKEN  (optional — enables self-redeploy fallback)
 *
 * Usage:
 *   npm run system:railway:redeploy
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

const base = (
  process.env.BUILDER_BASE_URL ||
  process.env.PUBLIC_BASE_URL ||
  process.env.LUMIN_SMOKE_BASE_URL ||
  ''
).replace(/\/$/, '');

const key =
  process.env.COMMAND_CENTER_KEY ||
  process.env.COMMAND_KEY ||
  process.env.LIFEOS_KEY ||
  process.env.API_KEY ||
  '';

const railwayToken = process.env.RAILWAY_TOKEN || '';

async function tryDeploy(url, headers) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: '{}',
  });
  const text = await r.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { ok: false, error: text.slice(0, 200) }; }
  return { status: r.status, ok: r.ok, json };
}

async function main() {
  if (!base) {
    console.error('❌ Set PUBLIC_BASE_URL (or BUILDER_BASE_URL) to the deploy origin.');
    process.exit(2);
  }

  // ── Path 1: standard command-key deploy ────────────────────────────────────
  if (key) {
    console.log(`Trying POST /api/v1/railway/deploy with command key…`);
    const { status, ok, json } = await tryDeploy(
      `${base}/api/v1/railway/deploy`,
      { 'x-command-key': key },
    );
    if (ok && json.ok) {
      console.log(JSON.stringify(json, null, 2));
      console.log('\n✅ Redeploy triggered via command-key path.\n');
      process.exit(0);
    }
    if (status !== 401 && status !== 403) {
      // Non-auth failure — surface it
      console.error(`HTTP ${status}:`, JSON.stringify(json));
      process.exit(1);
    }
    console.warn(`⚠️  Command-key auth failed (${status}) — trying railway-token fallback…`);
  } else {
    console.warn('No command key in env — skipping command-key path.');
  }

  // ── Path 2: railway-token self-redeploy (no command key needed) ─────────────
  if (railwayToken) {
    console.log(`Trying POST /api/v1/railway/managed-env/self-redeploy with RAILWAY_TOKEN…`);
    const { status, ok, json } = await tryDeploy(
      `${base}/api/v1/railway/managed-env/self-redeploy`,
      { 'x-railway-token': railwayToken },
    );
    if (ok && json.ok) {
      console.log(JSON.stringify(json, null, 2));
      console.log('\n✅ Redeploy triggered via RAILWAY_TOKEN self-redeploy path.\n');
      process.exit(0);
    }
    console.error(`HTTP ${status}:`, JSON.stringify(json));
    process.exit(1);
  }

  // ── No viable auth ──────────────────────────────────────────────────────────
  console.error(
    '\n❌ No viable auth for redeploy.\n' +
    '   • Set COMMAND_CENTER_KEY matching Railway vault, OR\n' +
    '   • Set RAILWAY_TOKEN (from Railway → Account Settings → Tokens)\n' +
    '   Then re-run: npm run system:railway:redeploy\n',
  );
  process.exit(2);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
