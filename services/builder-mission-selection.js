/**
 * SYNOPSIS: Builder-actionable mission selection for the never-stop lane.
 * Separates "what the autonomous builder can advance" from "what only a founder
 * can clear", so the never-stop runner never loops the builder on a
 * technically-done, founder-gated Point B mission (the attempt-N rebuild waste).
 * Derives entirely from getCompletionState.required_next_action — does not
 * modify the canonical completion semantics.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import { getCompletionState } from './bp-priority-completion.js';

const NON_BUILDER_ACTIONS = new Set(['none', 'founder_usability_confirmation']);

/**
 * True when there is real work the autonomous builder can advance.
 * Founder usability confirmation and terminal ("none") states are excluded.
 */
export function isBuilderActionable(item = {}, options = {}) {
  const action = getCompletionState(item, options).required_next_action;
  return !NON_BUILDER_ACTIONS.has(action);
}

/** Lowest-rank mission the autonomous builder can actually advance. */
export function getActiveBuilderMission(items = [], options = {}) {
  return [...items]
    .sort((a, b) => Number(a.rank || 0) - Number(b.rank || 0))
    .find((item) => isBuilderActionable(item, options)) || null;
}

/**
 * Incomplete missions whose only remaining step is a founder usability verdict.
 * Surfaced to the founder, never rebuilt.
 */
export function getFounderGatedMissions(items = [], options = {}) {
  return [...items]
    .sort((a, b) => Number(a.rank || 0) - Number(b.rank || 0))
    .filter((item) => getCompletionState(item, options).required_next_action === 'founder_usability_confirmation');
}
