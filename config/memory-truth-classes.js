/**
 * SYNOPSIS: config/memory-truth-classes.js
 */
// config/memory-truth-classes.js

/**
 * @see @ssot docs/projects/AMENDMENT_02_MEMORY_SYSTEM.md
 */
export const TRUTH_CLASSES = {
  objective: {
    default_trust_level: 'PROPOSED',
    default_retrieval_permission: 'context_only',
    can_auto_promote_to_canonical: false,
    is_relationship_memory: false,
    requires_founder_confirmation: false,
  },
  inferential: {
    default_trust_level: 'PROPOSED',
    default_retrieval_permission: 'context_only',
    can_auto_promote_to_canonical: false,
    is_relationship_memory: false,
    requires_founder_confirmation: false,
  },
  probabilistic: {
    default_trust_level: 'PROPOSED',
    default_retrieval_permission: 'context_only',
    can_auto_promote_to_canonical: false,
    is_relationship_memory: false,
    requires_founder_confirmation: false,
  },
  procedural: {
    default_trust_level: 'PROPOSED',
    default_retrieval_permission: 'context_only',
    can_auto_promote_to_canonical: false,
    is_relationship_memory: false,
    requires_founder_confirmation: false,
  },
  symbolic: {
    default_trust_level: 'PROPOSED',
    default_retrieval_permission: 'context_only',
    can_auto_promote_to_canonical: false,
    is_relationship_memory: false,
    requires_founder_confirmation: false,
  },
  emotional: {
    default_trust_level: 'PROPOSED',
    default_retrieval_permission: 'context_only',
    can_auto_promote_to_canonical: false,
    is_relationship_memory: false,
    requires_founder_confirmation: true,
  },
  relationship: {
    default_trust_level: 'PROPOSED',
    default_retrieval_permission: 'context_only',
    can_auto_promote_to_canonical: false,
    is_relationship_memory: true,
    requires_founder_confirmation: true,
  },
  preference: {
    default_trust_level: 'PROPOSED',
    default_retrieval_permission: 'context_only',
    can_auto_promote_to_canonical: false,
    is_relationship_memory: false,
    requires_founder_confirmation: false,
  },
  institutional: {
    default_trust_level: 'PROPOSED',
    default_retrieval_permission: 'context_only',
    can_auto_promote_to_canonical: false,
    is_relationship_memory: false,
    requires_founder_confirmation: false,
  },
  document_truth: {
    default_trust_level: 'PROPOSED',
    default_retrieval_permission: 'context_only',
    can_auto_promote_to_canonical: false,
    is_relationship_memory: false,
    requires_founder_confirmation: false,
  },
};

export function assignTruthClass(signal) {
  if (signal.source_type === 'founder_input' && signal.signal_type === 'relationship') {
    return 'relationship';
  }
  if (signal.source_type === 'founder_input' && signal.signal_type === 'emotional') {
    return 'emotional';
  }
  if (signal.source_type === 'council_output' || signal.source === 'model/AI narration') {
    return 'inferential';
  }
  if (signal.signal_type === 'preference') {
    return 'preference';
  }
  if (signal.signal_type === 'institutional_failure') {
    return 'institutional';
  }
  if (signal.signal_type === 'document') {
    return 'document_truth';
  }
  return 'inferential';
}

export function isSyntheticClass(truthClass) {
  return ['inferential', 'probabilistic', 'symbolic', 'emotional', 'relationship'].includes(truthClass);
}

export function getTruthClassConfig(truthClass) {
  if (!Object.keys(TRUTH_CLASSES).includes(truthClass)) {
    throw new Error(`Unknown truth class: ${truthClass}`);
  }
  return TRUTH_CLASSES[truthClass];
}