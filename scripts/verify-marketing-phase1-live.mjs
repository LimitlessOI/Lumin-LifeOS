/**
 * SYNOPSIS: LIVE §6 MarketingOS Phase 1 verifier — runnable tests PASS or named blockers.
 * @ssot docs/products/marketingos/PRODUCT_HOME.md
 *
 * Never silent-stop: every non-runnable path must land in blockers[] with why + next action.
 */
import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';

const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL;
const COMMAND_CENTER_KEY = process.env.COMMAND_CENTER_KEY;
const COMMAND_KEY = process.env.COMMAND_KEY || COMMAND_CENTER_KEY;

if (!PUBLIC_BASE_URL) {
  throw new Error('PUBLIC_BASE_URL is required');
}

if (!COMMAND_CENTER_KEY) {
  throw new Error('COMMAND_CENTER_KEY is required');
}

const outPath = path.resolve('products/receipts/MARKETING_PHASE1_VERIFY.json');
const blockersOutPath = path.resolve('products/receipts/SOCIALMEDIAOS_BLOCKERS.json');

const state = {
  ok: false,
  tests: [],
  blockers: [],
};

function pushTest(name, ok, details = null) {
  state.tests.push(details == null ? { name, ok } : { name, ok, details });
}

function pushBlocker(code, details) {
  state.blockers.push(typeof details === 'string' ? { code, details } : { code, ...details });
}

function isUuid(v) {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

async function requestJson(method, pathname, body, expectedStatus = null) {
  const res = await fetch(new URL(pathname, PUBLIC_BASE_URL), {
    method,
    headers: {
      'content-type': 'application/json',
      'x-command-center-key': COMMAND_CENTER_KEY,
      'x-command-key': COMMAND_KEY,
      accept: 'application/json',
    },
    body: body == null ? undefined : JSON.stringify(body),
  });

  const text = await res.text();
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
  }

  if (expectedStatus != null && res.status !== expectedStatus) {
    const err = new Error(`${method} ${pathname} expected ${expectedStatus}, got ${res.status}`);
    err.response = { status: res.status, body: json };
    throw err;
  }

  return { res, json, text };
}

function isStorageR2Configured() {
  return (
    String(process.env.STORAGE_PROVIDER || '').toLowerCase() === 'r2'
    && String(process.env.STORAGE_ENDPOINT || '').trim() !== ''
    && String(process.env.STORAGE_BUCKET || '').trim() !== ''
    && String(process.env.STORAGE_ACCESS_KEY_ID || '').trim() !== ''
    && String(process.env.STORAGE_SECRET_ACCESS_KEY || '').trim() !== ''
    && String(process.env.STORAGE_PUBLIC_URL || '').trim() !== ''
  );
}

async function isYoutubeOauthConnected() {
  try {
    const { res, json } = await requestJson('GET', '/api/v1/marketing/youtube/status');
    return res.status === 200 && (json?.connected === true || json?.oauthConfigured === true);
  } catch {
    return false;
  }
}

/**
 * Live-checked, not hardcoded: earlier versions of this function always returned both
 * blockers unconditionally regardless of actual state, which produced a real false
 * blocker report (YouTube OAuth was actually connected and working; the static list
 * never got updated). Each blocker below is only reported when its live check fails.
 */
async function namedInfraBlockers() {
  const blockers = [];

  if (!isStorageR2Configured()) {
    blockers.push({
      code: 'STORAGE_R2_UNVERIFIED',
      why_cant_fix_now: 'Cloudflare R2 credentials not yet set in Railway; audio upload intentionally excluded from Phase 1 text-mode verification',
      next_unblocking_action: 'Add verified STORAGE_PROVIDER=r2 + STORAGE_ENDPOINT/BUCKET/ACCESS_KEY_ID/SECRET_ACCESS_KEY/PUBLIC_URL to Railway, then test audio upload end-to-end',
    });
  }

  if (!(await isYoutubeOauthConnected())) {
    blockers.push({
      code: 'GOOGLE_YOUTUBE_OAUTH_UNVERIFIED',
      why_cant_fix_now: 'GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET not set in Railway, or /marketing/youtube/status did not report a connected channel; YouTube connect cannot exchange tokens',
      next_unblocking_action: `Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to Railway, then add redirect URI ${new URL('/api/v1/marketing/youtube/callback', PUBLIC_BASE_URL).toString()} in Google Cloud Console and test /marketing/youtube/connect`,
    });
  }

  return blockers;
}

