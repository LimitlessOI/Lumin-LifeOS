/**
 * SYNOPSIS: Direct paid-provider API → tool call → LifeOS system proof event.
 * No council, no simulation, no repo edits.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import {
  createSystemProofEvent,
  getSystemProofEvent,
  proofToolDefinition,
  PROOF_TOOL_NAME,
  verificationCurlForProofEvent,
  verificationPathForProofEvent,
} from './lifeos-system-proof-event.js';
import { refreshBuilderOsEnvFallback } from '../config/runtime-env.js';

const PROVIDERS = {
  gpt: 'openai',
  openai: 'openai',
  claude: 'anthropic',
  anthropic: 'anthropic',
  gemini: 'google',
  google: 'google',
};

const PROVIDER_LABELS = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
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

const MEMBER_KEY_TO_PROVIDER = {
  openai_gpt: 'openai',
  claude_sonnet: 'anthropic',
  gemini_flash: 'google',
};

/** UI-selected engine → proof provider id (openai | anthropic | google). */
export function memberKeyToProofProvider(memberKey) {
  const key = String(memberKey || '').trim();
  return MEMBER_KEY_TO_PROVIDER[key] || null;
}

/** Founder trigger phrases — hard-routed before council/command/builder. */
export const PROVIDER_PROOF_TRIGGER_PATTERNS = [
  'provider proof',
  'create provider proof event',
  'create proof event',
  'create a lifeos proof event',
  'verify provider connection',
  'verify gpt connection',
  'verify claude connection',
  'verify gemini connection',
  'test gpt connection',
  'test claude connection',
  'test gemini connection',
  'check gpt connection',
  'check claude connection',
  'check gemini connection',
  'run provider proof',
  'do a provider proof',
  'ask gpt to create a lifeos proof event',
  'ask claude to create a lifeos proof event',
  'ask gemini to create a lifeos proof event',
  'proof record inside lifeos',
];

/**
 * Hard gate: any provider-proof utterance bypasses council, ChC, BuilderOS, staging.
 */
export function detectProviderProofIntent(utterance) {
  const raw = String(utterance || '').trim();
  const t = raw.toLowerCase();
  if (!t) return false;

  if (parseProviderToolProofUtterance(raw)) return true;
  if (/^(create|make)\s+(a\s+)?lifeos\s+proof\s+event\.?$/i.test(raw)) return true;
  if (/\b(run|execute|do|make|start)\s+(?:a\s+)?provider\s+proof\b/.test(t)) return true;
  if (/\b(verify|test|check|probe)\s+(provider|gpt|claude|gemini|openai|anthropic|google)(\s+\w+)?\s+connection\b/.test(t)) return true;
  if (/\bcreat(e|ing)\s+(a\s+)?(provider\s+)?proof\s+event\b/.test(t)) return true;
  if (/\bprovider\s+proof\b/.test(t)) return true;
  if (/\bproof\s+record\b/.test(t) && /\b(creat|record|show|inside lifeos|resulting)\b/.test(t)) return true;
  if (/\bverify\s+provider\s+connection\b/.test(t)) return true;

  return false;
}

/** Extract openai | anthropic | google from utterance text. */
export function extractProofProviderFromUtterance(utterance) {
  const t = String(utterance || '').toLowerCase();
  if (/\b(gpt|openai)\b/.test(t)) return 'openai';
  if (/\b(claude|anthropic)\b/.test(t)) return 'anthropic';
  if (/\b(gemini|google)\b/.test(t)) return 'google';
  return null;
}

export function resolveProviderProofProvider(utterance, councilMember, councilMemberKeys) {
  return (
    extractProofProviderFromUtterance(utterance)
    || memberKeyToProofProvider(councilMember)
    || (Array.isArray(councilMemberKeys) && councilMemberKeys[0]
      ? memberKeyToProofProvider(councilMemberKeys[0])
      : null)
  );
}

/** @deprecated use detectProviderProofIntent */
export function isCreateProofEventCommand(utterance) {
  return detectProviderProofIntent(utterance)
    && /^(create|make)\s+(a\s+)?lifeos\s+proof\s+event\.?$/i.test(String(utterance || '').trim());
}

/**
 * Parse founder utterance: "Ask GPT to create a LifeOS proof event."
 */
