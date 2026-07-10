/**
 * SYNOPSIS: Script — Verify Marketing Phase1 Live.
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
      consent_type: 'session_recording',
      consent_text: 'phase1-verify',
      owner_id,
    };

    const consent = await requestJson('POST', '/api/v1/marketing/consent', consentPayload);
    if (![200, 201].includes(consent.res.status)) {
      throw new Error(`POST /api/v1/marketing/consent expected 200 or 201, got ${consent.res.status}`);
    }
    consentOwnerId = owner_id;
    pushTest('POST /api/v1/marketing/consent with consent_type + consent_text + UUID owner_id', true, {
      status: consent.res.status,
      owner_id: consentOwnerId,
    });

    const sessionWithoutConsentPayload = {
      owner_id,
    };

    try {
      await requestJson('POST', '/api/v1/marketing/sessions', sessionWithoutConsentPayload, 400);
      pushTest('POST /api/v1/marketing/sessions without consent expects 400', true);
    } catch (err) {
      pushTest('POST /api/v1/marketing/sessions without consent expects 400', false, err?.message || String(err));
      throw err;
    }

    const sessionWithConsentPayload = {
      consent_record_id: consent.json?.id || consent.json?.consent_record_id || consent.json?.data?.id || null,
      owner_id,
    };

    const session = await requestJson('POST', '/api/v1/marketing/sessions', sessionWithConsentPayload);
    if (![200, 201].includes(session.res.status)) {
      throw new Error(`POST /api/v1/marketing/sessions expected 200 or 201, got ${session.res.status}`);
    }
    sessionId = session.json?.id || session.json?.session_id || session.json?.data?.id || null;
    pushTest('POST session with consent', true, {
      status: session.res.status,
      id: sessionId,
    });

    const coach = await requestJson('POST', `/api/v1/marketing/sessions/${encodeURIComponent(sessionId)}/coach`, { message: 'phase1-verify', owner_id }, 200);
    coachId = coach.json?.id || coach.json?.coach_id || coach.json?.data?.id || null;
    pushTest('POST /api/v1/marketing/sessions/:id/coach', true, {
      status: coach.res.status,
      id: coachId,
    });

    const extract = await requestJson('POST', `/api/v1/marketing/sessions/${encodeURIComponent(sessionId)}/extract`, { owner_id }, 200);
    pushTest('POST /api/v1/marketing/sessions/:id/extract', true, {
      status: extract.res.status,
    });

    const generate = await requestJson('POST', `/api/v1/marketing/sessions/${encodeURIComponent(sessionId)}/generate`, { owner_id }, 200);
    contentId = generate.json?.pieces?.[0]?.id || generate.json?.id || generate.json?.content_id || generate.json?.data?.id || null;
    pushTest('POST /api/v1/marketing/sessions/:id/generate', true, {
      status: generate.res.status,
      id: contentId,
    });

    if (!contentId) {
      throw new Error('missing content id after generate');
    }

    const approve = await requestJson('PATCH', `/api/v1/marketing/content/${encodeURIComponent(contentId)}`, { action: 'approve', owner_id }, 200);
    pushTest('PATCH /api/v1/marketing/content/:id approve', true, {
      status: approve.res.status,
    });

    const exportRes = await fetch(new URL(`/api/v1/marketing/sessions/${encodeURIComponent(sessionId)}/export?owner_id=${encodeURIComponent(owner_id)}`, PUBLIC_BASE_URL), {
      method: 'GET',
      headers: {
        'x-command-center-key': COMMAND_CENTER_KEY,
        'x-command-key': COMMAND_KEY,
        accept: '*/*',
      },
    });

    exportHref = `/api/v1/marketing/sessions/${encodeURIComponent(sessionId)}/export?owner_id=${encodeURIComponent(owner_id)}`;
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

  const nonBlockedFailures = state.tests.filter((t) => !t.ok).length;
  state.ok = state.blockers.length === 0 && nonBlockedFailures === 0;

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(state, null, 2) + '\n');

  if (nonBlockedFailures > 0) {
    process.exitCode = 1;
  } else if (state.blockers.length > 0) {
    process.exitCode = 1;
  } else {
    process.exitCode = 0;
  }
}

await main();
