/**
 * SYNOPSIS: Exports estimateCauses — services/causality-engine.js.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

/**
 * Estimates causes for events based on a Human Constellation subgraph.
 * This implementation uses a simplified approach for demonstration purposes,
 * focusing on direct temporal correlation and predefined causal links in the constellation.
 *
 * @param {Array<Object>} eventStream - A temporal sequence of events, e.g., [{ timestamp: Date, type: 'trigger', payload: 'stressorA' }, { timestamp: Date, type: 'state_change', payload: 'anxiety' }]
 * @param {Object} constellation - A Human Constellation subgraph, containing nodes (values, goals, needs, beliefs, patterns, states, triggers, resources, risks, avoidances) and weighted edges.
 * @returns {Object} A causal graph with directed edges and causal confidence, e.g., { edges: [{ from: 'stressorA', to: 'anxiety', confidence: 0.8 }] }
 */
export function estimateCauses(eventStream, constellation) {
  const causalGraph = { edges: [] };
  const eventTypes = new Set(eventStream.map(event => event.type));

  // Simplified causal estimation:
  // Iterate through events and look for direct temporal correlations
  // that match known triggers or patterns in the constellation.
  for (let i = 0; i < eventStream.length; i++) {
    const currentEvent = eventStream[i];

    // Look for constellation triggers that match event types
    if (constellation.triggers) {
      for (const trigger of constellation.triggers) {
        if (currentEvent.payload === trigger.name && currentEvent.type === 'trigger') {
          // Find states or patterns linked to this trigger in the constellation
          for (const edge of constellation.edges) {
            if (edge.from === trigger.name && constellation.nodes.some(node => node.name === edge.to && node.type === 'states')) {
              causalGraph.edges.push({
                from: currentEvent.payload,
                to: edge.to,
                confidence: edge.causal_confidence || 0.7 // Use constellation's confidence or a default
              });
            }
          }
        }
      }
    }

    // Look for previous events causing subsequent state changes
    if (i > 0) {
      const previousEvent = eventStream[i - 1];
      // Simple heuristic: If a 'trigger' event is immediately followed by a 'state_change'
      // and the state is present in the constellation, infer a causal link.
      if (previousEvent.type === 'trigger' && currentEvent.type === 'state_change') {
        const stateNode = constellation.nodes.find(node => node.name === currentEvent.payload && node.type === 'states');
        if (stateNode) {
          // Check if there's an existing edge in constellation, otherwise assign a default confidence
          const existingEdge = constellation.edges.find(
            edge => edge.from === previousEvent.payload && edge.to === currentEvent.payload
          );
          causalGraph.edges.push({
            from: previousEvent.payload,
            to: currentEvent.payload,
            confidence: existingEdge ? existingEdge.causal_confidence : 0.6
          });
        }
      }
    }
  }

  return causalGraph;
}

/**
 * Proposes least-invasive interventions to achieve a target state, given constraints.
 * This implementation uses a simplified approach, suggesting interventions directly linked
 * to the target state or its immediate causes in the constellation.
 *
 * @param {Object} targetState - The desired state, e.g., { name: 'calm', type: 'states' }
 * @param {Array<Object>} constraints - Limitations on interventions, e.g., [{ type: 'cost', value: 'low' }]
 * @returns {Array<Object>} Ranked list of least-invasive interventions with predicted effects,
 *   e.g., [{ action: 'meditate for 10 minutes', predicted_effect: 'reduced anxiety', invasiveness: 0.2, confidence: 0.9 }]
 */
export function proposeInterventions(targetState, constraints) {
  const interventions = [];

  // In a real system, this would involve traversing the causal graph
  // backwards from the target state to identify upstream causes and
  // then finding interventions linked to those causes.
  // For this implementation, we'll assume a simplified constellation
  // where interventions are directly associated with states or patterns.

  // Mock constellation with intervention data
  const mockConstellation = {
    nodes: [
      { name: 'anxiety', type: 'states' },
      { name: 'calm', type: 'states' },
      { name: 'stressorA', type: 'triggers' },
      { name: 'meditation', type: 'resources' },
      { name: 'deep_breathing', type: 'resources' },
      { name: 'avoid_news', type: 'avoidances' }
    ],
    edges: [
      { from: 'stressorA', to: 'anxiety', causal_confidence: 0.8 },
      { from: 'meditation', to: 'calm', causal_confidence: 0.9 },
      { from: 'deep_breathing', to: 'calm', causal_confidence: 0.85 },
      { from: 'avoid_news', to: 'calm', causal_confidence: 0.7 }
    ]
  };

  // Find direct interventions for the target state
  for (const edge of mockConstellation.edges) {
    if (edge.to === targetState.name) {
      const sourceNode = mockConstellation.nodes.find(node => node.name === edge.from);
      if (sourceNode && (sourceNode.type === 'resources' || sourceNode.type === 'avoidances')) {
        let invasiveness = 0.5; // Default invasiveness
        if (sourceNode.type === 'resources') {
          invasiveness = 0.2; // Resources are generally less invasive
        } else if (sourceNode.type === 'avoidances') {
          invasiveness = 0.3; // Avoidances can be slightly more invasive than adding a resource
        }

        // Apply constraints - simplified for demonstration
        const meetsConstraints = constraints.every(constraint => {
          if (constraint.type === 'cost' && constraint.value === 'low') {
            return invasiveness <= 0.3; // Only allow low invasiveness for low cost
          }
          return true;
        });

        if (meetsConstraints) {
          interventions.push({
            action: `Engage in ${sourceNode.name}`,
            predicted_effect: `Increase ${targetState.name}`,
            invasiveness: invasiveness,
            confidence: edge.causal_confidence || 0.7
          });
        }
      }
    }
  }

  // Rank interventions by invasiveness (least invasive first) and then confidence
  interventions.sort((a, b) => {
    if (a.invasiveness !== b.invasiveness) {
      return a.invasiveness - b.invasiveness;
    }
    return b.confidence - a.confidence;
  });

  return interventions;
}

/**
 * Scores a causal model based on how well it predicts outcomes.
 * This implementation uses a simplified metric for demonstration.
 *
 * @param {Object} model - The causal graph to score, e.g., { edges: [{ from: 'stressorA', to: 'anxiety', confidence: 0.8 }] }
 * @param {Array<Object>} outcomes - Actual observed outcomes, e.g., [{ cause: 'stressorA', effect: 'anxiety', observed: true }]
 * @returns {Object} Score of the causal model, e.g., { fit: 0.85, accuracy: 0.9 }
 */
export function scoreCausalModel(model, outcomes) {
  let correctPredictions = 0;
  let totalPredictions = 0;

  for (const edge of model.edges) {
    for (const outcome of outcomes) {
      if (edge.from === outcome.cause && edge.to === outcome.effect) {
        totalPredictions++;
        if (outcome.observed) {
          correctPredictions++;
        }
      }
    }
  }

  const accuracy = totalPredictions > 0 ? correctPredictions / totalPredictions : 0;
  // A simple fit score could be the average confidence of the edges.
  const fit = model.edges.length > 0 ? model.edges.reduce((sum, edge) => sum + edge.confidence, 0) / model.edges.length : 0;

  return {
    fit: parseFloat(fit.toFixed(2)),
    accuracy: parseFloat(accuracy.toFixed(2))
  };
}