export function parseProviderToolProofUtterance(utterance) {
  const raw = String(utterance || '').trim();
  const m = raw.match(
    /^ask\s+(gpt|openai|claude|anthropic|gemini|google)\s+to\s+(?:create|make)\s+(?:a\s+)?lifeos\s+proof\s+event\.?$/i,
  );
  if (!m) return null;
  const provider = PROVIDERS[m[1].toLowerCase()];
  if (!provider) return null;
  return { provider, label: PROVIDER_LABELS[provider], utterance: raw };
}

function openAiTool() {
  const def = proofToolDefinition();
  return { type: 'function', function: def };
}

function anthropicTool() {
  const def = proofToolDefinition();
  return {
    name: def.name,
    description: def.description,
    input_schema: {
      type: 'object',
      properties: def.parameters.properties,
    },
  };
}

function googleTool() {
  const def = proofToolDefinition();
  return {
    name: def.name,
    description: def.description,
    parameters: {
      type: 'OBJECT',
      properties: {
        note: {
          type: 'STRING',
          description: 'Optional short note stored on the proof record',
        },
      },
    },
  };
}

function baseFailure({ provider, model, timestamp, error, httpStatus = null }) {
  return {
    ok: false,
    test: 'provider_tool_action_proof',
    provider,
    provider_label: PROVIDER_LABELS[provider] || provider,
    model,
    timestamp,
    provider_request_id: null,
    tool_called: false,
    tool_name: PROOF_TOOL_NAME,
    proof_event_id: null,
    record_id: null,
    verification_endpoint: null,
    verification_curl: null,
    error,
    http_status: httpStatus,
    council_used: false,
  };
}

function baseSuccess({
  provider,
  model,
  timestamp,
  providerRequestId,
  toolInput,
  proofEvent,
  baseUrl,
  providerRaw,
  toolCallRaw,
  latencyMs,
}) {
  const proofId = proofEvent.proof_event_id;
  return {
    ok: true,
    test: 'provider_tool_action_proof',
    provider,
    provider_label: PROVIDER_LABELS[provider] || provider,
    model,
    timestamp,
    provider_request_id: providerRequestId,
    tool_called: true,
    tool_name: PROOF_TOOL_NAME,
    tool_input: toolInput,
    proof_event_id: proofId,
    record_id: proofEvent.record_id,
    created_at: proofEvent.created_at,
    verification_endpoint: verificationPathForProofEvent(proofId, baseUrl),
    verification_curl: verificationCurlForProofEvent(proofId, baseUrl),
    latency_ms: latencyMs,
    council_used: false,
    provider_api_proof: {
      request_id: providerRequestId,
      model,
      tool_call: toolCallRaw,
    },
    system_action_proof: proofEvent,
    raw_provider_response: providerRaw,
  };
}

async function executeProofTool(pool, { userId, provider, model, providerRequestId, toolInput, utterance, sessionId, baseUrl }) {
  const note = toolInput?.note || `provider_api_proof:${provider}`;
  const proofEvent = await createSystemProofEvent(pool, {
    userId,
    provider,
    model,
    providerRequestId,
    toolName: PROOF_TOOL_NAME,
    note,
    utterance,
    sessionId,
    toolInput,
  });
  if (!proofEvent.ok) {
    return { ok: false, proofEvent };
  }
  return {
    ok: true,
    proofEvent: {
      ...proofEvent,
      verification_endpoint: verificationPathForProofEvent(proofEvent.proof_event_id, baseUrl),
      verification_curl: verificationCurlForProofEvent(proofEvent.proof_event_id, baseUrl),
    },
  };
}

async function callOpenAiWithTool({ apiKey, model, utterance }) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content:
            'You prove LifeOS API-to-system action by calling create_lifeos_system_proof_event. Do not claim you created a record without calling the tool.',
        },
        {
          role: 'user',
          content: utterance || 'Create a LifeOS proof event by calling create_lifeos_system_proof_event with note "openai_api_proof".',
        },
      ],
      tools: [openAiTool()],
      tool_choice: { type: 'function', function: { name: PROOF_TOOL_NAME } },
      max_tokens: 256,
      temperature: 0,
    }),
  });
  const raw = await res.json();
  const requestId = raw.id || res.headers.get('x-request-id') || null;
  if (!res.ok) {
    return { ok: false, raw, requestId, httpStatus: res.status, error: raw.error?.message || JSON.stringify(raw).slice(0, 500) };
  }
  const toolCalls = raw.choices?.[0]?.message?.tool_calls || [];
  const call = toolCalls.find((tc) => tc.function?.name === PROOF_TOOL_NAME) || toolCalls[0];
  if (!call?.function?.name) {
    return { ok: false, raw, requestId, error: 'provider_did_not_return_tool_call' };
  }
  let toolInput = {};
  try {
    toolInput = JSON.parse(call.function.arguments || '{}');
  } catch {
    toolInput = { note: 'openai_api_proof' };
  }
  return {
    ok: true,
    raw,
    requestId,
    model: raw.model || model,
    toolCall: call,
    toolInput,
  };
}

