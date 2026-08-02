/**
 * SYNOPSIS: Exports observe — services/lifeos-coaching-protocol.js.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

/**
 * Implements the LifeOS coaching flow: Observe → Become curious → Help them feel understood → Expand the landscape → Verify shared understanding → Assess readiness → Explore paths.
 * All logic is self-contained; no external service modules are imported.
 */

/**
 * Simulates an AI observation from input text.
 * @param {string|{text: string, metadata: object}} input - The input string or object with text and optional metadata.
 * @returns {{observation: string, themes: string[], entities: string[]}} - The extracted observation, themes, and entities.
 */
export function observe(input) {
  const text = typeof input === 'string' ? input : input.text;

  // Simple keyword-based extraction for demonstration.
  const themes = [];
  const entities = [];

  if (text.toLowerCase().includes('stress')) {
    themes.push('stress management');
    entities.push('stress');
  }
  if (text.toLowerCase().includes('goal')) {
    themes.push('goal setting');
    entities.push('goal');
  }
  if (text.toLowerCase().includes('relationship')) {
    themes.push('relationship dynamics');
    entities.push('relationship');
  }
  if (text.toLowerCase().includes('challenge')) {
    themes.push('overcoming challenges');
    entities.push('challenge');
  }
  if (text.toLowerCase().includes('change')) {
    themes.push('personal growth');
    entities.push('change');
  }
  if (text.toLowerCase().includes('future')) {
    themes.push('future planning');
    entities.push('future');
  }

  const observation = `The user expressed thoughts around: "${text.substring(0, Math.min(text.length, 100))}${text.length > 100 ? '...' : ''}"`;

  return { observation, themes, entities };
}

/**
 * Generates a curious, open-ended question based on an observation.
 * @param {string} observation - The observation string.
 * @returns {string} - A single curious, open-ended question.
 */
export function becomeCurious(observation) {
  if (!observation || typeof observation !== 'string') {
    return 'What is on your mind today?';
  }
  // Simplified logic: rephrasing the observation into a question
  if (observation.includes('thoughts around:')) {
    const topic = observation.split('thoughts around: "')[1]?.split('"')[0];
    if (topic) {
      return `Given your thoughts around "${topic}", what feels most important to explore right now?`;
    }
  }
  return `What is emerging for you from this observation: "${observation}"?`;
}

/**
 * Returns a reflection string that mirrors content and emotion without adding interpretation.
 * @param {object} constellation - Represents the user's current state, including nodes and edges of connections.
 * @param {string} statement - The user's statement to reflect.
 * @returns {string} - A reflection string.
 */
export function helpFeelUnderstood(constellation, statement) {
  // Simplistic reflection: directly mirrors the statement with a feeling word.
  // In a real system, 'constellation' would inform deeper emotional mirroring.
  const sentiment = detectSentiment(statement); // Internal helper
  let reflection = `It sounds like you're feeling ${sentiment} about "${statement}".`;

  if (statement.length > 150) {
    reflection = `You're sharing about "${statement.substring(0, 100)}...", and it seems like you're feeling ${sentiment}.`;
  }
  return reflection;
}

/**
 * Expands the landscape of a topic using a simulated constellation.
 * @param {object} constellation - Represents the user's current state, including nodes and edges of connections.
 * @param {string} topic - The topic to expand.
 * @returns {{perspectives: string[], unstatedNeeds: string[], betterQuestions: string[]}} - Expanded perspectives, unstated needs, and better questions.
 */
