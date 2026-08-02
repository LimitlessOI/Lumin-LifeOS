/**
 * SYNOPSIS: Exports getDefaultProfile — services/founder-communication-calibration.js.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

/**
 * @typedef {'example'|'principle'|'story'} LearningStyle
 */

/**
 * @typedef {object} CommunicationProfile
 * @property {number} literalness - 0-1, how literal Adam prefers communication.
 * @property {number} precision - 0-1, how precise Adam prefers communication.
 * @property {number} confidenceExpression - 0-1, how much confidence Adam expresses/prefers to see.
 * @property {number} abstraction - 0-1, how abstract Adam prefers communication.
 * @property {number} narrativeDensity - 0-1, how dense with narrative elements Adam prefers communication.
 * @property {number} goalOrientation - 0-1, how goal-oriented Adam prefers communication.
 * @property {LearningStyle} learningStyle - Adam's preferred learning style.
 * @property {string[]} biases - List of known cognitive biases.
 * @property {string[]} correctionStrategies - Strategies for correcting messages.
 */

/**
 * Returns a default communication profile for Adam.
 * @returns {CommunicationProfile}
 */
export function getDefaultProfile() {
  return {
    literalness: 0.8,
    precision: 0.9,
    confidenceExpression: 0.7,
    abstraction: 0.6,
    narrativeDensity: 0.4,
    goalOrientation: 0.85,
    learningStyle: 'principle', // Default to 'principle' as it aligns with precision/abstraction
    biases: ['confirmation bias', 'availability heuristic'],
    correctionStrategies: ['ask for concrete examples', 'request data sources', 'challenge assumptions'],
  };
}

/**
 * Adjusts a message towards the specified communication profile.
 * This is a simplified, rule-based adjustment. A more advanced implementation
 * would involve natural language processing and more nuanced transformations.
 *
 * @param {string} message - The original message.
 * @param {Partial<CommunicationProfile>} [profile={}] - The target communication profile. Defaults to a neutral profile for unspecified dimensions.
 * @returns {{adjusted: string, changes: string[], why: string}}
 */
