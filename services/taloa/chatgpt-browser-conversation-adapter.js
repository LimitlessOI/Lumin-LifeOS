/**
 * SYNOPSIS: TALOA-A2Z-005 -- app-specific ChatGPT browser adapter over the
 * generic observation/selection contracts (overlay-observation-engine.js,
 * overlay-target-selector.js). Classifies the current conversation state and
 * proposes bounded next actions; never performs an irreversible external
 * action itself -- that stays the action router's job under real
 * authorization.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */

const FOUNDER_ATTENTION_PATTERNS = /founder decision|need you to decide|which do you prefer|your call|confirm before I/i;

export function createChatGPTBrowserConversationAdapter({ observationEngine, targetSelector } = {}) {
  if (!observationEngine || typeof observationEngine.observe !== 'function') {
    throw new Error('createChatGPTBrowserConversationAdapter requires observationEngine');
  }
  if (!targetSelector || typeof targetSelector.select !== 'function') {
    throw new Error('createChatGPTBrowserConversationAdapter requires targetSelector');
  }

  function classifyState(snapshot) {
    const observation = observationEngine.observe(snapshot);

    if (observation.permission_prompts.length > 1) {
      return { state: 'FOUNDER_DECISION_REQUIRED', reason: 'multiple_simultaneous_approval_cards', observation };
    }
    if (observation.permission_prompts.length === 1) {
      return { state: 'APPROVAL_REQUIRED_CURRENT', reason: 'single_approval_card_present', observation };
    }
    if (observation.generating) {
      return { state: 'CHATGPT_WORKING', reason: 'response_still_generating', observation };
    }
    if (FOUNDER_ATTENTION_PATTERNS.test(observation.evidence.title) || FOUNDER_ATTENTION_PATTERNS.test(JSON.stringify(observation.controls))) {
      return { state: 'FOUNDER_DECISION_REQUIRED', reason: 'founder_attention_language_detected', observation };
    }
    if (observation.composer) {
      return { state: 'TURN_COMPLETE', reason: 'composer_ready_no_pending_prompts', observation };
    }
    return { state: 'HARD_CAPABILITY_BLOCKER', reason: 'no_composer_no_prompts_no_generation_signal', observation };
  }

  function nextAction(snapshot, intent = {}) {
    const classified = classifyState(snapshot);
    switch (classified.state) {
      case 'CHATGPT_WORKING':
        return { ok: true, action: { type: 'wait' }, classified };
      case 'APPROVAL_REQUIRED_CURRENT': {
        const picked = targetSelector.select(classified.observation, { kind: 'click', label: 'allow', ...intent });
        if (!picked.ok) return { ok: false, blocker: picked.blocker, reason: picked.reason, classified };
        return { ok: true, action: { type: 'click', target: picked.target, risky: false }, classified };
      }
      case 'TURN_COMPLETE': {
        if (!intent.messageText) return { ok: false, blocker: 'NO_INTENT', reason: 'turn_complete_but_no_message_supplied', classified };
        return {
          ok: true,
          action: { type: 'type', target: classified.observation.composer, value: intent.messageText },
          classified,
        };
      }
      case 'FOUNDER_DECISION_REQUIRED':
        return { ok: false, blocker: 'FOUNDER_DECISION_REQUIRED', reason: classified.reason, classified };
      default:
        return { ok: false, blocker: 'HARD_CAPABILITY_BLOCKER', reason: classified.reason, classified };
    }
  }

  return { classifyState, nextAction };
}

export default { createChatGPTBrowserConversationAdapter };
