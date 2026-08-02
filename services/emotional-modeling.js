/**
 * SYNOPSIS: Exports scoreEmotionalWeight — services/emotional-modeling.js.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

/**
 * @typedef {object} Observation
 * @property {string} subject - The person or entity experiencing the emotion.
 * @property {string} event - A brief description of the event that occurred.
 * @property {string} bodySensation - A description of physical sensations associated with the emotion.
 * @property {number} intensity - The intensity of the emotional experience (0-1).
 * @property {string} context - The surrounding circumstances of the observation.
 * @property {number} timestamp - Unix timestamp of the observation.
 * @property {string[]} [valuesAtStake] - Optional array of values perceived to be at stake.
 */

/**
 * @typedef {object} EmotionalScoreResult
 * @property {number} significance - How much the observation matters to the person's values, goals, relationships, and identity (0-1).
 * @property {number} emotionalWeight - Derived from intensity and context (0-1).
 * @property {number} confidence - Confidence in the score (0-1).
 * @property {string} notes - Explanatory notes.
 */

/**
 * Calculates the emotional weight and significance of an observation.
 * Significance is anchored to valuesAtStake and long-term stakes, not raw intensity.
 * @param {Observation} observation
 * @returns {EmotionalScoreResult}
 */
export function scoreEmotionalWeight(observation) {
  let significance = 0;
  let emotionalWeight = 0;
  let confidence = 0.7; // Default confidence, adjusted by complexity of input
  let notes = [];

  // Emotional Weight: Derived from intensity and context
  // Simple linear mapping for now, context can modulate
  emotionalWeight = observation.intensity;

  // Modulate emotionalWeight based on context keywords (example)
  if (observation.context.toLowerCase().includes('crisis') || observation.context.toLowerCase().includes('urgent')) {
    emotionalWeight = Math.min(1, emotionalWeight * 1.2);
    notes.push('Emotional weight slightly increased due to crisis/urgent context.');
  }

  // Significance: Anchored to valuesAtStake and long-term stakes
  if (observation.valuesAtStake && observation.valuesAtStake.length > 0) {
    // Each value at stake adds a base significance, capped at 1
    const valueImpact = Math.min(1, observation.valuesAtStake.length * 0.2);
    significance = Math.max(significance, valueImpact);
    notes.push(`Base significance from ${observation.valuesAtStake.length} values at stake.`);

    // If a core value is at stake, significance is higher
    const coreValues = ['integrity', 'family', 'purpose', 'health', 'freedom']; // Example core values
    const hasCoreValueAtStake = observation.valuesAtStake.some(value =>
      coreValues.includes(value.toLowerCase())
    );

    if (hasCoreValueAtStake) {
      significance = Math.min(1, significance + 0.3);
      notes.push('Significance boosted due to core values being impacted.');
    }
    confidence = Math.min(1, confidence + 0.1); // Higher confidence with explicit values
  } else {
    // If no explicit valuesAtStake, significance is lower and tied more to intensity/event
    significance = observation.intensity * 0.5; // Default lower significance
    notes.push('Significance derived from intensity due to missing explicit values at stake.');
    confidence = Math.max(0.3, confidence - 0.2); // Lower confidence without explicit values
  }

  // Further modulate significance based on event type or implicit long-term stakes (example)
  if (observation.event.toLowerCase().includes('breakthrough') || observation.event.toLowerCase().includes('achievement')) {
    significance = Math.min(1, significance + 0.2);
    notes.push('Significance boosted for breakthrough/achievement event.');
  }
  if (observation.event.toLowerCase().includes('failure') || observation.event.toLowerCase().includes('loss')) {
    significance = Math.min(1, significance + 0.1);
    notes.push('Significance boosted for failure/loss event.');
  }

  // Ensure scores are within 0-1 range
  significance = Math.max(0, Math.min(1, significance));
  emotionalWeight = Math.max(0, Math.min(1, emotionalWeight));
  confidence = Math.max(0, Math.min(1, confidence));

  return {
    significance: parseFloat(significance.toFixed(2)),
    emotionalWeight: parseFloat(emotionalWeight.toFixed(2)),
    confidence: parseFloat(confidence.toFixed(2)),
    notes: notes.join(' ')
  };
}