export function calibrateMessage(message, profile = {}) {
  const defaultProfile = getDefaultProfile();
  const effectiveProfile = { ...defaultProfile, ...profile };
  const changes = [];
  let adjustedMessage = message;
  let why = 'Message adjusted based on communication profile:\n';

  // Helper to apply a simple adjustment based on a dimension
  const applyAdjustment = (dimension, factor, transformFn, description) => {
    if (factor > 0.5) { // Adjust more towards the characteristic
      const original = adjustedMessage;
      adjustedMessage = transformFn(adjustedMessage, factor);
      if (original !== adjustedMessage) {
        changes.push(description);
        why += `- ${description}\n`;
      }
    }
  };

  // Literalness & Precision
  applyAdjustment('literalness', effectiveProfile.literalness, (msg, factor) => {
    // Example: Replace vague terms with more direct ones
    if (factor > 0.7) {
      return msg
        .replace(/\b(i think|i believe|it seems|i feel like)\b/gi, '')
        .replace(/\b(could be|might be|possibly)\b/gi, '');
    }
    return msg;
  }, 'Increased literalness and precision: removed vague phrasing.');

  applyAdjustment('precision', effectiveProfile.precision, (msg, factor) => {
    // Example: Encourage specific numbers/details
    if (factor > 0.8) {
      return msg.replace(/\b(a few|some|many|several)\b/gi, (match) => {
        if (match.toLowerCase() === 'a few') return '2-3';
        if (match.toLowerCase() === 'some') return 'a specific number of';
        if (match.toLowerCase() === 'many') return 'a significant number of';
        if (match.toLowerCase() === 'several') return '3-5';
        return match;
      });
    }
    return msg;
  }, 'Increased precision: suggested more specific quantification.');

  // Confidence Expression
  applyAdjustment('confidenceExpression', effectiveProfile.confidenceExpression, (msg, factor) => {
    // Example: Rephrase tentative statements
    if (factor > 0.6) {
      return msg
        .replace(/\b(we should try to|we could attempt to)\b/gi, 'We will')
        .replace(/\b(i think we can)\b/gi, 'We can')
        .replace(/\b(perhaps|maybe)\b/gi, '');
    }
    return msg;
  }, 'Adjusted confidence expression: rephrased tentative statements.');


  // Abstraction
  applyAdjustment('abstraction', effectiveProfile.abstraction, (msg, factor) => {
    // Example: Elevate specific examples to general principles if high abstraction
    if (factor > 0.7 && effectiveProfile.learningStyle === 'principle') {
      const examplesRemoved = msg.replace(/\b(for example|such as|e.g.)\b.*?(?=\.|\n|$)/gi, '');
      if (examplesRemoved !== msg) {
        return examplesRemoved + ' (Focus on the underlying principle.)';
      }
    } else if (factor < 0.3 && effectiveProfile.learningStyle === 'example') {
      // If low abstraction, ensure concrete examples are present (this rule doesn't add, but implies need)
      if (!/\b(for example|such as|e.g.)\b/gi.test(msg)) {
        return msg + ' (Consider adding a concrete example.)';
      }
    }
    return msg;
  }, 'Adjusted abstraction level based on preference.');

  // Narrative Density
  applyAdjustment('narrativeDensity', effectiveProfile.narrativeDensity, (msg, factor) => {
    // Example: Reduce storytelling elements if low narrative density
    if (factor < 0.5) {
      return msg
        .replace(/\b(let me tell you a story about|picture this:)\b/gi, '')
        .replace(/\b(once upon a time|it all started when)\b/gi, '');
    }
    return msg;
  }, 'Adjusted narrative density: removed storytelling elements.');

  // Goal Orientation
  applyAdjustment('goalOrientation', effectiveProfile.goalOrientation, (msg, factor) => {
    // Example: Add explicit calls to action or outcome focus
    if (factor > 0.7) {
      if (!/\b(next steps|action items|outcome)\b/gi.test(msg)) {
        return msg + ' What are the next steps and desired outcomes?';
      }
    }
    return msg;
  }, 'Increased goal orientation: added a prompt for next steps/outcomes.');

  // Learning Style (This primarily influences how the message could* be structured,
  // but direct transformation is harder without content generation. Here, we hint.)
  if (effectiveProfile.learningStyle === 'example' && !/\b(for example|such as|e.g.)\b/gi.test(adjustedMessage)) {
    changes.push('Consider adding a concrete example for learning style preference.');
  } else if (effectiveProfile.learningStyle === 'principle' && !/\b(principle|concept|underlying idea)\b/gi.test(adjustedMessage)) {
    changes.push('Consider emphasizing the underlying principle for learning style preference.');
  } else if (effectiveProfile.learningStyle === 'story' && effectiveProfile.narrativeDensity < 0.5) {
    changes.push('Consider adding a brief narrative for learning style preference.');
  }

  if (changes.length === 0) {
    why = 'No significant adjustments made based on the provided profile.';
  } else {
    why = why.trim();
  }

  return {
    adjusted: adjustedMessage.trim(),
    changes,
    why,
  };
}

/**
 * Learns from feedback to update a communication profile.
 * This is a simplified, linear adjustment. A more sophisticated model
 * would use non-linear learning rates, decay, and potentially more complex
 * statistical methods.
 *
 * @param {CommunicationProfile} profile - The current communication profile.
 * @param {string} originalMessage - The original message before adjustment.
 * @param {string} adjustedMessage - The message after adjustment.
 * @param {{dimension: string, direction: 'more'|'less', strength: number}} feedback - The feedback item.
 * @returns {CommunicationProfile} An updated profile object.
 */
export function learnFromFeedback(profile, originalMessage, adjustedMessage, feedback) {
  const newProfile = { ...profile };
  const learningRate = 0.1 * feedback.strength; // Strength scales the learning rate

  if (newProfile.hasOwnProperty(feedback.dimension) && typeof newProfile[feedback.dimension] === 'number') {
    if (feedback.direction === 'more') {
      newProfile[feedback.dimension] = Math.min(1, newProfile[feedback.dimension] + learningRate);
    } else if (feedback.direction === 'less') {
      newProfile[feedback.dimension] = Math.max(0, newProfile[feedback.dimension] - learningRate);
    }
  } else if (feedback.dimension === 'learningStyle') {
    // For learning style, a direct overwrite might be more appropriate, or a weighted choice
    // For simplicity, if feedback suggests a style, we lean towards it.
    // This is a very basic heuristic.
    if (feedback.direction === 'more') {
      newProfile.learningStyle = feedback.strength > 0.5 ? 'story' : (feedback.strength > 0.25 ? 'example' : 'principle');
    }
  }
  // Biases and correction strategies are not learned directly from this feedback type in this model.

  return newProfile;
}

