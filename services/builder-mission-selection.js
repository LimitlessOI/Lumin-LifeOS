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

/**
 * Lowest-rank mission the autonomous builder can actually advance.
 * `options.excludeMissionIds` (array/Set) skips missions the caller has already
 * proven un-buildable this session (e.g. structurally blocked — no BUILDER_READY
 * phases), so the never-stop loop advances instead of re-running a mission that
 * can never hand off to the builder (the infinite-retry token burn).
 */
export function getActiveBuilderMission(items = [], options = {}) {
  const excluded = toIdSet(options.excludeMissionIds);
  return [...items]
    .sort((a, b) => Number(a.rank || 0) - Number(b.rank || 0))
    .find((item) => !excluded.has(item.mission_id) && isBuilderActionable(item, options)) || null;
}

function toIdSet(ids) {
  if (ids instanceof Set) return ids;
  if (Array.isArray(ids)) return new Set(ids);
  return new Set();
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