/**
 * Clusters emotions based on simple string and body sensation similarity.
 * @param {Observation[]} observations
 * @returns {{clusters: {label: string, observations: Observation[], averageSignificance: number, count: number}[]}}
 */
export function clusterEmotions(observations) {
  const clusters = [];
  const processedIndices = new Set();

  for (let i = 0; i < observations.length; i++) {
    if (processedIndices.has(i)) {
      continue;
    }

    const currentObservation = observations[i];
    const currentScore = scoreEmotionalWeight(currentObservation);
    const newCluster = {
      label: `${currentObservation.event} (${currentObservation.bodySensation})`,
      observations: [currentObservation],
      totalSignificance: currentScore.significance,
      count: 1
    };
    processedIndices.add(i);

    for (let j = i + 1; j < observations.length; j++) {
      if (processedIndices.has(j)) {
        continue;
      }

      const compareObservation = observations[j];
      // Simple similarity check: exact match on event or bodySensation
      const eventMatch = currentObservation.event.toLowerCase() === compareObservation.event.toLowerCase();
      const bodySensationMatch = currentObservation.bodySensation.toLowerCase() === compareObservation.bodySensation.toLowerCase();

      if (eventMatch || bodySensationMatch) {
        newCluster.observations.push(compareObservation);
        const compareScore = scoreEmotionalWeight(compareObservation);
        newCluster.totalSignificance += compareScore.significance;
        newCluster.count++;
        processedIndices.add(j);
      }
    }
    newCluster.averageSignificance = newCluster.totalSignificance / newCluster.count;
    delete newCluster.totalSignificance; // Clean up intermediate property
    clusters.push(newCluster);
  }

  return {
    clusters: clusters.map(cluster => ({
      label: cluster.label,
      observations: cluster.observations,
      averageSignificance: parseFloat(cluster.averageSignificance.toFixed(2)),
      count: cluster.count
    }))
  };
}

/**
 * Merges multiple emotional signals into a single object.
 * @param {EmotionalScoreResult[]} signals
 * @returns {EmotionalScoreResult}
 */
export function mergeEmotionalSignals(signals) {
  if (signals.length === 0) {
    return { significance: 0, emotionalWeight: 0, confidence: 0, notes: 'No signals to merge.' };
  }

  let totalSignificance = 0;
  let totalEmotionalWeight = 0;
  let totalConfidence = 0;
  const allNotes = [];

  for (const signal of signals) {
    totalSignificance += signal.significance;
    totalEmotionalWeight += signal.emotionalWeight;
    totalConfidence += signal.confidence;
    if (signal.notes) {
      allNotes.push(signal.notes);
    }
  }

  const mergedSignificance = totalSignificance / signals.length;
  const mergedEmotionalWeight = totalEmotionalWeight / signals.length;
  const mergedConfidence = totalConfidence / signals.length;
  const synthesizedNotes = allNotes.join(' ').trim();

  return {
    significance: parseFloat(mergedSignificance.toFixed(2)),
    emotionalWeight: parseFloat(mergedEmotionalWeight.toFixed(2)),
    confidence: parseFloat(mergedConfidence.toFixed(2)),
    notes: synthesizedNotes || 'Merged emotional signals.'
  };
}

/**
 * Returns a short human-readable sentence describing why the significance score is what it is.
 * @param {EmotionalScoreResult} score
 * @returns {string}
 */
export function explainSignificance(score) {
  const { significance, notes } = score;

  if (significance < 0.2) {
    return `The observation had low significance, indicating it did not strongly impact core values or long-term stakes. ${notes}`;
  } else if (significance < 0.5) {
    return `The observation had moderate significance, likely touching on some values or mid-term stakes. ${notes}`;
  } else if (significance < 0.8) {
    return `The observation had high significance, deeply connected to important values or long-term goals. ${notes}`;
  } else {
    return `The observation had very high significance, profoundly impacting core values, identity, or critical long-term stakes. ${notes}`;
  }
}

/**
 * Returns the expected observation shape as an object.
 * @returns {Observation}
 */
export function getDefaultObservationSchema() {
  return {
    subject: 'string',
    event: 'string',
    bodySensation: 'string',
    intensity: 'number (0-1)',
    context: 'string',
    timestamp: 'number (Unix)',
    valuesAtStake: 'array of strings (optional)'
  };
}