/**
 * Estimates a communication profile from sample messages and feedback items.
 * This is a highly simplified estimation. A real system would use NLP, ML models,
 * and more advanced statistical analysis.
 *
 * @param {string[]} messages - Sample messages from Adam.
 * @param {{dimension: string, direction: 'more'|'less', strength: number}[]} feedbackItems - Historical feedback on message adjustments.
 * @returns {CommunicationProfile} An inferred profile object.
 */
export function estimateProfile(messages, feedbackItems) {
  let inferredProfile = getDefaultProfile();

  // Step 1: Infer from messages (very basic keyword analysis)
  let literalnessScore = 0;
  let precisionScore = 0;
  let confidenceScore = 0;
  let abstractionScore = 0;
  let narrativeScore = 0;
  let goalOrientationScore = 0;
  let exampleCount = 0;
  let principleCount = 0;
  let storyCount = 0;

  messages.forEach(msg => {
    const lowerMsg = msg.toLowerCase();

    // Literalness: absence of vague terms
    if (!/\b(i think|i believe|it seems|i feel like|could be|might be|possibly)\b/gi.test(lowerMsg)) {
      literalnessScore += 1;
    } else {
      literalnessScore -= 0.5; // Penalize presence of vagueness
    }

    // Precision: presence of numbers, specific details
    if (/\d+\.?\d*|\b(exact|specific|concrete)\b/gi.test(lowerMsg)) {
      precisionScore += 1;
    }

    // Confidence: presence of strong verbs, definitive statements
    if (/\b(will|can|must|achieve|deliver)\b/gi.test(lowerMsg) && !/\b(try to|hope to)\b/gi.test(lowerMsg)) {
      confidenceScore += 1;
    }

    // Abstraction: presence of concepts, theories, principles
    if (/\b(concept|principle|framework|theory|abstract|system)\b/gi.test(lowerMsg)) {
      abstractionScore += 1;
      principleCount++;
    } else if (/\b(for example|such as|e.g.|instance|case study)\b/gi.test(lowerMsg)) {
      exampleCount++;
    } else if (/\b(story|narrative|experience|journey)\b/gi.test(lowerMsg)) {
      storyCount++;
    }

    // Narrative Density: presence of storytelling elements
    if (/\b(once upon a time|it all started when|let me tell you a story)\b/gi.test(lowerMsg)) {
      narrativeScore += 1;
    }

    // Goal Orientation: presence of outcomes, objectives, next steps
    if (/\b(goal|objective|outcome|result|target|next steps|action item)\b/gi.test(lowerMsg)) {
      goalOrientationScore += 1;
    }
  });

  const numMessages = messages.length || 1; // Avoid division by zero

  inferredProfile.literalness = Math.max(0, Math.min(1, literalnessScore / numMessages + 0.5)); // Base + inferred offset
  inferredProfile.precision = Math.max(0, Math.min(1, precisionScore / numMessages + 0.3));
  inferredProfile.confidenceExpression = Math.max(0, Math.min(1, confidenceScore / numMessages + 0.4));
  inferredProfile.abstraction = Math.max(0, Math.min(1, abstractionScore / numMessages + 0.2));
  inferredProfile.narrativeDensity = Math.max(0, Math.min(1, narrativeScore / numMessages + 0.1));
  inferredProfile.goalOrientation = Math.max(0, Math.min(1, goalOrientationScore / numMessages + 0.5));

  // Infer learning style
  if (exampleCount > principleCount && exampleCount > storyCount) {
    inferredProfile.learningStyle = 'example';
  } else if (principleCount > exampleCount && principleCount > storyCount) {
    inferredProfile.learningStyle = 'principle';
  } else if (storyCount > exampleCount && storyCount > principleCount) {
    inferredProfile.learningStyle = 'story';
  } else {
    inferredProfile.learningStyle = 'principle'; // Default if unclear
  }

  // Step 2: Adjust based on feedback items
  feedbackItems.forEach(feedback => {
    inferredProfile = learnFromFeedback(inferredProfile, '', '', feedback); // Use learnFromFeedback logic
  });

  return inferredProfile;
}