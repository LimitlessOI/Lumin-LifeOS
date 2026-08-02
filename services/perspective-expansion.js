/**
 * SYNOPSIS: Exports generatePerspectiveSummary — services/perspective-expansion.js.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

/**
 * Generates a summary of the user's perspective based on their input and the Human Constellation.
 * This function aims to capture the user's view in their own frame.
 * @param {object} constellation - The Human Constellation object.
 * @param {Array<object>} constellation.nodes - Array of nodes (values, goals, needs, beliefs, patterns, states, triggers, resources, risks, avoidances).
 * @param {Array<object>} constellation.edges - Array of edges connecting nodes.
 * @param {string} userInput - The user's input.
 * @returns {string} A summary of the user's perspective.
 */
export function generatePerspectiveSummary(constellation, userInput) {
  if (!constellation || !userInput) {
    return "I need more information to generate a perspective summary.";
  }

  const userFeelings = [];
  const contributingFactors = [];

  // Attempt to identify user states from the constellation that might relate to the input
  const relevantStates = constellation.nodes.filter(
    (node) => node.type === "states" && userInput.toLowerCase().includes(node.name.toLowerCase())
  );
  if (relevantStates.length > 0) {
    userFeelings.push(...relevantStates.map((state) => state.name));
  }

  // Look for needs or values that might be triggered or unaddressed by the input context
  const triggeredNeeds = constellation.nodes.filter(
    (node) => node.type === "needs" && userInput.toLowerCase().includes(node.name.toLowerCase())
  );
  if (triggeredNeeds.length > 0) {
    contributingFactors.push(`an unaddressed need for ${triggeredNeeds.map((need) => need.name).join(" and ")}`);
  }

  const relevantValues = constellation.nodes.filter(
    (node) => node.type === "values" && userInput.toLowerCase().includes(node.name.toLowerCase())
  );
  if (relevantValues.length > 0) {
    contributingFactors.push(`a conflict with your value of ${relevantValues.map((value) => value.name).join(" and ")}`);
  }

  // Simple keyword matching for common emotional states and causal connectors
  const lowerCaseInput = userInput.toLowerCase();
  if (lowerCaseInput.includes("frustrated")) userFeelings.push("frustrated");
  if (lowerCaseInput.includes("confused")) userFeelings.push("confused");
  if (lowerCaseInput.includes("overwhelmed")) userFeelings.push("overwhelmed");
  if (lowerCaseInput.includes("stressed")) userFeelings.push("stressed");
  if (lowerCaseInput.includes("anxious")) userFeelings.push("anxious");
  if (lowerCaseInput.includes("happy")) userFeelings.push("happy");
  if (lowerCaseInput.includes("excited")) userFeelings.push("excited");

  if (lowerCaseInput.includes("because")) contributingFactors.push("something you mentioned");
  if (lowerCaseInput.includes("due to")) contributingFactors.push("something you mentioned");
  if (lowerCaseInput.includes("if")) contributingFactors.push("a potential outcome");

  let feelingSummary = userFeelings.length > 0 ? `You seem to be feeling ${userFeelings.join(" and ")}` : `You've shared your thoughts`;
  let factorSummary = contributingFactors.length > 0 ? ` because of ${contributingFactors.join(" and ")}` : "";

  // Incorporate direct user input as a primary factor if other factors are weak
  if (userFeelings.length === 0 && contributingFactors.length === 0) {
    return `It sounds like you're expressing: "${userInput}".`;
  } else if (contributingFactors.length === 0 && userInput.length > 50) {
    // If we have feelings but no clear factors from constellation, tie it to the input itself
    factorSummary = ` based on what you've shared about "${userInput.substring(0, 50)}..."`;
  } else if (contributingFactors.length === 0) {
    factorSummary = ` based on your input.`;
  }

  return `${feelingSummary}${factorSummary}. Is that right?`;
}

/**
 * Identifies unstated needs within the Human Constellation.
 * This function looks for needs that might be implicitly present or consistently under-addressed.
 * @param {object} constellation - The Human Constellation object.
 * @param {Array<object>} constellation.nodes - Array of nodes (values, goals, needs, beliefs, patterns, states, triggers, resources, risks, avoidances).
 * @param {Array<object>} constellation.edges - Array of edges connecting nodes.
 * @returns {Array<string>} A list of identified unstated needs.
 */
