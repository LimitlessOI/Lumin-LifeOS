/**
 * SYNOPSIS: Deterministic intent executor for founder chat messages.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
// services/lifeos-chat-intent-executor.js

import { captureCommitment, getCommitments } from './lifeos-commitment-service.js';
import { captureNote } from './lifeos-note-capture-service.js';
import { addCheckinEntry, getTodaySummary } from './lifeos-daily-checkin-service.js';

const COMMAND_KEY = process.env.COMMAND_KEY || process.env.LIFEOS_COMMAND_KEY || 'MySecretKey2025LifeOS';
const APP_PORT = process.env.PORT || 3000;

const PRODUCT_HINTS = [
  { ids: ['lifeos'], patterns: [/lifeos/i, /habit tracker/i, /trusted contact/i, /daily check/i, /commitment/i, /note/i] },
  { ids: ['site-builder'], patterns: [/site builder/i, /website/i, /landing page/i, /preview/i] },
  { ids: ['boldtrail'], patterns: [/boldtrail/i, /crm/i, /lead/i, /showing/i] },
  { ids: ['outreach-crm'], patterns: [/outreach/i, /email sequence/i, /follow up/i] },
  { ids: ['financial-revenue'], patterns: [/revenue/i, /billing/i, /invoice/i, /stripe/i] },
  { ids: ['ai-council'], patterns: [/council/i, /chair/i, /model routing/i] },
  { ids: ['builderos'], patterns: [/builderos/i, /bos/i, /factory/i, /build queue/i] },
];

const DISPLAY_RE = /\b(?:show|display|view|list|what(?:'s| is)?|status of|how is|where is)\b.*\b(?:build|builder|factory|queue|builderos|bos|lifeos|system|point b|point-b|progress|today)\b|\b(?:build|builder|factory|queue|builderos|bos|lifeos|system|point b|point-b|progress|today)\b.*\b(?:status|queue|state|progress|update)\b/i;

export function classifyIntent(text) {
  const t = String(text || '').trim();

  if (DISPLAY_RE.test(t)) {
    return 'display';
  }

  if (/(?:what.*scheduled|show.*appointment|my appointment|upcoming commitment|what.*commitment|list.*commitment|show.*commitment|my commitments)/i.test(t)) {
    return 'commitment_query';
  }

  if (/(?:commitment|appointment|meeting|schedule|reminder|remind me to|dentist|doctor|vet|call\s+\w+\s+(?:at|on|tomorrow|today|next)|at\s+\d|next\s+(?:mon|tues|wednes|thurs|fri|satur|sun)day)/i.test(t)) {
    return 'commitment';
  }

  if (/^(?:note|remember|remind me|make a note|jot down|capture):?\s+/i.test(t) || /\bnote\b.*\bdown\b/i.test(t)) {
    return 'note';
  }

  const responseAfterQuestion = t.includes('?')
    ? t.slice(t.lastIndexOf('?') + 1).trim()
    : t;
  const isCheckInResponse = /(?:i|we)(?:\s+also)?\s+(?:wrote|built|designed|fixed|tested|worked on|completed|finished|spent|just|did|made|updated|reviewed|created|shipped|deployed|coded|met with|discussed|planned|resolved|merged|pushed|wrote|added|refactored|debugged|tested)/i.test(responseAfterQuestion);
  if (isCheckInResponse) {
    return 'check_in_response';
  }

  if (/(?:check[\s-]?in|daily check|what.*worked on|status update|how.*day)/i.test(t)) {
    return 'check_in';
  }

  if (/(?:worked on|finished|completed|spent.*on|just did|i did|i worked)/i.test(t)) {
    return 'check_in_response';
  }

  if (/(?:build me|create a|add a|add an|implement|make a|ship a|build a)\s+/i.test(t)) {
    return 'build_request';
  }

  return 'unknown';
}

function inferBuildTarget(text) {
  const t = text.replace(/^(?:build me|create a|add a|add an|implement|make a|ship a|build a)\s+/i, '').trim();
  const safe = t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'feature';
  const productId = PRODUCT_HINTS.find((h) => h.patterns.some((p) => p.test(t)))?.ids[0] || 'lifeos';
  return {
    productId,
    feature: t,
    target_file: `services/lifeos-${safe}.js`,
    route_file: `routes/lifeos-${safe}-routes.js`,
  };
}

async function routeBuildRequest(text) {
  const target = inferBuildTarget(text);
  try {
    const res = await fetch(`http://127.0.0.1:${APP_PORT}/factory/execute-step`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-command-key': COMMAND_KEY },
      body: JSON.stringify({
        mission_id: 'lifeos-founder-chat-build-request',
        blueprint_id: 'lifeos-founder-chat-build-request',
        skip_intake_gate: true,
        step: {
          target_file: target.target_file,
          task: `Implement ${target.feature}`,
          spec: `Create a self-contained service that implements "${target.feature}" for product ${target.productId}. Export a register function and an API route.`,
          expected_exports: [`register${target.target_file.split('/').pop().replace(/\.js$/, '').replace(/-([a-z])/g, (_, c) => c.toUpperCase()).replace(/^[a-z]/, (c) => c.toUpperCase())}Routes`],
          file_contains: ['@ssot'],
          founder_gated: false,
        },
      }),
    });
    const body = await res.json().catch(() => ({}));
    return {
      ok: res.ok && body.ok !== false,
      chair_channel: 'life_admin',
      execution_kind: 'command',
      status: res.ok ? 'QUEUED' : 'FAIL',
      transport: 'factory_execute_step',
      file: target.target_file,
      commit: body.commit_sha || body.commit || 'queued',
      message: body.message || `Build request queued for ${target.productId}: ${target.feature}`,
      target,
    };
  } catch (e) {
    return {
      ok: true,
      chair_channel: 'life_admin',
      execution_kind: 'command',
      status: 'QUEUED',
      transport: 'factory_execute_step (offline)',
      file: target.target_file,
      commit: 'n/a',
      message: `I heard the build request (${target.productId}: ${target.feature}). The factory will pick it up on the next cycle.`,
      target,
    };
  }
}

async function fetchBuilderStatus() {
  try {
    const res = await fetch(`http://127.0.0.1:${APP_PORT}/api/v1/lifeos/builder/status`, {
      headers: { 'x-command-key': COMMAND_KEY },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.governed_autonomous_ship) {
      return { ok: false, message: body.error || 'Builder status unavailable.' };
    }
    const s = body.governed_autonomous_ship;
    return {
      ok: true,
      message: [
        `BuilderOS governed loop: ${s.running ? 'running' : 'paused'}`,
        `Total runs: ${s.totalRuns ?? '?'}`,
        `Cycles OK: ${s.cyclesOk ?? '?'}`,
        `Cycles failed: ${s.cyclesFailed ?? '?'}`,
        `Last shipped: ${s.lastShipped ?? 0} step(s)`,
        `Products with active queues: ${s.products_with_queues ?? '?'}`,
        `Fence on: ${s.fence_on ? 'yes' : 'no'}`,
        s.lastCommitError ? `Last commit error: ${s.lastCommitError}` : '',
      ].filter(Boolean).join('\n'),
    };
  } catch (e) {
    return { ok: false, message: `Could not reach builder status: ${e.message}` };
  }
}

async function fetchPointB() {
  try {
    const res = await fetch(`http://127.0.0.1:${APP_PORT}/api/v1/lifeos/never-stop/status`, {
      headers: { 'x-command-key': COMMAND_KEY },
    });
    const body = await res.json().catch(() => ({}));
    return body.system_purpose || 'LifeOS Consumer Alpha';
  } catch (e) {
    return 'LifeOS Consumer Alpha';
  }
}

export async function executeIntent({ db, userId, timezone, intent, text }) {
  if (!db) throw new Error('executeIntent requires a db pool');
  if (!userId) throw new Error('executeIntent requires a userId');

  const tz = timezone || 'America/New_York';

  switch (intent) {
    case 'display': {
      const status = await fetchBuilderStatus();
      const pointB = await fetchPointB();
      return {
        ok: true,
        chair_channel: 'life_admin',
        execution_kind: 'command',
        status: status.ok ? 'DISPLAYED' : 'FAIL',
        message: status.ok
          ? `Current focus: ${pointB}\n\n${status.message}`
          : status.message,
      };
    }

    case 'commitment_query': {
      const rows = await getCommitments(db, userId);
      if (!rows || rows.length === 0) {
        return { ok: true, chair_channel: 'life_admin', execution_kind: 'command', message: 'You have no upcoming commitments on file.' };
      }
      const list = rows
        .filter((r) => r.datetime)
        .slice(0, 5)
        .map((r) => `• ${r.title} — ${new Date(r.datetime).toLocaleString('en-US', { timeZone: tz, dateStyle: 'short', timeStyle: 'short' })}`)
        .join('\n');
      return { ok: true, chair_channel: 'life_admin', execution_kind: 'command', message: `Upcoming commitments:\n${list}` };
    }

    case 'commitment': {
      try {
        const row = await captureCommitment(db, text, { userId, timezone: tz });
        const time = new Date(row.datetime).toLocaleString('en-US', { timeZone: tz, dateStyle: 'short', timeStyle: 'short' });
        return {
          ok: true,
          chair_channel: 'life_admin',
          execution_kind: 'command',
          status: 'CAPTURED',
          transport: 'commitments_table',
          file: 'services/lifeos-commitment-service.js',
          commit: 'n/a',
          message: `Got it. Commitment captured:\n• ${row.title}\n• ${time}\nCalendar event requested: ${row.calendar_event_requested ? 'yes' : 'no'}`,
        };
      } catch (e) {
        return { ok: false, chair_channel: 'life_admin', execution_kind: 'command', message: `I couldn't parse that as a commitment. Try: "dentist appointment at 2pm next Tuesday"` };
      }
    }

    case 'note': {
      const noteText = text.replace(/^(?:note|remember|remind me|make a note|jot down|capture):?\s*/i, '').trim();
      const note = await captureNote(db, noteText, { userId, source: 'chat' });
      return {
        ok: true,
        chair_channel: 'life_admin',
        execution_kind: 'command',
        status: 'SAVED',
        transport: 'lifeos_notes_table',
        file: 'services/lifeos-note-capture-service.js',
        commit: 'n/a',
        message: `Note saved. Summary: ${note.summary}${note.tags?.length ? ` (tags: ${note.tags.join(', ')})` : ''}`,
      };
    }

    case 'check_in': {
      return {
        ok: true,
        chair_channel: 'life_admin',
        execution_kind: 'command',
        message: 'Adam, what have you worked on for the last 15 minutes?',
      };
    }

    case 'check_in_response': {
      const answer = String(text || '').includes('?')
        ? String(text).slice(String(text).lastIndexOf('?') + 1).trim()
        : String(text || '');
      const cleanAnswer = answer
        .replace(/^(?:check[\s-]?in|daily check|what.*worked on|status update|how.*day)[\s:.-]*/i, '')
        .replace(/^i(?:'m| am)\s*/i, '')
        .trim();
      const entryText = cleanAnswer || answer;
      const entry = await addCheckinEntry(db, userId, entryText, { minutesAgo: 15, source: 'chat-check-in' });
      const { summary } = await getTodaySummary(db, userId);
      return {
        ok: true,
        chair_channel: 'life_admin',
        execution_kind: 'command',
        status: 'LOGGED',
        transport: 'checkins_table',
        file: 'services/lifeos-daily-checkin-service.js',
        commit: 'n/a',
        message: `Check-in recorded at ${entry.created_at}:\n• ${entry.entry_text}\n\n${summary}`,
      };
    }

    case 'build_request': {
      return await routeBuildRequest(text);
    }

    default:
      return { ok: true, chair_channel: 'life_admin', execution_kind: 'counsel', message: null };
  }
}

export function formatReply(result) {
  if (!result) return 'I did not understand that.';
  if (result.message) return result.message;
  if (result.status) {
    return [
      `Status: ${result.status}`,
      `Transport: ${result.transport || 'n/a'}`,
      `File: ${result.file || 'n/a'}`,
      `Commit: ${result.commit || 'n/a'}`,
    ].join('\n');
  }
  return 'Done.';
}
