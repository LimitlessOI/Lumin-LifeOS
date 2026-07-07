// SYNOPSIS: SocialMediaOS Content Intelligence publish-or-kill gate.
// @ssot docs/products/marketingos/PRODUCT_HOME.md

function safeString(value) {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function normalizeText(value) {
  return safeString(value).replace(/\s+/g, ' ').trim();
}

function countWords(text) {
  const normalized = normalizeText(text);
  if (!normalized) return 0;
  return normalized.split(' ').filter(Boolean).length;
}

function uniqueWords(text) {
  const words = normalizeText(text)
    .toLowerCase()
    .match(/[a-z0-9']+/g);
  return new Set(words || []);
}

function extractTitleKeywords(title) {
  const stop = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'to', 'of', 'in', 'on', 'for', 'with',
    'at', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'this',
    'that', 'these', 'those', 'you', 'your', 'we', 'our', 'i', 'they', 'it'
  ]);
  return (normalizeText(title).toLowerCase().match(/[a-z0-9']+/g) || []).filter((w) => !stop.has(w));
}

function detectClaims(text) {
  const t = normalizeText(text).toLowerCase();
  const claims = [];
  if (!t) return claims;
  const patterns = [
    { re: /\b(\d{1,4}(?:\.\d+)?%?)\b/g, label: 'numeric claim' },
    { re: /\b(always|never|guarantee|guaranteed|best|worst|only|every|everyone|nobody|fastest|cheapest)\b/g, label: 'absolute claim' },
    { re: /\b(before|after|today|now|latest|new|newly|recently|202[0-9])\b/g, label: 'timing claim' }
  ];
  for (const { re, label } of patterns) {
    if (re.test(t)) claims.push(label);
  }
  return claims;
}

async function judge(role, prompt, callCouncilMember) {
  if (typeof callCouncilMember !== 'function') return null;
  try {
    return await callCouncilMember(role, prompt, { temperature: 0.2 });
  } catch {
    return null;
  }
}

function parseBinaryJudgement(text) {
  const raw = normalizeText(text).toLowerCase();
  if (!raw) return null;
  if (/\b(pass|yes|approve|publish|true)\b/.test(raw) && !/\b(fail|no|reject|hold|kill|false)\b/.test(raw)) return true;
  if (/\b(fail|no|reject|hold|kill|false)\b/.test(raw) && !/\b(pass|yes|approve|publish|true)\b/.test(raw)) return false;
  if (/^\s*(1|0)\s$/.test(raw)) return raw.trim() === '1';
  return null;
}

function buildChecks() {
  return [
    'hook is strong enough to keep attention at 15s',
    'reason to stay exists through 30s',
    'thumbnail matches title and hook',
    'info is accurate / not overclaimed',
    'something competitors do not have is present'
  ];
}

export async function publishOrKill({ callCouncilMember, piece }) {
  try {
    const title = normalizeText(piece?.title);
    const hook = normalizeText(piece?.hook);
    const body = normalizeText(piece?.body);
    const thumbnailConcept = normalizeText(piece?.thumbnailConcept);

    const checks = [];
    const blockingReasons = [];

    const titleKw = extractTitleKeywords(title);
    const hookWords = countWords(hook);
    const bodyWords = countWords(body);
    const hasTitle = title.length > 0;
    const hasHook = hook.length > 0;
    const hasBody = body.length > 0;

    const fifteenSecondHook = hasHook && hookWords >= 4 && hookWords <= 28;
    checks.push({
      name: 'hook keeps attention at 15s',
      pass: fifteenSecondHook,
      reason: fifteenSecondHook ? 'hook is concise and likely readable in a 15s window' : 'hook is missing or too thin/long for a quick retention test'
    });
    if (!fifteenSecondHook) blockingReasons.push('hook does not appear strong enough for a 15s retention test');

    const thirtySecondReason = hasBody && bodyWords >= 30;
    checks.push({
      name: 'reason to stay at 30s',
      pass: thirtySecondReason,
      reason: thirtySecondReason ? 'body has enough substance to justify continued viewing' : 'body looks too short to sustain a 30s reason-to-stay'
    });
    if (!thirtySecondReason) blockingReasons.push('insufficient reason to stay through 30s');

    const thumbMatches = hasTitle && (thumbnailConcept
      ? titleKw.some((kw) => thumbnailConcept.toLowerCase().includes(kw)) || normalizeText(thumbnailConcept).length > 0
      : true);
    checks.push({
      name: 'thumbnail matches title',
      pass: thumbMatches,
      reason: thumbMatches ? 'thumbnail concept appears aligned with title terms' : 'thumbnail concept is absent or not clearly aligned with the title'
    });
    if (!thumbMatches) blockingReasons.push('thumbnail concept does not clearly match the title');

    const localAccuracyRisk = (() => {
      const claims = [...detectClaims(title), ...detectClaims(hook), ...detectClaims(body)];
      if (!claims.length) return false;
      const overclaimSignals = /\b(guarantee|guaranteed|always|never|best|only)\b/i.test(`${title} ${hook} ${body}`);
      return overclaimSignals;
    })();
    const accuracyLocalPass = !localAccuracyRisk;
    checks.push({
      name: 'info accurate',
      pass: accuracyLocalPass,
      reason: accuracyLocalPass ? 'no obvious overclaim detected locally' : 'local heuristic spotted potentially overbroad or absolute claims'
    });
    if (!accuracyLocalPass) blockingReasons.push('local accuracy heuristic flagged overclaim risk');

    const competitorDifferentiationLocal = (() => {
      const text = `${title} ${hook} ${body}`.toLowerCase();
      const signals = [
        'template', 'framework', 'playbook', 'system', 'workflow', 'automation',
        'benchmark', 'proprietary', 'exclusive', 'unique', 'counterintuitive', 'uncommon',
        'first-party', 'data', 'real-time', 'live'
      ];
      return signals.some((s) => text.includes(s));
    })();
    checks.push({
      name: 'something competitors do not have',
      pass: competitorDifferentiationLocal,
      reason: competitorDifferentiationLocal ? 'content hints at differentiation signals' : 'no clear differentiation signal found locally'
    });
    if (!competitorDifferentiationLocal) blockingReasons.push('no distinct competitor-differentiation signal detected');

    const aiChecks = [
      {
        name: 'hook keeps attention at 15s',
        role: 'growth-editor',
        prompt: `Assess whether this hook would keep attention in the first 15 seconds. Return only PASS or FAIL with a short reason.\nTITLE: ${title}\nHOOK: ${hook}\nBODY: ${body}`
      },
      {
        name: 'reason to stay at 30s',
        role: 'retention-editor',
        prompt: `Assess whether there is a clear reason to keep watching past 30 seconds. Return only PASS or FAIL with a short reason.\nTITLE: ${title}\nHOOK: ${hook}\nBODY: ${body}`
      },
      {
        name: 'thumbnail matches title',
        role: 'thumbnail-editor',
        prompt: `Assess whether the thumbnail concept matches the title and hook. Return only PASS or FAIL with a short reason.\nTITLE: ${title}\nHOOK: ${hook}\nTHUMBNAIL: ${thumbnailConcept || '(none)'}`
      },
      {
        name: 'info accurate',
        role: 'fact-editor',
        prompt: `Assess whether the content feels accurate and avoids unsupported claims. Return only PASS or FAIL with a short reason.\nTITLE: ${title}\nHOOK: ${hook}\nBODY: ${body}`
      },
      {
        name: 'something competitors do not have',
        role: 'differentiation-editor',
        prompt: `Assess whether the piece communicates something competitors do not have. Return only PASS or FAIL with a short reason.\nTITLE: ${title}\nHOOK: ${hook}\nBODY: ${body}`
      }
    ];

    for (const c of aiChecks) {
      const aiText = await judge(c.role, c.prompt, callCouncilMember);
      const aiPass = aiText == null ? null : parseBinaryJudgement(aiText);
      const required = true;
      const base = checks.find((x) => x.name === c.name);
      if (aiPass === null) {
        checks.push({ name: `${c.name} (AI)`, pass: null, reason: 'ai_unavailable' });
      } else {
        checks.push({ name: `${c.name} (AI)`, pass: aiPass, reason: normalizeText(aiText) || 'ai_response' });
        if (required && aiPass === false) blockingReasons.push(`${c.name} failed by council`);
      }
      if (base && aiPass === false) {
        base.pass = false;
        base.reason = `${base.reason}; council disagreement`;
      }
    }

    const requiredPass = checks.filter((c) => c.name && !c.name.endsWith('(AI)')).every((c) => c.pass === true);
    const verdict = requiredPass && blockingReasons.length === 0 ? 'publish' : 'hold';

    return {
      ok: true,
      verdict,
      checks,
      blockingReasons: verdict === 'publish' ? [] : Array.from(new Set(blockingReasons))
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : safeString(error)
    };
  }
}

export default publishOrKill;