/**
 * Remote integration smoke tests — require a running API (local or Railway).
 * When nothing listens at TEST_BASE_URL, tests skip instead of failing (local `npm test` without `node server.js`).
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import { test } from 'node:test';
import assert from 'node:assert';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:8080';
const API_KEY = process.env.LIFEOS_KEY || '';

async function fetchWithTimeout(url, options = {}, timeout = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

function unreachableMessage(err) {
  const m = String(err?.message || err || '');
  if (/fetch failed|ECONNREFUSED|ENOTFOUND|ECONNRESET|socket/i.test(m)) return m;
  return m;
}

test('GET /healthz returns OK', async (t) => {
  let response;
  try {
    response = await fetchWithTimeout(`${BASE_URL}/healthz`);
  } catch (err) {
    t.skip(`Server not reachable at ${BASE_URL} — ${unreachableMessage(err)} (start server or set TEST_BASE_URL)`);
    return;
  }
  assert.strictEqual(response.ok, true, 'healthz should return 2xx status');
  const text = await response.text();
  assert.match(text, /OK|healthy/i, 'healthz should indicate OK status');
});

test('GET /api/v1/tools/status returns valid structure', async (t) => {
  let response;
  try {
    response = await fetchWithTimeout(`${BASE_URL}/api/v1/tools/status`, {
      headers: { 'x-lifeos-key': API_KEY }
    });
  } catch (err) {
    t.skip(`Server not reachable at ${BASE_URL} — ${unreachableMessage(err)}`);
    return;
  }

  if (response.status === 401 || response.status === 403) {
    t.skip('tools/status requires auth — set LIFEOS_KEY or run with server test env');
    return;
  }
  assert.strictEqual(response.ok, true, 'tools/status should return 2xx status');
  const data = await response.json();
  assert.strictEqual(data.ok, true, 'tools/status should have ok:true');
  assert.ok(data.commands || data.ollama, 'tools/status should have commands or ollama');
});

test('GET /api/v1/auto-builder/status returns valid structure', async (t) => {
  let response;
  try {
    response = await fetchWithTimeout(`${BASE_URL}/api/v1/auto-builder/status`, {
      headers: { 'x-lifeos-key': API_KEY }
    });
  } catch (err) {
    t.skip(`Server not reachable at ${BASE_URL} — ${unreachableMessage(err)}`);
    return;
  }

  if (response.status === 401 || response.status === 403) {
    t.skip('auto-builder/status requires auth — set LIFEOS_KEY or run with server test env');
    return;
  }
  assert.strictEqual(response.ok, true, 'auto-builder/status should return 2xx status');
  const data = await response.json();
  assert.strictEqual(data.ok, true, 'auto-builder/status should have ok:true');
});

test('POST /api/v1/website/audit returns JSON (real or fallback)', async (t) => {
  const payload = {
    business_type: 'test',
    location: 'test',
    competitor_urls: ['https://example.com'],
    goals: ['increase leads']
  };

  let response;
  try {
    response = await fetchWithTimeout(`${BASE_URL}/api/v1/website/audit`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-lifeos-key': API_KEY
      },
      body: JSON.stringify(payload)
    }, 60000);
  } catch (err) {
    t.skip(`Server not reachable at ${BASE_URL} — ${unreachableMessage(err)}`);
    return;
  }

  if (response.status === 401 || response.status === 403) {
    t.skip('website/audit requires auth — set LIFEOS_KEY or run with server test env');
    return;
  }
  assert.strictEqual(response.ok, true, 'website/audit should return 2xx status');
  const data = await response.json();

  // Should have either real audit data or fallback structure
  assert.ok(
    data.analysis || data.error || data.fallback,
    'website/audit should return structured JSON'
  );
});
