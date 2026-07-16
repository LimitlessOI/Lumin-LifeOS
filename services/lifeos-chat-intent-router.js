/**
 * SYNOPSIS: Founder chat intent router — services/lifeos-chat-intent-router.js.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

const LOWERCASE_WORD_SPLIT = /[^a-z0-9]+/i;

function tokenize(text) {
  return String(text || '').toLowerCase().split(LOWERCASE_WORD_SPLIT).filter(Boolean);
}

function includesAny(text, phrases) {
  const lowered = String(text || '').toLowerCase();
  return phrases.some((p) => lowered.includes(p.toLowerCase()));
}

function startsBuildOrder(message) {
  const m = String(message || '').trim();
  return /^do\s*:/i.test(m)
    || /^execute\s*:/i.test(m)
    || /^run\s*:/i.test(m)
    || /^build\s+/i.test(m)
    || /^fix\s+/i.test(m)
    || /^add\s+/i.test(m)
    || /\b(change|update|create|make|write|edit|patch)\s+(the|a|this|that)?\s*\S+\s+(in|to|from)\b/i.test(m)
    || /\bset\s+or\s+replace\b/i.test(m);
}

export async function classifyFounderIntent(message, _context) {
  const m = String(message || '').trim();
  const tokens = tokenize(m);

  if (startsBuildOrder(m) && !includesAny(m, ['how do you', 'how does', 'explain', 'counsel only', 'do not run', 'don\'t run'])) {
    return { lane: 'direct_build', confidence: 0.95, payload: m };
  }

  if (includesAny(m, ['what does', 'how does', 'show me', 'describe', 'walk me through']) && includesAny(m, ['workflow', 'process', 'steps'])) {
    if (includesAny(m, ['social media', 'smos', 'content', 'relocation', 'marketing'])) {
      return { lane: 'workflow_content', confidence: 0.95, payload: 'smos', message: m };
    }
    if (includesAny(m, ['appointment', 'calendar', 'commitment', 'schedule'])) {
      return { lane: 'workflow_content', confidence: 0.9, payload: 'commitment', message: m };
    }
    if (includesAny(m, ['note', 'capture'])) {
      return { lane: 'workflow_content', confidence: 0.9, payload: 'note', message: m };
    }
    if (includesAny(m, ['check in', 'checkin', 'daily', 'what have you worked on'])) {
      return { lane: 'workflow_content', confidence: 0.9, payload: 'checkin', message: m };
    }
  }

  if (includesAny(m, ['social media os', 'smos', 'relocation content', 'content workflow', 'content pack'])) {
    return { lane: 'workflow_content', confidence: 0.9, payload: 'smos', message: m };
  }

  if (includesAny(m, ['appointment', 'dentist', 'meeting', 'call', 'commitment', 'schedule', 'calendar event']) && !includesAny(m, ['workflow'])) {
    return { lane: 'commitment', confidence: 0.85, payload: m };
  }

  if (includesAny(m, ['note', 'remember', 'jot down', 'capture this', 'make a note']) && !includesAny(m, ['workflow', 'build', 'do:'])) {
    return { lane: 'note', confidence: 0.8, payload: m };
  }

  if (includesAny(m, ['what have you worked on', 'check in', 'checkin', 'daily check', '15 minutes'])) {
    return { lane: 'checkin', confidence: 0.85, payload: m };
  }

  if (includesAny(m, ['ambient', 'listen', 'hearing', 'always listening', 'speech recognition'])) {
    return { lane: 'ambient', confidence: 0.8, payload: m };
  }

  if (includesAny(m, ['digital twin', 'my twin', 'twin context', 'simulation'])) {
    return { lane: 'digital_twin_context', confidence: 0.8, payload: m };
  }

  return { lane: 'counsel', confidence: 0.6, payload: m };
}

export async function buildSMOSWorkflowReply(intent, _context) {
  if (intent.payload === 'smos' || includesAny(intent.message, ['social media', 'smos', 'relocation', 'content'])) {
    const reply = `Social Media OS relocation content workflow:

1. Brief — we coach a 15-minute focused brief so you extract the core relocation story.
2. Extract — pull the key angles, objections, and moments that matter.
3. Generate — create a content brief plus 5–10 posts, titles, and hooks.
4. Approve — review, edit, or reject each piece in the approval queue.
5. Export — approved items go to the content calendar and a publish-ready export.
6. Record — for the top pieces, the film studio records clean takes with a teleprompter.
7. Publish — final assets are published to your channels with captions and tags.

It replaces the manual Zoom/Notion loop with one coached session → approved content pack.`;
    return { lane: 'workflow_content', reply, command_ran: false, ok: true };
  }
  return { lane: 'workflow_content', reply: 'I can describe that workflow once the relevant module is loaded.', command_ran: false, ok: true };
}

function buildTaskFromPayload(payload) {
  if (typeof payload !== 'string' || !payload.trim()) return '';
  const m = payload.trim();
  if (/^do\s*:/i.test(m)) return m;
  return `do: ${m}`;
}

export async function buildDirectBuildReply(intent, context, _options) {
  const task = buildTaskFromPayload(intent.payload);
  if (!task) {
    return { lane: 'direct_build', reply: 'I could not understand the build order.', command_ran: false, ok: false, pass_fail: 'FAIL', command_truth: 'NO_COMMAND_RAN', first_blocker: 'empty_build_payload' };
  }

  const routeToBuilder = context?.routeToBuilder;
  if (typeof routeToBuilder !== 'function') {
    return { lane: 'direct_build', reply: 'Build tool is not wired in this context.', command_ran: false, ok: false, pass_fail: 'FAIL', command_truth: 'NO_COMMAND_RAN', first_blocker: 'routeToBuilder_unavailable' };
  }

  try {
    const result = await routeToBuilder(task, context.operatorKey, { confirmIntent: true });
    const build = result || {};
    const sha = build.sha || build.commit_sha || null;
    const committed = build.ok === true && (build.committed === true || Boolean(sha));
    const passFail = committed ? 'PASS' : 'FAIL';
    const commandTruth = committed ? 'COMMITTED' : 'NO_COMMAND_RAN';
    if (committed) {
      const reply = `Done — that change committed${sha ? ` (${String(sha).slice(0, 12)})` : ''}${build.target_file ? ` to ${build.target_file}` : ''}. Command: ${commandTruth}. Pass/Fail: ${passFail}. Commit: ${sha || 'unknown'}. Transport: COMMIT_ONLY_NOT_LIVE.`;
      return { lane: 'direct_build', reply, command_ran: true, ok: true, pass_fail: passFail, command_truth: commandTruth, commit_sha: sha, target_file: build.target_file || null, duration_ms: build.duration_ms || null, build };
    }
    const blocker = build.first_blocker || build.blocker || build.error || 'build did not commit';
    const reply = `That build did not land: ${blocker}. Nothing was committed.`;
    return { lane: 'direct_build', reply, command_ran: false, ok: false, pass_fail: passFail, command_truth: commandTruth, first_blocker: blocker, build };
  } catch (error) {
    return { lane: 'direct_build', reply: `Build call failed: ${error.message}. Nothing was committed.`, command_ran: false, ok: false, pass_fail: 'FAIL', command_truth: 'NO_COMMAND_RAN', first_blocker: error.message };
  }
}

export async function buildCommitmentReply(intent, _context) {
  return { lane: 'commitment', reply: 'I heard a commitment. Once the calendar service is live I will turn this into an event and ask you to confirm.', command_ran: false, ok: true };
}

export async function buildNoteReply(intent, _context) {
  return { lane: 'note', reply: 'Got it — I will file that as a note once note capture is wired.', command_ran: false, ok: true };
}

export async function buildCheckinReply(intent, _context) {
  return { lane: 'checkin', reply: 'Let me know what you worked on for the last 15 minutes and I will make notes from it.', command_ran: false, ok: true };
}

export async function buildAmbientReply(intent, _context) {
  return { lane: 'ambient', reply: 'Tap the microphone icon in the chat bar to toggle ambient listening. When it is on, I will transcribe and append what you say.', command_ran: false, ok: true };
}

export async function buildDigitalTwinReply(intent, _context) {
  return { lane: 'digital_twin_context', reply: 'I will pull your twin context once the digital-twin loader is live.', command_ran: false, ok: true };
}

export async function buildCounselReply(intent, _context) {
  return { lane: 'counsel', reply: null, command_ran: false, ok: true };
}

export async function routeByIntent(message, context) {
  const classification = await classifyFounderIntent(message, context);
  switch (classification.lane) {
    case 'workflow_content':
      return buildSMOSWorkflowReply(classification, context);
    case 'direct_build':
      return buildDirectBuildReply(classification, context, {});
    case 'commitment':
      return buildCommitmentReply(classification, context);
    case 'note':
      return buildNoteReply(classification, context);
    case 'checkin':
      return buildCheckinReply(classification, context);
    case 'ambient':
      return buildAmbientReply(classification, context);
    case 'digital_twin_context':
      return buildDigitalTwinReply(classification, context);
    default:
      return buildCounselReply(classification, context);
  }
}
