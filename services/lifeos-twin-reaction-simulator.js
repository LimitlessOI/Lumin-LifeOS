/**
 * SYNOPSIS: Exports createTwinReactionSimulator — services/lifeos-twin-reaction-simulator.js.
 */
export function createTwinReactionSimulator({ pool, callCouncilMember }) {
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('createTwinReactionSimulator requires a pg pool with query()');
  }

  async function loadTwinPrefs(userId) {
    const result = await pool.query(
      `select flourishing_prefs
         from lifeos_users
        where id = $1
        limit 1`,
      [userId]
    );
    return result.rows[0]?.flourishing_prefs ?? null;
  }

  function toText(value) {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  function extractUiDirectives(prefs) {
    if (!prefs) return '';
    if (typeof prefs === 'object') {
      return toText(prefs.ui_directives ?? prefs.uiDirectives ?? '');
    }

    const text = String(prefs);
    const match = text.match(/ui_directives\s*[:=]\s*([^\n;]+)/i);
    if (match) return match[1].trim();
    return '';
  }

  function summarizePrefs(prefs) {
    const raw = toText(prefs).trim();
    const uiDirectives = extractUiDirectives(prefs).trim();
    return { raw, uiDirectives };
  }

  function heuristicPrediction({ idea, context, prefs }) {
    const ideaText = [
      idea?.title,
      idea?.name,
      idea?.idea_title,
      idea?.description,
      idea?.idea_description,
      toText(idea)
    ].filter(Boolean).join(' ').toLowerCase();

    const contextText = toText(context).toLowerCase();
    const prefText = `${prefs.raw} ${prefs.uiDirectives}`.toLowerCase();

    const positiveSignals = [
      'simple',
      'fast',
      'clear',
      'transparent',
      'low friction',
      'less friction',
      'save time',
      'time',
      'focus',
      'calm',
      'reduce',
      'helpful',
      'useful',
      'trusted',
      'private',
      'minimal'
    ];

    const negativeSignals = [
      'complex',
      'confusing',
      'intrusive',
      'noisy',
      'slow',
      'heavy',
      'manual',
      'extra steps',
      'unclear',
      'spam',
      'more work',
      'risk',
      'surveillance'
    ];

    let score = 0;
    for (const s of positiveSignals) {
      if (ideaText.includes(s) || contextText.includes(s) || prefText.includes(s)) score += 1;
    }
    for (const s of negativeSignals) {
      if (ideaText.includes(s) || contextText.includes(s) || prefText.includes(s)) score -= 1;
    }

    const likely_response =
      score >= 2 ? 'likely positive, especially if the experience stays simple and low-friction' :
      score <= -1 ? 'likely cautious or negative unless the idea is made clearer and lighter' :
      'mixed / neutral, with interest depending on how clearly it fits their preferences';

    const reasons = [];
    if (prefs.raw) reasons.push('twin preferences loaded from flourishing_prefs');
    if (prefs.uiDirectives) reasons.push('ui_directives indicate presentation or interaction preferences');
    if (score >= 2) reasons.push('idea language aligns with simplicity, clarity, or time savings');
    if (score <= -1) reasons.push('idea language suggests friction, complexity, or extra effort');
    if (reasons.length === 0) reasons.push('insufficient preference detail for a strong signal');

    return {
      likely_response,
      confidence: score >= 2 || score <= -1 ? 'medium' : 'low',
      reasons,
      sources: ['prefs']
    };
  }

  async function simulate({ userId, idea, context }) {
    const prefs = summarizePrefs(await loadTwinPrefs(userId));
    const basePrediction = heuristicPrediction({ idea, context, prefs });

    if (typeof callCouncilMember !== 'function') {
      return basePrediction;
    }

    try {
      const prompt = [
        'Predict likely user response to a UI/product idea from twin preferences.',
        `Preferences: ${prefs.raw || 'none'}`,
        `UI directives: ${prefs.uiDirectives || 'none'}`,
        `Idea: ${toText(idea)}`,
        `Context: ${toText(context)}`,
        'Return a short one-paragraph narrative only. Do not add JSON.'
      ].join('\n');

      const narrative = await callCouncilMember('twin-reaction-simulator', prompt, { userId });
      const cleanNarrative = typeof narrative === 'string' ? narrative.trim() : '';
      if (cleanNarrative) {
        return {
          ...basePrediction,
          likely_response: cleanNarrative,
          confidence: basePrediction.confidence,
          reasons: basePrediction.reasons
        };
      }
      return basePrediction;
    } catch (error) {
      return basePrediction;
    }
  }

  return { simulate };
}