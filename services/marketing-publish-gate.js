// SYNOPSIS: SocialMediaOS content intelligence "publish or kill" gate.
// @ssot docs/products/marketingos/PRODUCT_HOME.md

function asText(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function normalizeSpace(text) {
  return asText(text).replace(/\s+/g, ' ').trim();
}

function wordCount(text) {
  const normalized = normalizeSpace(text);
  if (!normalized) return 0;
  return normalized.split(' ').filter(Boolean).length;
}

function sentenceCount(text) {
  const normalized = normalizeSpace(text);
  if (!normalized) return 0;
  const matches = normalized.match(/[.!?]+/g);
  return matches ? matches.length : 1;
}

function parseCouncilVerdict(raw) {
  const text = normalizeSpace(raw).toLowerCase();
  if (!text) return null;
  if (/\bkill\b/.test(text)) return 'kill';
  if (/\bhold\b/.test(text)) return 'hold';
  if (/\bpublish\b/.test(text)) return 'publish';
  return null;
}

function makeCheck(name, pass, reason) {
  return { name, pass, reason };
}

async function safeCouncil(callCouncilMember, role, prompt, opts) {
  if (typeof callCouncilMember !== 'function') return null;
  try {
    return await callCouncilMember(role, prompt, opts);
  } catch {
    return null;
  }
}

export async function publishOrKill({ callCouncilMember, piece } = {}) {
  try {
    const checks = [];
    const blockingReasons = [];

    const title = normalizeSpace(piece?.title);
    const hook = normalizeSpace(piece?.hook);
    const body = normalizeSpace(piece?.body);
    const thumbnailConcept = normalizeSpace(piece?.thumbnailConcept);

    const titleHasSomething = title.length > 0;
    const hookHasSomething = hook.length > 0;
    const bodyHasSomething = body.length > 0;

    const hookLength = hook.length;
    const titleLength = title.length;
    const bodyWords = wordCount(body);
    const bodySentences = sentenceCount(body);

    const cheapHookCheck = (() => {
      if (!hookHasSomething) return makeCheck('hook_15s_stickiness', false, 'hook_missing');
      const hasCuriosity = /(\?|why|how|what|secret|surprising|unexpected|counterintuitive|the reason|here’s|here is)/i.test(hook);
      const hasSpecificity = /(\d|%|times|minutes|seconds|hours|today|now|new|better|faster|cheaper|vs\.?|vs\b)/i.test(hook);
      const enoughDensity = hookLength >= 24 && hookLength <= 140;
      const pass = enoughDensity && (hasCuriosity || hasSpecificity);
      return makeCheck(
        'hook_15s_stickiness',
        pass,
        pass ? 'hook_looks_sticky' : 'hook_needs_more_curiosity_or_specificity'
      );
    })();
    checks.push(cheapHookCheck);
    if (!cheapHookCheck.pass) blockingReasons.push(cheapHookCheck.reason);

    const cheapTitleCheck = (() => {
      if (!titleHasSomething) return makeCheck('title_thumbnail_match', false, 'title_missing');
      if (!thumbnailConcept) return makeCheck('title_thumbnail_match', null, 'thumbnail_unavailable');
      const titleTokens = new Set(
        title
          .toLowerCase()
          .split(/[^a-z0-9]+/g)
          .filter((t) => t.length >= 4)
      );
      const thumbText = thumbnailConcept.toLowerCase();
      let overlap = 0;
      for (const token of titleTokens) {
        if (thumbText.includes(token)) overlap += 1;
      }
      const pass = titleTokens.size === 0 ? true : overlap >= Math.min(2, titleTokens.size);
      return makeCheck(
        'title_thumbnail_match',
        pass,
        pass ? 'thumbnail_matches_title' : 'thumbnail_needs_closer_alignment_to_title'
      );
    })();
    checks.push(cheapTitleCheck);
    if (cheapTitleCheck.pass === false) blockingReasons.push(cheapTitleCheck.reason);

    const localInfoCheck = (() => {
      if (!bodyHasSomething) return makeCheck('info_accuracy', false, 'body_missing');
      const suspiciousClaims = /\b(always|never|guarantee|guaranteed|everyone|no one|100%|best in the world|secret formula)\b/i.test(body);
      const vagueOnly = bodyWords > 0 && bodyWords < 30;
      const pass = !suspiciousClaims && !vagueOnly;
      return makeCheck(
        'info_accuracy',
        pass,
        pass ? 'no_obvious_accuracy_red_flags' : 'needs_factual_specificity_or_less_overclaiming'
      );
    })();
    checks.push(localInfoCheck);
    if (!localInfoCheck.pass) blockingReasons.push(localInfoCheck.reason);

    const localDifferentiationCheck = (() => {
      if (!bodyHasSomething) return makeCheck('something_competitors_dont_have', false, 'body_missing');
      const uniqueSignals = /(\bworkflow\b|\bsystem\b|\bplaybook\b|\boperating system\b|\bdecision\b|\binternal\b|\bfounder\b|\bcustomer data\b|\bproprietary\b|\bunlike\b|\bnot just\b|\bdifferent\b)/i.test(body);
      const concreteOffer = bodyWords >= 40 && bodySentences >= 2;
      const pass = uniqueSignals || concreteOffer;
      return makeCheck(
        'something_competitors_dont_have',
        pass,
        pass ? 'has_some_distinctive_angle_or_substance' : 'needs_clear_unique_angle'
      );
    })();
    checks.push(localDifferentiationCheck);
    if (!localDifferentiationCheck.pass) blockingReasons.push(localDifferentiationCheck.reason);

    const councilNeeded = typeof callCouncilMember === 'function';
    const aiPrompt = [
      'You are judging a social media content piece for publish-or-kill.',
      'Return exactly one short verdict word: publish, hold, or kill.',
      'Evaluate whether the hook can hold attention for 15s, whether there is a reason to stay for 30s, whether the thumbnail matches the title, whether the info appears accurate, and whether there is something competitors do not have.',
      '',
      `Title: ${title || '[missing]'}`,
      `Hook: ${hook || '[missing]'}`,
      `Body: ${body || '[missing]'}`,
      `Thumbnail concept: ${thumbnailConcept || '[missing]'}`,
    ].join('\n');

    const councilVerdict = councilNeeded ? parseCouncilVerdict(await safeCouncil(callCouncilMember, 'content-strategist', aiPrompt, { temperature: 0 })) : null;

    const aiChecks = [];
    if (councilNeeded) {
      const pass = councilVerdict === 'publish';
      aiChecks.push(makeCheck('council_overall', pass, councilVerdict || 'no_clear_verdict'));
    } else {
      aiChecks.push(makeCheck('council_overall', null, 'ai_unavailable'));
    }
    checks.push(...aiChecks);

    const requiredChecks = checks.filter((check) => check.name !== 'council_overall' || check.pass !== null);
    const blocking = requiredChecks.some((check) => check.pass === false);
    const verdict = blocking ? 'hold' : 'publish';

    return {
      ok: true,
      verdict,
      checks,
      blockingReasons: verdict === 'publish' ? [] : blockingReasons,
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export default publishOrKill;