export function expandLandscape(constellation, topic) {
  // Simplified constellation simulation:
  const nodes = constellation && constellation.nodes ? constellation.nodes : ['identity', 'relationships', 'career', 'well-being', 'purpose'];
  const edges = constellation && constellation.edges ? constellation.edges : [];

  const perspectives = [
    `Considering "${topic}" from an identity perspective: How does this align with who you see yourself becoming?`,
    `From a relationship angle: What impact does "${topic}" have on your key connections?`,
    `Thinking about your career in relation to "${topic}": What opportunities or challenges arise?`,
    `Looking at your overall well-being and "${topic}": How does it affect your energy and peace?`,
    `Reflecting on your deeper purpose and "${topic}": What connections emerge here?`,
  ];

  const unstatedNeeds = [];
  if (topic.toLowerCase().includes('change')) {
    unstatedNeeds.push('A need for stability and predictability.');
  }
  if (topic.toLowerCase().includes('stress')) {
    unstatedNeeds.push('A need for control and calm.');
  }
  if (topic.toLowerCase().includes('goal')) {
    unstatedNeeds.push('A need for clear steps and support.');
  }
  if (topic.toLowerCase().includes('future')) {
    unstatedNeeds.push('A need for clarity and direction.');
  }
  if (unstatedNeeds.length === 0) {
    unstatedNeeds.push('A need for deeper understanding and exploration.');
  }

  const betterQuestions = [
    `What's the deeper meaning of "${topic}" for you right now?`,
    `If "${topic}" were fully resolved, what would that unlock in your life?`,
    `What aspect of "${topic}" feels most alive for you to address first?`,
  ];

  // Incorporate actual constellation nodes/edges if available for more specific expansion
  if (nodes.includes(topic.toLowerCase())) {
    perspectives.push(`Given "${topic}" is a core area, how does it connect to your other priorities?`);
    const relevantEdges = edges.filter(e => e.from === topic || e.to === topic);
    if (relevantEdges.length > 0) {
      betterQuestions.push(`Considering its connections, what previously unseen aspect of "${topic}" is now visible?`);
    }
  }

  return { perspectives, unstatedNeeds, betterQuestions };
}

/**
 * Verifies shared understanding between a summary and a user's reply.
 * @param {string} summary - The system's summary of understanding.
 * @param {string} userReply - The user's reply to the summary.
 * @returns {{aligned: boolean, confidence: number, gap: string|null}} - Alignment status, confidence, and any identified gap.
 */
export function verifySharedUnderstanding(summary, userReply) {
  // Simplistic keyword matching for alignment.
  const summaryLower = summary.toLowerCase();
  const replyLower = userReply.toLowerCase();

  let aligned = false;
  let confidence = 0.5;
  let gap = null;

  if (replyLower.includes('yes') || replyLower.includes('exactly') || replyLower.includes('that is correct')) {
    aligned = true;
    confidence = 0.9;
  } else if (replyLower.includes('no') || replyLower.includes('not quite') || replyLower.includes('i meant')) {
    aligned = false;
    confidence = 0.2;
    gap = 'There seems to be a mismatch. Could you elaborate on what you meant?';
  } else if (summaryLower.includes('topic')) { // Example: if summary mentions a topic, check if reply does too.
    const topicMatch = summaryLower.match(/topic: "([^"]+)"/);
    if (topicMatch && replyLower.includes(topicMatch[1].toLowerCase())) {
      aligned = true;
      confidence = 0.7;
    } else {
      gap = 'The reply did not explicitly confirm the key topic.';
      confidence = 0.4;
    }
  }

  return { aligned, confidence, gap };
}

/**
 * Assesses readiness for a topic based on simulated constellation data and parameters.
 * @param {object} constellation - Represents the user's current state.
 * @param {string} topic - The topic for which to assess readiness.
 * @param {'low'|'medium'|'high'} complexity - The perceived complexity of the topic.
 * @param {number} emotionalWeight - A value between 0 and 1 representing emotional intensity.
 * @returns {{readinessScore: number, riskIfForced: number, form: 'question'|'suggestion'|'pause'|'resource'}} - Readiness score, risk, and suggested form of interaction.
 */
export function assessReadiness(constellation, topic, complexity = 'medium', emotionalWeight = 0.5) {
  let readinessScore = 0.5;
  let riskIfForced = 0.5;
  let form = 'question';

  // Simulate internal state from constellation
  const recentJoyScore = constellation && typeof constellation.joyScore === 'number' ? constellation.joyScore : 0.7;
  const recentIntegrityScore = constellation && typeof constellation.integrityScore === 'number' ? constellation.integrityScore : 0.8;
  const recentCommitmentCompletionRate = constellation && typeof constellation.commitmentCompletionRate === 'number' ? constellation.commitmentCompletionRate : 0.75;
  const emotionalStability = constellation && typeof constellation.emotionalStability === 'number' ? constellation.emotionalStability : 0.8; // 0-1, higher is more stable

  // Adjust readiness based on emotional weight and stability
  readinessScore += (emotionalStability - emotionalWeight) * 0.2;

  // Adjust readiness based on recent performance and well-being
  readinessScore += (recentJoyScore - 0.5) * 0.1;
  readinessScore += (recentIntegrityScore - 0.5) * 0.1;
  readinessScore += (recentCommitmentCompletionRate - 0.5) * 0.05;

  // Adjust based on complexity
  if (complexity === 'low') {
    readinessScore += 0.1;
    riskIfForced -= 0.1;
  } else if (complexity === 'high') {
    readinessScore -= 0.1;
    riskIfForced += 0.1;
  }

  // Cap scores between 0 and 1
  readinessScore = Math.max(0, Math.min(1, readinessScore));
  riskIfForced = Math.max(0, Math.min(1, riskIfForced));

  // Determine form based on readiness and risk
  if (readinessScore < 0.3 || riskIfForced > 0.7) {
    form = 'pause';
  } else if (readinessScore < 0.5 && riskIfForced > 0.5) {
    form = 'resource';
  } else if (readinessScore > 0.7 && emotionalWeight < 0.3) {
    form = 'suggestion';
  } else {
    form = 'question';
  }

  // Example for specific topics
  if (topic.toLowerCase().includes('grief') || topic.toLowerCase().includes('crisis')) {
    readinessScore = 0.1; // Override for high-sensitivity topics
    riskIfForced = 0.9;
    form = 'pause';
  }

  return { readinessScore, riskIfForced, form };
}

