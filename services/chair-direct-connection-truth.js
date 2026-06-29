/**
 * SYNOPSIS: Lumin direct connection truth — personality OK, execution claims must match receipts.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

const FALSE_ACTION_SENTENCE = [
  /\b(lifeos|lifere|dashboard|drawer|shell|app)\s+(is now|has been|was)\s+(open|opened|loaded|running|live)\b/i,
  /\b(i('ve| have| am)?\s+(opened|open|launched|navigated|loaded|switched to|taken you))\b/i,
  /\b(opening|navigating|loading)\s+(lifeos|lifere|the app|your dashboard)\b/i,
  /\b(successfully executed|has been triggered|build has been|mission .{0,40} (complete|completed|executed))\b/i,
  /\b(updated according to|files have been|changes have been (made|applied|committed))\b/i,
  /\b(i('ve| have)?\s+(scheduled|booked|set up|arranged|confirmed))\b/i,
  /\b(your appointment is|i checked your calendar|i verified your)\b/i,
  /\b(deployed to production|committed to (git|github)|pushed to main)\b/i,
  /\b(done!|all set!|you're all set)\b/i,
  /\bwhat would you like to do first\b/i,
  /\b(i (ran|executed|triggered|dispatched|started) (the|your|a)?)\b/i,
  /\b(build (is )?(complete|done|running)|mission (is )?complete)\b/i,
  /\b(alpha (is )?reached|point b (is )?reached)\b/i,
  /\b(no blockers|everything (looks|is) good|ready for production)\b/i,
  /\b(i('ve| have)? (fixed|patched|updated|shipped) (it|that|the))\b/i,
];

/** Counsel deflection when founder ordered repair — meta-analysis instead of execute/HALT. */
const REPAIR_DEFLECTION_SENTENCE = [
  /\bthis suggests a disconnect\b/i,
  /\byou'?re testing (conversation|the|how)\b/i,
  /\b(you|your) (said|say) a sentence\b/i,
  /\bexpecting it to send\b/i,
  /\bwhat is the current status of the LifeRE\b/i,
];