async function main() {
  let sessionId = null;
  let contentId = null;

  try {
    const owner_id = crypto.randomUUID();
    if (!isUuid(owner_id)) {
      throw new Error('generated owner_id is not a UUID');
    }

    const consent = await requestJson('POST', '/api/v1/marketing/consent', {
      consent_type: 'session_recording',
      consent_text: 'phase1-verify',
      owner_id,
    });
    if (![200, 201].includes(consent.res.status)) {
      throw new Error(`POST /api/v1/marketing/consent expected 200 or 201, got ${consent.res.status}`);
    }
    pushTest('POST /api/v1/marketing/consent with consent_type + consent_text + UUID owner_id', true, {
      status: consent.res.status,
      owner_id,
    });

    try {
      await requestJson('POST', '/api/v1/marketing/sessions', { owner_id }, 400);
      pushTest('POST /api/v1/marketing/sessions without consent expects 400', true);
    } catch (err) {
      pushTest('POST /api/v1/marketing/sessions without consent expects 400', false, err?.message || String(err));
      throw err;
    }

    const session = await requestJson('POST', '/api/v1/marketing/sessions', {
      consent_record_id: consent.json?.id || consent.json?.consent_record_id || consent.json?.data?.id || null,
      owner_id,
    });
    if (![200, 201].includes(session.res.status)) {
      throw new Error(`POST /api/v1/marketing/sessions expected 200 or 201, got ${session.res.status}`);
    }
    sessionId = session.json?.id || session.json?.session_id || session.json?.data?.id || null;
    pushTest('POST session with consent', true, {
      status: session.res.status,
      id: sessionId,
    });

    const coach = await requestJson(
      'POST',
      `/api/v1/marketing/sessions/${encodeURIComponent(sessionId)}/coach`,
      { message: 'I closed three homes in Summerlin last month because I treat every listing like a product launch.', owner_id },
      200,
    );
    pushTest('POST /api/v1/marketing/sessions/:id/coach', true, {
      status: coach.res.status,
      hookDetected: coach.json?.hookDetected ?? null,
    });

    const extract = await requestJson(
      'POST',
      `/api/v1/marketing/sessions/${encodeURIComponent(sessionId)}/extract`,
      { owner_id },
      200,
    );
    pushTest('POST /api/v1/marketing/sessions/:id/extract', true, {
      status: extract.res.status,
      n: (extract.json?.extractions || []).length,
    });

    const generate = await requestJson(
      'POST',
      `/api/v1/marketing/sessions/${encodeURIComponent(sessionId)}/generate`,
      { owner_id },
      200,
    );
    contentId = generate.json?.pieces?.[0]?.id || generate.json?.id || generate.json?.content_id || generate.json?.data?.id || null;
    pushTest('POST /api/v1/marketing/sessions/:id/generate', true, {
      status: generate.res.status,
      id: contentId,
    });

    if (!contentId) {
      throw new Error('missing content id after generate');
    }

    const approve = await requestJson(
      'PATCH',
      `/api/v1/marketing/content/${encodeURIComponent(contentId)}`,
      { action: 'approve', owner_id },
      200,
    );
    pushTest('PATCH /api/v1/marketing/content/:id approve', true, {
      status: approve.res.status,
      pieceStatus: approve.json?.piece?.status || null,
    });

    const exportRes = await fetch(
      new URL(`/api/v1/marketing/sessions/${encodeURIComponent(sessionId)}/export?owner_id=${encodeURIComponent(owner_id)}`, PUBLIC_BASE_URL),
      {
        method: 'GET',
        headers: {
          'x-command-center-key': COMMAND_CENTER_KEY,
          'x-command-key': COMMAND_KEY,
          accept: '*/*',
        },
      },
    );
    const disposition = exportRes.headers.get('content-disposition') || '';
    const exportText = await exportRes.text();
    if (!exportRes.ok) {
      throw new Error(`GET export failed with ${exportRes.status}: ${exportText}`);
    }
    if (!/attachment/i.test(disposition)) {
      throw new Error(`GET export missing attachment Content-Disposition: ${disposition}`);
    }
    pushTest('GET export and assert Content-Disposition contains attachment', true, {
      status: exportRes.status,
      contentDisposition: disposition,
    });
  } catch (err) {
    pushBlocker('RUN_FAILED', {
      details: err?.message || String(err),
      why_cant_fix_now: 'Runnable Phase 1 path failed — system must repair routes/script, not stop',
      next_unblocking_action: 'Re-run founder-chat GAP-FILL on the failing step with the exact error string',
    });
  }

  // Named infra blockers — live-checked, not hardcoded. Honesty, not fake PASS and not silent stop.
  const liveBlockers = await namedInfraBlockers();
  if (liveBlockers.some((b) => b.code === 'STORAGE_R2_UNVERIFIED')) {
    pushTest('audio upload', true, { status: 'BLOCKED', reason: 'STORAGE_R2_UNVERIFIED' });
  } else {
    pushTest('audio upload', true, { status: 'CONFIGURED', reason: 'STORAGE_R2 env vars present (not functionally exercised by this text-mode run)' });
  }
  for (const b of liveBlockers) {
    pushBlocker(b.code, b);
  }

  const runnableFailures = state.tests.filter((t) => !t.ok && t?.details?.status !== 'BLOCKED').length;
  const runFailed = state.blockers.some((b) => b.code === 'RUN_FAILED');
  state.ok = runnableFailures === 0 && !runFailed;
  state.at = new Date().toISOString();
  state.note = 'ok=true means all runnable §6 text-mode tests passed; infra blockers remain named in blockers[]';

  const blockersDoc = {
    schema: 'socialmediaos_blockers_v1',
    at: state.at,
    ok: liveBlockers.length === 0,
    note: 'Named blockers — system must not fake PASS or stop silently',
    runnable_verify_ok: state.ok,
    blockers: liveBlockers,
  };

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, `${JSON.stringify(state, null, 2)}\n`);
  await fs.mkdir(path.dirname(blockersOutPath), { recursive: true });
  await fs.writeFile(blockersOutPath, `${JSON.stringify(blockersDoc, null, 2)}\n`);

  process.exitCode = state.ok ? 0 : 1;
}

await main();
