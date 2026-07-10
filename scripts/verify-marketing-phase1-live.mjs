/**
 * SYNOPSIS: Script — Verify Marketing Phase1 Live.
 */
import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';

const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL;
const COMMAND_CENTER_KEY = process.env.COMMAND_CENTER_KEY;

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
  state.blockers.push({ code, details });
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

async function main() {
  let consentOwnerId = null;
  let sessionId = null;
  let coachId = null;
  let contentId = null;
  let exportHref = null;

  try {
    const owner_id = crypto.randomUUID();
    if (!isUuid(owner_id)) {
      throw new Error('generated owner_id is not a UUID');
    }

    const consentPayload = {
      owner_id,
      session_recording: true,
    };

    const consent = await requestJson('POST', '/api/v1/marketing/consent', consentPayload, 200);
    consentOwnerId = owner_id;
    pushTest('POST /api/v1/marketing/consent with session_recording + UUID owner_id', true, {
      status: consent.res.status,
      owner_id: consentOwnerId,
    });

    const sessionWithoutConsentPayload = {
      owner_id,
      session_recording: true,
    };

    try {
      await requestJson('POST', '/api/v1/marketing/session', sessionWithoutConsentPayload, 400);
      pushTest('POST session without consent expects 400', true);
    } catch (err) {
      pushTest('POST session without consent expects 400', false, err?.message || String(err));
      throw err;
    }

    const sessionWithConsentPayload = {
      owner_id,
      session_recording: true,
      consent: true,
    };

    const session = await requestJson('POST', '/api/v1/marketing/session', sessionWithConsentPayload, 200);
    sessionId = session.json?.id || session.json?.session_id || session.json?.data?.id || null;
    pushTest('POST session with consent', true, {
      status: session.res.status,
      id: sessionId,
    });

    const coach = await requestJson('POST', '/api/v1/marketing/coach', { owner_id }, 200);
    coachId = coach.json?.id || coach.json?.coach_id || coach.json?.data?.id || null;
    pushTest('POST coach', true, {
      status: coach.res.status,
      id: coachId,
    });

    const extract = await requestJson('POST', '/api/v1/marketing/extract', { owner_id, session_id: sessionId }, 200);
    pushTest('POST extract', true, {
      status: extract.res.status,
    });

    const generate = await requestJson('POST', '/api/v1/marketing/generate', { owner_id, session_id: sessionId, coach_id: coachId }, 200);
    contentId = generate.json?.id || generate.json?.content_id || generate.json?.data?.id || null;
    pushTest('POST generate', true, {
      status: generate.res.status,
      id: contentId,
    });

    if (!contentId) {
      throw new Error('missing content id after generate');
    }

    const approve = await requestJson('PATCH', `/api/v1/marketing/content/${encodeURIComponent(contentId)}/approve`, { owner_id }, 200);
    pushTest('PATCH content approve', true, {
      status: approve.res.status,
    });

    const exportRes = await fetch(new URL(`/api/v1/marketing/content/${encodeURIComponent(contentId)}/export`, PUBLIC_BASE_URL), {
      method: 'GET',
      headers: {
        'x-command-center-key': COMMAND_CENTER_KEY,
        accept: '*/*',
      },
    });

    exportHref = `/api/v1/marketing/content/${encodeURIComponent(contentId)}/export`;
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
    if (String(err?.message || '').includes('STORAGE_R2_UNVERIFIED')) {
      pushBlocker('STORAGE_R2_UNVERIFIED', 'Audio upload is blocked because storage R2 is unverified.');
    } else {
      pushBlocker('RUN_FAILED', err?.message || String(err));
    }
  }

  const socialmediaosBlockers = {
    ok: false,
    blockers: [
      {
        code: 'STORAGE_R2_UNVERIFIED',
        why_cant_fix_now: 'Audio upload is excluded; STORAGE_* is not in the managed-env allowlist and remains unverified on Railway.',
        next_unblocking_action: 'Verify STORAGE_* handling in Railway managed env, then re-run the audio upload path.',
      },
      {
        code: 'LEGACY_SOCIALMEDIAOS_404',
        why_cant_fix_now: 'The canonical surface is /api/v1/marketing/*, so legacy SocialMediaOS routes are expected to 404.',
        next_unblocking_action: 'Use /api/v1/marketing/* for live verification and retire legacy route expectations.',
      },
      {
        code: 'SENTRY_LAYER_B_NOT_RUN',
        why_cant_fix_now: 'The browser walkthrough has not been run yet, so Layer B remains unverified.',
        next_unblocking_action: 'Run the Sentry browser walkthrough and record the result.',
      },
      {
        code: 'STALE_VERIFY_MARKETING_PHASE1_MJS',
        why_cant_fix_now: 'The old hallucinated script is still present, but the live verifier is scripts/verify-marketing-phase1-live.mjs.',
        next_unblocking_action: 'Remove or ignore the stale script and keep using scripts/verify-marketing-phase1-live.mjs as the live verifier.',
      },
    ],
  };

  const nonBlockedFailures = state.tests.filter((t) => !t.ok).length;
  state.ok = state.blockers.length === 0 && nonBlockedFailures === 0;

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(state, null, 2) + '\n');
  await fs.mkdir(path.dirname(blockersOutPath), { recursive: true });
  await fs.writeFile(blockersOutPath, JSON.stringify(socialmediaosBlockers, null, 2) + '\n');

  if (nonBlockedFailures > 0) {
    process.exitCode = 1;
  } else if (state.blockers.length > 0) {
    process.exitCode = 1;
  } else {
    process.exitCode = 0;
  }
}

await main();
