/**
 * SYNOPSIS: Parse repo-relative target paths and domains from operator/build instructions.
 * Parse repo-relative target paths and domains from operator/build instructions.
 * Shared by Voice Rail command executor and BuilderOS PBB planner.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

const TARGET_FILE_RE =
  /\b((?:scripts|services|routes|public|config|startup|db\/migrations|builderos-reboot)\/[\w./-]+\.(?:mjs|cjs|js|html|sql|md|json))\b/i;

const BARE_OVERLAY_FILE_RE =
  /\b(lifeos-app|lifeos-lifere|lifeos-dashboard|lifeos-login|lifeos-communication-os)\.(html|js)\b/i;

export function resolveBareOverlayFilename(text = '') {
  const match = String(text || '').match(BARE_OVERLAY_FILE_RE);
  if (!match) return null;
  return `public/overlay/${match[1]}.${match[2]}`;
}

export function extractTargetFileFromInstruction(instruction) {
  const text = String(instruction || '');
  const match = text.match(TARGET_FILE_RE);
  if (match?.[1]) return match[1].replace(/\\/g, '/');
  return resolveBareOverlayFilename(text);
}

const EXPLICIT_TARGET_RE = /target_file:\s*([^\s]+\.(?:html|js|css|md|json))/i;

const UI_FEEDBACK_RE =
  /\b(color|colour|css|style|background|font|yellow|black|text|button|drawer|chat|message|bubble|response|responses|lumin|overlay|ui|interface|panel|padding|margin|border|hover|theme|sidebar|fab|dock)\b/i;

const RESPONSE_UI_RE = /\b(responses?|reply|replies|assistant message|your message|your response)\b/i;

const STRUCTURAL_UI_RE = /\b(add|remove|create|delete|new page|new screen|route|api|function|wire|implement|component|drawer control|dock button)\b/i;

export const CANONICAL_FOUNDER_UI_TARGET = 'public/overlay/lifeos-app.html';
export const CANONICAL_FOUNDER_CSS_TARGET = 'public/overlay/lifeos-theme-overrides.css';

/** Color/style-only founder feedback — must not rewrite lifeos-app.html. */
export function isCssOnlyUiFeedback(instruction = '') {
  const t = String(instruction || '');
  if (/\b(add|set|make|change|update)\s+(a\s+)?(yellow|blue|red|green|purple|orange|pink|white|black)\b/i.test(t)
    && /\b(color|background|style|response|reply|bubble|message|assistant)\b/i.test(t)) {
    return true;
  }
  if (STRUCTURAL_UI_RE.test(t) && !/\b(color|colour|background|font|style|yellow|blue|red|green)\b/i.test(t)) {
    return false;
  }
  if (!UI_FEEDBACK_RE.test(t) && !RESPONSE_UI_RE.test(t)) return false;
  if (extractTargetFileFromInstruction(t)) {
    const p = extractTargetFileFromInstruction(t);
    if (/\.css$/i.test(p)) return true;
    if (/lifeos-app\.html/i.test(p) && (UI_FEEDBACK_RE.test(t) || RESPONSE_UI_RE.test(t))) {
      if (/\b(voice|send it|dictat|mic|listening|speech|wire|implement|function|post message|click send|submit)\b/i.test(t)) {
        return false;
      }
      if (/\b(rounded|round|radius|border-radius|bigger|smaller|width|height|padding|margin|opacity|layout|position)\b/i.test(t)
        && !/\b(color|colour|background|font|yellow|blue|red|green|style)\b/i.test(t)) {
        return false;
      }
      return /\b(color|colour|background|font|yellow|black text|text color|style|faint|lighter|darker)\b/i.test(t)
        || (RESPONSE_UI_RE.test(t) && /\b(change|make|set|update)\b/i.test(t));
    }
  }
  return /\b(color|colour|background|font|yellow|black text|text color|style)\b/i.test(t)
    || (RESPONSE_UI_RE.test(t) && /\b(change|make|set|update)\b/i.test(t));
}


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
  if (/\b(voice|dictat|mic|listening|speech|send it)\b/i.test(text)
    && /\b(send|post|submit|message)\b/i.test(text)) {
    return { target_file: CANONICAL_FOUNDER_UI_TARGET, source: 'voice_send_heuristic', confidence: 'high' };
  }
  if (/\b(enter|return key|hit enter|press enter)\b/i.test(text)
    && /\b(send|post|submit|message|chat|box|field|textarea|typing)\b/i.test(text)) {
    const surface = /\b(lumin drawer|lumin-input|lifeos-app)\b/i.test(text)
      ? CANONICAL_FOUNDER_UI_TARGET
      : 'public/overlay/lifeos-dashboard.html';
    return { target_file: surface, source: 'enter_send_heuristic', confidence: 'high' };
  }
  if (/\b(lifere|life-?re)\b/i.test(text)) {
    return { target_file: 'public/overlay/lifeos-lifere.html', source: 'keyword_match', confidence: 'medium' };
  }
  if (UI_FEEDBACK_RE.test(text) || RESPONSE_UI_RE.test(text)) {
    if (isCssOnlyUiFeedback(text)) {
      return { target_file: CANONICAL_FOUNDER_CSS_TARGET, source: 'css_only_heuristic', confidence: 'high' };
    }
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
  if (/\.css$/i.test(String(targetFile || ''))) {
    return [
      base,
      '',
      'CSS PATCH ONLY — append or update rules in the existing stylesheet.',
      `target_file: ${targetFile}`,
      'Output ONLY valid CSS (no HTML, no markdown fences).',
      'For Lumin chat replies use selectors: .lumin-msg.assistant, .msg.assistant',
    ].join('\n');
  }
  if (/\.html$/i.test(String(targetFile || ''))) {
    return [
      base,
      '',
      'GAP-FILL scoped HTML/JS patch ONLY.',
      `target_file: ${targetFile}`,
      'DO NOT rewrite the whole file.',
      'Change only the script block or DOM wiring needed for this request.',
    ].join('\n');
  }
  return [
    base,
    '',
    'GAP-FILL scoped patch ONLY.',
    `target_file: ${targetFile}`,
    'DO NOT rewrite the whole file.',
    'Change only the block needed for this request.',
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
    if (/── Autopsy|Fix path \(execute|GAP-FILL: patch|COMMITTED_HARMFUL|Self-repair/i.test(content)) continue;
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