async function callAnthropicWithTool({ apiKey, model, utterance }) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 256,
      system:
        'You prove LifeOS API-to-system action by calling create_lifeos_system_proof_event. Do not claim you created a record without calling the tool.',
      messages: [
        {
          role: 'user',
          content: utterance || 'Create a LifeOS proof event by calling create_lifeos_system_proof_event with note "anthropic_api_proof".',
        },
      ],
      tools: [anthropicTool()],
      tool_choice: { type: 'tool', name: PROOF_TOOL_NAME },
    }),
  });
  const raw = await res.json();
  const requestId = raw.id || res.headers.get('request-id') || null;
  if (!res.ok) {
    return { ok: false, raw, requestId, httpStatus: res.status, error: raw.error?.message || JSON.stringify(raw).slice(0, 500) };
  }
  const toolUse = (raw.content || []).find((b) => b.type === 'tool_use' && b.name === PROOF_TOOL_NAME)
    || (raw.content || []).find((b) => b.type === 'tool_use');
  if (!toolUse?.name) {
    return { ok: false, raw, requestId, error: 'provider_did_not_return_tool_call' };
  }
  return {
    ok: true,
    raw,
    requestId,
    model: raw.model || model,
    toolCall: toolUse,
    toolInput: toolUse.input || { note: 'anthropic_api_proof' },
  };
}

async function callGoogleWithTool({ apiKey, model, utterance }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{
          text:
            'You prove LifeOS API-to-system action by calling create_lifeos_system_proof_event. Do not claim you created a record without calling the tool.',
        }],
      },
      contents: [{
        role: 'user',
        parts: [{
          text: utterance || 'Create a LifeOS proof event by calling create_lifeos_system_proof_event with note "google_api_proof".',
        }],
      }],
      tools: [{ functionDeclarations: [googleTool()] }],
      toolConfig: {
        functionCallingConfig: {
          mode: 'ANY',
          allowedFunctionNames: [PROOF_TOOL_NAME],
        },
      },
      generationConfig: { maxOutputTokens: 256, temperature: 0 },
    }),
  });
  const raw = await res.json();
  const requestId = raw.responseId || null;
  if (!res.ok) {
    return { ok: false, raw, requestId, httpStatus: res.status, error: raw.error?.message || JSON.stringify(raw).slice(0, 500) };
  }
  const parts = raw.candidates?.[0]?.content?.parts || [];
  const fnCall = parts.find((p) => p.functionCall?.name === PROOF_TOOL_NAME)?.functionCall
    || parts.find((p) => p.functionCall)?.functionCall;
  if (!fnCall?.name) {
    return { ok: false, raw, requestId, error: 'provider_did_not_return_tool_call' };
  }
  const toolInput = fnCall.args || { note: 'google_api_proof' };
  return {
    ok: true,
    raw,
    requestId,
    model,
    toolCall: fnCall,
    toolInput,
  };
}

/**
 * Call paid provider API with one LifeOS tool; execute tool → DB proof event.
 */