export function identifyUnstatedNeeds(constellation) {
  if (!constellation || !constellation.nodes) {
    return ["The constellation data is insufficient to identify unstated needs."];
  }

  const unstatedNeeds = new Set();
  const needsNodes = constellation.nodes.filter((node) => node.type === "needs");
  const valuesNodes = constellation.nodes.filter((node) => node.type === "values");
  const goalsNodes = constellation.nodes.filter((node) => node.type === "goals");
  const avoidancesNodes = constellation.nodes.filter((node) => node.type === "avoidances");
  const risksNodes = constellation.nodes.filter((node) => node.type === "risks");

  // Example heuristic: a value that has many strong connections but no explicit associated 'need' node
  valuesNodes.forEach((valueNode) => {
    const relatedNeeds = needsNodes.filter((need) =>
      constellation.edges.some(
        (edge) =>
          (edge.from === valueNode.id && edge.to === need.id) || (edge.from === need.id && edge.to === valueNode.id)
      )
    );
    if (relatedNeeds.length === 0) {
      unstatedNeeds.add(`A deeper need to fulfill your value of "${valueNode.name}"`);
    }
  });

  // Example heuristic: a recurring avoidance pattern or risk that points to an underlying need for security/control
  avoidancesNodes.forEach((avoidanceNode) => {
    if (avoidanceNode.frequency > 0.5) { // Assuming a 'frequency' property exists for patterns
      unstatedNeeds.add(`A need for security or control, indicated by your avoidance of "${avoidanceNode.name}"`);
    }
  });

  risksNodes.forEach((riskNode) => {
    if (riskNode.strength > 0.7) { // Assuming a 'strength' property for risks
      unstatedNeeds.add(`A need for proactive mitigation or safety, related to the risk of "${riskNode.name}"`);
    }
  });

  // Look for goals that are highly weighted but have few resources or triggers, implying a need for support
  goalsNodes.forEach((goalNode) => {
    const incomingResources = constellation.edges.filter(
      (edge) => edge.to === goalNode.id && constellation.nodes.some(n => n.id === edge.from && n.type === 'resources')
    );
    const outgoingTriggers = constellation.edges.filter(
      (edge) => edge.from === goalNode.id && constellation.nodes.some(n => n.id === edge.to && n.type === 'triggers')
    );

    if (goalNode.strength > 0.7 && incomingResources.length < 1 && outgoingTriggers.length < 1) {
      unstatedNeeds.add(`A need for more resources or clear triggers to achieve your goal of "${goalNode.name}"`);
    }
  });


  if (unstatedNeeds.size === 0) {
    return ["No obvious unstated needs identified from the current constellation data."];
  }

  return Array.from(unstatedNeeds);
}

/**
 * Generates a "better question" based on the Human Constellation to improve the quality of the user's inquiry.
 * This aims to move beyond surface-level questions to address underlying motivations or connections.
 * @param {object} constellation - The Human Constellation object.
 * @param {Array<object>} constellation.nodes - Array of nodes (values, goals, needs, beliefs, patterns, states, triggers, resources, risks, avoidances).
 * @param {Array<object>} constellation.edges - Array of edges connecting nodes.
 * @returns {string} A better question.
 */
export function askBetterQuestion(constellation) {
  if (!constellation || !constellation.nodes) {
    return "What's truly at stake for you in this situation?";
  }

  const needsNodes = constellation.nodes.filter((node) => node.type === "needs");
  const goalsNodes = constellation.nodes.filter((node) => node.type === "goals");
  const valuesNodes = constellation.nodes.filter((node) => node.type === "values");
  const risksNodes = constellation.nodes.filter((node) => node.type === "risks");
  const patternsNodes = constellation.nodes.filter((node) => node.type === "patterns");

  // Prioritize questions that connect to core motivations or address identified gaps
  if (needsNodes.length > 0) {
    const prominentNeed = needsNodes.sort((a, b) => b.strength - a.strength)[0]; // Assuming 'strength' property
    if (prominentNeed) {
      return `How does this relate to your need for "${prominentNeed.name}"?`;
    }
  }

  if (goalsNodes.length > 0) {
    const primaryGoal = goalsNodes.sort((a, b) => b.strength - a.strength)[0];
    if (primaryGoal) {
      return `What outcome are you truly aiming for with respect to "${primaryGoal.name}"?`;
    }
  }

  if (valuesNodes.length > 0) {
    const coreValue = valuesNodes.sort((a, b) => b.stability - a.stability)[0]; // Assuming 'stability' property
    if (coreValue) {
      return `What value are you trying to uphold or express through this?`;
    }
  }

  if (risksNodes.length > 0) {
    const highestRisk = risksNodes.sort((a, b) => b.strength - a.strength)[0];
    if (highestRisk) {
      return `What are you trying to protect or avoid by asking this, considering the risk of "${highestRisk.name}"?`;
    }
  }

  if (patternsNodes.length > 0) {
    const recurringPattern = patternsNodes.sort((a, b) => b.frequency - a.frequency)[0]; // Assuming 'frequency'
    if (recurringPattern) {
      return `How does this situation fit into the pattern of "${recurringPattern.name}" that we've observed?`;
    }
  }

  // Fallback questions if specific constellation data is sparse
  if (constellation.edges.length > 0) {
    return "What underlying connections or motivations are at play here?";
  }

  return "What's truly at stake for you in this situation, and what would a good outcome look like?";
}