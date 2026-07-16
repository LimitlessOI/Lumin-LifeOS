/**
 * SYNOPSIS: Exports createLifereRealEstateTeleprompter — services/lifere-real-estate-teleprompter.js.
 * @ssot docs/products/lifere/PRODUCT_HOME.md
 */
export function createLifereRealEstateTeleprompter({ pool }) {
  const sessions = new Map();

  const SCRIPTS = {
    'buyer-consultation': [
      'Thanks for taking the time today. Before we start, I want to learn what made you want to move.',
      'What would the perfect home do for your life over the next 5 years?',
      'Let me show you how we can find options that match your criteria and protect your time.',
      'Do you have any concerns about the process we should address right now?',
      'If we find a home that fits, are you prepared to write an offer today?',
    ],
    'listing-appointment': [
      'Thanks for inviting me over. My goal is to understand your timeline and your goals.',
      'What is the ideal closing date for your move?',
      'Let me walk you through how we market homes in this area and the results we track.',
      'Based on the comparable sales, here is the price range I believe we can achieve.',
      'If you are comfortable with the plan, the next step is signing the listing agreement.',
    ],
    'follow-up': [
      'I promised to follow up today. I have the information you asked for.',
      'What questions came up for you since we last spoke?',
      'The next step is to schedule a time to see the homes that fit your criteria.',
      'Are you ready to move forward, or is there anything still in the way?',
    ],
    'objection-handling': [
      'I hear that. Let me make sure I understand before I respond.',
      'Can you tell me more about what is behind that concern?',
      'Here is what I have seen work in similar situations.',
      'Does that approach feel fair to you?',
      'If we can resolve this, would you be ready to move forward?',
    ],
  };

  function getScriptLines(scenario) {
    return SCRIPTS[scenario] || SCRIPTS['buyer-consultation'];
  }

  function defaultState(agentId, scenario) {
    const lines = getScriptLines(scenario);
    return {
      agentId,
      scenario,
      paused: false,
      currentIndex: 0,
      insertionPoint: 0,
      offTopic: false,
      storyEndTransition: null,
      lines,
    };
  }

  async function loadScriptForScenario(agentId, scenario) {
    const state = defaultState(agentId, scenario);
    sessions.set(agentId, state);
    return getTeleprompterState(agentId);
  }

  function getCurrentLine(agentId) {
    const state = sessions.get(agentId);
    if (!state) return null;
    return {
      agentId: state.agentId,
      scenario: state.scenario,
      currentIndex: state.currentIndex,
      paused: state.paused,
      offTopic: state.offTopic,
      currentLine: state.lines[state.currentIndex] || null,
      nextLine: state.lines[state.currentIndex + 1] || null,
      storyEndTransition: state.storyEndTransition,
      insertionPoint: state.insertionPoint,
      totalLines: state.lines.length,
    };
  }

  function advanceScript(agentId, clientCue) {
    const state = sessions.get(agentId);
    if (!state) return null;
    if (state.offTopic) return getCurrentLine(agentId);
    if (state.paused) return getCurrentLine(agentId);
    if (state.currentIndex < state.lines.length - 1) {
      state.currentIndex += 1;
    }
    return getCurrentLine(agentId);
  }

  function handleInterruption(agentId, interruptionText) {
    const state = sessions.get(agentId);
    if (!state) return null;
    const text = String(interruptionText || '').toLowerCase();
    const isStory = /story|remember|when i was|one time|my kid|my child|my mom|my dad|my friend/i.test(text);
    const isOffTopic = /not interested|different subject|anyway|by the way|speaking of/i.test(text) || isStory;

    if (isOffTopic) {
      state.paused = true;
      state.offTopic = true;
      state.insertionPoint = state.currentIndex;
      const currentLine = state.lines[state.currentIndex] || '';
      state.storyEndTransition = `Thanks for sharing. To bring us back to the house, ${currentLine.toLowerCase()}`;
      return { ...getCurrentLine(agentId), storyEndTransition: state.storyEndTransition };
    }
    return getCurrentLine(agentId);
  }

  function resumeAfterStory(agentId) {
    const state = sessions.get(agentId);
    if (!state) return null;
    state.paused = false;
    state.offTopic = false;
    const transition = state.storyEndTransition || state.lines[state.insertionPoint] || '';
    return { ...getCurrentLine(agentId), transition, insertionPoint: state.insertionPoint };
  }

  function getTeleprompterState(agentId) {
    const state = sessions.get(agentId);
    if (!state) return null;
    return {
      agentId: state.agentId,
      scenario: state.scenario,
      currentIndex: state.currentIndex,
      paused: state.paused,
      offTopic: state.offTopic,
      currentLine: state.lines[state.currentIndex] || null,
      nextLine: state.lines[state.currentIndex + 1] || null,
      storyEndTransition: state.storyEndTransition,
      insertionPoint: state.insertionPoint,
      totalLines: state.lines.length,
    };
  }

  return {
    loadScriptForScenario,
    getCurrentLine,
    advanceScript,
    handleInterruption,
    resumeAfterStory,
    getTeleprompterState,
  };
}
