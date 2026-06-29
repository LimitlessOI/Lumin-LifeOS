/**
 * SYNOPSIS: Founder intent compiler — English + thread context → structured work execution.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

const FRUSTRATION_MARKERS = /\b(just do|do what i|stop repeating|don't repeat|do not repeat|what i asked|what i fucking|see how you do|shut up and|enough questions|quit asking)\b/i;

const VIDEO_PACKAGE_MARKERS = /\b(video|videos|content package|video package)\b/i;
const SMOS_MARKERS = /\b(social media os|smos|content brief|our process|socialmediaos)\b/i;
const CONTENT_TOPIC_MARKERS = /\b(content|scripts?|hooks?|brief|relocation|relocation content)\b/i;
const VIDEO_PACKAGE_ACTION = /\b(package|make|create|plan|build|need|want|produce|draft|prepare|scripts?|hooks?|formulas?|follow|start|run)\b/i;

function normalizeHistory(history = []) {
  if (!Array.isArray(history)) return [];
  return history
    .map((h) => ({
      role: h.role === 'assistant' ? 'assistant' : 'user',
      content: String(h.content || h.text || '').trim(),
    }))
    .filter((h) => h.content.length > 0);
}

/** Bind angry "just do it" to the prior user task in thread. */
export function bindContinuationUtterance(utterance = '', history = []) {
  const t = String(utterance || '').trim();
  if (!t || !FRUSTRATION_MARKERS.test(t)) return t;

  const hist = normalizeHistory(history);
  const priorUsers = hist.filter((h) => h.role === 'user' && h.content.length > 24);
  const lastTask = priorUsers.length >= 2 ? priorUsers[priorUsers.length - 2]?.content : priorUsers[priorUsers.length - 1]?.content;
  if (!lastTask) return t;
  if (lastTask.toLowerCase() === t.toLowerCase()) return t;

  return `${lastTask}\n\n[Founder: execute now — no paraphrase, no clarifying questions]`;
}

export function isFounderFrustrationContinuation(utterance = '') {
  return FRUSTRATION_MARKERS.test(String(utterance || ''));
}

function parseVideoCount(text = '') {
  const m = String(text).match(/\b(five|5|\d+)\s*videos?\b/i);
  if (!m) return 5;
  if (m[1].toLowerCase() === 'five') return 5;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 10) : 5;
}

const QUESTION_OPENING = /^(what|how|why|when|where|who|which|can you|could you|tell me|describe|explain|do you know)\b/i;
const EXECUTE_VERBS = /\b(make|create|build|need|want|produce|draft|prepare|follow|start|run|package|do it|just do)\b/i;

