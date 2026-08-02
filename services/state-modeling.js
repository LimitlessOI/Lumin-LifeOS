/**
 * SYNOPSIS: Exports inferState — services/state-modeling.js.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

/**
 * Maps constellation nodes and recent events to a person's state and coaching suggestions.
 * @param {object} constellation - The person's constellation graph.
 * @param {Array<object>} constellation.nodes - Array of nodes, e.g., `{id, type, name, value}`.
 * @param {Array<object>} constellation.edges - Array of edges, e.g., `{from, to, weight}`.
 * @param {Array<string>} recentEvents - Array of recent event strings.
 * @returns {{state: string, confidence: number, indicators: string[], suggestions: {pace: 'slow'|'normal'|'pause', depth: 'surface'|'medium'|'deep', directness: 'indirect'|'gentle'|'direct', avoidLabels: boolean}}}
 */
export function inferState(constellation, recentEvents) {
  let state = 'unknown';
  const indicators = [];
  let confidence = 0.1;

  const stateScores = {
    calm: 0,
    excited: 0,
    overwhelmed: 0,
    ashamed: 0,
    grieving: 0,
    angry: 0,
    hopeful: 0,
    unknown: 0,
  };

  const keywords = {
    overwhelmed: ['too much', 'struggling', 'can\'t cope', 'pressure', 'stressed', 'many things'],
    ashamed: ['embarrassed', 'guilty', 'failure', 'regret', 'hide', 'unworthy'],
    grieving: ['loss', 'sad', 'mourning', 'bereavement', 'miss', 'heartbroken'],
    angry: ['frustrated', 'rage', 'irritated', 'resentment', 'furious', 'upset'],
    hopeful: ['optimistic', 'positive', 'opportunity', 'growth', 'future', 'excited about'],
    excited: ['thrilled', 'eager', 'energetic', 'enthusiastic', 'anticipating', 'passion'],
    calm: ['peaceful', 'relaxed', 'centered', 'tranquil', 'clear', 'grounded'],
  };

  // Analyze constellation nodes
  for (const node of constellation.nodes) {
    const lowerName = node.name ? node.name.toLowerCase() : '';
    const lowerType = node.type ? node.type.toLowerCase() : '';
    const lowerValue = node.value ? String(node.value).toLowerCase() : '';

    if (lowerType === 'states' || lowerType === 'emotional_state') {
      if (lowerName.includes('overwhelmed')) stateScores.overwhelmed += 0.3;
      if (lowerName.includes('ashamed')) stateScores.ashamed += 0.3;
      if (lowerName.includes('grieving')) stateScores.grieving += 0.3;
      if (lowerName.includes('angry')) stateScores.angry += 0.3;
      if (lowerName.includes('hopeful')) stateScores.hopeful += 0.3;
      if (lowerName.includes('excited')) stateScores.excited += 0.3;
      if (lowerName.includes('calm')) stateScores.calm += 0.3;
    }

    if (lowerType === 'triggers') {
      if (lowerName.includes('stress') || lowerValue.includes('stress')) stateScores.overwhelmed += 0.2;
      if (lowerName.includes('failure') || lowerValue.includes('failure')) stateScores.ashamed += 0.2;
      if (lowerName.includes('loss') || lowerValue.includes('loss')) stateScores.grieving += 0.2;
      if (lowerName.includes('conflict') || lowerValue.includes('conflict')) stateScores.angry += 0.2;
    }

    if (lowerType === 'needs') {
      if (lowerName.includes('rest') || lowerName.includes('space')) stateScores.overwhelmed += 0.1;
      if (lowerName.includes('acceptance') || lowerName.includes('forgiveness')) stateScores.ashamed += 0.1;
      if (lowerName.includes('comfort') || lowerName.includes('support')) stateScores.grieving += 0.1;
      if (lowerName.includes('understanding') || lowerName.includes('justice')) stateScores.angry += 0.1;
      if (lowerName.includes('challenge') || lowerName.includes('progress')) stateScores.hopeful += 0.1;
      if (lowerName.includes('stimulation') || lowerName.includes('expression')) stateScores.excited += 0.1;
      if (lowerName.includes('stability') || lowerName.includes('clarity')) stateScores.calm += 0.1;
    }
  }

  // Analyze recent events
  for (const event of recentEvents) {
    const lowerEvent = event.toLowerCase();
    for (const s in keywords) {
      if (keywords[s].some(k => lowerEvent.includes(k))) {
        stateScores[s] += 0.2; // Increase score for matching keyword
        indicators.push(`Event keyword match: "${s}"`);
      }
    }
  }

  // Determine the dominant state
  let maxScore = 0;
  for (const s in stateScores) {
    if (stateScores[s] > maxScore) {
      maxScore = stateScores[s];
      state = s;
    }
  }

  // Refine confidence based on score and number of indicators
  confidence = Math.min(1, maxScore / 2 + indicators.length * 0.05);

  // If no strong state, default to unknown with low confidence
  if (maxScore < 0.5 && indicators.length < 2) {
    state = 'unknown';
    confidence = Math.max(0.1, confidence * 0.5);
  }

  // Add general indicators
  if (state === 'overwhelmed' && maxScore > 0.5) indicators.push('High volume of inputs or demands');
  if (state === 'ashamed' && maxScore > 0.5) indicators.push('Focus on past actions or perceived failures');
  if (state === 'grieving' && maxScore > 0.5) indicators.push('References to loss or significant change');
  if (state === 'angry' && maxScore > 0.5) indicators.push('Expressions of frustration or injustice');
  if (state === 'hopeful' && maxScore > 0.5) indicators.push('Anticipation of positive future outcomes');
  if (state === 'excited' && maxScore > 0.5) indicators.push('High energy and enthusiasm detected');
  if (state === 'calm' && maxScore > 0.5) indicators.push('Sense of stability and clarity');

  const suggestions = adaptCoachingForState(state);

  return { state, confidence, indicators, suggestions };
}

