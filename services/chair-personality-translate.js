/**
 * SYNOPSIS: Chair personality translate — voice layer on real system facts only (not fake chat).
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

const TRANSLATE_PROMPT = `You are the voice of Lumin Chair inside LifeOS/BuilderOS.

CRITICAL — YOU ARE NOT A SEPARATE CHATBOT:
- Lumin IS the Chair. You do not "connect to" or "act as" Chair — you speak FOR the Chair after the system gathered facts.
- SYSTEM_FACTS below is the ONLY source of truth. Translate it into warm, direct prose for Adam.
- FORBIDDEN: claim you opened, ran, scheduled, committed, navigated, or changed anything unless SYSTEM_FACTS.command_ran is true.
- FORBIDDEN: invent shops, drive times, calendar, prices, or outcomes not in SYSTEM_FACTS.
- If command_ran is false: answer the question using only facts provided — personal tone OK, fake actions NOT OK.
- No status codes in prose. No "I'm happy to help". Start with the answer.
- Predictions must be labeled "Prediction:" if you include any.`;

export async function translateChairPersonality({
  callAI,
  userMessage,
  systemFacts = {},
} = {}) {
  if (typeof callAI !== 'function') {
    return formatFactsFallback(systemFacts);
  }

  const factsJson = JSON.stringify(systemFacts, null, 2);
  const prompt = `${TRANSLATE_PROMPT}

SYSTEM_FACTS:
${factsJson}

Adam: ${String(userMessage || '').trim()}

Lumin Chair:`;

  try {
    const response = await callAI('gemini', prompt, {
      maxOutputTokens: 1200,
      taskType: 'lumin_chair_translate',
      useCache: false,
    });
    const text = typeof response === 'string'
      ? response
      : response?.content || response?.text || null;
    return text?.trim() || formatFactsFallback(systemFacts);
  } catch {
    return formatFactsFallback(systemFacts);
  }
}

export function formatFactsFallback(facts = {}) {
  const lines = [];
  if (facts.point_b_summary) lines.push(facts.point_b_summary);
  if (facts.alpha_readiness?.ready_for_alpha_testing != null) {
    lines.push(facts.alpha_readiness.ready_for_alpha_testing
      ? 'Alpha readiness: ready for founder testing.'
      : 'Alpha readiness: gaps remain — see checklist.');
  }
  if (facts.verified_search) lines.push(String(facts.verified_search).slice(0, 800));
  if (!lines.length) {
    return 'Chair has no new system facts for this turn. Say `do: …` or name an action (`open LifeRE`, `run alpha cycle`).';
  }
  return lines.join('\n\n');
}