const FALSE_ACTION_WHOLE = [
  /^lifeos is now open/i,
  /^opening lifeos/i,
  /^i('ve| have) opened/i,
];

export function detectCounselTheater(text = '', commandTruth = 'NO_COMMAND_RAN', opts = {}) {
  if (commandTruth !== 'NO_COMMAND_RAN') return { violation: false, hits: [] };
  const t = String(text || '').trim();
  if (!t) return { violation: false, hits: [] };
  const hits = [];
  for (const re of FALSE_ACTION_WHOLE) {
    if (re.test(t)) hits.push(re.source);
  }
  const sentenceRes = [...FALSE_ACTION_SENTENCE, ...REPAIR_DEFLECTION_SENTENCE];
  for (const sentence of t.split(/(?<=[.!?])\s+/)) {
    for (const re of sentenceRes) {
      if (re.test(sentence)) hits.push(sentence.slice(0, 80));
    }
  }
  for (const re of REPAIR_DEFLECTION_SENTENCE) {
    if (re.test(t)) hits.push(re.source);
  }
  return { violation: hits.length > 0, hits: [...new Set(hits)] };
}

export function scrubCounselTheater(text = '', commandTruth = 'NO_COMMAND_RAN') {
  const raw = String(text || '').trim();
  if (!raw || commandTruth !== 'NO_COMMAND_RAN') return raw;

  const sentences = raw.split(/(?<=[.!?])\s+/).filter(Boolean);
  const kept = [];
  let stripped = 0;

  for (const sentence of sentences) {
    const bad = FALSE_ACTION_SENTENCE.some((re) => re.test(sentence))
      || FALSE_ACTION_WHOLE.some((re) => re.test(sentence))
      || REPAIR_DEFLECTION_SENTENCE.some((re) => re.test(sentence));
    if (bad) {
      stripped += 1;
      continue;
    }
    kept.push(sentence);
  }

  if (kept.length === 0) {
    return '';
  }
  return kept.join(' ').trim();
}

const DIRECT_LUMIN_CHANNELS = new Set(['lumin', 'chair', 'counsel', 'life_admin', 'founder_interface']);

export function isDirectLuminConnection(truth = {}) {
  if (truth.direct_connection === false) return false;
  if (truth.direct_connection === true || truth.conversational_mode === true) return true;
  const channel = truth.chair_channel || truth.action || '';
  return truth.lumin_chair === true && DIRECT_LUMIN_CHANNELS.has(channel);
}

export function formatConversationalLuminReply(truth = {}, counselText = '') {
  const commandTruth = truth.command_truth || 'NO_COMMAND_RAN';
  const scrubbed = scrubCounselTheater(counselText, commandTruth);
  const theater = detectCounselTheater(counselText, commandTruth);

  if (commandTruth === 'COMMAND_RAN' || commandTruth === 'COMMITTED' || commandTruth === 'BUILD_ATTEMPTED') {
    return formatDirectConnectionReply(truth, counselText);
  }

  const body = (scrubbed || counselText || '').trim();
  if (body) return body;
  if (theater.violation || truth.theater_blocked) {
    return 'I removed a false action claim — nothing ran this turn. Tell me what to execute and I will.';
  }
  return '';
}

export function formatDirectConnectionReply(truth = {}, counselText = '') {
  const commandTruth = truth.command_truth || 'NO_COMMAND_RAN';
  const channel = truth.chair_channel || truth.action || 'lumin';
  const scrubbed = scrubCounselTheater(counselText, commandTruth);

  if (isDirectLuminConnection(truth) && commandTruth === 'NO_COMMAND_RAN') {
    return formatConversationalLuminReply(truth, counselText);
  }

  if (commandTruth === 'COMMAND_RAN' || commandTruth === 'COMMITTED' || commandTruth === 'BUILD_ATTEMPTED') {
    const header = commandTruth === 'COMMITTED'
      ? `✅ Shipped · Command: ${commandTruth}`
      : commandTruth === 'BUILD_ATTEMPTED'
        ? `⏳ Build attempted · Command: ${commandTruth}`
        : `✅ Done · Command: ${commandTruth}`;
    const meta = [
      channel !== 'lumin' ? `Channel: ${channel}` : null,
      truth.action_type ? `Action: ${truth.action_type}` : null,
    ].filter(Boolean).join(' · ');
    const lines = [header];
    if (meta) lines.push(meta);
    if (scrubbed || counselText) {
      lines.push('', scrubbed || counselText);
    }
    return lines.join('\n').trim();
  }

  const header = '💬 Counsel only · No command ran';
  const hint = 'To execute: say `do: …` or name an action (`open LifeRE`, `run alpha cycle`, `redeploy`).';
  const body = scrubbed || counselText || '';
  const theater = detectCounselTheater(counselText, commandTruth);
  const lines = [header];
  if (body) {
    lines.push('', body);
  } else if (theater.violation) {
    lines.push('', 'I almost claimed an action ran — that would have been theater. I did not execute anything.');
  }
  lines.push('', hint);
  return lines.join('\n').trim();
}

export function enforceDirectConnectionTruth(truth = {}) {
  const out = { ...truth };
  const commandTruth = out.command_truth || 'NO_COMMAND_RAN';
  const technical = out.human_summary_technical || out.human_summary || '';
  const theater = detectCounselTheater(technical, commandTruth);

  if (theater.violation && commandTruth === 'NO_COMMAND_RAN') {
    out.theater_blocked = true;
    out.theater_hits = theater.hits;
    out.truth_gate_violation = out.truth_gate_violation || 'COUNSEL_THEATER_BLOCKED';
    out.human_summary_technical = scrubCounselTheater(technical, commandTruth);
  }

  return out;
}
