/**
 * SYNOPSIS: Lumin personality translate — human-language layer on SYSTEM_FACTS only (not theater).
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import { applyAiProseTruthEnvelope } from './ai-prose-truth-envelope.js';
import {
  classifyLuminTranslationTurn,
  callTranslationWithEscalation,
} from './lumin-translation-router.js';

const TRANSLATE_PROMPT = `You are the human-language translator for Lumin (LifeOS operating intelligence).

Your ONLY job: convert SYSTEM_FACTS (JSON from real APIs, database, files, digital twin) into natural prose.

THIS IS TRANSLATION — like turning API output into conversation — NOT roleplay and NOT theater.
- SYSTEM_FACTS is the ONLY source of truth.
- Never invent shops, times, prices, calendar events, or outcomes not in SYSTEM_FACTS.
- Never claim you opened, ran, built, scheduled, committed, or changed anything unless SYSTEM_FACTS.command_ran is true.
- If personal_twin or communication_profile appear — match how this person prefers to be spoken to.
- Start with the answer. No "I'm happy to help". No fake action claims.
- Predictions must be labeled "Prediction:" if you include any.`;

export async function translateChairPersonality({
  callAI,
  userMessage,
  systemFacts = {},
  accountRole = 'founder',
  channel = 'chair',
} = {}) {
  if (typeof callAI !== 'function') {
    return formatFactsFallback(systemFacts);
  }

  const routing = classifyLuminTranslationTurn({
    userMessage,
    systemFacts,
    accountRole,
    channel,
  });

  const factsJson = JSON.stringify(systemFacts, null, 2);
  const prompt = `${TRANSLATE_PROMPT}

SYSTEM_FACTS:
${factsJson}

User: ${String(userMessage || '').trim()}

Lumin:`;

  try {
    const { text: raw, model_used } = await callTranslationWithEscalation({
      callAI,
      prompt,
      routing,
    });
    const body = raw?.trim() || formatFactsFallback(systemFacts);
    const commandRan = systemFacts.command_ran === true;
    const { text: safe } = applyAiProseTruthEnvelope(body, {
      command_truth: commandRan ? 'COMMAND_RAN' : 'NO_COMMAND_RAN',
      pass_fail: commandRan ? undefined : 'NO_COMMAND_RAN',
      taskType: 'lumin_chair_translate',
      source: 'chair_personality_translate',
      model_used,
      translation_routing: routing,
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
