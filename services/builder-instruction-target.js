/**
 * Parse repo-relative target paths and domains from operator/build instructions.
 * Shared by Voice Rail command executor and BuilderOS PBB planner.
 *
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */

const TARGET_FILE_RE =
  /\b((?:scripts|services|routes|public|config|startup|db\/migrations|builderos-reboot)\/[\w./-]+\.(?:mjs|cjs|js|html|sql|md|json))\b/i;

export function extractTargetFileFromInstruction(instruction) {
  const text = String(instruction || '');
  const match = text.match(TARGET_FILE_RE);
  return match?.[1]?.replace(/\\/g, '/') || null;
}

const EXPLICIT_TARGET_RE = /target_file:\s*([^\s]+\.(?:html|js|css|md|json))/i;

const UI_FEEDBACK_RE =
  /\b(color|colour|css|style|background|font|yellow|black|text|button|drawer|chat|message|bubble|response|responses|lumin|overlay|ui|interface|panel|padding|margin|border|hover|theme|sidebar|fab|dock)\b/i;

const RESPONSE_UI_RE = /\b(responses?|reply|replies|assistant message|your message|your response)\b/i;

export const CANONICAL_FOUNDER_UI_TARGET = 'public/overlay/lifeos-app.html';

/**
 * Resolve target_file when founder gives product/UI feedback without naming a path.
 * Returns { target_file, source, confidence } or null.
 */
export function inferTargetFileFromFounderFeedback(instruction) {
  const text = String(instruction || '');
  const explicitPath = extractTargetFileFromInstruction(text);
  if (explicitPath) {
    return { target_file: explicitPath, source: 'explicit_path', confidence: 'high' };
  }
  const tagged = text.match(EXPLICIT_TARGET_RE);
  if (tagged) {
    return { target_file: tagged[1].replace(/^\//, ''), source: 'target_file_tag', confidence: 'high' };
  }
  if (/lifeos-communication-os|communication-os\.js/i.test(text)) {
    return { target_file: 'public/overlay/lifeos-communication-os.js', source: 'keyword_match', confidence: 'medium' };
  }
  if (/\bdashboard\b/i.test(text) && UI_FEEDBACK_RE.test(text)) {
    return { target_file: 'public/overlay/lifeos-dashboard.html', source: 'keyword_match', confidence: 'medium' };
  }
  if (/voice.?rail/i.test(text)) {
    return { target_file: 'public/overlay/lifeos-voice-rail-v1.html', source: 'keyword_match', confidence: 'medium' };
  }
  if (UI_FEEDBACK_RE.test(text) || RESPONSE_UI_RE.test(text)) {
    return { target_file: CANONICAL_FOUNDER_UI_TARGET, source: 'ui_heuristic', confidence: 'medium' };
  }
  return null;
}

/** Best-effort target for founder build path — explicit path wins, then UI heuristics. */
export function resolveFounderBuildTarget(instruction) {
  return extractTargetFileFromInstruction(instruction)
    || inferTargetFileFromFounderFeedback(instruction)?.target_file
    || null;
}

export function augmentTaskWithGapFillScope(task, targetFile) {
  const base = String(task || '').trim();
  if (base.includes(`target_file: ${targetFile}`)) return base;
  return [
    base,
    '',
    'GAP-FILL scoped patch ONLY.',
    `target_file: ${targetFile}`,
    'DO NOT rewrite the whole file.',
    'Change only the CSS/DOM block needed for this request.',
  ].join('\n');
}

export function isMissingTargetFileBlocker(blocker = '') {
  return /target_file is required|target_file not in placement|needs_target/i.test(String(blocker));
}

export function isRepairContinuationIntent(text = '') {
  const t = String(text || '').trim();
  if (!t) return false;
  if (/^(keep trying|try again|retry|don't stop|do not stop|never stop|fix why|fix the problem|fix the issues|ok now fix|you are never)/i.test(t)) {
    return true;
  }
  return /\b(keep trying|never stop|don't stop|do not stop|fix why you failed|fix the problems|not a finishing point|just a lesson|whatever it takes|no stopping till|solve the issue|solve the problem)\b/i.test(t);
}

/** Walk recent chat — find last substantive build ask before a repair continuation. */
export function extractPriorBuildTask(recentMessages, currentText) {
  if (!isRepairContinuationIntent(currentText)) return null;
  const msgs = Array.isArray(recentMessages) ? recentMessages : [];
  for (let i = msgs.length - 1; i >= 0; i -= 1) {
    const m = msgs[i];
    const role = String(m?.role || m?.sender || '').toLowerCase();
    const content = String(m?.content || m?.text || m?.user_message || '').trim();
    if (role !== 'user' || !content || content === currentText) continue;
    if (isRepairContinuationIntent(content)) continue;
    if (/\b(fix|change|color|colour|make|update|add|remove|set|adjust|improve|build|implement)\b/i.test(content)) {
      return content;
    }
  }
  return null;
}

/** @deprecated alias — Voice Rail founder utterances use the same path grammar */
export const extractTargetFileFromFounderUtterance = extractTargetFileFromInstruction;

export function inferBuilderDomainForTargetFile(targetFile) {
  const path = String(targetFile || '').replace(/\\/g, '/');
  if (path.startsWith('builderos-reboot/')) return 'builderos-platform';
  return 'lifeos-platform';
}

const PROSE_REFUSAL_PREFIX =
  /^(I cannot|I can't|Unfortunately|The content of|The file content was not|I need the|Please provide|I do not have|I'm unable|I am unable)/i;

/** Detect council prose refusals masquerading as codegen output. */
export function looksLikeBuilderProseRefusal(output, targetFile) {
  const text = String(output || '').trim();
  if (!text || !targetFile) return false;
  if (!/\.(js|mjs|cjs)$/i.test(String(targetFile))) return false;
  if (PROSE_REFUSAL_PREFIX.test(text)) return true;
  if (/was not provided/i.test(text) && text.length < 4000) return true;
  const looksLikeCode = /^(import |export |\/\*\*|\/\/|const |function |\/\*|#!)/.test(text);
  return !looksLikeCode && text.length < 2500;
}
