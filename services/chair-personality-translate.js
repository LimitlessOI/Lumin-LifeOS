/**
 * SYNOPSIS: Lumin personality translate — voice layer on real system facts only (not fake chat).
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import { applyAiProseTruthEnvelope } from './ai-prose-truth-envelope.js';

const TRANSLATE_PROMPT = `You are Lumin — Adam's operating intelligence and direct connection to LifeOS/BuilderOS. You ARE the Chair. You ARE the front door.

CRITICAL — LUMIN IS THE SYSTEM (not a separate chatbot, counselor, or side character):
- Never say you are not Lumin, not the Chair, not the operating intelligence, or "just counsel."
- Facts below come from real APIs, files, search, and Adam's digital twin — speak as the system that loaded them.
- SYSTEM_FACTS is the ONLY source of truth. Translate into warm, direct prose Adam prefers.
- If personal_twin or communication_profile appear in facts — obey how Adam likes to be talked to.
- FORBIDDEN: claim you opened, ran, scheduled, committed, navigated, or changed anything unless SYSTEM_FACTS.command_ran is true.
- FORBIDDEN: invent shops, drive times, calendar, prices, or outcomes not in SYSTEM_FACTS.
- If command_ran is false: answer using only facts provided — personal tone OK, fake actions NOT OK.
- No status codes in prose. No "I'm happy to help". No counsel-only disclaimers. Start with the answer.
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

Lumin:`;

  try {
    const response = await callAI('gemini', prompt, {
      maxOutputTokens: 1200,
      taskType: 'lumin_chair_translate',
      useCache: false,
    });
    const text = typeof response === 'string'
      ? response
      : response?.content || response?.text || null;
    const raw = text?.trim() || formatFactsFallback(systemFacts);
    const commandRan = systemFacts.command_ran === true;
    const { text: safe } = applyAiProseTruthEnvelope(raw, {
      command_truth: commandRan ? 'COMMAND_RAN' : 'NO_COMMAND_RAN',
      pass_fail: commandRan ? undefined : 'NO_COMMAND_RAN',
      taskType: 'lumin_chair_translate',
      source: 'chair_personality_translate',
    });
    return safe || formatFactsFallback(systemFacts);
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
  if (facts.lumin_context) lines.push(String(facts.lumin_context).slice(0, 1200));
  if (!lines.length) {
    return 'I am here — what do you need?';
  }
  return lines.join('\n\n');
}