export async function executeProviderToolProofAction(pool, {
  provider,
  userId,
  utterance = null,
  sessionId = null,
  baseUrl = null,
}) {
  const timestamp = new Date().toISOString();
  const model = modelFor(provider);
  const apiKey = apiKeyFor(provider);
  if (!apiKey) {
    const keyName = provider === 'google' ? 'GEMINI_API_KEY or GOOGLE_API_KEY' : `${provider.toUpperCase()}_API_KEY`;
    return baseFailure({
      provider,
      model,
      timestamp,
      error: `missing_api_key:${keyName}`,
    });
  }
  if (!userId) {
    return baseFailure({ provider, model, timestamp, error: 'user_id_required' });
  }

  const started = Date.now();
  try {
    let providerResult;
    if (provider === 'openai') {
      providerResult = await callOpenAiWithTool({ apiKey, model, utterance });
    } else if (provider === 'anthropic') {
      providerResult = await callAnthropicWithTool({ apiKey, model, utterance });
    } else if (provider === 'google') {
      providerResult = await callGoogleWithTool({ apiKey, model, utterance });
    } else {
      return baseFailure({ provider, model, timestamp, error: `unsupported_provider:${provider}` });
    }

    if (!providerResult.ok) {
      return {
        ...baseFailure({
          provider,
          model: providerResult.model || model,
          timestamp,
          error: providerResult.error,
          httpStatus: providerResult.httpStatus,
        }),
        provider_request_id: providerResult.requestId,
        raw_provider_response: providerResult.raw,
      };
    }

    const exec = await executeProofTool(pool, {
      userId,
      provider,
      model: providerResult.model || model,
      providerRequestId: providerResult.requestId,
      toolInput: providerResult.toolInput,
      utterance,
      sessionId,
      baseUrl,
    });
    if (!exec.ok) {
      return {
        ...baseFailure({
          provider,
          model: providerResult.model || model,
          timestamp,
          error: exec.proofEvent?.error || 'proof_event_create_failed',
        }),
        provider_request_id: providerResult.requestId,
        tool_called: true,
        tool_input: providerResult.toolInput,
        raw_provider_response: providerResult.raw,
        system_action_error: exec.proofEvent,
      };
    }

    return baseSuccess({
      provider,
      model: providerResult.model || model,
      timestamp,
      providerRequestId: providerResult.requestId,
      toolInput: providerResult.toolInput,
      proofEvent: exec.proofEvent,
      baseUrl,
      providerRaw: providerResult.raw,
      toolCallRaw: providerResult.toolCall,
      latencyMs: Date.now() - started,
    });
  } catch (err) {
    return baseFailure({
      provider,
      model,
      timestamp,
      error: err.message,
    });
  }
}

export function formatProviderToolProofReply(result) {
  const lines = [
    'PROVIDER PROOF — direct system action (no council, no builder)',
    `ok: ${result.ok}`,
    `provider: ${result.provider_label || result.provider}`,
    `model: ${result.model}`,
    `timestamp: ${result.timestamp}`,
    `provider_request_id: ${result.provider_request_id || '—'}`,
    `tool_called: ${result.tool_called === true}`,
    `tool_name: ${result.tool_name || PROOF_TOOL_NAME}`,
    `proof_event_id: ${result.proof_event_id || '—'}`,
    `record_id: ${result.record_id || '—'}`,
    `verification_endpoint: ${result.verification_endpoint || '—'}`,
  ];
  if (result.verification_curl) lines.push(`verification_curl: ${result.verification_curl}`);
  if (result.error) lines.push(`error: ${result.error}`);
  if (result.tool_input) lines.push(`tool_input: ${JSON.stringify(result.tool_input)}`);
  if (result.proof_record?.ok) {
    lines.push('');
    lines.push('PROOF RECORD (LifeOS):');
    lines.push(`  id: ${result.proof_record.proof_event_id}`);
    lines.push(`  provider: ${result.proof_record.metadata?.provider || '—'}`);
    lines.push(`  model: ${result.proof_record.metadata?.model || '—'}`);
    lines.push(`  provider_request_id: ${result.proof_record.metadata?.provider_request_id || '—'}`);
    lines.push(`  created_at: ${result.proof_record.created_at || '—'}`);
    lines.push(`  verified: ${result.proof_record.verified === true}`);
    lines.push(`  status: ${result.proof_record.status || '—'}`);
  }
  lines.push(`council_used: ${result.council_used === true}`);
  return lines.join('\n');
}

/**
 * Execute provider proof and read back the stored record for founder-visible display.
 */
export async function handleProviderProofAction(pool, {
  userId,
  utterance,
  sessionId = null,
  baseUrl = null,
  councilMember = null,
  councilMemberKeys = null,
}) {
  const provider = resolveProviderProofProvider(utterance, councilMember, councilMemberKeys);
  if (!provider) {
    return {
      ok: false,
      test: 'provider_tool_action_proof',
      error: 'provider_not_specified',
      council_used: false,
      reply_text: formatProviderToolProofReply({
        ok: false,
        error: 'provider_not_specified — name GPT, Claude, or Gemini, or select in AI options',
        council_used: false,
      }),
    };
  }

  const proofResult = await executeProviderToolProofAction(pool, {
    provider,
    userId,
    utterance,
    sessionId,
    baseUrl,
  });

  if (proofResult.ok && proofResult.proof_event_id) {
    const proof_record = await getSystemProofEvent(pool, proofResult.proof_event_id);
    proofResult.proof_record = proof_record.ok ? proof_record : null;
  }

  return {
    ...proofResult,
    council_used: false,
    reply_text: formatProviderToolProofReply({ ...proofResult, council_used: false }),
  };
}
