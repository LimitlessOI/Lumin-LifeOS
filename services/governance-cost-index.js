/**
 * SYNOPSIS: Exports measureGovernanceCost — services/governance-cost-index.js.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

export const version = "2026-08-02";

/**
 * Measures the governance cost of a decision process.
 * @param {object} decision - The decision object.
 * @param {string} decision.id - The decision ID.
 * @param {string} decision.title - The decision title.
 * @param {string} decision.urgency - The decision urgency.
 * @param {Array<object>} process - An array of process steps.
 * @param {string} process[].office - The office performing the action.
 * @param {string} process[].action - The action performed.
 * @param {number} process[].timestamp - The timestamp of the action.
 * @param {number} [process[].tokens] - The number of tokens used, if any.
 * @returns {{cost_score: number, breakdown: {time_steps: number, token_calls: number, handoffs: number, blockers: number}, bottlenecks: string[]}}
 */
export function measureGovernanceCost(decision, process = []) {
  let time_steps = process.length;
  let token_calls = 0;
  let handoffs = 0;
  let blockers = 0;
  const officeTransitions = new Set();
  const stepActions = new Map();
  const bottleneckSteps = [];

  if (process.length > 0) {
    let currentOffice = process[0].office;
    for (let i = 0; i < process.length; i++) {
      const step = process[i];

      if (step.tokens && step.tokens > 0) {
        token_calls++;
      }

      const actionLower = step.action.toLowerCase();
      if (actionLower.includes("blocked") || actionLower.includes("failed") || actionLower.includes("retry")) {
        blockers++;
        bottleneckSteps.push(`${step.office}: ${step.action}`);
      }

      if (step.office !== currentOffice) {
        handoffs++;
        officeTransitions.add(`${currentOffice} -> ${step.office}`);
        currentOffice = step.office;
      }

      stepActions.set(step.action, (stepActions.get(step.action) || 0) + 1);
    }
  }

  // Simple cost score calculation (example logic)
  // Higher values for breakdown components lead to a higher cost score
  const baseScore = (time_steps * 0.1) + (token_calls * 0.3) + (handoffs * 0.2) + (blockers * 0.4);
  const cost_score = Math.min(1, baseScore / 10); // Normalize to 0-1, assuming max reasonable baseScore is 10 for illustrative purposes

  return {
    cost_score,
    breakdown: {
      time_steps,
      token_calls,
      handoffs,
      blockers,
    },
    bottlenecks: bottleneckSteps,
  };
}

/**
 * Compares the governance costs of multiple processes.
 * @param {Array<Array<object>>} processes - An array of process arrays.
 * @returns {{cheapest: object, most_expensive: object, average_cost: number}}
 */
export function compareProcessCosts(processes) {
  if (!processes || processes.length === 0) {
    return { cheapest: null, most_expensive: null, average_cost: 0 };
  }

  let cheapestProcess = null;
  let mostExpensiveProcess = null;
  let minCost = Infinity;
  let maxCost = -Infinity;
  let totalCost = 0;

  const results = processes.map((p, index) => {
    // A dummy decision object is used as the decision itself doesn't impact the cost calculation logic within measureGovernanceCost
    const costData = measureGovernanceCost({ id: `decision-${index}`, title: `Process ${index}`, urgency: "medium" }, p);
    return { process: p, cost: costData.cost_score };
  });

  for (const res of results) {
    totalCost += res.cost;
    if (res.cost < minCost) {
      minCost = res.cost;
      cheapestProcess = res.process;
    }
    if (res.cost > maxCost) {
      maxCost = res.cost;
      mostExpensiveProcess = res.process;
    }
  }

  const average_cost = totalCost / results.length;

  return {
    cheapest: cheapestProcess,
    most_expensive: mostExpensiveProcess,
    average_cost,
  };
}

/**
 * Suggests concrete actions to reduce governance cost.
 * @param {object} decision - The decision object.
 * @param {string} decision.id - The decision ID.
 * @param {string} decision.title - The decision title.
 * @param {string} decision.urgency - The decision urgency.
 * @param {Array<object>} process - An array of process steps.
 * @param {string} process[].office - The office performing the action.
 * @param {string} process[].action - The action performed.
 * @param {number} process[].timestamp - The timestamp of the action.
 * @param {number} [process[].tokens] - The number of tokens used, if any.
 * @returns {string[]} An array of concrete suggestions.
 */
export function suggestCheaperPath(decision, process) {
  const suggestions = [];
  const { breakdown, bottlenecks } = measureGovernanceCost(decision, process);

  if (breakdown.blockers > 0) {
    suggestions.push(`Address identified bottlenecks: ${bottlenecks.join(", ")} to prevent delays and rework.`);
  }

  if (breakdown.handoffs > 2) { // Arbitrary threshold for suggesting reduction
    suggestions.push("Consolidate steps to reduce the number of handoffs between offices.");
  }

  if (breakdown.token_calls > 1) { // Arbitrary threshold for suggesting optimization
    suggestions.push("Review steps involving token calls for potential optimization or elimination.");
  }

  if (breakdown.time_steps > 5 && breakdown.handoffs <= 2) { // Suggest if many steps but not primarily handoff issue
    suggestions.push("Evaluate if any process steps can be automated or streamlined to reduce overall time steps.");
  }

  if (decision.urgency === "high" && breakdown.time_steps > 3) {
    suggestions.push("For high urgency decisions, consider an expedited path with fewer approval steps.");
  }

  if (suggestions.length === 0) {
    suggestions.push("The current process appears efficient. Continue monitoring for potential improvements.");
  }

  return suggestions;
}

/**
 * Returns the names of the cost metrics.
 * @returns {string[]} An array of metric names.
 */
export function getCostMetrics() {
  return ["time_steps", "token_calls", "handoffs", "blockers", "cost_score"];
}