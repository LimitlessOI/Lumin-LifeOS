/**
 * SYNOPSIS: Deterministic FluidUIComposer — maps a validated ViewIntent to
 * a composed tree of approved primitives per blueprint §8. This is the
 * mechanism that keeps "governed adaptive composition" from becoming
 * "arbitrary model-generated UI": adaptation happens in WHICH primitives get
 * selected and how they're arranged, never in what a primitive is allowed to
 * be. Real logic, not a stub — same intent + same data always produces the
 * same composed tree (§65a.C, hash-stable, tested in
 * tests/fluid-ui-composer.test.js).
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */
import { createHash } from 'node:crypto';
import { validateViewIntent, fixedEnvelopeElements, isApprovedPrimitive } from './fluid-ui-types.js';

// §65a.B — deterministic fallback is the floor, not the polish. Returned
// when composition itself fails, never a blank panel.
function fallbackComposition(reason) {
  return {
    ok: false,
    reason,
    tree: [{ primitive: 'Text', role: 'fallback', content: 'Unable to compose a view for this request.' }],
    elements: fixedEnvelopeElements(),
    hash: null,
  };
}

function composeInform(intent) {
  const nodes = [];
  if (intent.primary_object) {
    nodes.push({ primitive: 'Text', role: 'primary', content: String(intent.primary_object) });
  }
  if (Array.isArray(intent.evidence_refs) && intent.evidence_refs.length) {
    for (const ref of intent.evidence_refs) {
      nodes.push({ primitive: 'EvidenceNode', ref });
    }
  }
  if (Array.isArray(intent.confidence_refs) && intent.confidence_refs.length) {
    for (const c of intent.confidence_refs) {
      nodes.push({ primitive: 'ConfidenceBadge', value: c });
    }
  }
  return nodes;
}

function composeConfirm(intent) {
  const nodes = [{ primitive: 'Text', role: 'primary', content: String(intent.primary_object ?? '') }];
  const actions = Array.isArray(intent.required_actions) && intent.required_actions.length
    ? intent.required_actions
    : ['Confirm', 'Cancel'];
  for (const action of actions) {
    nodes.push({ primitive: 'ActionButton', role: 'action', label: String(action) });
  }
  return nodes;
}

function composeChoose(intent) {
  const options = Array.isArray(intent.required_actions) ? intent.required_actions : [];
  return [
    { primitive: 'Text', role: 'primary', content: String(intent.primary_object ?? '') },
    { primitive: 'ChoiceGroup', options: options.map((o) => String(o)) },
  ];
}

function composeCompare(intent) {
  const items = Array.isArray(intent.comparison_items) ? intent.comparison_items : [];
  return [{ primitive: 'Comparison', items }];
}

function composeProgress(intent) {
  return [
    { primitive: 'Text', role: 'primary', content: String(intent.primary_object ?? '') },
    { primitive: 'Progress', value: typeof intent.confidence_refs === 'number' ? intent.confidence_refs : null },
  ];
}

function composeHandoff(intent) {
  return [
    { primitive: 'Text', role: 'primary', content: String(intent.primary_object ?? '') },
    { primitive: 'HandoffPrompt', reason: intent.attention_constraints || 'human_step_required' },
  ];
}

function composeEvidence(intent) {
  const refs = Array.isArray(intent.evidence_refs) ? intent.evidence_refs : [];
  return refs.map((ref) => ({ primitive: 'EvidenceNode', ref }));
}

const COMPOSERS_BY_PURPOSE = {
  inform: composeInform,
  confirm: composeConfirm,
  choose: composeChoose,
  compare: composeCompare,
  progress: composeProgress,
  handoff: composeHandoff,
  evidence: composeEvidence,
};

/**
 * Stable hash of the composed tree — makes §65a.C's "same intent, same
 * surface" property an assertable fact, not just a design intention.
 */
function hashTree(tree) {
  return createHash('sha256').update(JSON.stringify(tree)).digest('hex').slice(0, 16);
}

export function composeViewIntent(intent, { dismissible = true } = {}) {
  const validation = validateViewIntent(intent);
  if (!validation.ok) return fallbackComposition(`invalid_view_intent: ${validation.errors.join('; ')}`);

  const composerFn = COMPOSERS_BY_PURPOSE[intent.purpose];
  if (!composerFn) return fallbackComposition(`no_composer_for_purpose: ${intent.purpose}`);

  let tree;
  try {
    tree = composerFn(intent);
  } catch (error) {
    return fallbackComposition(`composer_threw: ${error.message}`);
  }

  for (const node of tree) {
    if (!isApprovedPrimitive(node.primitive)) {
      return fallbackComposition(`unapproved_primitive_emitted: ${node.primitive}`);
    }
  }

  const elements = fixedEnvelopeElements({ dismissible });
  const fullTree = [...tree, ...elements];
  return { ok: true, reason: null, tree: fullTree, elements, hash: hashTree(fullTree) };
}

export default composeViewIntent;
