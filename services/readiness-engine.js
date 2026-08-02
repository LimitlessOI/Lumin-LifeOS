/**
 * SYNOPSIS: Exports assessReadiness — services/readiness-engine.js.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

/**
 * Represents a recipient's profile for readiness assessment.
 * @typedef {object} RecipientProfile
 * @property {string} emotionalState - e.g., 'calm', 'overwhelmed', 'grieving', 'hopeful'
 * @property {number} cognitiveLoad - A numerical value representing current cognitive burden (0-1).
 * @property {object} context - Current environmental or situational context.
 * @property {Array<string>} history - Relevant historical interactions or patterns.
 * @property {object} constellation - A simplified representation of the Human Constellation for the recipient.
 * @property {Array<string>} constellation.avoidances - List of known avoidance patterns for the recipient.
 */

/**
 * Represents the insight to be delivered.
 * @typedef {object} Insight
 * @property {string} topic - The primary topic of the insight.
 * @property {string} complexity - 'low', 'medium', 'high'
 * @property {string} emotionalWeight - 'low', 'medium', 'high'
 */

/**
 * Assesses the readiness of a recipient to integrate a target insight.
 * @param {RecipientProfile} recipient - The recipient's profile.
 * @param {Insight} insight - The insight to be integrated.
 * @returns {{readiness_score: number, risk_if_forced: string}}
 */
export function assessReadiness(recipient, insight) {
  let readiness_score = 1.0;
  let risk_if_forced = 'none';

  // Cognitive Load Impact
  if (recipient.cognitiveLoad > 0.7) {
    readiness_score -= 0.4; // High cognitive load significantly reduces readiness
    risk_if_forced = 'overwhelm';
  } else if (recipient.cognitiveLoad > 0.4) {
    readiness_score -= 0.2;
    if (risk_if_forced === 'none') risk_if_forced = 'overwhelm';
  }

  // Emotional State Impact
  if (recipient.emotionalState === 'overwhelmed' || recipient.emotionalState === 'grieving') {
    readiness_score -= 0.5;
    if (risk_if_forced === 'none') risk_if_forced = 'overwhelm';
  } else if (recipient.emotionalState === 'anxious') {
    readiness_score -= 0.3;
    if (risk_if_forced === 'none') risk_if_forced = 'rejection';
  }

  // Insight Complexity Impact
  if (insight.complexity === 'high') {
    readiness_score -= 0.3;
    if (risk_if_forced === 'none') risk_if_forced = 'overwhelm';
  } else if (insight.complexity === 'medium') {
    readiness_score -= 0.1;
  }

  // Insight Emotional Weight Impact
  if (insight.emotionalWeight === 'high') {
    readiness_score -= 0.3;
    if (risk_if_forced === 'none') risk_if_forced = 'rejection';
  } else if (insight.emotionalWeight === 'medium') {
    readiness_score -= 0.1;
  }

  // Avoidance Patterns
  const avoidancePattern = detectAvoidancePattern(recipient.constellation, insight.topic);
  if (avoidancePattern) {
    readiness_score -= 0.6; // Strong negative impact if an avoidance pattern is detected
    risk_if_forced = 'rejection';
  }

  // Ensure score is within 0-1 range
  readiness_score = Math.max(0, Math.min(1, readiness_score));

  // Refine risk based on final score if it's still 'none'
  if (risk_if_forced === 'none' && readiness_score < 0.5) {
    risk_if_forced = 'rejection';
  } else if (risk_if_forced === 'none' && readiness_score < 0.7) {
    risk_if_forced = 'dependency'; // May lead to dependency if not fully ready but not overwhelmed/rejected
  }


  return { readiness_score, risk_if_forced };
}

/**
 * Selects the recommended form for delivering an insight based on recipient readiness.
 * @param {RecipientProfile} recipient - The recipient's profile.
 * @param {Insight} insight - The insight to be integrated.
 * @returns {string} The recommended form ('micro-insight', 'dialogue', 'exercise', 'wait').
 */
export function selectForm(recipient, insight) {
  const { readiness_score } = assessReadiness(recipient, insight);

  if (readiness_score >= 0.8) {
    return 'dialogue'; // High readiness, ready for interactive engagement
  } else if (readiness_score >= 0.6) {
    return 'exercise'; // Moderate readiness, can engage with structured activity
  } else if (readiness_score >= 0.4) {
    return 'micro-insight'; // Low readiness, small digestible piece of information
  } else {
    return 'wait'; // Very low readiness, defer delivery
  }
}

/**
 * Detects if a recipient has an avoidance pattern related to a given topic.
 * This is a simplified stub based on the Human Constellation structure.
 * @param {object} constellation - A simplified representation of the Human Constellation for the recipient.
 * @param {Array<string>} constellation.avoidances - List of known avoidance patterns for the recipient.
 * @param {string} topic - The topic to check for avoidance.
 * @returns {boolean} True if an avoidance pattern is detected for the topic, false otherwise.
 */
export function detectAvoidancePattern(constellation, topic) {
  if (!constellation || !Array.isArray(constellation.avoidances)) {
    return false;
  }
  // This is a simplified check. A real implementation would involve more sophisticated graph traversal
  // and pattern matching based on weighted edges and historical data.
  return constellation.avoidances.some(avoidance => avoidance.toLowerCase().includes(topic.toLowerCase()));
}