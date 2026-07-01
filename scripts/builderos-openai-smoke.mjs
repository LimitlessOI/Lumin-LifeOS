#!/usr/bin/env node
/**
 * SYNOPSIS: Minimal BuilderOS OpenAI lane smoke.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import 'dotenv/config';
import './lib/load-builderos-env.mjs';

const apiKey = String(process.env.OPENAI_API_KEY || '').trim();

if (!apiKey) {
  console.error(JSON.stringify({
    ok: false,
    error: 'OPENAI_API_KEY_MISSING',
    detail: 'No OPENAI_API_KEY loaded from shell, .env, .env.local, or .env.builderos.',
  }, null, 2));
  process.exit(1);
}

const response = await fetch('https://api.openai.com/v1/responses', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    authorization: `Bearer ${apiKey}`,
  },
  body: JSON.stringify({
    model: process.env.BUILDEROS_MODEL_DEFAULT || 'gpt-5.4-mini',
    max_output_tokens: 30,
    input: 'Reply with exactly BUILDEROS_SMOKE_PASS',
  }),
});

const payload = await response.json().catch(() => null);
if (!response.ok) {
  console.error(JSON.stringify({
    ok: false,
    status: response.status,
    payload,
  }, null, 2));
  process.exit(1);
}

const text = Array.isArray(payload?.output)
  ? payload.output
      .flatMap((item) => item?.content || [])
      .map((item) => item?.text || '')
      .join(' ')
      .trim()
  : '';

const ok = text.includes('BUILDEROS_SMOKE_PASS');
console.log(JSON.stringify({
  ok,
  model: payload?.model || null,
  text,
  usage: payload?.usage || null,
}, null, 2));
process.exit(ok ? 0 : 1);