/**
 * Adapts coaching style suggestions for a given inferred state.
 * @param {string} state - The inferred state (calm, excited, overwhelmed, ashamed, grieving, angry, hopeful, unknown).
 * @returns {{pace: 'slow'|'normal'|'pause', depth: 'surface'|'medium'|'deep', directness: 'indirect'|'gentle'|'direct', avoidLabels: boolean}}
 */
export function adaptCoachingForState(state) {
  const defaultSuggestions = {
    pace: 'normal',
    depth: 'medium',
    directness: 'gentle',
    avoidLabels: true,
  };

  switch (state) {
    case 'calm':
      return { pace: 'normal', depth: 'deep', directness: 'direct', avoidLabels: true };
    case 'excited':
      return { pace: 'normal', depth: 'medium', directness: 'gentle', avoidLabels: true };
    case 'overwhelmed':
      return { pace: 'slow', depth: 'surface', directness: 'indirect', avoidLabels: true };
    case 'ashamed':
      return { pace: 'slow', depth: 'medium', directness: 'indirect', avoidLabels: true };
    case 'grieving':
      return { pace: 'slow', depth: 'surface', directness: 'indirect', avoidLabels: true };
    case 'angry':
      return { pace: 'slow', depth: 'surface', directness: 'indirect', avoidLabels: true };
    case 'hopeful':
      return { pace: 'normal', depth: 'deep', directness: 'direct', avoidLabels: true };
    case 'unknown':
    default:
      return defaultSuggestions;
  }
}

/**
 * Detects if there's a significant shift between a previous and current state.
 * @param {string} previousState - The previously inferred state.
 * @param {string} currentState - The currently inferred state.
 * @returns {{shifted: boolean, direction: string, note: string}}
 */
export function detectStateShift(previousState, currentState) {
  if (previousState === currentState) {
    return { shifted: false, direction: 'stable', note: `State remains ${currentState}.` };
  }

  const shiftMap = {
    calm: {
      excited: 'upbeat',
      overwhelmed: 'degraded',
      ashamed: 'degraded',
      grieving: 'degraded',
      angry: 'degraded',
      hopeful: 'upbeat',
      unknown: 'unclear',
    },
    excited: {
      calm: 'stabilizing',
      overwhelmed: 'degraded',
      ashamed: 'degraded',
      grieving: 'degraded',
      angry: 'degraded',
      hopeful: 'stable',
      unknown: 'unclear',
    },
    overwhelmed: {
      calm: 'improving',
      excited: 'unclear',
      ashamed: 'degraded',
      grieving: 'degraded',
      angry: 'degraded',
      hopeful: 'improving',
      unknown: 'unclear',
    },
    ashamed: {
      calm: 'improving',
      excited: 'upbeat',
      overwhelmed: 'degraded',
      grieving: 'degraded',
      angry: 'degraded',
      hopeful: 'improving',
      unknown: 'unclear',
    },
    grieving: {
      calm: 'improving',
      excited: 'upbeat',
      overwhelmed: 'degraded',
      ashamed: 'degraded',
      angry: 'degraded',
      hopeful: 'improving',
      unknown: 'unclear',
    },
    angry: {
      calm: 'improving',
      excited: 'upbeat',
      overwhelmed: 'degraded',
      ashamed: 'degraded',
      grieving: 'degraded',
      hopeful: 'improving',
      unknown: 'unclear',
    },
    hopeful: {
      calm: 'stable',
      excited: 'upbeat',
      overwhelmed: 'degraded',
      ashamed: 'degraded',
      grieving: 'degraded',
      angry: 'degraded',
      unknown: 'unclear',
    },
    unknown: {
      calm: 'clarifying',
      excited: 'clarifying',
      overwhelmed: 'clarifying',
      ashamed: 'clarifying',
      grieving: 'clarifying',
      angry: 'clarifying',
      hopeful: 'clarifying',
    },
  };

  const direction = shiftMap[previousState]?.[currentState] || 'unclear';
  const note = `Shift detected from ${previousState} to ${currentState}.`;

  return { shifted: true, direction, note };
}

/**
 * Returns a short, non-labeling sentence describing the inferred state.
 * @param {string} state - The inferred state.
 * @param {number} confidence - The confidence level (0-1).
 * @returns {string}
 */
export function describeState(state, confidence) {
  const prefix = confidence > 0.7 ? 'It sounds like ' : 'There may be a sense that ';

  switch (state) {
    case 'calm':
      return `${prefix}things are settled and clear right now.`;
    case 'excited':
      return `${prefix}there is a lot of energy and anticipation.`;
    case 'overwhelmed':
      return `${prefix}there may be a lot right now.`;
    case 'ashamed':
      return `${prefix}there are some difficult feelings about past actions.`;
    case 'grieving':
      return `${prefix}there is a process of loss and sadness.`;
    case 'angry':
      return `${prefix}there is frustration or a feeling of injustice.`;
    case 'hopeful':
      return `${prefix}there are positive possibilities ahead.`;
    case 'unknown':
    default:
      return 'It is not yet clear what is present. We are observing.';
  }
}