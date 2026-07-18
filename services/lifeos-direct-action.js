/**
 * SYNOPSIS: Founder -> LifeOS direct action bridge — real writes + proofs, no counsel theater.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
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
import { logFoodWithPhoto } from './lifeos-ai-photo-food-logger.js';
import { createCommitmentTracker } from './commitment-tracker.js';
import { createVictoryVault } from './victory-vault.js';
import { resolveLifeOSUserId } from './lifeos-user-resolver.js';
import { createLifeOSHabits } from './lifeos-habits.js';

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

function stripTailPunct(s = '') {
  return String(s || '').trim().replace(/[?.!]+$/g, '').trim();
}

/**
 * Parse LifeOS write / proof directives. Prefer startsWith / simple extract — tip Node
 * has been flaky with some `\b…(.+?)\s$` patterns.
 */
export function parseLifeOSDirectAction(text) {
  const raw = String(text || '').trim();
  if (!raw) return { matched: false, action_type: null };
  const lower = raw.toLowerCase();

  if (SHOW_PROOF_PATTERNS.some((pattern) => pattern.test(raw))) {
    return { matched: true, action_type: 'show_proof_record' };
  }
  if (PROVIDER_PROOF_PATTERNS.some((pattern) => pattern.test(raw))) {
    return { matched: true, action_type: 'provider_proof' };
  }

  // Food: "log food: eggs", "log food eggs", "i ate a burrito", "ate: salad"
  const foodColon = lower.match(/^(?:log\s+food|food\s+log|i\s+ate|ate)\s*:\s*(.+)$/i);
  const foodSpace = lower.match(/^(?:log\s+food|food\s+log)\s+(.+)$/i);
  const iAte = lower.match(/^i\s+ate\s+(.+)$/i);
  const foodDesc = stripTailPunct((foodColon || foodSpace || iAte)?.[1] || '');
  if (foodDesc) {
    return { matched: true, action_type: 'food_log', description: foodDesc };
  }

  // Sleep: "log sleep 7.5", "log sleep: 7 hours quality 4", "slept 7.5 hours"
  const sleepLine = lower.match(/^(?:log\s+sleep|sleep\s+log|slept)\s*:?\s*(.+)$/i);
  if (sleepLine) {
    const rest = sleepLine[1];
    const hours = rest.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hours?)?/);
    const quality = rest.match(/quality\s*[:=]?\s*([1-5])/);
    if (hours) {
      return {
        matched: true,
        action_type: 'sleep_log',
        hours_slept: Number(hours[1]),
        quality: quality ? Number(quality[1]) : null,
        notes: stripTailPunct(rest),
      };
    }
  }

  // Commitment: "commit: …", "commitment: …", "i commit to …"
  const commitColon = raw.match(/^(?:commit|commitment)\s*:\s*(.+)$/i);
  const commitTo = raw.match(/^i\s+commit\s+to\s+(.+)$/i);
  const commitTitle = stripTailPunct((commitColon || commitTo)?.[1] || '');
  if (commitTitle) {
    return { matched: true, action_type: 'commitment_create', title: commitTitle };
  }

  // Victory: "log victory: …", "victory: …"
  const victory = raw.match(/^(?:log\s+victory|victory(?:\s+log)?)\s*:\s*(.+)$/i);
  if (victory) {
    const title = stripTailPunct(victory[1]);
    if (title) {
      return {
        matched: true,
        action_type: 'victory_log',
        title,
        what_you_did: title,
      };
    }
  }

  // Habit: "complete habit morning walk", "mark habit X done", "habit done: walk"
  const habitDoneColon = lower.match(/^(?:habit\s+done|complete\s+habit|mark\s+habit)\s*:\s*(.+)$/i);
  const habitDone = lower.match(/^(?:complete\s+habit|mark\s+habit)\s+(.+?)(?:\s+done)?$/i);
  const habitName = stripTailPunct((habitDoneColon || habitDone)?.[1] || '');
  if (habitName && habitName !== 'done') {
    return { matched: true, action_type: 'habit_complete', habit_name: habitName };
  }
  const habitId = lower.match(/^(?:complete\s+habit|mark\s+habit)\s+(\d+)\b/);
  if (habitId) {
    return { matched: true, action_type: 'habit_complete', habit_id: Number(habitId[1]) };
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

function fail(actionType, error) {
  return {
    ok: false,
    matched: true,
    executed: false,
    action_type: actionType,
    result_record: null,
    visible_founder_message: `DIRECT ACTION FAILED\naction_type: ${actionType}\nexecuted: false\nerror: ${error}`,
    error,
  };
}

function okResult(actionType, record, human) {
  return {
    ok: true,
    matched: true,
    executed: true,
    action_type: actionType,
    result_record: record,
    visible_founder_message: human,
    error: null,
  };
}

async function resolveNumericUserId(pool, userId) {
  if (Number.isInteger(userId)) return userId;
  if (userId != null && /^\d+$/.test(String(userId).trim())) return parseInt(String(userId).trim(), 10);
  if (!pool) return null;
  return resolveLifeOSUserId(pool, 'adam');
}

async function executeFoodLog(pool, userId, parsed) {
  const row = await logFoodWithPhoto(pool, userId, { description: parsed.description });
  return okResult(
    'food_log',
    row,
    `Logged food: ${row.description || parsed.description} (id ${row.id}).`,
  );
}

async function executeSleepLog(pool, userId, parsed) {
  const hours = Number(parsed.hours_slept);
  if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
    return fail('sleep_log', 'hours_slept_invalid');
  }
  const sleepEnd = new Date();
  const sleepStart = new Date(sleepEnd.getTime() - hours * 3600 * 1000);
  // Tip schema: sleep_logs (sleep_start/sleep_end) — not lifeos_sleep_logs.
  const quality = parsed.quality != null
    ? Math.min(10, Math.max(1, Number(parsed.quality)))
    : null;
  const { rows } = await pool.query(
    `INSERT INTO sleep_logs (user_id, sleep_start, sleep_end, quality, source, notes)
     VALUES ($1, $2, $3, $4, 'chair_direct', $5)
     RETURNING *`,
    [userId, sleepStart.toISOString(), sleepEnd.toISOString(), quality, parsed.notes || null],
  );
  const row = rows[0];
  return okResult(
    'sleep_log',
    row,
    `Logged sleep: ${hours}h${quality != null ? ` quality ${quality}` : ''} (id ${row.id}).`,
  );
}

