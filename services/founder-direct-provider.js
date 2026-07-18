/**
 * SYNOPSIS: Founder direct provider test — live API only, no council, no simulation.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import { applyAiProseTruthEnvelope } from './ai-prose-truth-envelope.js';
import { refreshBuilderOsEnvFallback } from '../config/runtime-env.js';
const PROVIDERS = {
  gpt: { provider: 'openai', label: 'GPT' },
  openai: { provider: 'openai', label: 'GPT' },
  claude: { provider: 'anthropic', label: 'Claude' },
  anthropic: { provider: 'anthropic', label: 'Claude' },
  gemini: { provider: 'google', label: 'Gemini' },
  google: { provider: 'google', label: 'Gemini' },
};

function apiKeyFor(provider) {
  refreshBuilderOsEnvFallback();
  if (provider === 'openai') return process.env.OPENAI_API_KEY?.trim() || null;
  if (provider === 'anthropic') return process.env.ANTHROPIC_API_KEY?.trim() || null;
  if (provider === 'google') {
    return process.env.GEMINI_API_KEY?.trim()
      || process.env.GOOGLE_API_KEY?.trim()
      || process.env.GOOGLE_AI_KEY?.trim()
      || null;
  }
  return null;
}

function modelFor(provider) {
  if (provider === 'openai') {
    return process.env.OPENAI_MODEL || process.env.OPENAI_CHAT_MODEL || 'gpt-4o';
  }
  if (provider === 'anthropic') {
    return process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
  }
  return process.env.GEMINI_MODEL || 'gemini-2.5-flash';
}

function envelopeDirectText(text) {
  if (!text) return text;
  const { text: safe } = applyAiProseTruthEnvelope(String(text), {
    command_truth: 'NO_COMMAND_RAN',
    pass_fail: 'NO_COMMAND_RAN',
    taskType: 'founder_direct_provider',
    source: 'founder_direct_provider',
  });
  return safe;
}

function stampDirectResult(result) {
  if (!result || typeof result !== 'object') return result;
  const out = {
    ...result,
    counsel_only: true,
    command_truth: 'NO_COMMAND_RAN',
    pass_fail: result.ok ? 'NO_COMMAND_RAN' : 'FAIL',
  };
  if (typeof out.text === 'string') {
    out.text = envelopeDirectText(out.text);
  }
  return out;
}

export function parseFounderDirectProviderUtterance(utterance) {
  const raw = String(utterance || '').trim();
  const m = raw.match(/^talk to (gpt|openai|claude|anthropic|gemini|google)\s*:\s*(.*)$/i);
  if (!m) return null;
  const key = m[1].toLowerCase();
  const mapped = PROVIDERS[key];
  if (!mapped) return null;
  const prompt = String(m[2] || '').trim() || 'what model are you and what is 2+2?';
  return { provider: mapped.provider, label: mapped.label, prompt };
}

async function _callFounderDirectProviderRaw({ provider, prompt }) {
  const timestamp = new Date().toISOString();
  const model = modelFor(provider);
  const apiKey = apiKeyFor(provider);
  if (!apiKey) {
    return {
      ok: false,
      test: 'founder_direct_provider',
      provider,
      model,
      timestamp,
      request_id: null,
      error: `missing_api_key:${provider === 'google' ? 'GEMINI_API_KEY or GOOGLE_API_KEY' : `${provider.toUpperCase()}_API_KEY`}`,
      raw_response: null,
      text: null,
    };
  }

  const started = Date.now();
  try {
    if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 512,
          temperature: 0,
        }),
      });
      const raw = await res.json();
      const request_id = raw.id || res.headers.get('x-request-id') || null;
      if (!res.ok) {
        return {
          ok: false,
          test: 'founder_direct_provider',
          provider,
          model,
          timestamp,
          request_id,
          http_status: res.status,
          error: raw.error?.message || JSON.stringify(raw).slice(0, 500),
          raw_response: raw,
          text: null,
          latency_ms: Date.now() - started,
        };
      }
      const text = raw.choices?.[0]?.message?.content || '';
      return {
        ok: true,
        test: 'founder_direct_provider',
        provider,
        model: raw.model || model,
        timestamp,
        request_id,
        raw_response: raw,
        text,
        latency_ms: Date.now() - started,
      };
    }

    if (provider === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 512,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const raw = await res.json();
      const request_id = raw.id || res.headers.get('request-id') || null;
      if (!res.ok) {
        return {
          ok: false,
          test: 'founder_direct_provider',
          provider,
          model,
          timestamp,
          request_id,
          http_status: res.status,
          error: raw.error?.message || JSON.stringify(raw).slice(0, 500),
          raw_response: raw,
          text: null,
          latency_ms: Date.now() - started,
        };
      }
      const text = raw.content?.[0]?.text || '';
      return {
        ok: true,
        test: 'founder_direct_provider',
        provider,
        model: raw.model || model,
        timestamp,
        request_id,
        raw_response: raw,
        text,
        latency_ms: Date.now() - started,
      };
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 512, temperature: 0 },
      }),
    });
    const raw = await res.json();
    const request_id = raw.responseId || null;
    if (!res.ok) {
      return {
        ok: false,
        test: 'founder_direct_provider',
        provider: 'google',
        model,
        timestamp,
        request_id,
        http_status: res.status,
        error: raw.error?.message || JSON.stringify(raw).slice(0, 500),
        raw_response: raw,
        text: null,
        latency_ms: Date.now() - started,
      };
    }
    const text = raw.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
    return {
      ok: true,
      test: 'founder_direct_provider',
      provider: 'google',
      model,
      timestamp,
      request_id,
      raw_response: raw,
      text,
      latency_ms: Date.now() - started,
    };
  } catch (err) {
    return {
      ok: false,
      test: 'founder_direct_provider',
      provider,
      model,
      timestamp,
      request_id: null,
      error: err.message,
      raw_response: null,
      text: null,
      latency_ms: Date.now() - started,
    };
  }
}

export async function callFounderDirectProvider(args) {
  return stampDirectResult(await _callFounderDirectProviderRaw(args));
}

export function formatFounderDirectProviderReply(result) {
  if (!result) return 'founder_direct_provider: no result';
  const lines = [
    'FOUNDER DIRECT PROVIDER TEST',
    `provider: ${result.provider}`,
    `model: ${result.model}`,
    `timestamp: ${result.timestamp}`,
    `request_id: ${result.request_id || '—'}`,
    `ok: ${result.ok}`,
  ];
  if (result.error) lines.push(`error: ${result.error}`);
  if (result.text) {
    lines.push('');
    lines.push('response:');
    lines.push(result.text);
  }
  lines.push('');
  lines.push('raw_response:');
  lines.push(JSON.stringify(result.raw_response, null, 2));
  return lines.join('\n');
}
