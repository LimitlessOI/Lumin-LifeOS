/**
 * SYNOPSIS: Exports detectAvoidancePattern — services/lifeos-avoidance-pattern.js.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

/**
 * Detects when a topic is repeatedly approached and moved away from.
 *
 * @param {object} constellation - An object representing the relationship graph (not directly used in this self-contained logic, but included for API consistency).
 * @param {string} topic - The topic to detect avoidance for.
 * @param {Array<object>} events - An array of topic exposure events. Each event is `{topic: string, action: 'approach'|'avoid', timestamp: number}`.
 * @returns {{detected: boolean, occurrences: number, pattern: 'consistent_avoidance'|'mixed'|'none', confidence: number, examples: string[]}}
 */
export function detectAvoidancePattern(constellation, topic, events) {
  const relevantEvents = events.filter(event => event.topic === topic);

  if (relevantEvents.length < 3) { // Require at least 3 events to detect a pattern
    return {
      detected: false,
      occurrences: relevantEvents.length,
      pattern: 'none',
      confidence: 0,
      examples: []
    };
  }

  const approachCount = relevantEvents.filter(event => event.action === 'approach').length;
  const avoidCount = relevantEvents.filter(event => event.action === 'avoid').length;

  let pattern = 'none';
  let detected = false;
  let confidence = 0;

  // Pattern detection logic
  if (avoidCount > approachCount && avoidCount >= 2 && relevantEvents.length >= 3) {
    // Check for a sequence of approach followed by avoid
    let approachThenAvoid = 0;
    for (let i = 0; i < relevantEvents.length - 1; i++) {
      if (relevantEvents[i].action === 'approach' && relevantEvents[i+1].action === 'avoid') {
        approachThenAvoid++;
      }
    }

    if (approachThenAvoid >= 1 && avoidCount >= 2) { // At least one approach-avoid sequence and at least two avoids
      pattern = 'consistent_avoidance';
      detected = true;
      // Confidence increases with more avoidances and clear approach-avoid sequences
      confidence = Math.min(1, (avoidCount / relevantEvents.length) * 0.7 + (approachThenAvoid / (relevantEvents.length - 1)) * 0.3);
    } else if (avoidCount > 0 && approachCount > 0) {
      pattern = 'mixed';
      // Lower confidence for mixed patterns, indicates less clear avoidance
      confidence = Math.min(0.5, (avoidCount / relevantEvents.length) * 0.5);
    }
  }

  const examples = relevantEvents.map(event => `${new Date(event.timestamp).toLocaleString()}: ${event.action}`);

  return {
    detected,
    occurrences: relevantEvents.length,
    pattern,
    confidence,
    examples: examples.slice(-5) // Return up to 5 most recent examples
  };
}

/**
 * Formats a curious invitation based on the detected pattern and tone.
 *
 * @param {'consistent_avoidance'|'mixed'|'none'} pattern - The detected avoidance pattern.
 * @param {string} topic - The topic of the avoidance pattern.
 * @param {'gentle'|'direct'|'neutral'} [tone='gentle'] - The desired tone for the invitation.
 * @returns {string} The formatted curious invitation.
 */
export function formatCuriousInvitation(pattern, topic, tone = 'gentle') {
  let invitation = '';

  switch (pattern) {
    case 'consistent_avoidance':
      if (tone === 'gentle') {
        invitation = `I notice the topic of "${topic}" has come up several times, but we consistently move away from it. I could be reading that incorrectly. Does that observation fit your experience?`;
      } else if (tone === 'direct') {
        invitation = `Regarding "${topic}", there's a clear pattern of approaching and then avoiding it. What's happening there?`;
      } else { // neutral
        invitation = `The topic "${topic}" shows a pattern of consistent avoidance in our interactions. Would you like to explore why?`;
      }
      break;
    case 'mixed':
      if (tone === 'gentle') {
        invitation = `I've noticed some back-and-forth with the topic of "${topic}". Sometimes we approach it, sometimes we shift away. I wonder if there's anything there?`;
      } else if (tone === 'direct') {
        invitation = `There's an inconsistent engagement with "${topic}". What's your current stance on discussing it?`;
      } else { // neutral
        invitation = `Interactions around "${topic}" show a mixed pattern of approach and avoidance. Do you have any thoughts on this?`;
      }
      break;
    case 'none':
    default:
      if (tone === 'gentle') {
        invitation = `It seems like "${topic}" hasn't shown any clear avoidance patterns, but I'm open to discussing it if it's on your mind.`;
      } else if (tone === 'direct') {
        invitation = `No avoidance pattern detected for "${topic}". If you want to discuss it, let me know.`;
      } else { // neutral
        invitation = `The topic "${topic}" does not currently exhibit an avoidance pattern.`;
      }
      break;
  }

  return invitation;
}

/**
 * Tracks a topic exposure event within a constellation-like object.
 * This function extends the existing `constellation` object by adding or updating
 * a node/edge entry for the topic exposure. For this self-contained module,
 * it simulates a simple update to a conceptual constellation.
 *
 * @param {object} constellation - The current constellation-like object.
 * @param {string} topic - The topic of the event.
 * @param {object} event - The event object: `{topic: string, action: 'approach'|'avoid', timestamp: number}`.
 * @returns {object} An updated constellation-like object.
 */
export function trackTopicExposure(constellation, topic, event) {
  // Simulate a simple constellation update. In a real system, 'constellation'
  // would likely be a more complex graph structure (e.g., nodes, edges).
  // For this self-contained module, we'll store a history of events per topic.

  const updatedConstellation = { ...constellation };

  if (!updatedConstellation.topicExposures) {
    updatedConstellation.topicExposures = {};
  }

  if (!updatedConstellation.topicExposures[topic]) {
    updatedConstellation.topicExposures[topic] = [];
  }

  updatedConstellation.topicExposures[topic].push({
    action: event.action,
    timestamp: event.timestamp,
  });

  // Keep the history for a topic manageable, e.g., last 20 events
  const MAX_HISTORY_PER_TOPIC = 20;
  if (updatedConstellation.topicExposures[topic].length > MAX_HISTORY_PER_TOPIC) {
    updatedConstellation.topicExposures[topic] = updatedConstellation.topicExposures[topic].slice(-MAX_HISTORY_PER_TOPIC);
  }

  return updatedConstellation;
}