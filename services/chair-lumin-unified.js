/**
 * SYNOPSIS: Chair native turn — Lumin IS the Chair; personality translates real facts only.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import { detectDualIntent } from './chair-context-classifier.js';
import { gatherChairNativeFacts } from './chair-native-facts.js';
import { translateChairPersonality } from './chair-personality-translate.js';
import { formatStrategicBriefSection } from './lumin-strategic-intelligence.js';
import { getDoctrinePromptBlock } from './lifeos-service-doctrine.js';
import { formatThreadForPrompt } from './lumin-thread-context.js';
import { shouldUseDirectProgramAnswer, formatDirectProgramAnswer } from './chair-program-direct-answer.js';

export async function runChairNativeTurn(cleanedInput, deps = {}, chairContext = {}) {
  const {
    callAI,
    translatePersonality = translateChairPersonality,
    sanitizeConversationReply,
    memoryContext = null,
    strategicBrief = null,
    pool = null,
  } = deps;

  const dual = detectDualIntent(cleanedInput);
  const systemFacts = await gatherChairNativeFacts(cleanedInput, {
    callAI,
    pool,
    memoryContext,
    strategicBrief,
    userId: deps.userId || null,
    userHandle: deps.userHandle || chairContext.user_handle || null,
  }, chairContext);

  const doctrineBlock = getDoctrinePromptBlock();
  if (doctrineBlock && !systemFacts.lifeos_service_doctrine) {
    systemFacts.lifeos_service_doctrine = doctrineBlock;
  }

  if (deps.listeningOnboarding) {
    systemFacts.listening_onboarding = deps.listeningOnboarding;
    systemFacts.chair_note = `${systemFacts.chair_note} Listening setup mode — output listening_profile fence when user confirms prefs.`;
  }

  const threadHist = chairContext.conversation_history || deps.conversationHistory || [];
  if (threadHist.length) {
    systemFacts.recent_thread = formatThreadForPrompt(threadHist);
    systemFacts.chair_note = `${systemFacts.chair_note} Continue the thread naturally — do not paraphrase Adam's request back; do not ask obvious confirm questions.`;
  }

  let voice;
  if (shouldUseDirectProgramAnswer(cleanedInput, systemFacts)) {
    voice = formatDirectProgramAnswer(cleanedInput, systemFacts);
  }
  if (!voice) {
    voice = await translatePersonality({
      callAI,
      userMessage: cleanedInput,
      systemFacts,
      accountRole: chairContext.account_role || chairContext.user_role || 'founder',
      channel: chairContext.domain || 'chair',
      pool,
      userId: deps.userId || null,
    });
  }

  const strategicSection = systemFacts.strategic_brief
    ? formatStrategicBriefSection(systemFacts.strategic_brief)
    : '';
  if (strategicSection && !voice.includes('strategic')) {
    voice = `${voice}\n\n${strategicSection}`;
  }

  const safeReply = sanitizeConversationReply
    ? sanitizeConversationReply(voice, { command_truth: 'NO_COMMAND_RAN' })
    : voice;

  return {
    ok: true,
    action: 'chair',
    chair_domain: chairContext.domain || 'conversation',
    personal_turn: systemFacts.personal_turn,
    command_truth: 'NO_COMMAND_RAN',
    pass_fail: 'NO_COMMAND_RAN',
    execution_kind: 'CHAIR_FACTS',
    direct_connection: true,
    dual_intent: dual.dual ? { personal: true, build: true } : null,
    human_summary_technical: safeReply,
    chair_native_facts: systemFacts,
    conversation_sanitized: safeReply !== voice,
    done_synopsis: null,
    next_synopsis: null,
    strategic_brief: systemFacts.strategic_brief || null,
    errand_search_block: systemFacts.verified_search || null,
  };
}

export { runChairNativeTurn as runLuminUnifiedTurn };
