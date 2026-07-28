/**
 * SYNOPSIS: Exports generateAlternativeFutures — services/voluntary-progress-alternative-futures.js.
 * @ssot docs/products/lifere/PRODUCT_HOME.md
 */
export function generateAlternativeFutures({ goal_text, goal_category = 'general' }) {
  return [
    {
      path_label: 'Aggressive',
      description: `Pursue the goal of ${goal_text} aggressively, aiming for the fastest results.`,
      time_estimate: 'shortest',
      financial_cost_estimate: 'highest',
      emotional_cost_estimate: 'high',
      risk_level: 'high',
      reversibility: 'hard_to_reverse'
    },
    {
      path_label: 'Steady',
      description: `Take a steady approach towards achieving ${goal_text}, balancing speed and caution.`,
      time_estimate: 'moderate',
      financial_cost_estimate: 'moderate',
      emotional_cost_estimate: 'medium',
      risk_level: 'medium',
      reversibility: 'partially_reversible'
    },
    {
      path_label: 'Minimal-commitment',
      description: `Explore ${goal_text} with minimal commitment, allowing for easy adjustment.`,
      time_estimate: 'longest',
      financial_cost_estimate: 'lowest',
      emotional_cost_estimate: 'low',
      risk_level: 'low',
      reversibility: 'easily_reversible'
    }
  ];
}

export function pathRequiresFullDecisionBrief(path) {
  return path.risk_level === 'high' || path.reversibility === 'hard_to_reverse';
}
