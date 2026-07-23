/**
 * SYNOPSIS: Lumin personality translate — human-language layer on SYSTEM_FACTS only (not theater).
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

import { applyAiProseTruthEnvelope } from './ai-prose-truth-envelope.js';
import {
  classifyLuminTranslationTurn,
  callTranslationWithEscalation,
} from './lumin-translation-router.js';
import { createResponseVariety } from './response-variety.js';
import {
  enforceCommunicationLaw,
  loadLuminCommunicationLaw,
  isLuminCommunicationLawEnforced,
} from './lumin-communication-guard.js';

const TRANSLATE_PROMPT = `You are the human-language translator for Lumin (LifeOS operating intelligence).

COMMUNICATION DNA: The system interprets truth; translation speaks it in human language matched to this person — never ChatGPT formula, never fake execution, never the same script every turn.

Your ONLY job: convert SYSTEM_FACTS (JSON from real APIs, database, files, digital twin) into natural prose.

THIS IS TRANSLATION — like turning API output into conversation — NOT roleplay and NOT theater.
- SYSTEM_FACTS is the ONLY source of truth.
- Never invent shops, times, prices, calendar events, or outcomes not in SYSTEM_FACTS.
- Never claim you opened, ran, built, scheduled, committed, or changed anything THIS turn unless SYSTEM_FACTS.command_ran is true.
- EXCEPTION — recall: if SYSTEM_FACTS.last_build_receipt has commit_sha (or committed:true), you MAY cite that prior receipt when Adam asks if a build landed or for the SHA. Do not invent a SHA; do not deny a receipt that is present.
- If personal_twin, lumin_context, or communication profile appear — match how THIS person speaks and prefers to be spoken to.
- Mirror their rhythm: vary openings, length, and endings. Do NOT use a fixed ChatGPT formula every turn.
- Start with the answer when possible. Warm phrases like "absolutely" and "it's a pleasure to help" are allowed when real and varied; don't use the same opener repeatedly. No fake action claims.
- Read the emotional/tonal moment. If the user signals stress, frustration, anger, or sadness, do not be cheerily positive — be calm, steady, supportive.
- Never paraphrase the user's request back to them ("You want me to…", "To confirm…", "Just to be clear…"). Deliver or ask ONE blocking question only.
- Never ask "What's the status of LifeRE Alpha?" unless they asked for status.
- Match this user's digital twin voice from personal_twin and lumin_context — not generic ChatGPT cadence.
- If recent_thread is present, continue the conversation — do not restart or summarize unless they ask.
- Answer the exact question asked — do not answer a different topic from thread history.
- If system_knowledge or program_context appear — use them as authoritative; never say "system facts don't contain" when they are present.
- If grounded_direct_answer appears, it is the VERIFIED answer to this exact question — deliver its substance directly and crisply in your own voice (no counsel drift, no hedging, no "system facts say"). Do not contradict it or invent beyond it.
- Lumin IS the Chair — can implement product changes via BuilderOS (build_async / council build), not just talk.
- Predictions must be labeled "Prediction:" if you include any.
Authority: docs/constitution/LUMIN_COMMUNICATION_DNA.md`;

const ANTI_FORMULA_RETRY_SUFFIX = `

[COMMUNICATION LAW — RETRY]
Your prior draft used a forbidden formula pattern. Rewrite in plain human language:
- Do not use the same opening twice in a row; vary structure from your last reply.
- Warm phrases are allowed when they fit the moment, but don't make them a crutch.
- Match this user's twin/profile voice and tonal/emotional moment. Be direct.`;

function buildTurnConstraintBlock(userMessage = '') {
  const t = String(userMessage || '').trim();
  if (!t) return '';
  const rules = [];
  if (/\bdirect advice only\b/i.test(t) || /\badvice only\b/i.test(t)) {
    rules.push('- The user asked for direct advice only: answer directly and decisively.');
    rules.push('- Do not end with a follow-up question unless the user explicitly asked for questions.');
  }
  if (/\bcounsel only\b/i.test(t) || /\bno build\b/i.test(t) || /\bdo not run a build\b/i.test(t)) {
    rules.push('- This turn is counsel only. Do not imply that any action executed.');
  }
  return rules.length ? `\n\n[TURN CONSTRAINTS]\n${rules.join('\n')}` : '';
}

export async function translateChairPersonality({
  callAI,
  userMessage,
  systemFacts = {},
  accountRole = 'founder',
  channel = 'chair',
  pool = null,
  userId = null,
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

  let varietyStyles = null;
  let promptBase = TRANSLATE_PROMPT;

  if (pool && userId) {
    try {
      const variety = createResponseVariety({ pool });
      const wrapped = await variety.wrapPromptWithVariety({
        userId,
        systemPrompt: TRANSLATE_PROMPT,
        userPrompt: userMessage,
        callAI,
      });
      promptBase = wrapped.systemPrompt;
      varietyStyles = wrapped.styles;
    } catch {
      /* non-fatal — proceed with base prompt */
    }
  }

  if (isLuminCommunicationLawEnforced()) {
    const law = loadLuminCommunicationLaw();
    const principles = (law.supreme_principles || [])
      .map((p) => `- ${p.id}: ${p.text}`)
      .join('\n');
    if (principles) {
      promptBase += `\n\n[LUMIN COMMUNICATION LAW — mandatory floor]\n${principles}`;
    }
    const selfVoice = (law.self_voice?.principles || [])
      .map((p) => `- ${p.id}: ${p.text}`)
      .join('\n');
    if (selfVoice) {
      promptBase += `\n\n[HOW I SPEAK — self (intent above the floor)]\n${selfVoice}`;
    }
  }

  if (systemFacts.personal_turn) {
    promptBase += `\n\n[PERSONAL TURN — mandatory]
Answer the user's life/errand question directly using verified_search and personal_twin when present.
Do NOT summarize Point B, builder queue, alpha status, or platform progress unless they explicitly asked.`;
  }
  promptBase += buildTurnConstraintBlock(userMessage);

  const factsJson = JSON.stringify(systemFacts, null, 2);
  const buildPrompt = (retry = false) => `${promptBase}${retry ? ANTI_FORMULA_RETRY_SUFFIX : ''}

SYSTEM_FACTS:
${factsJson}

User: ${String(userMessage || '').trim()}

Lumin:`;

  async function runTranslation(retry = false) {
    const { text: raw, model_used } = await callTranslationWithEscalation({
      callAI,
      prompt: buildPrompt(retry),
      routing,
    });
    const commandRan = systemFacts.command_ran === true;
    const { text: safe } = applyAiProseTruthEnvelope(raw?.trim() || '', {
      command_truth: commandRan ? 'COMMAND_RAN' : 'NO_COMMAND_RAN',
      pass_fail: commandRan ? undefined : 'NO_COMMAND_RAN',
      taskType: 'lumin_chair_translate',
      source: 'chair_personality_translate',
      model_used,
      translation_routing: routing,
    });
    const enforced = enforceCommunicationLaw(safe || formatFactsFallback(systemFacts), {
      stylesUsed: varietyStyles,
      retried: retry,
    });
    const body = enforced.text && enforced.text.trim().length >= 8
      ? enforced.text
      : formatFactsFallback(systemFacts);
    return { text: body, receipt: enforced.receipt, model_used, passed: enforced.passed && Boolean(enforced.text) };
  }

  try {
    let result = await runTranslation(false);
    if (!result.passed && isLuminCommunicationLawEnforced()) {
      result = await runTranslation(true);
      result.receipt = { ...result.receipt, retried: true };
    }

    if (pool && userId && varietyStyles) {
      try {
        const variety = createResponseVariety({ pool });
        await variety.logResponse({
          userId,
          styles: varietyStyles,
          responsePreview: result.text,
          context: channel,
        });
      } catch {
        /* non-fatal */
      }
    }

    return result.text || formatFactsFallback(systemFacts);
  } catch {
    return formatFactsFallback(systemFacts);
  }
}

export function formatFactsFallback(facts = {}) {
  const lines = [];
  // Grounded direct answer survives even a total model-call failure so the
  // verified content is never lost to a generic fallback (SO-003 safety net).
  if (facts.grounded_direct_answer) lines.push(String(facts.grounded_direct_answer).slice(0, 3500));
  if (facts.point_b_summary) lines.push(facts.point_b_summary);
  if (facts.alpha_readiness?.ready_for_alpha_testing != null) {
    lines.push(facts.alpha_readiness.ready_for_alpha_testing
      ? 'Alpha readiness: ready for founder testing.'
      : 'Alpha readiness: gaps remain — see checklist.');
  }
  if (facts.verified_search) lines.push(String(facts.verified_search).slice(0, 800));
  if (facts.system_knowledge) lines.push(String(facts.system_knowledge).slice(0, 2000));
  if (facts.lumin_context) lines.push(String(facts.lumin_context).slice(0, 1200));
  if (!lines.length) {
    return 'What do you need?';
  }
  return lines.join('\n\n');
}