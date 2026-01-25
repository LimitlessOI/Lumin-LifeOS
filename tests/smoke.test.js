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

test('GET /healthz returns OK', async () => {
  const response = await fetchWithTimeout(`${BASE_URL}/healthz`);
  assert.strictEqual(response.ok, true, 'healthz should return 2xx status');
  const text = await response.text();
  assert.match(text, /OK|healthy/i, 'healthz should indicate OK status');
});

test('GET /api/v1/tools/status returns valid structure', async () => {
  const response = await fetchWithTimeout(`${BASE_URL}/api/v1/tools/status`, {
    headers: { 'x-lifeos-key': API_KEY }
  });

  assert.strictEqual(response.ok, true, 'tools/status should return 2xx status');
  const data = await response.json();
  assert.strictEqual(data.ok, true, 'tools/status should have ok:true');
  assert.ok(data.commands || data.ollama, 'tools/status should have commands or ollama');
});

test('GET /api/v1/auto-builder/status returns valid structure', async () => {
  const response = await fetchWithTimeout(`${BASE_URL}/api/v1/auto-builder/status`, {
    headers: { 'x-lifeos-key': API_KEY }
  });

  assert.strictEqual(response.ok, true, 'auto-builder/status should return 2xx status');
  const data = await response.json();
  assert.strictEqual(data.ok, true, 'auto-builder/status should have ok:true');
});

test('POST /api/v1/website/audit returns JSON (real or fallback)', async () => {
  const payload = {
    business_type: 'test',
    location: 'test',
    competitor_urls: ['https://example.com'],
    goals: ['increase leads']
  };

  const response = await fetchWithTimeout(`${BASE_URL}/api/v1/website/audit`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-lifeos-key': API_KEY
    },
    body: JSON.stringify(payload)
  }, 60000);

  assert.strictEqual(response.ok, true, 'website/audit should return 2xx status');
  const data = await response.json();

  // Should have either real audit data or fallback structure
  assert.ok(
    data.analysis || data.error || data.fallback,
    'website/audit should return structured JSON'
  );
});
