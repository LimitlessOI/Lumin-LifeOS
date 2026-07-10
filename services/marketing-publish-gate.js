// SYNOPSIS: SocialMediaOS content intelligence gate for publish-or-kill decisions.
// @ssot docs/products/marketingos/PRODUCT_HOME.md

const CHECK_NAMES = Object.freeze({
  hook: 'hook_15s',
  stay: 'stay_30s',
  thumbnail: 'thumbnail_matches_title',
  accuracy: 'info_accurate',
  novelty: 'competitor_edge',
});

function normalizeText(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function lower(value) {
  return normalizeText(value).toLowerCase();
}

function wordCount(value) {
  const text = normalizeText(value);
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

function scoreHook(text) {
  const s = lower(text);
  let score = 0;
  const cues = [
    'you won’t believe',
    'watch until',
    'in 15 seconds',
    '15 seconds',
    'the reason',
    'here’s why',
    'why this works',
    'stop scrolling',
    'what happens next',
    'most people miss',
    'the simplest way',
    'the mistake',
  ];
  for (const cue of cues) if (s.includes(cue)) score += 1;
  if (wordCount(text) <= 18) score += 1;
  if (/[!?]/.test(text)) score += 0.5;
  return score;
}

function scoreStay(text) {
  const s = lower(text);
  let score = 0;
  const cues = [
    'step by step',
    'in this video',
    'by the end',
    'example',
    'framework',
    'checklist',
    'breakdown',
    'before and after',
    'use this',
    'do this instead',
    'real numbers',
    'specific',
  ];
  for (const cue of cues) if (s.includes(cue)) score += 1;
  if (wordCount(text) >= 35) score += 1;
  return score;
}

function thumbnailMatchesTitle(title, thumbnailConcept) {
  const t = lower(title);
  const c = lower(thumbnailConcept);
  if (!c) return null;
  const titleTokens = t.split(/[^a-z0-9]+/).filter(Boolean);
  const conceptTokens = c.split(/[^a-z0-9]+/).filter(Boolean);
  const overlap = titleTokens.filter((token) => conceptTokens.includes(token));
  return overlap.length > 0 || conceptTokens.some((token) => titleTokens.includes(token));
}

function infoLooksAccurate(piece) {
  const text = lower([piece?.title, piece?.hook, piece?.body].filter(Boolean).join(' '));
  if (!text) return false;
  const riskyClaims = [
    'guaranteed',
    '100%',
    'always',
    'never fails',
    'secret',
    'proof',
    'scientifically proven',
    'instant results',
    'make money fast',
  ];
  if (riskyClaims.some((claim) => text.includes(claim))) return false;
  const body = normalizeText(piece?.body);
  return body.length >= 40;
}

function parseCouncilDecision(raw) {
  const text = normalizeText(raw);
  const lowered = text.toLowerCase();
  if (!text) return { pass: null, reason: 'empty_response' };
  if (lowered.includes('pass') || lowered.includes('publish') || lowered.includes('yes')) {
    return { pass: true, reason: text.slice(0, 240) };
  }
  if (lowered.includes('fail') || lowered.includes('hold') || lowered.includes('no') || lowered.includes('kill')) {
    return { pass: false, reason: text.slice(0, 240) };
  }
  return { pass: null, reason: text.slice(0, 240) };
}

async function askCouncil(callCouncilMember, role, prompt) {
  if (typeof callCouncilMember !== 'function') return { pass: null, reason: 'ai_unavailable' };
  try {
    const raw = await callCouncilMember(role, prompt);
    return parseCouncilDecision(raw);
  } catch {
    return { pass: null, reason: 'ai_unavailable' };
  }
}

export async function publishOrKill({ callCouncilMember, piece } = {}) {
  try {
    const checks = [];
    const blockingReasons = [];

    const title = normalizeText(piece?.title);
    const hook = normalizeText(piece?.hook);
    const body = normalizeText(piece?.body);
    const thumbnailConcept = normalizeText(piece?.thumbnailConcept);

    const hookLocalScore = scoreHook(hook);
    const hookPass = hookLocalScore >= 1.5;
    checks.push({
      name: CHECK_NAMES.hook,
      pass: hookPass,
      reason: hookPass ? 'hook appears strong for fast attention' : 'hook is too weak or generic for 15s attention',
    });
    if (!hookPass) blockingReasons.push('hook');

    const stayLocalScore = scoreStay(body);
    const stayPass = stayLocalScore >= 1;
    checks.push({
      name: CHECK_NAMES.stay,
      pass: stayPass,
      reason: stayPass ? 'body appears to justify staying to 30s' : 'body does not clearly justify staying to 30s',
    });
    if (!stayPass) blockingReasons.push('stay');

    const thumbnailPass = thumbnailConcept ? thumbnailMatchesTitle(title, thumbnailConcept) : null;
    checks.push({
      name: CHECK_NAMES.thumbnail,
      pass: thumbnailPass,
      reason:
        thumbnailPass === null
          ? 'thumbnail_concept_unavailable'
          : thumbnailPass
            ? 'thumbnail concept matches title'
            : 'thumbnail concept does not match title',
    });
    if (thumbnailPass === false) blockingReasons.push('thumbnail');

    const accuracyPass = infoLooksAccurate(piece);
    checks.push({
      name: CHECK_NAMES.info_accurate,
      pass: accuracyPass,
      reason: accuracyPass ? 'no obvious accuracy red flags detected' : 'possible accuracy risk or insufficient substance',
    });
    if (!accuracyPass) blockingReasons.push('accuracy');

    const noveltyPrompt = [
      'Assess whether this content has a competitive edge that competitors do not usually have.',
      'Return a concise decision with reasoning.',
      `Title: ${title || '(missing)'}`,
      `Hook: ${hook || '(missing)'}`,
      `Body: ${body || '(missing)'}`,
    ].join('\n');

    const noveltyDecision = await askCouncil(callCouncilMember, 'gemini_flash', noveltyPrompt);
    checks.push({
      name: CHECK_NAMES.novelty,
      pass: noveltyDecision.pass,
      reason: noveltyDecision.reason,
    });
    if (noveltyDecision.pass === false) blockingReasons.push('novelty');

    const requiredPasses = checks.every((check) => check.pass === true);
    return {
      ok: true,
      verdict: requiredPasses ? 'publish' : 'hold',
      checks,
      blockingReasons: requiredPasses ? [] : [...new Set(blockingReasons)],
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export default publishOrKill;
