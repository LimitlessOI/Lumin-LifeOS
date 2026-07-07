// SYNOPSIS: SocialMediaOS "publish or kill" gate for content intelligence.
// @ssot docs/products/marketingos/PRODUCT_HOME.md

const REQUIRED_GATE_NAMES = [
  'hook_retention_15s',
  'reason_to_stay_30s',
  'thumbnail_title_match',
  'info_accuracy',
  'differentiation'
];

function safeTrim(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function toLower(value) {
  return safeTrim(value).toLowerCase();
}

function words(value) {
  return toLower(value)
    .split(/[^a-z0-9]+/g)
    .filter(Boolean);
}

function unique(arr) {
  return [...new Set(arr)];
}

function overlapScore(a, b) {
  const aw = unique(words(a));
  const bw = new Set(words(b));
  if (!aw.length) return 0;
  let hit = 0;
  for (const token of aw) if (bw.has(token)) hit += 1;
  return hit / aw.length;
}

function containsAny(text, terms) {
  const t = toLower(text);
  return terms.some((term) => t.includes(term));
}

function buildLocalHeuristics(piece) {
  const title = safeTrim(piece?.title);
  const hook = safeTrim(piece?.hook);
  const body = safeTrim(piece?.body);
  const thumbnailConcept = safeTrim(piece?.thumbnailConcept);
  const fullText = [title, hook, body].filter(Boolean).join(' ');

  const hookWords = words(hook);
  const titleWords = words(title);
  const bodyWords = words(body);

  const hookRetains = hookWords.length >= 6 && hookWords.length <= 28 && /[?!.:]/.test(hook) ? true : hookWords.length >= 6;
  const reasonsToStay = bodyWords.length >= 35 || containsAny(fullText, ['because', 'why', 'how', 'step', 'steps', 'proof', 'example', 'demo', 'framework', 'mistake', 'results', 'data']);
  const thumbnailMatches = thumbnailConcept
    ? overlapScore(title, thumbnailConcept) >= 0.25 || overlapScore(hook, thumbnailConcept) >= 0.2
    : true;

  const infoAccurate = title.length > 0 && hook.length > 0 && body.length > 0 && bodyWords.length >= 25;
  const differentiation = containsAny(fullText, [
    'not',
    'instead',
    'unique',
    'counterintuitive',
    'different',
    'competitor',
    'vs',
    'better than',
    'most people',
    'few',
    'rare',
    'new'
  ]) || bodyWords.length >= 40;

  return {
    hook_retention_15s: {
      pass: hookRetains,
      reason: hookRetains ? 'hook appears concise enough to carry early attention' : 'hook is too weak or too short to likely retain attention'
    },
    reason_to_stay_30s: {
      pass: reasonsToStay,
      reason: reasonsToStay ? 'body gives a substantive reason to continue' : 'body does not give enough reason to keep watching'
    },
    thumbnail_title_match: {
      pass: thumbnailMatches,
      reason: thumbnailMatches ? 'thumbnail concept aligns with title/hook' : 'thumbnail concept appears mismatched to the title/hook'
    },
    info_accuracy: {
      pass: infoAccurate,
      reason: infoAccurate ? 'content has enough concrete substance to be plausibly accurate' : 'content is too thin to judge as accurate'
    },
    differentiation: {
      pass: differentiation,
      reason: differentiation ? 'content suggests a distinct angle or substantive value' : 'content does not clearly differentiate itself'
    }
  };
}

async function askCouncil(callCouncilMember, role, prompt) {
  if (typeof callCouncilMember !== 'function') return null;
  try {
    return await callCouncilMember(role, prompt);
  } catch {
    return null;
  }
}

function parseCouncilJudgement(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const text = raw.trim();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {}
  }

  const lowered = text.toLowerCase();
  const pass = lowered.includes('pass') || lowered.includes('publish') || lowered.includes('yes');
  const fail = lowered.includes('fail') || lowered.includes('hold') || lowered.includes('kill') || lowered.includes('no');
  if (pass || fail) return { pass: pass && !fail, reason: text };
  return { reason: text };
}

async function publishOrKill({ callCouncilMember, piece } = {}) {
  try {
    const local = buildLocalHeuristics(piece);
    const checks = [];
    const blockingReasons = [];

    for (const name of REQUIRED_GATE_NAMES) {
      const localCheck = local[name];
      if (!localCheck) continue;

      let check = { name, pass: localCheck.pass, reason: localCheck.reason };

      if (typeof callCouncilMember === 'function') {
        const aiPrompt = [
          `Evaluate this SocialMediaOS content piece for the gate "${name}".`,
          `Return a concise decision with reason.`,
          `Title: ${safeTrim(piece?.title) || '(empty)'}`,
          `Hook: ${safeTrim(piece?.hook) || '(empty)'}`,
          `Body: ${safeTrim(piece?.body) || '(empty)'}`,
          `Thumbnail concept: ${safeTrim(piece?.thumbnailConcept) || '(none)'}`
        ].join('\n');

        const raw = await askCouncil(callCouncilMember, 'editor', aiPrompt);
        if (raw == null) {
          check = { ...check, pass: null, reason: 'ai_unavailable' };
        } else {
          const judged = parseCouncilJudgement(raw);
          if (judged && typeof judged.pass === 'boolean') {
            check = { name, pass: judged.pass, reason: safeTrim(judged.reason) || raw.trim() };
          } else if (judged && judged.reason) {
            check = { name, pass: localCheck.pass, reason: safeTrim(judged.reason) || localCheck.reason };
          }
        }
      } else if (['hook_retention_15s', 'reason_to_stay_30s', 'thumbnail_title_match', 'info_accuracy', 'differentiation'].includes(name)) {
        check = { name, pass: null, reason: 'ai_unavailable' };
      }

      checks.push(check);
      if (check.pass === false) blockingReasons.push(`${name}: ${check.reason}`);
    }

    const requiredPasses = checks.every((c) => c.pass === true);
    const verdict = requiredPasses ? 'publish' : 'hold';

    return {
      ok: true,
      verdict,
      checks,
      blockingReasons: verdict === 'publish' ? [] : blockingReasons
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        message: error instanceof Error ? error.message : String(error)
      }
    };
  }
}

export { publishOrKill };
export default publishOrKill;