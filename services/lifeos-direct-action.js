/**
 * SYNOPSIS: Founder -> LifeOS direct action bridge.
 * Founder -> LifeOS direct action bridge.
 * Hard-routed system actions only. No council, no personas, no builder staging.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import {
  executeProviderToolProofAction,
  memberKeyToProofProvider,
  resolveProviderProofProvider,
} from './founder-provider-tool-action.js';
import {
  getSystemProofEvent,
  listSystemProofEvents,
} from './lifeos-system-proof-event.js';

const PROVIDER_ALIASES = {
  gpt: 'openai',
  openai: 'openai',
  claude: 'anthropic',
  anthropic: 'anthropic',
  gemini: 'google',
  google: 'google',
};

const PROVIDER_PROOF_PATTERNS = [
  /\bcreate\s+provider\s+proof\s+event\b/i,
  /\bcreate\s+proof\s+event\b/i,
  /\bverify\s+provider\s+connection\b/i,
  /\bverify\s+gpt\s+connection\b/i,
  /\bverify\s+claude\s+connection\b/i,
  /\bverify\s+gemini\s+connection\b/i,
  /\brun\s+provider\s+proof\b/i,
];

const SHOW_PROOF_PATTERNS = [
  /\bshow\s+proof\s+record\b/i,
];

function normalizeProvider(value) {
  const key = String(value || '').trim().toLowerCase();
  return PROVIDER_ALIASES[key] || null;
}

export function parseLifeOSDirectAction(text) {
  const raw = String(text || '').trim();
  if (!raw) return { matched: false, action_type: null };
  if (SHOW_PROOF_PATTERNS.some((pattern) => pattern.test(raw))) {
    return { matched: true, action_type: 'show_proof_record' };
  }
  if (PROVIDER_PROOF_PATTERNS.some((pattern) => pattern.test(raw))) {
    return { matched: true, action_type: 'provider_proof' };
  }
  return { matched: false, action_type: null };
}

function resolveSelectedProvider(selectedProvider, selectedProviders) {
  const single = normalizeProvider(selectedProvider) || memberKeyToProofProvider(selectedProvider);
  if (single) return single;
  if (Array.isArray(selectedProviders)) {
    for (const item of selectedProviders) {
      const resolved = normalizeProvider(item) || memberKeyToProofProvider(item);
      if (resolved) return resolved;
    }
  }
  return null;
}

function buildProviderProofMessage(result, proofRecord) {
  const meta = proofRecord?.metadata || {};
  const record = proofRecord?.ok ? proofRecord : null;
  const lines = [
    result.ok ? 'DIRECT ACTION COMPLETE' : 'DIRECT ACTION FAILED',
    'action_type: provider_proof',
    `executed: ${result.ok === true}`,
    `provider: ${result.provider_label || result.provider || '—'}`,
    `model: ${result.model || '—'}`,
    `provider_request_id: ${result.provider_request_id || '—'}`,
    `proof_record_id: ${record?.proof_event_id || result.proof_event_id || '—'}`,
  ];
  if (record) {
    lines.push(`created_at: ${record.created_at || '—'}`);
    lines.push(`verified: ${record.verified === true}`);
    lines.push(`status: ${record.status || '—'}`);
  }
  if (result.error) lines.push(`error: ${result.error}`);
  if (!record && meta.provider_request_id) {
    lines.push(`readback_request_id: ${meta.provider_request_id}`);
  }
  return lines.join('\n');
}

function buildShowProofMessage(record) {
  const meta = record?.metadata || {};
  return [
    record?.ok ? 'DIRECT ACTION COMPLETE' : 'DIRECT ACTION FAILED',
    'action_type: show_proof_record',
    `executed: ${record?.ok === true}`,
    `proof_record_id: ${record?.proof_event_id || '—'}`,
    `provider: ${meta.provider || '—'}`,
    `model: ${meta.model || '—'}`,
    `provider_request_id: ${meta.provider_request_id || '—'}`,
    `created_at: ${record?.created_at || '—'}`,
    `verified: ${record?.verified === true}`,
    `status: ${record?.status || '—'}`,
  ].join('\n');
}

export async function executeLifeOSDirectAction(pool, {
  userId,
  text,
  sessionId = null,
  baseUrl = null,
  selectedProvider = null,
  selectedProviders = null,
} = {}) {
  const parsed = parseLifeOSDirectAction(text);
  if (!parsed.matched) {
    return {
      ok: true,
      matched: false,
      executed: false,
      action_type: null,
      result_record: null,
      visible_founder_message: null,
      error: null,
    };
  }

  if (!userId) {
    return {
      ok: false,
      matched: true,
      executed: false,
      action_type: parsed.action_type,
      result_record: null,
      visible_founder_message: `DIRECT ACTION FAILED\naction_type: ${parsed.action_type}\nexecuted: false\nerror: user_id_required`,
      error: 'user_id_required',
    };
  }

  if (parsed.action_type === 'show_proof_record') {
    const latest = await listSystemProofEvents(pool, userId, { limit: 1 });
    const record = latest?.ok && latest.events?.[0]
      ? await getSystemProofEvent(pool, latest.events[0].proof_event_id)
      : { ok: false, error: 'proof_record_not_found' };
    return {
      ok: record.ok === true,
      matched: true,
      executed: record.ok === true,
      action_type: 'show_proof_record',
      result_record: record.ok ? record : null,
      proof_record: record.ok ? record : null,
      visible_founder_message: buildShowProofMessage(record),
      error: record.ok ? null : (record.error || 'proof_record_not_found'),
    };
  }

  const provider =
    resolveProviderProofProvider(text, selectedProvider, selectedProviders)
    || resolveSelectedProvider(selectedProvider, selectedProviders);
  if (!provider) {
    return {
      ok: false,
      matched: true,
      executed: false,
      action_type: 'provider_proof',
      result_record: null,
      visible_founder_message: 'DIRECT ACTION FAILED\naction_type: provider_proof\nexecuted: false\nerror: provider_not_resolved',
      error: 'provider_not_resolved',
    };
  }

  const providerToolProof = await executeProviderToolProofAction(pool, {
    provider,
    userId,
    utterance: text,
    sessionId,
    baseUrl,
  });
  const proofRecord = providerToolProof?.proof_event_id
    ? await getSystemProofEvent(pool, providerToolProof.proof_event_id)
    : null;

  return {
    ok: providerToolProof.ok === true && proofRecord?.ok === true,
    matched: true,
    executed: providerToolProof.ok === true,
    action_type: 'provider_proof',
    provider_tool_proof: providerToolProof,
    result_record: proofRecord?.ok ? proofRecord : null,
    proof_record: proofRecord?.ok ? proofRecord : null,
    visible_founder_message: buildProviderProofMessage(providerToolProof, proofRecord),
    error: providerToolProof.ok ? (proofRecord?.ok ? null : (proofRecord?.error || 'proof_record_readback_failed')) : providerToolProof.error,
  };
}
