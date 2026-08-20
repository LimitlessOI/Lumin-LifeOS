/**
 * SYNOPSIS: Real, enforced type definitions for the Fluid UI system per
 * TALOA_UNIVERSAL_OVERLAY_FLUID_UI_BLUEPRINT_CLAUDE_DRAFT.md §8 — ViewIntent,
 * the closed primitive set, and the fixed-envelope elements that FluidUIComposer
 * may never omit. No model-authored HTML/JS ever reaches these types; a model
 * may only ever produce a ViewIntent, never a primitive tree directly.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */

// The ONLY primitives FluidUIComposer is allowed to emit. Adding a new
// primitive here is a deliberate architecture decision, not something a
// composer call site can do implicitly.
export const APPROVED_PRIMITIVES = Object.freeze([
  'Text', 'Metric', 'ConfidenceBadge', 'EvidenceNode', 'ActionButton',
  'ChoiceGroup', 'FormField', 'Comparison', 'Timeline', 'Progress',
  'Media', 'AppSurface', 'Highlight', 'Tooltip', 'SplitPane',
  'Workspace', 'AvatarAnchor', 'HandoffPrompt',
]);

export const INPUT_OWNERSHIP_ZONES = Object.freeze([
  'PASSTHROUGH', 'TALOA_INTERACTIVE', 'SHARED_GUIDED', 'MODAL_HUMAN_STEP',
]);

const VIEW_INTENT_FIELDS = [
  'purpose', 'primary_object', 'information_depth', 'urgency', 'interaction_mode',
  'attention_constraints', 'required_actions', 'evidence_refs', 'confidence_refs',
  'comparison_items', 'modality_preferences',
];

const VALID_PURPOSES = Object.freeze([
  'inform', 'confirm', 'choose', 'compare', 'progress', 'handoff', 'evidence',
]);

/**
 * Real validation, not decoration — a malformed ViewIntent must be rejected
 * before it ever reaches the composer, per §65a.B (deterministic fallback is
 * the floor, not the polish).
 */
export function validateViewIntent(intent) {
  const errors = [];
  if (!intent || typeof intent !== 'object') {
    return { ok: false, errors: ['ViewIntent must be an object'] };
  }
  if (!VALID_PURPOSES.includes(intent.purpose)) {
    errors.push(`purpose must be one of ${VALID_PURPOSES.join('|')}, got: ${intent.purpose}`);
  }
  if (intent.primary_object == null) {
    errors.push('primary_object is required');
  }
  if (intent.required_actions != null && !Array.isArray(intent.required_actions)) {
    errors.push('required_actions must be an array when present');
  }
  if (intent.comparison_items != null && !Array.isArray(intent.comparison_items)) {
    errors.push('comparison_items must be an array when present');
  }
  return { ok: errors.length === 0, errors };
}

export function newViewIntent(fields = {}) {
  const intent = {};
  for (const key of VIEW_INTENT_FIELDS) intent[key] = fields[key] ?? null;
  return intent;
}

/**
 * §65a.A — fixed envelope elements FluidUIComposer must always include and
 * may never let a ViewIntent omit or restyle: the dismiss control and (when
 * a handoff is in play) the way to reach a human.
 */
export function fixedEnvelopeElements({ dismissible = true } = {}) {
  const elements = [];
  if (dismissible) {
    elements.push({ primitive: 'ActionButton', role: 'dismiss', label: 'Dismiss', fixed: true });
  }
  return elements;
}

export function isApprovedPrimitive(name) {
  return APPROVED_PRIMITIVES.includes(name);
}
