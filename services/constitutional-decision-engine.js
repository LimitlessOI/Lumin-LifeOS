/**
 * SYNOPSIS: Constitutional decision engine facade.
 * Wraps the Knowledge/Judgment split, goal decomposition, cognitive-spine health,
 * and founder cognitive-load optimizer into a single decision-support surface.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { tagOutput } from './knowledge-judgment-split.js';
import { decomposeGoal, nextReadySubGoal, markSubGoalDone } from './goal-decomposition.js';
import { computeCognitiveSpineHealth, recordModelCall } from './cognitive-spine-health.js';
import { decideInteraction, shouldAskFounder } from './founder-cognitive-load-optimizer.js';

export function analyzeDecision({ input, mission, chairContext = {} }) {
  const tagged = tagOutput(input);
  const subGoals = decomposeGoal({
    id: mission?.id || 'decision-1',
    title: mission?.title || 'constitutional decision',
    description: input,
    steps: mission?.steps || [],
    dependencies: mission?.dependencies || [],
  });
  const cognitiveHealth = computeCognitiveSpineHealth({
    reasoningSteps: [{ consensus: true, propagated_confidence: chairContext.confidence || 0.75 }],
    modelCalls: [],
    confidenceHistory: [chairContext.confidence || 0.75],
  });
  const interaction = decideInteraction({
    reversibility: chairContext.reversibility || 'reversible_without_data_loss',
    cost_of_error: chairContext.cost_of_error || 0,
    confidence: chairContext.confidence || 0.75,
    can_auto_revert: chairContext.can_auto_revert !== false,
  });

  return {
    ok: true,
    knowledge_judgment: tagged,
    sub_goals: subGoals,
    cognitive_health: cognitiveHealth,
    interaction,
    should_ask_founder: shouldAskFounder(interaction),
    next_ready_sub_goal: nextReadySubGoal(subGoals),
  };
}

export function advanceSubGoal(state, subGoalId) {
  return markSubGoalDone(state.sub_goals ? state : { sub_goals: state }, subGoalId);
}

export { tagOutput, decomposeGoal, computeCognitiveSpineHealth, recordModelCall, decideInteraction };