export function isQuestionOnlyUtterance(utterance = '') {
  const bare = String(utterance || '').trim();
  if (!bare) return false;
  if (/\b(counsel only|do not run|don't run|without building|without running)\b/i.test(bare)) return true;
  const stripped = bare.replace(/\b(do not|don't)\s+run\b/gi, ' ');
  return QUESTION_OPENING.test(bare) && !EXECUTE_VERBS.test(stripped);
}

/** Fast deterministic detect — current utterance only (history is not re-run intent). */
export function detectWorkIntent(utterance = '', history = []) {
  const t = String(utterance || '').trim();
  // Strip auto-wrapped do:/target_file — detect from founder words only
  const bare = t.replace(/^\s*(do|execute|run)\s*:\s*/i, '').replace(/\ntarget_file:\s*\S+/gi, '').trim();
  if (!bare) return null;
  if (isQuestionOnlyUtterance(bare)) return null;

  if (VIDEO_PACKAGE_MARKERS.test(bare) && VIDEO_PACKAGE_ACTION.test(bare)) {
    return {
      version: 'founder_intent_compiler_v1',
      intent: 'work',
      executor: 'video_package',
      params: { count: parseVideoCount(bare) },
      confidence: 0.92,
      execute_now: true,
      paraphrase: null,
      source: 'regex_video_package',
    };
  }

  if (SMOS_MARKERS.test(bare) && VIDEO_PACKAGE_ACTION.test(bare)) {
    return {
      version: 'founder_intent_compiler_v1',
      intent: 'work',
      executor: 'socialmediaos_content',
      params: { count: parseVideoCount(bare) },
      confidence: 0.94,
      execute_now: true,
      paraphrase: null,
      source: 'regex_smos',
    };
  }

  if (CONTENT_TOPIC_MARKERS.test(bare) && VIDEO_PACKAGE_ACTION.test(bare) && /\b(for|about|on)\s+/i.test(bare)) {
    return {
      version: 'founder_intent_compiler_v1',
      intent: 'work',
      executor: 'socialmediaos_content',
      params: { count: parseVideoCount(bare) },
      confidence: 0.88,
      execute_now: true,
      paraphrase: null,
      source: 'regex_content_topic',
    };
  }

  return null;
}

function extractJsonBlock(text, fallback = null) {
  const raw = String(text || '').trim();
  if (!raw) return fallback;
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    try { return JSON.parse(fence[1].trim()); } catch { return fallback; }
  }
  const idx = raw.indexOf('{');
  if (idx >= 0) {
    try { return JSON.parse(raw.slice(idx)); } catch { return fallback; }
  }
  return fallback;
}

/**
 * Compile founder utterance → execution plan. Regex first; optional model for edge cases.
 */
export async function compileFounderIntent({
  utterance = '',
  conversationHistory = [],
  uiContext = null,
  callAI = null,
} = {}) {
  const bound = bindContinuationUtterance(utterance, conversationHistory);
  if (isQuestionOnlyUtterance(bound)) {
    return {
      version: 'founder_intent_compiler_v1',
      intent: 'counsel',
      executor: null,
      confidence: 0.9,
      execute_now: false,
      paraphrase: null,
      source: 'question_only',
    };
  }
  const fast = detectWorkIntent(bound, conversationHistory);
  if (fast) return { ...fast, bound_utterance: bound !== utterance ? bound : undefined };

  if (typeof callAI !== 'function') {
    return {
      version: 'founder_intent_compiler_v1',
      intent: 'unknown',
      executor: null,
      confidence: 0,
      execute_now: false,
      paraphrase: null,
      source: 'no_model',
    };
  }

  const hist = normalizeHistory(conversationHistory).slice(-8);
  const histBlock = hist.length
    ? hist.map((h) => `${h.role}: ${h.content.slice(0, 500)}`).join('\n')
    : '(none)';

  const prompt = `You translate founder English into a JSON execution plan for LifeOS Lumin.

Return JSON only:
{
  "intent": "work|counsel|status|build_code|unknown",
  "executor": "video_package|null",
  "params": { "count": 5 },
  "confidence": 0.0-1.0,
  "execute_now": true|false,
  "paraphrase": "one line — what they want done, not a question back"
}

Rules:
- "work" + video_package when they want video scripts, hooks, content calendar, N videos packaged
- execute_now true when the founder clearly wants output NOW (not brainstorming)
- Never set intent counsel when they assigned a concrete deliverable
- Use conversation thread to resolve "do it" / frustration to the prior task
- confidence >= 0.75 and execute_now true only when executor is clear

UI context: ${uiContext ? JSON.stringify(uiContext) : 'none'}

Thread:
${histBlock}

Founder message:
${bound}`;

  try {
    const raw = await callAI(prompt);
    const parsed = extractJsonBlock(raw, {});
    if (parsed?.intent === 'work' && parsed?.executor && Number(parsed.confidence) >= 0.75) {
      return {
        version: 'founder_intent_compiler_v1',
        intent: 'work',
        executor: String(parsed.executor),
        params: parsed.params || {},
        confidence: Number(parsed.confidence) || 0.75,
        execute_now: parsed.execute_now !== false,
        paraphrase: parsed.paraphrase || null,
        source: 'model',
        bound_utterance: bound !== utterance ? bound : undefined,
      };
    }
  } catch {
    /* fall through */
  }

  return {
    version: 'founder_intent_compiler_v1',
    intent: 'unknown',
    executor: null,
    confidence: 0,
    execute_now: false,
    paraphrase: null,
    source: 'model_miss',
    bound_utterance: bound !== utterance ? bound : undefined,
  };
}