/**
 * Explores potential paths for a topic.
 * @param {object} constellation - Represents the user's current state.
 * @param {string} topic - The topic for which to explore paths.
 * @param {boolean} invitation - Whether the user has explicitly invited path exploration.
 * @returns {{invited: boolean, paths: [{label: string, rationale: string, nextStep: string}]}} - Invitation status and a list of paths.
 */
export function explorePaths(constellation, topic, invitation = true) {
  const paths = [];

  if (!invitation) {
    return { invited: false, paths: [] };
  }

  // Simulate path generation based on topic and constellation elements
  const hasGoalNode = constellation && constellation.nodes && constellation.nodes.includes('goal setting');
  const hasRelationshipEdge = constellation && constellation.edges && constellation.edges.some(e => e.from === 'relationships' || e.to === 'relationships');

  if (topic.toLowerCase().includes('career')) {
    paths.push({
      label: 'Refine career purpose',
      rationale: 'Aligning your career with your deeper purpose can bring more fulfillment.',
      nextStep: 'Explore your core values and how they manifest in your work.',
    });
    if (hasGoalNode) {
      paths.push({
        label: 'Set a specific career growth goal',
        rationale: 'Clear goals provide direction and motivation for career advancement.',
        nextStep: 'Define a SMART goal for your career in the next 3-6 months.',
      });
    }
  }

  if (topic.toLowerCase().includes('relationship')) {
    paths.push({
      label: 'Strengthen communication skills',
      rationale: 'Effective communication is key to healthy relationships.',
      nextStep: 'Practice active listening in your next important conversation.',
    });
    if (hasRelationshipEdge) {
      paths.push({
        label: 'Explore shared activities',
        rationale: 'Shared experiences can deepen bonds and create new memories.',
        nextStep: 'Suggest a new activity to a key person in your life this week.',
      });
    }
  }

  if (topic.toLowerCase().includes('well-being')) {
    paths.push({
      label: 'Integrate a new self-care practice',
      rationale: 'Consistent self-care supports overall well-being.',
      nextStep: 'Commit to 10 minutes of mindfulness daily for the next 7 days.',
    });
  }

  if (paths.length === 0) {
    paths.push({
      label: 'Deepen self-awareness',
      rationale: 'Understanding yourself better is a foundation for all growth.',
      nextStep: 'Engage in a daily reflection practice for 5 minutes.',
    });
  }

  return { invited: true, paths };
}

// --- Internal Helper Functions (not exported) ---

/**
 * Simple sentiment detection for demonstration.
 * @param {string} text - The input text.
 * @returns {string} - A sentiment label.
 */
function detectSentiment(text) {
  const lowerText = text.toLowerCase();
  if (lowerText.includes('happy') || lowerText.includes('joy') || lowerText.includes('excited')) {
    return 'positive';
  }
  if (lowerText.includes('sad') || lowerText.includes('down') || lowerText.includes('unhappy') || lowerText.includes('grief')) {
    return 'a bit low';
  }
  if (lowerText.includes('stress') || lowerText.includes('anxious') || lowerText.includes('worry')) {
    return 'concerned';
  }
  if (lowerText.includes('frustrated') || lowerText.includes('annoyed')) {
    return 'frustrated';
  }
  return 'thoughtful';
}