/**
 * SYNOPSIS: Chair native turn — Lumin IS the Chair; personality translates real facts only.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import { detectDualIntent } from './chair-context-classifier.js';
import { gatherChairNativeFacts } from './chair-native-facts.js';
import { translateChairPersonality } from './chair-personality-translate.js';
import { formatStrategicBriefSection } from './lumin-strategic-intelligence.js';
import { getDoctrinePromptBlock } from './lifeos-service-doctrine.js';

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
  }, chairContext);

  const doctrineBlock = getDoctrinePromptBlock();
  if (doctrineBlock && !systemFacts.lifeos_service_doctrine) {
    systemFacts.lifeos_service_doctrine = doctrineBlock;
  }

  let voice = await translatePersonality({
    callAI,
    userMessage: cleanedInput,
    systemFacts,
  });

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