async function executeCommitment(pool, userId, parsed) {
  const tracker = createCommitmentTracker(pool, null);
  const c = await tracker.logCommitment({ userId, title: parsed.title, source: 'chair_direct' });
  return okResult(
    'commitment_create',
    c,
    `Commitment logged: ${c.title || parsed.title} (id ${c.id}).`,
  );
}

async function executeVictory(pool, userId, parsed) {
  const vault = createVictoryVault({ pool, callAI: null, logger: console });
  const moment = await vault.logMoment({
    userId,
    title: parsed.title,
    whatYouDid: parsed.what_you_did || parsed.title,
    sourceType: 'chair_direct',
  });
  return okResult(
    'victory_log',
    moment,
    `Victory logged: ${moment.title || parsed.title} (id ${moment.id}).`,
  );
}

async function executeHabitComplete(pool, userId, parsed) {
  const habits = createLifeOSHabits({ pool });
  let habitId = parsed.habit_id || null;
  let habitName = parsed.habit_name || null;
  const listed = await habits.listHabits(userId);
  if (!habitId && habitName) {
    const needle = habitName.toLowerCase();
    const hit = listed.find((h) => String(h.title || '').toLowerCase() === needle)
      || listed.find((h) => String(h.title || '').toLowerCase().includes(needle))
      || listed.find((h) => needle.includes(String(h.title || '').toLowerCase()));
    if (!hit) {
      // Auto-create named habit then complete — real write, not theater.
      const created = await habits.createHabit(userId, { title: habitName, frequency: 'daily' });
      habitId = created.id;
      habitName = created.title;
    } else {
      habitId = hit.id;
      habitName = hit.title;
    }
  }
  if (!habitId) return fail('habit_complete', 'habit_id_or_name_required');

  const completion = await habits.checkInHabit(userId, habitId, { completed: true });
  return okResult(
    'habit_complete',
    { habit_id: habitId, habit_name: habitName, completion },
    `Habit complete: ${habitName || `#${habitId}`} (completion id ${completion.id}).`,
  );
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

  const resolvedUserId = await resolveNumericUserId(pool, userId);
  if (!resolvedUserId && parsed.action_type !== 'provider_proof' && parsed.action_type !== 'show_proof_record') {
    return fail(parsed.action_type, 'user_id_required');
  }
  if (!resolvedUserId && (parsed.action_type === 'show_proof_record' || parsed.action_type === 'provider_proof')) {
    return fail(parsed.action_type, 'user_id_required');
  }

  try {
    if (parsed.action_type === 'food_log') {
      if (!pool) return fail('food_log', 'pool_unavailable');
      return await executeFoodLog(pool, resolvedUserId, parsed);
    }
    if (parsed.action_type === 'sleep_log') {
      if (!pool) return fail('sleep_log', 'pool_unavailable');
      return await executeSleepLog(pool, resolvedUserId, parsed);
    }
    if (parsed.action_type === 'commitment_create') {
      if (!pool) return fail('commitment_create', 'pool_unavailable');
      return await executeCommitment(pool, resolvedUserId, parsed);
    }
    if (parsed.action_type === 'victory_log') {
      if (!pool) return fail('victory_log', 'pool_unavailable');
      return await executeVictory(pool, resolvedUserId, parsed);
    }
    if (parsed.action_type === 'habit_complete') {
      if (!pool) return fail('habit_complete', 'pool_unavailable');
      return await executeHabitComplete(pool, resolvedUserId, parsed);
    }

    if (parsed.action_type === 'show_proof_record') {
      const latest = await listSystemProofEvents(pool, resolvedUserId, { limit: 1 });
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
      return fail('provider_proof', 'provider_not_resolved');
    }

    const providerToolProof = await executeProviderToolProofAction(pool, {
      provider,
      userId: resolvedUserId,
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
      error: providerToolProof.ok
        ? (proofRecord?.ok ? null : (proofRecord?.error || 'proof_record_readback_failed'))
        : providerToolProof.error,
    };
  } catch (err) {
    return fail(parsed.action_type, err.message || 'direct_action_failed');
  }
}